"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

type ReservationRow = any;

export default function RoomSalesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadRoomSales();
  }, []);

  async function loadRoomSales() {
    setLoading(true);

    const { data, error } = await supabase
      .from("finance_hotel_reservations")
      .select("*")
      .order("check_in", { ascending: false });

    if (error) {
      console.log("ROOM SALES LOAD ERROR:", error.message);
      setRows([]);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  const isCancelled = (row: any) => {
    const status = String(row.status || "").toUpperCase();
    return (
      status.includes("CANCELLED") ||
      status.includes("CANCELED") ||
      status.includes("NO SHOW") ||
      status.includes("NOSHOW")
    );
  };

  const getDate = (row: any) =>
    String(row.check_in || row.arrival_date || row.created_at || "").slice(0, 10);

  const getGross = (row: any) =>
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

  const getPaid = (row: any) =>
    Number(row.amount_paid || row.paid_amount || row.payment_amount || 0);

  const getBalance = (row: any) => {
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

    if (!firstSheetName) {
      return { rows: [], headers: [] as string[] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: "",
      raw: false,
    });

    if (rawRows.length === 0) {
      return { rows: [], headers: [] as string[] };
    }

    const originalHeaders = Object.keys(rawRows[0] || {});
    const headers = originalHeaders.map((header) => normalizeHeader(header));

    const rows = rawRows.map((rawRow) => {
      const row: Record<string, string> = {};

      originalHeaders.forEach((header) => {
        const normalizedHeader = normalizeHeader(header);
        row[normalizedHeader] = String(rawRow[header] ?? "").trim();
      });

      return row;
    });

    return { rows, headers };
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
        const month = a.padStart(2, "0");
        const day = b.padStart(2, "0");
        return `${c}-${month}-${day}`;
      }
    }

    return null;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
            import_key:
              reservationNumber ||
              `${guestName || "guest"}-${checkIn || "nodate"}-${room || "noroom"}`,
          };
        })
       .filter((row): row is any => Boolean(row));

      if (payload.length === 0) {
        alert(
          `No valid room sales rows found. Detected CSV headers: ${parsed.headers.join(", ")}`,
        );
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
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImportCSV}
            className="hidden"
          />

          <section className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Hotel Sales
            </p>
            <h1 className="mt-2 text-4xl font-black">Room Sales</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Import and monitor hotel room revenue, collections, unpaid balances,
              arrivals, departures, and booking source performance.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:grid-cols-6">
            <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
            <DateInput label="Date To" value={dateTo} onChange={setDateTo} />

            <ActionButton label="Refresh" onClick={loadRoomSales} />
            <ActionButton
              label={importing ? "Importing..." : "Import File"}
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload size={15} />}
              disabled={importing}
            />
            <ActionButton
              label="Delete Selected"
              onClick={deleteSelected}
              icon={<Trash2 size={15} />}
              disabled={deleting || selectedIds.length === 0}
              danger
            />
            <ActionButton
              label="Delete Filtered"
              onClick={deleteAllFiltered}
              icon={<Trash2 size={15} />}
              disabled={deleting || filteredRows.length === 0}
              danger
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Kpi title="Gross Room Revenue" value={peso(grossRevenue)} />
            <Kpi title="Collected Revenue" value={peso(collectedRevenue)} />
            <Kpi title="Unpaid Balance" value={peso(unpaidBalance)} />
            <Kpi title="ADR" value={peso(adr)} />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Kpi title="Reservations" value={String(reservationCount)} />
            <Kpi title="Arrivals Today" value={String(arrivalsToday)} />
            <Kpi title="Departures Today" value={String(departuresToday)} />
            <Kpi title="Cancelled / No Show" value={String(cancelledRows.length)} />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
                <div>
                  <h2 className="text-xl font-black">Room Sales Transactions</h2>
                  <p className="text-sm text-slate-400">
                    Showing {filteredRows.length} active reservation(s). Selected{" "}
                    {selectedIds.length}.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Clear Filter
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1280px] text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                        />
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

                  <tbody className="divide-y divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                          Loading room sales...
                        </td>
                      </tr>
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                          No room sales found.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, index) => (
                        <tr key={row.id || index} className="hover:bg-slate-800/60">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(String(row.id))}
                              onChange={() => toggleSelected(row.id)}
                            />
                          </td>
                          <td className="px-4 py-3">{formatDate(row.check_in)}</td>
                          <td className="px-4 py-3">{formatDate(row.check_out)}</td>
                          <td className="px-4 py-3">{row.guest_name || "-"}</td>
                          <td className="px-4 py-3">
                            {row.reservation_number || row.reference_no || row.id}
                          </td>
                          <td className="px-4 py-3">
                            {row.booking_source || "Direct / Unknown"}
                          </td>
                          <td className="px-4 py-3">
                            {row.room || row.room_type || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">{peso(getGross(row))}</td>
                          <td className="px-4 py-3 text-right">{peso(getPaid(row))}</td>
                          <td className="px-4 py-3 text-right">{peso(getBalance(row))}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold">
                              {row.status || "ACTIVE"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-black">Booking Sources</h2>
              <p className="mt-1 text-sm text-slate-400">
                Revenue breakdown by source.
              </p>

              <div className="mt-5 space-y-3">
                {bookingSources.length === 0 ? (
                  <p className="text-sm text-slate-400">No source data found.</p>
                ) : (
                  bookingSources.map((item: any) => (
                    <div
                      key={item.source}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black">{item.source}</p>
                          <p className="text-xs text-slate-400">
                            {item.count} reservation(s)
                          </p>
                        </div>
                        <p className="font-black text-amber-300">
                          {peso(item.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
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
      <label className="text-xs font-bold uppercase text-slate-400">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
      />
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
  disabled,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-end">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${
          danger
            ? "border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
            : "bg-amber-400 text-slate-950 hover:bg-amber-300"
        }`}
      >
        {icon}
        {label}
      </button>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </div>
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