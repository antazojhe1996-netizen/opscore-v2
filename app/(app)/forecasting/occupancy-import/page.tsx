"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
type OccupancyRow = {
  id?: string;
  business_date: string;
  rooms_sold: number;
  capacity: number;
  blocked_rooms: number;
  out_of_service_rooms: number;
  available_rooms: number;
  adjusted_occupancy: number;
  occupancy: number;
  room_revenue: number;
  other_revenue: number;
  total_revenue: number;
  adr: number;
  revpar: number;
  taxes: number;
  fees: number;
  source: string;
  uploaded_at: string;
};

type CurrentUser = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

type AuditSeverity = "info" | "warning" | "critical";

const MODULE_NAME = "Occupancy Import";

export default function OccupancyImportPage() {
  /// STATES
  const [occupancyData, setOccupancyData] = useState<OccupancyRow[]>([]);
  const [previewData, setPreviewData] = useState<OccupancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  /// CALCULATIONS
  const filteredOccupancyData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return occupancyData;

    return occupancyData.filter((row) =>
      row.business_date?.toLowerCase().includes(term)
    );
  }, [occupancyData, searchTerm]);

  const previewSummary = useMemo(() => {
    const totalRoomsSold = previewData.reduce(
      (sum, row) => sum + Number(row.rooms_sold || 0),
      0
    );

    const totalRevenue = previewData.reduce(
      (sum, row) => sum + Number(row.total_revenue || 0),
      0
    );

    return {
      rows: previewData.length,
      totalRoomsSold,
      totalRevenue,
    };
  }, [previewData]);

  /// FUNCTIONS
  const getCurrentUser = async (): Promise<CurrentUser> => {
    const localUser =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_user")
        : null;

    if (localUser) {
      try {
        const parsedUser = JSON.parse(localUser);

        return {
          id: parsedUser?.id || null,
          name:
            parsedUser?.name ||
            parsedUser?.full_name ||
            parsedUser?.user_name ||
            parsedUser?.email ||
            "Unknown User",
          email: parsedUser?.email || null,
        };
      } catch {
        // Continue to Supabase auth fallback.
      }
    }

    const { data } = await supabase.auth.getUser();

    return {
      id: data?.user?.id || null,
      name:
        data?.user?.user_metadata?.full_name ||
        data?.user?.email ||
        "Unknown User",
      email: data?.user?.email || null,
    };
  };

  const createAuditLog = async ({
    action,
    description,
    severity = "info",
    recordId = null,
    oldValue = null,
    newValue = null,
  }: {
    action: string;
    description: string;
    severity?: AuditSeverity;
    recordId?: string | null;
    oldValue?: any;
    newValue?: any;
  }) => {
    const currentUser = await getCurrentUser();

    const { error } = await supabase.from("audit_logs").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      module: MODULE_NAME,
      action,
      description,
      severity,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
    });

    if (error) {
      console.log("AUDIT LOG ERROR:", error.message);
    }
  };

  const cleanNumber = (value: any) => {
    if (!value) return 0;

    return Number(
      String(value)
        .replace("Ã¢â€šÂ±", "")
        .replace("%", "")
        .replace(/,/g, "")
        .trim()
    );
  };

  const parseCSVLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"' && nextChar === '"') {
        current += '"';
        index++;
        continue;
      }

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    result.push(current.trim());
    return result;
  };

  const getOccupancyData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: false });

    if (error) {
      console.log("GET OCCUPANCY DATA ERROR:", error.message);
      setLoading(false);
      return;
    }

    setOccupancyData((data || []) as OccupancyRow[]);
    setLoading(false);
  };

  const handleCSVUpload = (event: any) => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const text = e.target.result;

      const rows = String(text)
        .split(/\r?\n/)
        .filter((row: string) => row.trim() !== "");

      if (rows.length <= 1) {
        alert("CSV file has no data rows.");
        return;
      }

      const headers = parseCSVLine(rows[0]).map((header) => header.trim());

      const parsedData = rows
        .slice(1)
        .map((row: string) => {
          const values = parseCSVLine(row);
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
        })
        .filter((row: OccupancyRow) => row.business_date);

      setPreviewData(parsedData);
    };

    reader.readAsText(file);
  };

  const importData = async () => {
    if (previewData.length === 0) {
      alert("Please upload a Cloudbeds CSV first.");
      return;
    }

    setImporting(true);

    const cleanData = previewData.filter((row) => row.business_date);
    const importDates = cleanData.map((row) => row.business_date);

    const { data: existingRows, error: existingError } = await supabase
      .from("occupancy_data")
      .select("*")
      .in("business_date", importDates);

    if (existingError) {
      console.log("CHECK EXISTING OCCUPANCY ERROR:", existingError.message);
      alert("Failed to check existing occupancy data.");
      setImporting(false);
      return;
    }

    const existingDateSet = new Set(
      (existingRows || []).map((row: any) => row.business_date)
    );

    const createRows = cleanData.filter(
      (row) => !existingDateSet.has(row.business_date)
    );

    const updateRows = cleanData.filter((row) =>
      existingDateSet.has(row.business_date)
    );

    const { data, error } = await supabase
      .from("occupancy_data")
      .upsert(cleanData, {
        onConflict: "business_date",
      })
      .select();

    if (error) {
      console.log("IMPORT OCCUPANCY ERROR:", error.message);
      alert("Failed to import occupancy data.");
      setImporting(false);
      return;
    }

    await createAuditLog({
      action: "IMPORT_OCCUPANCY_DATA",
      description: `Imported Cloudbeds occupancy CSV. Created: ${createRows.length}, Updated: ${updateRows.length}, Total rows: ${cleanData.length}`,
      severity: updateRows.length > 0 ? "warning" : "info",
      recordId: null,
      oldValue: {
        existing_rows: existingRows || [],
        create_count: createRows.length,
        update_count: updateRows.length,
      },
      newValue: {
        imported_rows: data || cleanData,
        total_rows: cleanData.length,
      },
    });

    if (createRows.length > 0) {
      await createAuditLog({
        action: "CREATE_OCCUPANCY_IMPORT",
        description: `Created ${createRows.length} new occupancy date record(s).`,
        severity: "info",
        recordId: null,
        oldValue: null,
        newValue: createRows,
      });
    }

    if (updateRows.length > 0) {
      await createAuditLog({
        action: "UPDATE_OCCUPANCY_IMPORT",
        description: `Updated ${updateRows.length} existing occupancy date record(s).`,
        severity: "warning",
        recordId: null,
        oldValue: existingRows || [],
        newValue: updateRows,
      });
    }

    alert("Occupancy data imported successfully.");
    setPreviewData([]);
    await getOccupancyData();
    setImporting(false);
  };

  const deleteOccupancyRow = async (row: OccupancyRow) => {
    if (!row.id) return;

    const confirmed = confirm(
      `Delete occupancy data for ${row.business_date}? This action will be audited.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("occupancy_data")
      .delete()
      .eq("id", row.id);

    if (error) {
      console.log("DELETE OCCUPANCY DATA ERROR:", error.message);
      alert("Failed to delete occupancy data.");
      return;
    }

    await createAuditLog({
      action: "DELETE_OCCUPANCY_IMPORT",
      description: `Deleted occupancy data for ${row.business_date}.`,
      severity: "critical",
      recordId: row.id,
      oldValue: row,
      newValue: null,
    });

    await getOccupancyData();
  };

  useEffect(() => {
    getOccupancyData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
<main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Settings
          </p>

          <h1 className="mt-2 text-4xl font-black">Occupancy Import</h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-400">
            Upload Cloudbeds occupancy statistics for forecasting, scheduling,
            and finance. Import, update, and delete actions are recorded in the
            audit trail.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-bold">Upload Cloudbeds CSV</h2>

            <p className="mt-2 text-sm text-slate-400">
              Export Occupancy Statistics from Cloudbeds, then upload the CSV
              here.
            </p>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">
                Expected Cloudbeds columns:
              </p>
              <div className="mt-2 space-y-1">
                <p>Stay Date</p>
                <p>Rooms Sold - sum</p>
                <p>Capacity - sum</p>
                <p>Available Rooms - sum</p>
                <p>Occupancy - aggregated</p>
                <p>Total Room Revenue - sum</p>
                <p>Total Revenue - sum</p>
                <p>ADR - aggregated</p>
              </div>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"
            />

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-500">Rows</p>
                <p className="mt-1 text-xl font-black">{previewSummary.rows}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-500">Sold</p>
                <p className="mt-1 text-xl font-black">
                  {previewSummary.totalRoomsSold}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-500">Revenue</p>
                <p className="mt-1 text-xl font-black">
                  Ã¢â€šÂ±{previewSummary.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={importData}
              disabled={importing}
              className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import / Update Data"}
            </button>

            {previewData.length > 0 && (
              <button
                onClick={() => setPreviewData([])}
                disabled={importing}
                className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Preview
              </button>
            )}

            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              Audit actions covered: IMPORT_OCCUPANCY_DATA,
              CREATE_OCCUPANCY_IMPORT, UPDATE_OCCUPANCY_IMPORT,
              DELETE_OCCUPANCY_IMPORT.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-4 text-lg font-bold">CSV Preview</h2>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Sold</th>
                      <th className="px-4 py-3">Capacity</th>
                      <th className="px-4 py-3">Available</th>
                      <th className="px-4 py-3">Occ %</th>
                      <th className="px-4 py-3">Room Revenue</th>
                      <th className="px-4 py-3">Total Revenue</th>
                      <th className="px-4 py-3">ADR</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {previewData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          Upload a Cloudbeds CSV file to preview data.
                        </td>
                      </tr>
                    ) : (
                      previewData.map((row, index) => (
                        <tr key={index} className="text-slate-200">
                          <td className="whitespace-nowrap px-4 py-4 font-semibold">
                            {row.business_date}
                          </td>
                          <td className="px-4 py-4">{row.rooms_sold}</td>
                          <td className="px-4 py-4">{row.capacity}</td>
                          <td className="px-4 py-4">{row.available_rooms}</td>
                          <td className="px-4 py-4">{row.occupancy}%</td>
                          <td className="px-4 py-4">
                            Ã¢â€šÂ±{row.room_revenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-4">
                            Ã¢â€šÂ±{row.total_revenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-4">
                            Ã¢â€šÂ±{row.adr.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Imported Occupancy Data</h2>
              <p className="mt-1 text-sm text-slate-400">
                {filteredOccupancyData.length} record
                {filteredOccupancyData.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search date..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-400 lg:max-w-sm"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Sold</th>
                    <th className="px-4 py-3">Capacity</th>
                    <th className="px-4 py-3">Available</th>
                    <th className="px-4 py-3">Occ %</th>
                    <th className="px-4 py-3">Room Revenue</th>
                    <th className="px-4 py-3">Total Revenue</th>
                    <th className="px-4 py-3">ADR</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Loading occupancy data...
                      </td>
                    </tr>
                  ) : filteredOccupancyData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No occupancy data imported yet.
                      </td>
                    </tr>
                  ) : (
                    filteredOccupancyData.map((row) => (
                      <tr
                        key={row.id || row.business_date}
                        className="text-slate-200 transition hover:bg-slate-800/30"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-semibold">
                          {row.business_date}
                        </td>
                        <td className="px-4 py-4">{row.rooms_sold}</td>
                        <td className="px-4 py-4">{row.capacity}</td>
                        <td className="px-4 py-4">{row.available_rooms}</td>
                        <td className="px-4 py-4">{row.occupancy}%</td>
                        <td className="px-4 py-4">
                          Ã¢â€šÂ±{Number(row.room_revenue || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          Ã¢â€šÂ±{Number(row.total_revenue || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          Ã¢â€šÂ±{Number(row.adr || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => deleteOccupancyRow(row)}
                            className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}






