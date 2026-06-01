"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import * as XLSX from "xlsx";

type ReservationRow = {
  id?: number;
  reservation_number: string;
  guest_name: string;
  room: string;
  room_type: string;
  check_in: string | null;
  check_out: string | null;
  nights: number;
  booking_source: string;
  status: string;
  accommodation_total: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  import_key: string;
};

export default function RoomSalesPage() {
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ReservationRow[]>([]);
  const [period, setPeriod] = useState<"today" | "month" | "year" | "all">(
  "all"
);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const getReservations = async () => {
  const { data, error } = await supabase
    .from("finance_hotel_reservations")
    .select("*")
    .order("check_in", { ascending: false });

  console.log("HOTEL RESERVATIONS DATA:", data);
  console.log("HOTEL RESERVATIONS ERROR:", error);

  if (error) {
    console.log("GET RESERVATIONS ERROR:", error);
    return;
  }

  setReservations(data || []);
};

  useEffect(() => {
    getReservations();
  }, []);

  const formatMoney = (value: number) =>
    value.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
    });

  const cleanMoney = (value: any) => {
    return (
      Number(String(value || "").replace("₱", "").replace(/,/g, "").trim()) || 0
    );
  };

  const cleanDate = (value: any) => {
    if (!value) return null;

    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return null;

      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
        date.d
      ).padStart(2, "0")}`;
    }

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;

    return parsed.toISOString().split("T")[0];
  };

  const getValue = (row: any, keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
        return row[key];
      }
    }

    return "";
  };

  const getRoomTypeName = (roomType: string) => {
    const value = String(roomType || "").toLowerCase();

    if (value.includes("standard")) return "Standard Room";
    if (value.includes("deluxe")) return "Deluxe Room";
    if (value.includes("premium")) return "Premium Room";
    if (value.includes("family")) return "Family Room";
    if (value.includes("penthouse")) return "Penthouse";

    return roomType || "Needs Review";
  };

  const filteredRows = useMemo(() => {
    const now = new Date();

    return reservations.filter((row) => {
      if (period === "all") return true;
      if (!row.check_in) return false;

      const date = new Date(row.check_in);
      if (isNaN(date.getTime())) return false;

      if (period === "today") {
        return date.toDateString() === now.toDateString();
      }

      if (period === "month") {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      }

      if (period === "year") {
        return date.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [reservations, period]);

  const totalRevenue = filteredRows.reduce(
    (sum, row) => sum + Number(row.grand_total || 0),
    0
  );

  const totalPaid = filteredRows.reduce(
    (sum, row) => sum + Number(row.amount_paid || 0),
    0
  );

  const totalBalance = filteredRows.reduce(
    (sum, row) => sum + Number(row.balance_due || 0),
    0
  );

  const totalReservations = filteredRows.length;

  const unpaidRows = filteredRows
    .filter((row) => Number(row.balance_due || 0) > 0)
    .sort((a, b) => Number(b.balance_due || 0) - Number(a.balance_due || 0));

  const revenueByRoomType = filteredRows.reduce((acc: any, row) => {
    const key = getRoomTypeName(row.room_type);
    acc[key] = (acc[key] || 0) + Number(row.grand_total || 0);
    return acc;
  }, {});

  const revenueBySource = filteredRows.reduce((acc: any, row) => {
    const key = row.booking_source || "Needs Review";
    acc[key] = (acc[key] || 0) + Number(row.grand_total || 0);
    return acc;
  }, {});

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    const cleanedRows: ReservationRow[] = rawRows
      .map((row: any) => {
        const reservationNumber = String(
          getValue(row, ["Reservation Number", "Reservation #", "RES #"])
        ).trim();

        const guestName = String(getValue(row, ["Name", "Guest Name"])).trim();

        const room = String(
          getValue(row, ["Room Number", "Room", "ROOM"])
        ).trim();

        const roomType = getRoomTypeName(
          String(getValue(row, ["Room Type", "RoomType"])).trim()
        );

        const checkIn = cleanDate(
          getValue(row, ["Check in Date", "Check In", "Check-In"])
        );

        const checkOut = cleanDate(
          getValue(row, ["Check out Date", "Check Out", "Check-Out"])
        );

        const nights =
          Number(getValue(row, ["Nights", "Night", "Total Nights"])) || 0;

        const bookingSource = String(
          getValue(row, ["Source", "Booking Source"])
        ).trim();

        const status = String(getValue(row, ["Status"])).trim();

        const accommodationTotal = cleanMoney(
          getValue(row, ["Accommodation Total"])
        );

        const grandTotal = cleanMoney(getValue(row, ["Grand Total"]));

        const amountPaid = cleanMoney(getValue(row, ["Amount Paid"]));

        const balanceDue = cleanMoney(getValue(row, ["Balance Due"]));

        return {
          reservation_number: reservationNumber,
          guest_name: guestName,
          room,
          room_type: roomType,
          check_in: checkIn,
          check_out: checkOut,
          nights,
          booking_source: bookingSource || "Needs Review",
          status: status || "Needs Review",
          accommodation_total: accommodationTotal,
          grand_total: grandTotal,
          amount_paid: amountPaid,
          balance_due: balanceDue,
          import_key: reservationNumber,
        };
      })
      .filter((row) => row.reservation_number && row.grand_total > 0);

    setPreviewRows(cleanedRows);
  };

  const importToDatabase = async () => {
    if (previewRows.length === 0) {
      alert("No rows to import.");
      return;
    }

    setImporting(true);

    const { error } = await supabase
      .from("finance_hotel_reservations")
      .upsert(previewRows, {
        onConflict: "import_key",
      });

    setImporting(false);

    if (error) {
      console.log("RESERVATION IMPORT ERROR:", error);
      alert("Import failed. Check console.");
      return;
    }

    alert("Hotel sales imported successfully.");

    setPreviewRows([]);
    setFileName("");
    getReservations();
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-yellow-400">
              Finance / Hotel Sales
            </p>

            <h1 className="mt-1 text-3xl font-bold">Hotel Sales Dashboard</h1>

            <p className="mt-2 text-sm text-slate-400">
              Monitor room sales, amount paid, unpaid balances, and reservations
              from Cloudbeds export.
            </p>
          </div>

          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            {[
              ["today", "Today"],
              ["month", "This Month"],
              ["year", "This Year"],
              ["all", "All Time"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key as any)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  period === key
                    ? "bg-yellow-400 text-slate-950"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Sales" value={formatMoney(totalRevenue)} />
          <SummaryCard title="Amount Paid" value={formatMoney(totalPaid)} />
          <SummaryCard
            title="Unpaid Balance"
            value={formatMoney(totalBalance)}
            danger={totalBalance > 0}
          />
          <SummaryCard
            title="Reservations"
            value={String(totalReservations)}
          />
        </section>

        {totalBalance > 0 && (
          <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h2 className="text-xl font-bold text-red-300">
              Unpaid Rooms Alert
            </h2>

            <p className="mt-2 text-sm text-red-200">
              There are {unpaidRows.length} reservations with outstanding
              balance. These should be checked in Cloudbeds.
            </p>
          </section>
        )}

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <BreakdownCard
            title="Sales by Room Type"
            data={revenueByRoomType}
            formatMoney={formatMoney}
          />

          <BreakdownCard
            title="Sales by Booking Source"
            data={revenueBySource}
            formatMoney={formatMoney}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Rooms with Unpaid Balance</h2>

          <p className="mt-1 text-sm text-slate-400">
            Manager view for rooms/reservations that still have balance due.
          </p>

          <div className="mt-5 max-h-[420px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Reservation</th>
                  <th className="px-4 py-3">Check In</th>
                  <th className="px-4 py-3">Check Out</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>

              <tbody>
                {unpaidRows.map((row) => (
                  <tr
                    key={row.import_key}
                    className="border-b border-slate-800/70 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {row.room || "-"}
                    </td>
                    <td className="px-4 py-3">{row.guest_name || "-"}</td>
                    <td className="px-4 py-3">
                      {row.reservation_number || "-"}
                    </td>
                    <td className="px-4 py-3">{row.check_in || "-"}</td>
                    <td className="px-4 py-3">{row.check_out || "-"}</td>
                    <td className="px-4 py-3">{row.status || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(Number(row.grand_total || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {formatMoney(Number(row.amount_paid || 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">
                      {formatMoney(Number(row.balance_due || 0))}
                    </td>
                  </tr>
                ))}

                {unpaidRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No unpaid rooms found for selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">All Hotel Sales Records</h2>

          <div className="mt-5 max-h-[480px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1300px] border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-4 py-3">Check In</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Room Type</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.slice(0, 100).map((row) => (
                  <tr
                    key={row.import_key}
                    className="border-b border-slate-800/70 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">{row.check_in || "-"}</td>
                    <td className="px-4 py-3">{row.room || "-"}</td>
                    <td className="px-4 py-3">{row.room_type || "-"}</td>
                    <td className="px-4 py-3">{row.guest_name || "-"}</td>
                    <td className="px-4 py-3">
                      {row.booking_source || "-"}
                    </td>
                    <td className="px-4 py-3">{row.status || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatMoney(Number(row.grand_total || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {formatMoney(Number(row.amount_paid || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      {formatMoney(Number(row.balance_due || 0))}
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No records found for selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

       <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
  <h2 className="text-xl font-bold">Import Cloudbeds Reservations</h2>

  <p className="mt-2 text-sm text-slate-400">
    Upload reservations export. OpsCore will ignore unnecessary personal
    columns and save only sales/reporting fields.
  </p>

  <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
    <input
      type="file"
      accept=".xlsx,.xls,.csv"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
      }}
      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300"
    />

    <button
      onClick={importToDatabase}
      disabled={importing || previewRows.length === 0}
      className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {importing ? "Importing..." : "Import"}
    </button>

    {previewRows.length > 0 && (
      <button
        onClick={() => {
          setPreviewRows([]);
          setFileName("");
        }}
        disabled={importing}
        className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel Import
      </button>
    )}
  </div>

  {fileName && (
    <p className="mt-3 text-sm text-slate-400">
      Selected file: <span className="text-white">{fileName}</span>
    </p>
  )}

  {previewRows.length > 0 && (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold">Import Preview</h3>
          <p className="text-sm text-slate-400">
            {previewRows.length} reservation rows ready for import.
          </p>
        </div>
      </div>

      <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="px-4 py-3">Check In</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Room Type</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Sales</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>

          <tbody>
            {previewRows.slice(0, 100).map((row, index) => (
              <tr
                key={`${row.import_key}-${index}`}
                className="border-b border-slate-800/70 hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">{row.check_in || "-"}</td>
                <td className="px-4 py-3">{row.room || "-"}</td>
                <td className="px-4 py-3">{row.room_type || "-"}</td>
                <td className="px-4 py-3">{row.guest_name || "-"}</td>
                <td className="px-4 py-3">{row.booking_source || "-"}</td>
                <td className="px-4 py-3">{row.status || "-"}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatMoney(Number(row.grand_total || 0))}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {formatMoney(Number(row.amount_paid || 0))}
                </td>
                <td className="px-4 py-3 text-right text-red-400">
                  {formatMoney(Number(row.balance_due || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewRows.length > 100 && (
        <p className="mt-3 text-sm text-slate-500">
          Showing first 100 rows only. All {previewRows.length} rows will be
          imported.
        </p>
      )}
    </div>
  )}

  {previewRows.length === 0 && fileName && (
    <p className="mt-4 text-sm text-red-400">
      No valid rows detected. Check if the Cloudbeds export headers match the
      importer fields.
    </p>
  )}
</section>
      </main>
    </div>
  );

  
}



function SummaryCard({ title, value, danger }: any) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/30 bg-red-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className="text-sm text-slate-400">{title}</p>
      <h2
        className={`mt-2 text-2xl font-bold ${
          danger ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}

function BreakdownCard({ title, data, formatMoney }: any) {
  const entries = Object.entries(data).sort(
    (a: any, b: any) => Number(b[1]) - Number(a[1])
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="mt-5 space-y-3">
        {entries.map(([name, amount]: any) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
          >
            <span className="font-medium">{name}</span>
            <span className="font-bold text-emerald-400">
              {formatMoney(Number(amount || 0))}
            </span>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">
            No data yet.
          </div>
        )}
      </div>
    </div>
  );
}