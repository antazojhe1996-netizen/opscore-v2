"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ForecastingPage() {
  /// STATES
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [eventAddons, setEventAddons] = useState<any[]>([]);
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

    // Missing row/value is not scheduled.
    // OFF and RD are valid rest days, not working manpower.
    // LEAVE is also not counted as scheduled HC.
    return Boolean(normalized) &&
      normalized !== "OFF" &&
      normalized !== "RD" &&
      normalized !== "LEAVE";
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

  const statusBadge = (status: string) => {
    if (status === "Low Staff" || status === "High Risk" || status === "High") {
      return "border-red-500/30 bg-red-500/20 text-red-400";
    }

    if (status === "Over Staff" || status === "Normal") {
      return "border-yellow-500/30 bg-yellow-500/20 text-yellow-400";
    }

    return "border-green-500/30 bg-green-500/20 text-green-400";
  };

  const demandBadge = (status: string) => {
    if (status === "High") {
      return "border-green-500/30 bg-green-500/20 text-green-400";
    }

    if (status === "Normal") {
      return "border-yellow-500/30 bg-yellow-500/20 text-yellow-400";
    }

    return "border-red-500/30 bg-red-500/20 text-red-400";
  };

  /// EFFECTS
  useEffect(() => {
    getOccupancyData();
    getSchedules();
    getEventAddons();
    loadHCRules();
    loadForecastingRules();
  }, []);

  /// CALCULATIONS
  const forecastData = useMemo(() => {
    return occupancyData.map((day) => {
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
  }, [occupancyData, schedules, eventAddons, hcRules, forecastingRules]);

  const rangedData = forecastData.slice(0, Number(viewRange));

  const filteredData =
    riskFilter === "All"
      ? rangedData
      : rangedData.filter((day) => day.staffing_status === riskFilter);

  const criticalDays = rangedData.filter(
    (day) => day.staffing_status === "Low Staff"
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

  /// UI
  return (
  <div className="flex min-h-screen bg-slate-950 text-white">
    <Sidebar />

    <main className="flex-1 p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forecasting</h1>
          <p className="text-sm text-slate-400">
            View future demand from room occupancy, staffing risk, and occasional events.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/forecasting/occupancy-import"
            className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-yellow-300"
          >
            Import Room Occupancy
          </Link>

          <Link
            href="/forecasting/event-addons"
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:border-yellow-400 hover:bg-slate-800"
          >
            Event Add-ons
          </Link>

          <button
            onClick={() => setShowAlertPanel(true)}
            className="rounded-xl border border-red-500/40 bg-red-500/20 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/30"
          >
            View Alerts
          </button>
        </div>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <p className="text-sm text-yellow-300">Peak Room Occupancy Day</p>
          <h2 className="mt-2 text-2xl font-bold">
            {peakDemandDay?.business_date || "No data"}
          </h2>
          <p className="mt-1 text-xs text-yellow-300">
            {peakDemandDay?.occupancy || 0}% room occupancy
          </p>
        </div>

        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
          <p className="text-sm text-green-300">Upcoming Events</p>
          <h2 className="mt-2 text-3xl font-bold">{eventAddons.length}</h2>
          <p className="mt-1 text-xs text-green-300">
            {totalEventPax} total pax
          </p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
          <p className="text-sm text-red-300">Staff Alerts</p>
          <h2 className="mt-2 text-3xl font-bold">{criticalDays.length}</h2>
          <p className="mt-1 text-xs text-red-300">Need manpower review</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Labor Risk</p>
          <h2 className="mt-2 text-3xl font-bold">{laborRisk}</h2>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">View Range</label>
            <select
              value={viewRange}
              onChange={(e) => setViewRange(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
            >
              <option value="7">Next 7 Days</option>
              <option value="14">Next 14 Days</option>
              <option value="30">Next 30 Days</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Staffing Risk</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
            >
              <option value="All">All</option>
              <option value="Low Staff">Low Staff</option>
              <option value="Normal">Normal</option>
              <option value="Over Staff">Over Staff</option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <p className="mb-2 text-sm text-slate-400">Forecast Summary</p>
            <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              Main demand is based on room occupancy. Events are added only when encoded.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Room Occupancy Demand Forecast</h2>
          <p className="text-sm text-slate-400">
            Future demand based mainly on room occupancy forecast. Event data appears at the end when available.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4">Room Occupancy</th>
            <th className="py-3 pr-4">Rooms Sold</th>
            <th className="py-3 pr-4">Available Rooms</th>
            <th className="py-3 pr-4">Required HC</th>
            <th className="py-3 pr-4">Scheduled HC</th>
            <th className="py-3 pr-4">Gap</th>
            <th className="w-[220px] py-3 pr-6">Event</th>
            <th className="w-[90px] py-3 pr-6">Pax</th>
            <th className="py-3 pr-4">Demand</th>
            <th className="py-3 pr-4">Staffing Risk</th>
          </tr>
                      </thead>

            <tbody>
              {filteredData.map((day) => (
                <tr
            key={day.id}
            className="border-b border-slate-800/70 text-slate-200 hover:bg-slate-800/30"
          >
            <td className="py-3 pr-4">{day.business_date}</td>
            <td className="py-3 pr-4 font-semibold">{day.occupancy}%</td>
            <td className="py-3 pr-4">{day.rooms_sold}</td>
            <td className="py-3 pr-4">{day.available_rooms}</td>
            <td className="py-3 pr-4">{day.required_hc}</td>
            <td className="py-3 pr-4">{day.scheduled_hc}</td>
            <td className={day.gap < 0 ? "py-3 pr-4 font-black text-red-400" : day.gap > 0 ? "py-3 pr-4 font-black text-yellow-400" : "py-3 pr-4 font-black text-green-400"}>
              {day.gap > 0 ? `+${day.gap}` : day.gap}
            </td>

            <td className="w-[220px] py-3 pr-6 text-slate-300">
          {day.event_name || "-"}
        </td>

            <td className="w-[90px] py-3 pr-6">
              {day.expected_pax || "-"}
            </td>

            <td className="py-3 pr-4">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${demandBadge(
                  day.demand_status
                )}`}
              >
                {day.demand_status}
              </span>
            </td>

            <td className="py-3 pr-4">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
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
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    No forecast data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAlertPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Forecast Alerts</h2>
                <p className="text-sm text-slate-400">
                  Review upcoming events and staffing risks.
                </p>
              </div>

              <button
                onClick={() => setShowAlertPanel(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <h3 className="mb-3 font-bold text-red-400">Staffing Alerts</h3>

                <div className="space-y-2">
                  {criticalDays.length > 0 ? (
                    criticalDays.map((day) => (
                      <div
                        key={day.id}
                        className="rounded-lg bg-slate-900 p-3"
                      >
                        <div className="flex justify-between">
                          <span className="font-semibold">
                            {day.business_date}
                          </span>

                          <span className="font-bold text-red-400">
                            Gap {day.gap}
                          </span>
                        </div>

                        <div className="mt-1 text-sm text-slate-300">
                          Required HC: {day.required_hc}
                        </div>

                        <div className="text-sm text-slate-300">
                          Scheduled HC: {day.scheduled_hc}
                        </div>

                        <div className="text-sm text-red-400">
                          {day.staffing_status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      No staffing alerts.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <h3 className="mb-3 font-bold text-green-400">Upcoming Events</h3>

                <div className="space-y-2">
                  {eventAddons.length > 0 ? (
                    eventAddons.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg bg-slate-900 p-3"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {event.event_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {event.event_date}
                          </p>
                        </div>

                        <div className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-bold text-green-400">
                          {event.expected_pax} Pax
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No events added.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  </div>
);
}