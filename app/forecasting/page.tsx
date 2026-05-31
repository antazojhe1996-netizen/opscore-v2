"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ForecastingPage() {
  /// STATES
  const [occupancyData, setOccupancyData] = useState<any[]>([]);

  /// CALCULATIONS
  const getRequiredHC = (occupancy: number) => {
    if (occupancy >= 80) return 50;
    if (occupancy >= 50) return 35;
    return 20;
  };

  const forecastData = occupancyData.map((day) => ({
    ...day,
    required_hc: getRequiredHC(Number(day.occupancy || 0)),
  }));

  const next7Days = forecastData.slice(0, 7);

  const averageOccupancy =
    next7Days.length > 0
      ? Math.round(
          next7Days.reduce(
            (sum, day) => sum + Number(day.occupancy || 0),
            0
          ) / next7Days.length
        )
      : 0;

  const highestOccupancyDay =
    next7Days.length > 0
      ? next7Days.reduce((highest, day) =>
          Number(day.occupancy || 0) > Number(highest.occupancy || 0)
            ? day
            : highest
        )
      : null;

  const lowestOccupancyDay =
    next7Days.length > 0
      ? next7Days.reduce((lowest, day) =>
          Number(day.occupancy || 0) < Number(lowest.occupancy || 0)
            ? day
            : lowest
        )
      : null;

  const averageRequiredHC =
    next7Days.length > 0
      ? Math.round(
          next7Days.reduce(
            (sum, day) => sum + Number(day.required_hc || 0),
            0
          ) / next7Days.length
        )
      : 0;

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
    if (occupancy >= 80) {
      return "border-green-500/30 bg-green-500/20 text-green-400";
    }

    if (occupancy >= 50) {
      return "border-yellow-500/30 bg-yellow-500/20 text-yellow-400";
    }

    return "border-red-500/30 bg-red-500/20 text-red-400";
  };

  const hcStatus = (occupancy: number) => {
    if (occupancy >= 80) return "High Demand";
    if (occupancy >= 50) return "Normal Demand";
    return "Low Demand";
  };

  useEffect(() => {
    getOccupancyData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Forecasting</h1>
          <p className="text-sm text-slate-400">
            Forecast headcount requirements using imported occupancy data.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
  <Link
    href="/forecasting/occupancy-import"
    className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-yellow-400 hover:bg-slate-800"
  >
    <h2 className="text-xl font-bold">Occupancy Import</h2>

    <p className="mt-3 text-sm leading-6 text-slate-400">
      Upload Cloudbeds occupancy data for forecasting and workforce planning.
    </p>

    <p className="mt-6 text-sm font-semibold text-yellow-400">
      Open Import →
    </p>
  </Link>

  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 opacity-60">
    <h2 className="text-xl font-bold">Event Add-ons</h2>

    <p className="mt-3 text-sm leading-6 text-slate-400">
      Add special events that increase required manpower.
    </p>

    <p className="mt-6 text-sm font-semibold text-slate-500">
      Coming Soon
    </p>
  </div>
</section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Next 7 Days Avg Occupancy</p>
            <h2 className="mt-2 text-3xl font-bold">{averageOccupancy}%</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Avg Required HC</p>
            <h2 className="mt-2 text-3xl font-bold">{averageRequiredHC}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Highest Occupancy</p>
            <h2 className="mt-2 text-3xl font-bold">
              {highestOccupancyDay
                ? `${highestOccupancyDay.occupancy}%`
                : "0%"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {highestOccupancyDay?.business_date || "No data"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Lowest Occupancy</p>
            <h2 className="mt-2 text-3xl font-bold">
              {lowestOccupancyDay
                ? `${lowestOccupancyDay.occupancy}%`
                : "0%"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {lowestOccupancyDay?.business_date || "No data"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Occupancy-Based HC Forecast</h2>
            <p className="text-sm text-slate-400">
              Required HC is currently calculated using simple occupancy
              thresholds.
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
                  <th className="py-3 pr-4">Demand Status</th>
                  <th className="py-3 pr-4">Room Revenue</th>
                  <th className="py-3 pr-4">ADR</th>
                </tr>
              </thead>

              <tbody>
                {forecastData.map((day) => (
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
                          Number(day.occupancy || 0)
                        )}`}
                      >
                        {day.occupancy}%
                      </span>
                    </td>

                    <td className="py-3 pr-4 font-semibold">
                      {day.required_hc}
                    </td>

                    <td className="py-3 pr-4">
                      {hcStatus(Number(day.occupancy || 0))}
                    </td>

                    <td className="py-3 pr-4">₱{day.room_revenue}</td>
                    <td className="py-3 pr-4">₱{day.adr}</td>
                  </tr>
                ))}

                {forecastData.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-500"
                    >
                      No occupancy data found. Import Cloudbeds data first.
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