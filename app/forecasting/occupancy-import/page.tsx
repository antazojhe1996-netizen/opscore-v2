"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function OccupancyImportPage() {
  /// STATES
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  /// FUNCTIONS
  const cleanNumber = (value: any) => {
    if (!value) return 0;

    return Number(
      String(value)
        .replace("₱", "")
        .replace("%", "")
        .replace(/,/g, "")
        .trim()
    );
  };

  const getOccupancyData = async () => {
    const { data, error } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: false });

    if (error) {
      console.log("GET OCCUPANCY DATA ERROR:", error);
      return;
    }

    setOccupancyData(data || []);
  };

  const handleCSVUpload = (event: any) => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const text = e.target.result;

      const rows = text
        .split("\n")
        .filter((row: string) => row.trim() !== "");

      const headers = rows[0]
        .split(",")
        .map((header: string) => header.trim());

      const parsedData = rows.slice(1).map((row: string) => {
        const values = row.split(",");

        const record: any = {};

        headers.forEach((header: string, index: number) => {
          record[header] = values[index]?.trim();
        });

        return {
          business_date: record["Stay Date"],
          rooms_sold: cleanNumber(record["Rooms Sold - sum"]),
          capacity: cleanNumber(record["Capacity - sum"]),
          blocked_rooms: cleanNumber(record["Blocked Rooms - sum"]),
          out_of_service_rooms: cleanNumber(
            record["Out of Service Rooms - sum"]
          ),
          available_rooms: cleanNumber(record["Available Rooms - sum"]),
          adjusted_occupancy: cleanNumber(
            record["Adjusted Occupancy - aggregated"]
          ),
          occupancy: cleanNumber(record["Occupancy - aggregated"]),
          room_revenue: cleanNumber(record["Total Room Revenue - sum"]),
          other_revenue: cleanNumber(record["Total Other Revenue - sum"]),
          total_revenue: cleanNumber(record["Total Revenue - sum"]),
          adr: cleanNumber(record["ADR - aggregated"]),
          revpar: cleanNumber(record["RevPAR - aggregated"]),
          taxes: cleanNumber(record["Total taxes - sum"]),
          fees: cleanNumber(record["Total fees - sum"]),
          source: "Cloudbeds CSV",
          uploaded_at: new Date().toISOString(),
        };
      });

      setPreviewData(parsedData);
    };

    reader.readAsText(file);
  };

  const importData = async () => {
    if (previewData.length === 0) {
      alert("Please upload a Cloudbeds CSV first.");
      return;
    }

    const cleanData = previewData.filter((row) => row.business_date);

    const { error } = await supabase.from("occupancy_data").upsert(cleanData, {
      onConflict: "business_date",
    });

    if (error) {
      console.log("IMPORT OCCUPANCY ERROR:", error);
      alert("Failed to import occupancy data.");
      return;
    }

    alert("Occupancy data imported successfully.");
    setPreviewData([]);
    getOccupancyData();
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
          <h1 className="text-2xl font-bold">Occupancy Import</h1>
          <p className="text-sm text-slate-400">
            Upload Cloudbeds occupancy statistics for forecasting, scheduling,
            and finance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Upload Cloudbeds CSV</h2>

            <p className="mb-4 text-sm text-slate-400">
              Export Occupancy Statistics from Cloudbeds, then upload the CSV
              here.
            </p>

            <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Expected Cloudbeds columns:</p>
              <p className="mt-2">Stay Date</p>
              <p>Rooms Sold - sum</p>
              <p>Capacity - sum</p>
              <p>Available Rooms - sum</p>
              <p>Occupancy - aggregated</p>
              <p>Total Room Revenue - sum</p>
              <p>Total Revenue - sum</p>
              <p>ADR - aggregated</p>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />

            <button
              onClick={importData}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500"
            >
              Import / Update Data
            </button>
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">CSV Preview</h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Sold</th>
                    <th className="py-3 pr-4">Capacity</th>
                    <th className="py-3 pr-4">Available</th>
                    <th className="py-3 pr-4">Occ %</th>
                    <th className="py-3 pr-4">Room Revenue</th>
                    <th className="py-3 pr-4">Total Revenue</th>
                    <th className="py-3 pr-4">ADR</th>
                  </tr>
                </thead>

                <tbody>
                  {previewData.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-800/70 text-slate-200"
                    >
                      <td className="py-3 pr-4">{row.business_date}</td>
                      <td className="py-3 pr-4">{row.rooms_sold}</td>
                      <td className="py-3 pr-4">{row.capacity}</td>
                      <td className="py-3 pr-4">{row.available_rooms}</td>
                      <td className="py-3 pr-4">{row.occupancy}%</td>
                      <td className="py-3 pr-4">₱{row.room_revenue}</td>
                      <td className="py-3 pr-4">₱{row.total_revenue}</td>
                      <td className="py-3 pr-4">₱{row.adr}</td>
                    </tr>
                  ))}

                  {previewData.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-500"
                      >
                        Upload a Cloudbeds CSV file to preview data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">Imported Occupancy Data</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Sold</th>
                  <th className="py-3 pr-4">Capacity</th>
                  <th className="py-3 pr-4">Available</th>
                  <th className="py-3 pr-4">Occ %</th>
                  <th className="py-3 pr-4">Room Revenue</th>
                  <th className="py-3 pr-4">Total Revenue</th>
                  <th className="py-3 pr-4">ADR</th>
                </tr>
              </thead>

              <tbody>
                {occupancyData.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800/70 text-slate-200 transition hover:bg-slate-800/30"
                  >
                    <td className="py-3 pr-4">{row.business_date}</td>
                    <td className="py-3 pr-4">{row.rooms_sold}</td>
                    <td className="py-3 pr-4">{row.capacity}</td>
                    <td className="py-3 pr-4">{row.available_rooms}</td>
                    <td className="py-3 pr-4">{row.occupancy}%</td>
                    <td className="py-3 pr-4">₱{row.room_revenue}</td>
                    <td className="py-3 pr-4">₱{row.total_revenue}</td>
                    <td className="py-3 pr-4">₱{row.adr}</td>
                  </tr>
                ))}

                {occupancyData.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-500"
                    >
                      No occupancy data imported yet.
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