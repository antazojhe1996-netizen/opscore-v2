"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
export default function ForecastingPage() {
  /// STATES
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [eventAddons, setEventAddons] = useState<any[]>([]);
  const [roomSales, setRoomSales] = useState<any[]>([]);
  const [hcRules, setHcRules] = useState<any>(null);
  const [forecastingRules, setForecastingRules] = useState<any>(null);
  const [viewRange, setViewRange] = useState("7");
  const [riskFilter, setRiskFilter] = useState("All");
  const [showAlertPanel, setShowAlertPanel] = useState(false);

  /// FUNCTIONS
  const getOccupancyData = async () => {
    const { data, error } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: true });

    if (error) {
      console.log("GET OCCUPANCY ERROR:", error.message);
      return;
    }

    setOccupancyData(data || []);
  };

  const getRoomSales = async () => {
    const { data, error } = await supabase
      .from("finance_hotel_reservations")
      .select("*")
      .order("check_in", { ascending: true });

    if (error) {
      console.log("GET ROOM SALES FOR FORECAST ERROR:", error.message);
      return;
    }

    setRoomSales(data || []);
  };

  const getSchedules = async () => {
    const { data, error } = await supabase.from("schedules").select("*");

    if (error) {
      console.log("GET SCHEDULES ERROR:", error.message);
      return;
    }

    setSchedules(data || []);
  };

  const getEventAddons = async () => {
    const { data, error } = await supabase
      .from("event_addons")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.log("GET EVENT ADDONS ERROR:", error.message);
      return;
    }

    setEventAddons(data || []);
  };

  const loadHCRules = async () => {
    const { data, error } = await supabase
      .from("hc_rule_settings")
      .select("setting_data")
      .eq("setting_name", "hc_rules")
      .maybeSingle();

    if (error) {
      console.log("LOAD HC RULES ERROR:", error.message);
      return;
    }

    setHcRules(data?.setting_data || null);
  };

  const loadForecastingRules = async () => {
    const { data, error } = await supabase
      .from("forecasting_settings")
      .select("setting_data")
      .eq("setting_name", "forecasting_rules")
      .maybeSingle();

    if (error) {
      console.log("LOAD FORECASTING RULES ERROR:", error.message);
      return;
    }

    setForecastingRules(data?.setting_data || null);
  };

  const refreshForecasting = () => {
    getOccupancyData();
    getRoomSales();
    getSchedules();
    getEventAddons();
    loadHCRules();
    loadForecastingRules();
  };

  const getEventForDate = (date: string) => {
    return eventAddons.find(
      (event) => String(event.event_date) === String(date)
    );
  };

  const sumRuleValues = (rules: Record<string, number> = {}) => {
    return Object.values(rules).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );
  };

  const getRequiredHC = (day: any) => {
    if (!hcRules) return 0;

    const roomsSold = Number(day.rooms_sold || 0);
    const date = String(day.business_date);

    const occupancyRule = hcRules.occupancyRules?.find((rule: any) => {
      return (
        roomsSold >= Number(rule.min || 0) &&
        roomsSold <= Number(rule.max || 999999)
      );
    });

    const baseHC = sumRuleValues(occupancyRule?.rules || {});

    const dayName = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const peakRule = hcRules.peakRules?.find(
      (rule: any) => rule.day === dayName
    );

    const peakHC = sumRuleValues(peakRule?.rules || {});

    const event = getEventForDate(date);
    const eventPax = Number(event?.expected_pax || 0);

    const eventRule = hcRules.eventRules?.find((rule: any) => {
      return (
        eventPax >= Number(rule.min || 0) &&
        eventPax <= Number(rule.max || 999999)
      );
    });

    const eventHC = event ? sumRuleValues(eventRule?.rules || {}) : 0;

    return baseHC + peakHC + eventHC;
  };

  const getScheduleDateValue = (schedule: any) =>
    String(
      schedule?.day ||
        schedule?.date ||
        schedule?.schedule_date ||
        schedule?.business_date ||
        schedule?.created_at ||
        ""
    ).slice(0, 10);

  const isWorkingScheduleShift = (shift: any) => {
    const normalized = String(shift || "").trim().toUpperCase();

    return (
      Boolean(normalized) &&
      normalized !== "OFF" &&
      normalized !== "RD" &&
      normalized !== "LEAVE"
    );
  };

  const getScheduledHC = (date: string) => {
    return schedules.filter(
      (schedule) =>
        getScheduleDateValue(schedule) === String(date) &&
        isWorkingScheduleShift(schedule.shift)
    ).length;
  };

  const getDemandStatus = (occupancy: number, eventPax: number) => {
    const highOccupancy = Number(forecastingRules?.demand?.high || 90);
    const normalOccupancy = Number(forecastingRules?.demand?.normal || 50);
    const lowOccupancy = Number(forecastingRules?.demand?.low || 30);

    const highPax = Number(forecastingRules?.eventDemand?.highPax || 200);
    const normalPax = Number(forecastingRules?.eventDemand?.normalPax || 80);
    const lowPax = Number(forecastingRules?.eventDemand?.lowPax || 30);

    if (occupancy >= highOccupancy || eventPax >= highPax) return "High";
    if (occupancy >= normalOccupancy || eventPax >= normalPax) return "Normal";
    if (occupancy >= lowOccupancy || eventPax >= lowPax) return "Low";

    return "Very Low";
  };

  const getStaffingStatus = (gap: number) => {
    if (gap < 0) return "Low Staff";
    if (gap > 0) return "Over Staff";
    return "Normal";
  };

  const getBadgeClass = (status: string) => {
    if (
      status === "Low Staff" ||
      status === "High Risk" ||
      status === "High"
    ) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (
      status === "Over Staff" ||
      status === "Overstaff Risk" ||
      status === "Normal"
    ) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (status === "Low" || status === "Very Low") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  const getGapClass = (gap: number) => {
    if (gap < 0) return "text-red-700";
    if (gap > 0) return "text-amber-700";
    return "text-emerald-700";
  };

  /// EFFECTS
  useEffect(() => {
    refreshForecasting();
  }, []);

  /// CALCULATIONS
  const forecastSourceLabel =
    occupancyData.length > 0 ? "Occupancy Import" : "Room Sales Fallback";

  const fallbackOccupancyData = useMemo(() => {
    const TOTAL_ROOMS = 50;

    const activeRoomSales = roomSales.filter((row) => {
      const status = String(row.status || "").toUpperCase();

      return (
        !status.includes("CANCELLED") &&
        !status.includes("CANCELED") &&
        !status.includes("NO SHOW") &&
        !status.includes("NOSHOW")
      );
    });

    const grouped = activeRoomSales.reduce((acc: Record<string, any>, row) => {
      const date = String(
        row.check_in || row.arrival_date || row.created_at || ""
      ).slice(0, 10);

      if (!date) return acc;

      if (!acc[date]) {
        acc[date] = {
          id: `room-sales-${date}`,
          business_date: date,
          rooms_sold: 0,
          available_rooms: TOTAL_ROOMS,
          occupancy: 0,
          source: "Room Sales Fallback",
        };
      }

      acc[date].rooms_sold += 1;
      acc[date].available_rooms = Math.max(
        TOTAL_ROOMS - acc[date].rooms_sold,
        0
      );
      acc[date].occupancy = Math.min(
        Math.round((acc[date].rooms_sold / TOTAL_ROOMS) * 100),
        100
      );

      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) =>
      String(a.business_date).localeCompare(String(b.business_date))
    );
  }, [roomSales]);

  const forecastInputData =
    occupancyData.length > 0 ? occupancyData : fallbackOccupancyData;

  const forecastData = useMemo(() => {
    return forecastInputData.map((day: any) => {
      const occupancy = Number(day.occupancy || 0);
      const event = getEventForDate(day.business_date);
      const eventPax = Number(event?.expected_pax || 0);

      const requiredHC = getRequiredHC(day);
      const scheduledHC = getScheduledHC(day.business_date);
      const gap = scheduledHC - requiredHC;

      const demandStatus = getDemandStatus(occupancy, eventPax);
      const staffingStatus = getStaffingStatus(gap);

      return {
        ...day,
        occupancy,
        event_name: event?.event_name || "-",
        expected_pax: eventPax,
        required_hc: requiredHC,
        scheduled_hc: scheduledHC,
        gap,
        demand_status: demandStatus,
        staffing_status: staffingStatus,
      };
    });
  }, [forecastInputData, schedules, eventAddons, hcRules, forecastingRules]);

  const rangedData = forecastData.slice(0, Number(viewRange));

  const filteredData =
    riskFilter === "All"
      ? rangedData
      : rangedData.filter((day) => day.staffing_status === riskFilter);

  const criticalDays = rangedData.filter(
    (day) => day.staffing_status === "Low Staff"
  );

  const overStaffDays = rangedData.filter(
    (day) => day.staffing_status === "Over Staff"
  );

  const totalEventPax = eventAddons.reduce(
    (sum, event) => sum + Number(event.expected_pax || 0),
    0
  );

  const peakDemandDay =
    rangedData.length > 0
      ? rangedData.reduce((peak, day) => {
          const dayScore =
            Number(day.occupancy || 0) + Number(day.expected_pax || 0) / 10;

          const peakScore =
            Number(peak.occupancy || 0) + Number(peak.expected_pax || 0) / 10;

          return dayScore > peakScore ? day : peak;
        })
      : null;

  const totalGap = rangedData.reduce(
    (sum, day) => sum + Number(day.gap || 0),
    0
  );

  const overstaffGap = Number(forecastingRules?.laborRisk?.overstaffGap || 5);

  const laborRisk =
    criticalDays.length > 0
      ? "High Risk"
      : totalGap > overstaffGap
      ? "Overstaff Risk"
      : "Normal";

  const dataQualityAlerts = [
    !hcRules ? "HC rules are not configured." : "",
    schedules.length === 0 ? "No schedules loaded for comparison." : "",
    forecastInputData.length === 0 ? "No occupancy or room sales forecast data." : "",
  ].filter(Boolean);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="WORKFORCE / FORECASTING" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Workforce
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Forecasting
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                View future room demand, event load, staffing coverage, and
                manpower risk using occupancy, room sales, schedules, and HC
                rules.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/forecasting/occupancy-import"
                className="h-11 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
              >
                Import Occupancy
              </Link>

              <Link
                href="/forecasting/event-addons"
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                Event Add-ons
              </Link>

              <button
                onClick={() => setShowAlertPanel(true)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                View Alerts
              </button>
            </div>
          </div>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Peak Demand
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                {peakDemandDay?.business_date || "No data"}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {peakDemandDay?.occupancy || 0}% room occupancy
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Upcoming Events
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                {eventAddons.length}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {totalEventPax} total pax
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Staff Alerts
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                {criticalDays.length}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Need manpower review
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Labor Risk
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                {laborRisk}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Net gap: {totalGap > 0 ? `+${totalGap}` : totalGap}
              </p>
            </div>
          </section>

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Forecast Controls
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Filters and Source Status
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Current source: {forecastSourceLabel}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  View Range
                </label>
                <select
                  value={viewRange}
                  onChange={(e) => setViewRange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="7">Next 7 Days</option>
                  <option value="14">Next 14 Days</option>
                  <option value="30">Next 30 Days</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Staffing Risk
                </label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="All">All</option>
                  <option value="Low Staff">Low Staff</option>
                  <option value="Normal">Normal</option>
                  <option value="Over Staff">Over Staff</option>
                </select>
              </div>

              <div className="xl:col-span-2">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Forecast Summary
                </p>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-700">
                  Main demand uses imported occupancy data. If empty, OPSCORE
                  falls back to Room Sales reservations. Events are added when
                  encoded.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Demand Forecast
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Room Occupancy Demand Forecast
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Future demand based on occupancy import, Room Sales fallback,
                event data, HC rules, and schedule coverage.
              </p>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Occupancy</th>
                    <th className="px-6 py-4">Rooms Sold</th>
                    <th className="px-6 py-4">Available</th>
                    <th className="px-6 py-4">Required HC</th>
                    <th className="px-6 py-4">Scheduled HC</th>
                    <th className="px-6 py-4">Gap</th>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Pax</th>
                    <th className="px-6 py-4">Demand</th>
                    <th className="px-6 py-4">Staffing Risk</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredData.map((day) => (
                    <tr
                      key={day.id}
                      className="transition-all duration-200 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-black text-slate-950">
                        {day.business_date}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-950">
                        {day.occupancy}%
                      </td>
                      <td className="px-6 py-4">{day.rooms_sold || 0}</td>
                      <td className="px-6 py-4">
                        {day.available_rooms || 0}
                      </td>
                      <td className="px-6 py-4">{day.required_hc}</td>
                      <td className="px-6 py-4">{day.scheduled_hc}</td>
                      <td
                        className={`px-6 py-4 font-black ${getGapClass(
                          Number(day.gap || 0)
                        )}`}
                      >
                        {day.gap > 0 ? `+${day.gap}` : day.gap}
                      </td>
                      <td className="px-6 py-4">{day.event_name || "-"}</td>
                      <td className="px-6 py-4">
                        {day.expected_pax || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getBadgeClass(
                            day.demand_status
                          )}`}
                        >
                          {day.demand_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getBadgeClass(
                            day.staffing_status
                          )}`}
                        >
                          {day.staffing_status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-14 text-center">
                        <h3 className="text-sm font-black text-slate-950">
                          No forecast data found.
                        </h3>
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          Import occupancy data or add room sales reservations
                          to generate the forecast.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {showAlertPanel && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-950/35"
              onClick={() => setShowAlertPanel(false)}
            />

            <aside className="fixed right-0 top-16 z-50 flex h-[calc(100vh-64px)] w-full max-w-[820px] flex-col border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Forecast Review
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Forecast Alerts
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Review upcoming event load, staffing gaps, and data quality
                    risks.
                  </p>
                </div>

                <button
                  onClick={() => setShowAlertPanel(false)}
                  className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  Ã—
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Staffing Alerts
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    Low Staff Days
                  </h3>

                  <div className="mt-4 space-y-3">
                    {criticalDays.length > 0 ? (
                      criticalDays.map((day) => (
                        <div
                          key={day.id}
                          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                        >
                          <div className="flex justify-between gap-4">
                            <span>{day.business_date}</span>
                            <span>Gap {day.gap}</span>
                          </div>
                          <p className="mt-2 text-xs leading-5">
                            Required HC: {day.required_hc} Â· Scheduled HC:{" "}
                            {day.scheduled_hc}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                        No staffing alerts.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Cost Risk
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    Over Staff Days
                  </h3>

                  <div className="mt-4 space-y-3">
                    {overStaffDays.length > 0 ? (
                      overStaffDays.map((day) => (
                        <div
                          key={day.id}
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700"
                        >
                          <div className="flex justify-between gap-4">
                            <span>{day.business_date}</span>
                            <span>+{day.gap}</span>
                          </div>
                          <p className="mt-2 text-xs leading-5">
                            Review possible schedule adjustment or
                            cross-deployment.
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                        No overstaff alerts.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Upcoming Events
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    Event Load
                  </h3>

                  <div className="mt-4 space-y-3">
                    {eventAddons.length > 0 ? (
                      eventAddons.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"
                        >
                          <div className="flex justify-between gap-4">
                            <span>{event.event_name}</span>
                            <span>{event.expected_pax} Pax</span>
                          </div>
                          <p className="mt-2 text-xs leading-5">
                            Event Date: {event.event_date}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                        No events added.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Data Quality
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    Forecast Reliability
                  </h3>

                  <div className="mt-4 space-y-3">
                    {dataQualityAlerts.length > 0 ? (
                      dataQualityAlerts.map((alert) => (
                        <p
                          key={alert}
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700"
                        >
                          {alert}
                        </p>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                        Forecast data sources are ready.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white/95 p-6">
                <button
                  onClick={refreshForecasting}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  Refresh
                </button>

                <button
                  onClick={() => setShowAlertPanel(false)}
                  className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  Close Review
                </button>
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}





