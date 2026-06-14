"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

type ReservationRow = {
  id?: string;
  company_id?: string | null;
  reservation_number?: string | null;
  guest_name?: string | null;
  room?: string | null;
  room_type?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  nights?: number | null;
  booking_source?: string | null;
  status?: string | null;
  accommodation_total?: number | null;
  grand_total?: number | null;
  total_sales?: number | null;
  amount_paid?: number | null;
  balance_due?: number | null;
  unpaid_balance?: number | null;
  payment_method?: string | null;
  import_key?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

const companyIdKey = "opscore_current_company_id";

export default function RoomSalesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const storedCompanyId = localStorage.getItem(companyIdKey) || "";
    setCompanyId(storedCompanyId);
  }, []);

  useEffect(() => {
    if (companyId) loadRoomSales(companyId);
  }, [companyId]);

  async function loadRoomSales(activeCompanyId = companyId) {
    if (!activeCompanyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

const { data, error } = await supabase
  .from("finance_hotel_reservations")
  .select("*")
  .order("check_in", { ascending: false });

    if (error) {
      console.log("ROOM SALES LOAD ERROR:", error);
      alert(error.message || "Failed to load room sales.");
      setRows([]);
    } else {
      setRows((data || []) as ReservationRow[]);
    }

    setLoading(false);
  }

  const isCancelled = (row: ReservationRow) => {
    const status = String(row.status || "").toUpperCase();
    return (
      status.includes("CANCELLED") ||
      status.includes("CANCELED") ||
      status.includes("NO SHOW") ||
      status.includes("NOSHOW")
    );
  };

  const getDate = (row: ReservationRow) =>
    String(row.check_in || row.arrival_date || row.created_at || "").slice(0, 10);

  const getGross = (row: ReservationRow) =>
    Number(
      row.grand_total ||
        row.total_sales ||
        row.accommodation_total ||
        row.total_amount ||
        row.gross_sales ||
        row.reservation_total ||
        row.total ||
        0,
    );

  const getPaid = (row: ReservationRow) =>
    Number(row.amount_paid || row.paid_amount || row.payment_amount || 0);

  const getBalance = (row: ReservationRow) => {
    const saved = Number(row.balance_due || row.unpaid_balance || row.balance || 0);
    const computed = getGross(row) - getPaid(row);
    return Math.max(saved || computed || 0, 0);
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (isCancelled(row)) return false;

      const d = getDate(row);
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;

      return true;
    });
  }, [rows, dateFrom, dateTo]);

  const cancelledRows = rows.filter(isCancelled);

  const grossRevenue = filteredRows.reduce((sum, row) => sum + getGross(row), 0);
  const collectedRevenue = filteredRows.reduce((sum, row) => sum + getPaid(row), 0);
  const unpaidBalance = filteredRows.reduce((sum, row) => sum + getBalance(row), 0);
  const reservationCount = filteredRows.length;
  const adr = reservationCount > 0 ? grossRevenue / reservationCount : 0;

  const todayKey = new Date().toISOString().slice(0, 10);

  const arrivalsToday = filteredRows.filter((row) => getDate(row) === todayKey).length;

  const departuresToday = filteredRows.filter(
    (row) =>
      String(row.check_out || row.departure_date || row.checkout_date || "").slice(0, 10) ===
      todayKey,
  ).length;

  const bookingSources = Object.values(
    filteredRows.reduce((acc: Record<string, any>, row) => {
      const source = row.booking_source || "Direct / Unknown";
      if (!acc[source]) acc[source] = { source, amount: 0, count: 0 };
      acc[source].amount += getGross(row);
      acc[source].count += 1;
      return acc;
    }, {}),
  ).sort((a: any, b: any) => b.amount - a.amount) as any[];

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedIds.includes(String(row.id)));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filteredRows.some((row) => String(row.id) === id)),
      );
      return;
    }

    setSelectedIds((prev) =>
      Array.from(new Set([...prev, ...filteredRows.map((row) => String(row.id))])),
    );
  };

  const toggleSelected = (id: any) => {
    const key = String(id);
    setSelectedIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const normalizeHeader = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

  const splitCSVLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === `"` && insideQuotes && next === `"`) {
        current += `"`;
        i += 1;
        continue;
      }

      if (char === `"`) {
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

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2) return { rows: [], headers: [] as string[] };

    const headers = splitCSVLine(lines[0]).map((h) => normalizeHeader(h));

    const parsed = lines.slice(1).map((line) => {
      const values = splitCSVLine(line);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      return row;
    });

    return { rows: parsed, headers };
  };

  const parseXLSX = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) return { rows: [], headers: [] as string[] };

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: "",
      raw: false,
    });

    if (rawRows.length === 0) return { rows: [], headers: [] as string[] };

    const originalHeaders = Object.keys(rawRows[0] || {});
    const headers = originalHeaders.map((header) => normalizeHeader(header));

    const parsedRows = rawRows.map((rawRow) => {
      const row: Record<string, string> = {};

      originalHeaders.forEach((header) => {
        row[normalizeHeader(header)] = String(rawRow[header] ?? "").trim();
      });

      return row;
    });

    return { rows: parsedRows, headers };
  };

  const parseImportFile = async (file: File) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      return parseXLSX(file);
    }

    const text = await file.text();
    return parseCSV(text);
  };

  const getCSVValue = (row: Record<string, string>, keys: string[]) => {
    const rowKeys = Object.keys(row);

    for (const key of keys) {
      const wanted = normalizeHeader(key);

      if (row[wanted] !== undefined && String(row[wanted]).trim() !== "") {
        return row[wanted];
      }

      const looseMatch = rowKeys.find((rowKey) => {
        const a = rowKey.replace(/_/g, "");
        const b = wanted.replace(/_/g, "");
        return a === b || a.includes(b) || b.includes(a);
      });

      if (looseMatch && String(row[looseMatch]).trim() !== "") {
        return row[looseMatch];
      }
    }

    return "";
  };

  const cleanMoney = (value: any) => {
    const raw = String(value || "0").trim();
    const negative = raw.startsWith("(") && raw.endsWith(")");
    const cleaned = raw.replace(/[₱,$,\s()]/g, "");
    const number = Number(cleaned) || 0;
    return negative ? -number : number;
  };

  const normalizeDate = (value: any) => {
    if (!value) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    const parts = raw.split(/[/-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (c.length === 4) {
        return `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
      }
    }

    return null;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!companyId) {
      alert("No active company session. Please login again.");
      event.target.value = "";
      return;
    }

    setImporting(true);

    try {
      const parsed = await parseImportFile(file);
      const parsedRows = parsed.rows;

      const payload: any[] = parsedRows
        .map((row) => {
          const checkIn = normalizeDate(
            getCSVValue(row, [
              "check_in",
              "check in",
              "arrival_date",
              "arrival",
              "arrival date",
              "date",
              "stay date",
            ]),
          );

          const checkOut = normalizeDate(
            getCSVValue(row, [
              "check_out",
              "check out",
              "departure_date",
              "departure",
              "departure date",
            ]),
          );

          const reservationNumber = getCSVValue(row, [
            "reservation_number",
            "reservation no",
            "reservation",
            "confirmation number",
            "confirmation_no",
            "confirmation",
            "booking number",
            "booking id",
            "reference",
            "reference_no",
            "id",
          ]);

          const guestName = getCSVValue(row, [
            "guest_name",
            "guest name",
            "guest",
            "customer",
            "name",
            "primary guest",
            "guest full name",
          ]);

          const room = getCSVValue(row, [
            "room",
            "room_number",
            "room no",
            "room name",
            "unit",
          ]);

          const roomType = getCSVValue(row, [
            "room_type",
            "room type",
            "accommodation",
            "accommodation type",
            "category",
          ]);

          const bookingSource = getCSVValue(row, [
            "booking_source",
            "booking source",
            "source",
            "channel",
            "booking channel",
            "origin",
          ]);

          const status = getCSVValue(row, ["status", "reservation status"]) || "ACTIVE";

          const accommodationTotal = cleanMoney(
            getCSVValue(row, [
              "accommodation_total",
              "accommodation total",
              "room revenue",
              "room revenue sum",
              "total room revenue sum",
              "accommodation revenue",
              "room charges",
            ]),
          );

          const grandTotal = cleanMoney(
            getCSVValue(row, [
              "grand_total",
              "grand total",
              "total_sales",
              "total sales",
              "total_amount",
              "total amount",
              "gross",
              "amount",
              "total",
              "revenue",
            ]),
          );

          const amountPaid = cleanMoney(
            getCSVValue(row, [
              "amount_paid",
              "amount paid",
              "paid_amount",
              "paid amount",
              "paid",
              "payment_amount",
              "payment amount",
              "collected",
              "collections",
            ]),
          );

          const balanceDue =
            cleanMoney(
              getCSVValue(row, [
                "balance_due",
                "balance due",
                "unpaid_balance",
                "unpaid balance",
                "balance",
                "remaining balance",
              ]),
            ) || Math.max((grandTotal || accommodationTotal) - amountPaid, 0);

          const paymentMethod = getCSVValue(row, [
            "payment_method",
            "payment method",
            "payment",
            "method",
          ]);

          const nights = Number(getCSVValue(row, ["nights", "night", "no of nights"])) || null;
          const financialValue = grandTotal || accommodationTotal || amountPaid || balanceDue;

          const hasUsefulRoomSalesData =
            financialValue > 0 ||
            Boolean(guestName && (checkIn || checkOut || room || roomType)) ||
            Boolean(reservationNumber && guestName) ||
            Boolean(reservationNumber && financialValue > 0);

          if (!hasUsefulRoomSalesData) return null;

          const rawImportKey =
            reservationNumber ||
            `${guestName || "guest"}-${checkIn || "nodate"}-${room || "noroom"}`;

          return {
            
            reservation_number: reservationNumber || null,
            guest_name: guestName || null,
            room: room || null,
            room_type: roomType || null,
            check_in: checkIn,
            check_out: checkOut,
            nights,
            booking_source: bookingSource || "Direct / Unknown",
            status,
            accommodation_total: accommodationTotal || grandTotal || 0,
            grand_total: grandTotal || accommodationTotal || 0,
            total_sales: grandTotal || accommodationTotal || 0,
            amount_paid: amountPaid || 0,
            balance_due: balanceDue || 0,
            unpaid_balance: balanceDue || 0,
            payment_method: paymentMethod || null,
            import_key: `${companyId}-${rawImportKey}`,
          };
        })
        .filter((row): row is any => Boolean(row));

      if (payload.length === 0) {
        alert(`No valid room sales rows found. Detected headers: ${parsed.headers.join(", ")}`);
        return;
      }

      const { error } = await supabase
        .from("finance_hotel_reservations")
        .upsert(payload, { onConflict: "import_key" });

      if (error) {
        console.log("ROOM SALES IMPORT ERROR:", error);
        alert(error.message);
        return;
      }

      alert(`Imported ${payload.length} valid room sales row(s).`);
      await loadRoomSales();
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("No selected rows.");
      return;
    }

    if (!confirm(`Delete ${selectedIds.length} selected room sales row(s)?`)) return;

    setDeleting(true);

   const { error } = await supabase
  .from("finance_hotel_reservations")
  .delete()
  .in("id", selectedIds);

    if (error) {
      alert(error.message);
    } else {
      setSelectedIds([]);
      await loadRoomSales();
    }

    setDeleting(false);
  };

  const deleteAllFiltered = async () => {
    const ids = filteredRows.map((row) => String(row.id)).filter(Boolean);

    if (ids.length === 0) {
      alert("No filtered rows to delete.");
      return;
    }

    if (!confirm(`Delete all ${ids.length} filtered room sales row(s)?`)) return;

    setDeleting(true);

   const { error } = await supabase
  .from("finance_hotel_reservations")
  .delete()
  .in("id", ids);

    if (error) {
      alert(error.message);
    } else {
      setSelectedIds([]);
      await loadRoomSales();
    }

    setDeleting(false);
  };

  return (
    <PageGuard moduleKey="hotel_room_sales">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="FINANCE / ROOM SALES" />

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImportCSV}
            className="hidden"
          />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Finance
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Room Sales
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Import and monitor room revenue, collections, unpaid balances, arrivals, departures, and booking source performance.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
              <button
  onClick={() => loadRoomSales()}
  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
>
  Refresh
</button>
                <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                  <Upload size={15} />
                  {importing ? "Importing..." : "Import File"}
                </button>
              </div>
            </section>

            <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[220px_220px_1fr]">
                <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
                <DateInput label="Date To" value={dateTo} onChange={setDateTo} />

                <div className="flex flex-wrap items-end gap-3">
                  <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                    Clear Filter
                  </button>
                  <button onClick={deleteSelected} disabled={deleting || selectedIds.length === 0} className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 size={15} />
                    Delete Selected
                  </button>
                  <button onClick={deleteAllFiltered} disabled={deleting || filteredRows.length === 0} className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 size={15} />
                    Delete Filtered
                  </button>
                </div>
              </div>
            </section>

            <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Kpi title="Gross Room Revenue" value={peso(grossRevenue)} />
              <Kpi title="Collected Revenue" value={peso(collectedRevenue)} tone="success" />
              <Kpi title="Unpaid Balance" value={peso(unpaidBalance)} tone="danger" />
              <Kpi title="ADR" value={peso(adr)} />
            </section>

            <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Kpi title="Reservations" value={String(reservationCount)} />
              <Kpi title="Arrivals Today" value={String(arrivalsToday)} />
              <Kpi title="Departures Today" value={String(departuresToday)} />
              <Kpi title="Cancelled / No Show" value={String(cancelledRows.length)} tone="warning" />
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Transactions
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Room Sales Transactions
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Showing {filteredRows.length} active reservation(s). Selected {selectedIds.length}.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1280px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">
                          <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
                        </th>
                        <th className="px-4 py-3">Check In</th>
                        <th className="px-4 py-3">Check Out</th>
                        <th className="px-4 py-3">Guest</th>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Room</th>
                        <th className="px-4 py-3 text-right">Gross</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                      {loading ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-14 text-center text-slate-500">
                            Loading room sales...
                          </td>
                        </tr>
                      ) : filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-14 text-center text-slate-500">
                            No room sales found.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, index) => (
                          <tr key={row.id || index} className="transition-all duration-200 hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selectedIds.includes(String(row.id))} onChange={() => toggleSelected(row.id)} />
                            </td>
                            <td className="px-4 py-3">{formatDate(row.check_in || "")}</td>
                            <td className="px-4 py-3">{formatDate(row.check_out || "")}</td>
                            <td className="px-4 py-3 font-black text-slate-950">{row.guest_name || "-"}</td>
                            <td className="px-4 py-3">{row.reservation_number || row.reference_no || row.id}</td>
                            <td className="px-4 py-3">{row.booking_source || "Direct / Unknown"}</td>
                            <td className="px-4 py-3">{row.room || row.room_type || "-"}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-950">{peso(getGross(row))}</td>
                            <td className="px-4 py-3 text-right">{peso(getPaid(row))}</td>
                            <td className="px-4 py-3 text-right">{peso(getBalance(row))}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status || "ACTIVE"} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Source Report
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Booking Sources
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Revenue breakdown by source.
                </p>

                <div className="mt-5 space-y-3">
                  {bookingSources.length === 0 ? (
                    <p className="text-sm font-semibold text-slate-500">No source data found.</p>
                  ) : (
                    bookingSources.map((item: any) => (
                      <div key={item.source} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950">{item.source}</p>
                            <p className="text-xs font-semibold text-slate-500">
                              {item.count} reservation(s)
                            </p>
                          </div>
                          <p className="font-black text-slate-950">{peso(item.amount)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

function Kpi({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
      ? "text-red-700"
      : "text-slate-950";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className={`mt-3 text-3xl font-black tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();

  const style =
    normalized.includes("CANCEL") || normalized.includes("NO SHOW")
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : normalized.includes("PENDING")
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
      {status}
    </span>
  );
}

function peso(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-PH");
}