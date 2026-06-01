"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ForecastingPage() {
  /// STATES
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [viewRange, setViewRange] = useState("7");
  const [riskFilter, setRiskFilter] = useState("All");

  /// CALCULATIONS
  const getRequiredHC = (occupancy: number) => {
    if (occupancy >= 80) return 50;
    if (occupancy >= 50) return 35;
    return 20;
  };

  const getScheduledHC = (occupancy: number) => {
    if (occupancy >= 80) return 45;
    if (occupancy >= 50) return 35;
    return 22;
  };

  const getDemandStatus = (occupancy: number) => {
    if (occupancy >= 85) return "Critical";
    if (occupancy >= 70) return "High";
    if (occupancy >= 50) return "Normal";
    return "Low";
  };

  const getStaffingStatus = (gap: number) => {
    if (gap < 0) return "Low Staff";
    if (gap > 0) return "Over Staff";
    return "Normal";
  };

  const forecastData = useMemo(() => {
    return occupancyData.map((day) => {
      const occupancy = Number(day.occupancy || 0);
      const requiredHC = getRequiredHC(occupancy);
      const scheduledHC = getScheduledHC(occupancy);
      const gap = scheduledHC - requiredHC;

      return {
        ...day,
        occupancy,
        required_hc: requiredHC,
        scheduled_hc: scheduledHC,
        gap,
        demand_status: getDemandStatus(occupancy),
        staffing_status: getStaffingStatus(gap),
      };
    });
  }, [occupancyData]);

  const rangedData = forecastData.slice(0, Number(viewRange));

  const filteredData =
    riskFilter === "All"
      ? rangedData
      : rangedData.filter((day) => day.staffing_status === riskFilter);

  const averageOccupancy =
    rangedData.length > 0
      ? Math.round(
          rangedData.reduce((sum, day) => sum + Number(day.occupancy || 0), 0) /
            rangedData.length
        )
      : 0;

  const averageRequiredHC =
    rangedData.length > 0
      ? Math.round(
          rangedData.reduce(
            (sum, day) => sum + Number(day.required_hc || 0),
            0
          ) / rangedData.length
        )
      : 0;

  const highestOccupancyDay =
    rangedData.length > 0
      ? rangedData.reduce((highest, day) =>
          Number(day.occupancy || 0) > Number(highest.occupancy || 0)
            ? day
            : highest
        )
      : null;

  const criticalDays = rangedData.filter(
    (day) => day.demand_status === "Critical" || day.staffing_status === "Low Staff"
  );

  const totalGap = rangedData.reduce((sum, day) => sum + Number(day.gap || 0), 0);

  const laborRisk =
    criticalDays.length > 0
      ? "High Risk"
      : totalGap > 5
      ? "Overstaff Risk"
      : "Normal";

  const departmentBreakdown = [
    {
      department: "Front Office",
      required: Math.ceil(averageRequiredHC * 0.12),
    },
    {
      department: "Housekeeping",
      required: Math.ceil(averageRequiredHC * 0.28),
    },
    {
      department: "Kitchen",
      required: Math.ceil(averageRequiredHC * 0.18),
    },
    {
      department: "Waitress",
      required: Math.ceil(averageRequiredHC * 0.18),
    },
    {
      department: "Cashier",
      required: Math.ceil(averageRequiredHC * 0.1),
    },
    {
      department: "Maintenance",
      required: Math.ceil(averageRequiredHC * 0.08),
    },
  ];

  /// FUNCTIONS
  const getOccupancyData = async () => {
    const { data, error } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: true });

    if (error) {
      console.log("GET OCCUPANCY DATA ERROR:", error);
      return;
    }

    setOccupancyData(data || []);
  };

  const occupancyBadge = (occupancy: number) => {
    if (occupancy >= 80) return "border-green-500/30 bg-green-500/20 text-green-400";
    if (occupancy >= 50) return "border-yellow-500/30 bg-yellow-500/20 text-yellow-400";
    return "border-red-500/30 bg-red-500/20 text-red-400";
  };

  const statusBadge = (status: string) => {
    if (status === "Low Staff" || status === "Critical" || status === "High Risk") {
      return "border-red-500/30 bg-red-500/20 text-red-400";
    }

    if (status === "Over Staff" || status === "High" || status === "Overstaff Risk") {
      return "border-yellow-500/30 bg-yellow-500/20 text-yellow-400";
    }

    return "border-green-500/30 bg-green-500/20 text-green-400";
  };

  useEffect(() => {
    getOccupancyData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Forecasting</h1>
            <p className="text-sm text-slate-400">
              Forecast headcount requirements using imported room occupancy data.
            </p>
          </div>

          <Link
            href="/forecasting/occupancy-import"
            className="w-fit rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-300"
          >
            Import Occupancy
          </Link>
          <Link
            href="/forecasting/event-addons"
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:border-yellow-400 hover:bg-slate-800"
          >
            Event Add-ons
          </Link>
          
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Average Occupancy</p>
            <h2 className="mt-2 text-3xl font-bold">{averageOccupancy}%</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Average Required HC</p>
            <h2 className="mt-2 text-3xl font-bold">{averageRequiredHC}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Highest Occupancy</p>
            <h2 className="mt-2 text-3xl font-bold">
              {highestOccupancyDay ? `${highestOccupancyDay.occupancy}%` : "0%"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {highestOccupancyDay?.business_date || "No data"}
            </p>
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
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Smart Alerts</h2>

          <div className="space-y-3">
            {criticalDays.length > 0 ? (
              criticalDays.slice(0, 5).map((day) => (
                <div
                  key={day.id}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
                >
                  {day.business_date} has {day.occupancy}% occupancy. Required HC is{" "}
                  {day.required_hc}. Staffing status: {day.staffing_status}.
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                No critical staffing risk detected for the selected period.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Department HC Breakdown</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departmentBreakdown.map((dept) => (
              <div
                key={dept.department}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <p className="text-sm text-slate-400">{dept.department}</p>
                <h3 className="mt-2 text-2xl font-bold">{dept.required}</h3>
                <p className="mt-1 text-xs text-slate-500">Suggested required HC</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Occupancy-Based HC Forecast</h2>
            <p className="text-sm text-slate-400">
              Required HC is calculated from occupancy forecast. Settings integration is ready next.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Rooms Sold</th>
                  <th className="py-3 pr-4">Available</th>
                  <th className="py-3 pr-4">Occupancy</th>
                  <th className="py-3 pr-4">Required HC</th>
                  <th className="py-3 pr-4">Scheduled HC</th>
                  <th className="py-3 pr-4">Gap</th>
                  <th className="py-3 pr-4">Staffing Status</th>
                  <th className="py-3 pr-4">Demand</th>
                  <th className="py-3 pr-4">Room Revenue</th>
                  <th className="py-3 pr-4">ADR</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.map((day) => (
                  <tr
                    key={day.id}
                    className="border-b border-slate-800/70 text-slate-200 transition hover:bg-slate-800/30"
                  >
                    <td className="py-3 pr-4">{day.business_date}</td>
                    <td className="py-3 pr-4">{day.rooms_sold}</td>
                    <td className="py-3 pr-4">{day.available_rooms}</td>

                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${occupancyBadge(
                          day.occupancy
                        )}`}
                      >
                        {day.occupancy}%
                      </span>
                    </td>

                    <td className="py-3 pr-4 font-semibold">{day.required_hc}</td>
                    <td className="py-3 pr-4">{day.scheduled_hc}</td>

                    <td className="py-3 pr-4 font-semibold">
                      {day.gap > 0 ? `+${day.gap}` : day.gap}
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

                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
                          day.demand_status
                        )}`}
                      >
                        {day.demand_status}
                      </span>
                    </td>

                    <td className="py-3 pr-4">₱{day.room_revenue || 0}</td>
                    <td className="py-3 pr-4">₱{day.adr || 0}</td>
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
      </main>
    </div>
  );
}