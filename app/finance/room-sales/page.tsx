"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/lib/supabase";

type Mode = "OTA" | "DIRECT";
type Channel = "BOOKING_COM" | "AIRBNB";

type OtaLine = {
  id?: string;
  company_id?: string | null;
  channel?: string | null;
  line_type?: string | null;
  statement_date?: string | null;
  payout_date?: string | null;
  payout_id?: string | null;
  reference_code?: string | null;
  confirmation_code?: string | null;
  booking_number?: string | null;
  guest_name?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  nights?: number | null;
  currency?: string | null;
  gross_amount?: number | null;
  commission_amount?: number | null;
  service_fee?: number | null;
  vat_amount?: number | null;
  cleaning_fee?: number | null;
  tax_amount?: number | null;
  net_payout?: number | null;
  paid_out?: number | null;
  details?: string | null;
  import_key?: string | null;
  created_at?: string | null;
};

type DirectLine = {
  id?: string;
  company_id?: string | null;
  sales_date?: string | null;
  reference_no?: string | null;
  guest_name?: string | null;
  room?: string | null;
  room_type?: string | null;
  payment_method?: string | null;
  source?: string | null;
  gross_amount?: number | null;
  collected_amount?: number | null;
  remarks?: string | null;
  import_key?: string | null;
  created_at?: string | null;
};

const companyIdKey = "opscore_current_company_id";

export default function OtaAndDirectSalesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [mode, setMode] = useState<Mode>("OTA");
  const [channel, setChannel] = useState<Channel>("BOOKING_COM");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [otaRows, setOtaRows] = useState<OtaLine[]>([]);
  const [directRows, setDirectRows] = useState<DirectLine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const storedCompanyId = localStorage.getItem(companyIdKey) || "";
    setCompanyId(storedCompanyId);
  }, []);

  useEffect(() => {
    if (companyId) loadData(companyId);
  }, [companyId]);

  useEffect(() => {
    setSelectedIds([]);
  }, [mode]);

  async function loadData(activeCompanyId = companyId) {
    if (!activeCompanyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [otaResult, directResult] = await Promise.all([
      supabase
        .from("ota_statement_lines")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("statement_date", { ascending: false }),
      supabase
        .from("direct_sales_import_lines")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("sales_date", { ascending: false }),
    ]);

    if (otaResult.error) {
      console.log("OTA SALES LOAD ERROR:", otaResult.error);
      alert(otaResult.error.message || "Failed to load OTA sales.");
      setOtaRows([]);
    } else {
      setOtaRows((otaResult.data || []) as OtaLine[]);
    }

    if (directResult.error) {
      console.log("DIRECT SALES LOAD ERROR:", directResult.error);
      alert(directResult.error.message || "Failed to load direct sales.");
      setDirectRows([]);
    } else {
      setDirectRows((directResult.data || []) as DirectLine[]);
    }

    setLoading(false);
  }

  const filteredOtaRows = useMemo(() => {
    return otaRows.filter((row) => {
      const d = String(row.payout_date || row.statement_date || row.check_out || "").slice(0, 10);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      return true;
    });
  }, [otaRows, dateFrom, dateTo]);

  const filteredDirectRows = useMemo(() => {
    return directRows.filter((row) => {
      const d = String(row.sales_date || row.created_at || "").slice(0, 10);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      return true;
    });
  }, [directRows, dateFrom, dateTo]);

  const reservationOtaRows = filteredOtaRows.filter((row) =>
    String(row.line_type || "").toUpperCase().includes("RESERVATION"),
  );

  const payoutOtaRows = filteredOtaRows.filter((row) =>
    String(row.line_type || "").toUpperCase().includes("PAYOUT"),
  );

  const otaGross = reservationOtaRows.reduce((sum, row) => sum + n(row.gross_amount), 0);
  const otaCommission = reservationOtaRows.reduce((sum, row) => sum + Math.abs(n(row.commission_amount)), 0);
  const otaFees =
    reservationOtaRows.reduce((sum, row) => sum + Math.abs(n(row.service_fee)) + Math.abs(n(row.vat_amount)) + Math.abs(n(row.cleaning_fee)) + Math.abs(n(row.tax_amount)), 0);
  const otaNet =
    filteredOtaRows.reduce((sum, row) => sum + n(row.net_payout), 0) ||
    payoutOtaRows.reduce((sum, row) => sum + n(row.paid_out), 0);

  const directGross = filteredDirectRows.reduce((sum, row) => sum + n(row.gross_amount), 0);
  const directCollected = filteredDirectRows.reduce((sum, row) => sum + n(row.collected_amount), 0);

  const groupedOta = groupBy(filteredOtaRows, (row) => row.channel || "UNKNOWN", (row) => n(row.net_payout) || n(row.paid_out));
  const groupedDirect = groupBy(filteredDirectRows, (row) => row.payment_method || "Unspecified", (row) => n(row.collected_amount) || n(row.gross_amount));

  const activeRows = mode === "OTA" ? filteredOtaRows : filteredDirectRows;
  const allFilteredSelected =
    activeRows.length > 0 && activeRows.every((row: any) => selectedIds.includes(String(row.id)));

  const toggleSelectAllFiltered = () => {
    const ids = activeRows.map((row: any) => String(row.id)).filter(Boolean);

    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const toggleSelected = (id: any) => {
    const key = String(id);
    setSelectedIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("No selected rows.");
      return;
    }

    const table = mode === "OTA" ? "ota_statement_lines" : "direct_sales_import_lines";
    if (!confirm(`Delete ${selectedIds.length} selected ${mode === "OTA" ? "OTA" : "Direct"} sales row(s)?`)) return;

    setDeleting(true);

    const { error } = await supabase.from(table).delete().in("id", selectedIds);

    if (error) {
      alert(error.message);
    } else {
      setSelectedIds([]);
      await loadData();
    }

    setDeleting(false);
  };

  const deleteAllFiltered = async () => {
    const ids = activeRows.map((row: any) => String(row.id)).filter(Boolean);
    if (ids.length === 0) {
      alert("No filtered rows to delete.");
      return;
    }

    const table = mode === "OTA" ? "ota_statement_lines" : "direct_sales_import_lines";
    if (!confirm(`Delete all ${ids.length} filtered ${mode === "OTA" ? "OTA" : "Direct"} sales row(s)?`)) return;

    setDeleting(true);

    const { error } = await supabase.from(table).delete().in("id", ids);

    if (error) {
      alert(error.message);
    } else {
      setSelectedIds([]);
      await loadData();
    }

    setDeleting(false);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      if (mode === "OTA") {
        const payload = parsedRows
          .map((row) => buildOtaPayload(row, channel, companyId))
          .filter((row): row is any => Boolean(row));

        if (payload.length === 0) {
          alert(`No valid OTA rows found. Detected headers: ${parsed.headers.join(", ")}`);
          return;
        }

        const { error } = await supabase
          .from("ota_statement_lines")
          .upsert(payload, { onConflict: "import_key" });

        if (error) {
          console.log("OTA IMPORT ERROR:", error);
          alert(error.message);
          return;
        }

        alert(`Imported ${payload.length} OTA statement row(s).`);
      } else {
        const payload = parsedRows
          .map((row) => buildDirectPayload(row, companyId))
          .filter((row): row is any => Boolean(row));

        if (payload.length === 0) {
          alert(`No valid direct sales rows found. Detected headers: ${parsed.headers.join(", ")}`);
          return;
        }

        const { error } = await supabase
          .from("direct_sales_import_lines")
          .upsert(payload, { onConflict: "import_key" });

        if (error) {
          console.log("DIRECT IMPORT ERROR:", error);
          alert(error.message);
          return;
        }

        alert(`Imported ${payload.length} direct / walk-in sales row(s).`);
      }

      await loadData();
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const downloadDirectTemplate = () => {
    const templateRows = [
      {
        sales_date: "2026-01-01",
        reference_no: "WALKIN-2026-0001",
        guest_name: "Guest Name",
        room: "101",
        room_type: "Standard",
        payment_method: "Cash",
        source: "Walk-in / Direct",
        gross_amount: "2199",
        collected_amount: "2199",
        remarks: "Manual historical import",
      },
    ];

    const sheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Direct Sales Import");
    XLSX.writeFile(workbook, "OPScore_Direct_Walkin_Sales_Import_Template.xlsx");
  };

  return (
    <PageGuard moduleKey="hotel_room_sales">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="FINANCE / SALES IMPORTS" />

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImportFile}
            className="hidden"
          />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Finance
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Sales Imports
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Cash-based source foundation for Executive Dashboard. OTA uses Booking.com / Airbnb statements. Direct walk-in uses Cash Management plus manual historical import.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => loadData()}
                  className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <RefreshCw size={15} />
                  Refresh
                </button>

                <button
                  onClick={downloadDirectTemplate}
                  className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <Download size={15} />
                  Direct Template
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload size={15} />
                  {importing ? "Importing..." : "Import File"}
                </button>
              </div>
            </section>

            <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setMode("OTA")}
                    className={`h-11 rounded-xl px-5 text-sm font-black transition-all duration-200 active:scale-[0.98] ${
                      mode === "OTA"
                        ? "bg-slate-950 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    OTA Sales
                  </button>

                  <button
                    onClick={() => setMode("DIRECT")}
                    className={`h-11 rounded-xl px-5 text-sm font-black transition-all duration-200 active:scale-[0.98] ${
                      mode === "DIRECT"
                        ? "bg-slate-950 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Walk-in / Direct Import
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[220px_220px_220px_1fr]">
                  <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
                  <DateInput label="Date To" value={dateTo} onChange={setDateTo} />

                  {mode === "OTA" ? (
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        OTA Channel
                      </label>
                      <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value as Channel)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="BOOKING_COM">Booking.com</option>
                        <option value="AIRBNB">Airbnb</option>
                      </select>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                        Manual Historical
                      </p>
                      <p className="mt-1 text-xs font-bold text-amber-800">
                        Use for January → latest walk-in only.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-end gap-3">
                    <button
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      Clear Filter
                    </button>
                    <button
                      onClick={deleteSelected}
                      disabled={deleting || selectedIds.length === 0}
                      className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Delete Selected
                    </button>
                    <button
                      onClick={deleteAllFiltered}
                      disabled={deleting || activeRows.length === 0}
                      className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Delete Filtered
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {mode === "OTA" ? (
              <>
                <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Kpi title="OTA Gross" value={peso(otaGross)} />
                  <Kpi title="Commission" value={peso(otaCommission)} tone="warning" />
                  <Kpi title="Fees / VAT" value={peso(otaFees)} tone="warning" />
                  <Kpi title="Net Payout" value={peso(otaNet)} tone="success" />
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <TableShell
                    title="OTA Statement Lines"
                    subtitle={`Showing ${filteredOtaRows.length} imported OTA row(s). Selected ${selectedIds.length}.`}
                  >
                    <OtaTable
                      rows={filteredOtaRows}
                      loading={loading}
                      selectedIds={selectedIds}
                      allFilteredSelected={allFilteredSelected}
                      onToggleAll={toggleSelectAllFiltered}
                      onToggleSelected={toggleSelected}
                    />
                  </TableShell>

                  <SourceAside
                    title="OTA Channels"
                    subtitle="Net payout / paid out by channel."
                    items={groupedOta}
                  />
                </section>
              </>
            ) : (
              <>
                <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Kpi title="Direct Gross" value={peso(directGross)} />
                  <Kpi title="Direct Collected" value={peso(directCollected)} tone="success" />
                  <Kpi title="Imported Rows" value={String(filteredDirectRows.length)} />
                  <Kpi title="Uncollected" value={peso(Math.max(directGross - directCollected, 0))} tone="danger" />
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <TableShell
                    title="Walk-in / Direct Historical Import"
                    subtitle={`Showing ${filteredDirectRows.length} imported direct sales row(s). Selected ${selectedIds.length}.`}
                  >
                    <DirectTable
                      rows={filteredDirectRows}
                      loading={loading}
                      selectedIds={selectedIds}
                      allFilteredSelected={allFilteredSelected}
                      onToggleAll={toggleSelectAllFiltered}
                      onToggleSelected={toggleSelected}
                    />
                  </TableShell>

                  <SourceAside
                    title="Payment Methods"
                    subtitle="Collected amount by payment method."
                    items={groupedDirect}
                  />
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function buildOtaPayload(row: Record<string, string>, channel: Channel, companyId: string) {
  const lineType =
    getCSVValue(row, ["Type", "Transaction Type", "Record Type"]) ||
    (getCSVValue(row, ["Paid out", "Payout", "Net Payout"]) ? "Payout" : "Reservation");

  const statementDate = normalizeDate(getCSVValue(row, ["Date", "Statement Date", "Transaction Date"]));
  const payoutDate = normalizeDate(getCSVValue(row, ["Payout date", "Paid out date", "Arriving by date"]));
  const checkIn = normalizeDate(getCSVValue(row, ["Check-in", "Check In", "Start date", "Arrival"]));
  const checkOut = normalizeDate(getCSVValue(row, ["Checkout", "Check-out", "Check Out", "End date", "Departure"]));

  const confirmationCode = getCSVValue(row, [
    "Confirmation code",
    "Confirmation",
    "Reservation code",
    "Booking number",
    "Booking ID",
  ]);

  const bookingNumber = getCSVValue(row, ["Booking number", "Reservation ID", "Reservation number"]);
  const referenceCode = getCSVValue(row, ["Reference code", "Payout ID", "Payout id", "Batch Reference"]);
  const guestName = getCSVValue(row, ["Guest", "Guest name", "Guest Name", "Name"]);
  const currency = getCSVValue(row, ["Currency"]) || "PHP";

  const amount = cleanMoney(getCSVValue(row, ["Amount", "Gross", "Gross Amount"]));
  const grossEarnings = cleanMoney(getCSVValue(row, ["Gross earnings", "Gross Earnings"]));
  const grossAmount = channel === "AIRBNB" ? grossEarnings || amount : amount || grossEarnings;

  const commission = cleanMoney(getCSVValue(row, ["Commission"]));
  const serviceFee = cleanMoney(getCSVValue(row, ["Payments Service Fee", "Payment Service Fee", "Service fee", "Service Fee"]));
  const vat = cleanMoney(getCSVValue(row, ["VAT for online platform services", "VAT", "VAT Amount"]));
  const cleaningFee = cleanMoney(getCSVValue(row, ["Cleaning fee", "Cleaning Fee"]));
  const tax = cleanMoney(getCSVValue(row, ["Airbnb remitted tax", "Tax", "Tax Amount"]));
  const net = cleanMoney(getCSVValue(row, ["Net", "Net Payout", "Net payout"]));
  const paidOut = cleanMoney(getCSVValue(row, ["Paid out", "Paid Out", "Payout", "Payout Amount"]));

  const netPayout = net || paidOut || amount || 0;
  const details = getCSVValue(row, ["Details", "Description", "Remarks"]);
  const nights = Number(getCSVValue(row, ["Nights", "No. of Nights", "Night"])) || null;

  const hasUsefulData =
    Boolean(confirmationCode || bookingNumber || referenceCode || guestName || details) ||
    grossAmount !== 0 ||
    netPayout !== 0 ||
    paidOut !== 0;

  if (!hasUsefulData) return null;

  const rawKey = [
    channel,
    lineType,
    confirmationCode || bookingNumber || "no-booking",
    referenceCode || "no-ref",
    statementDate || payoutDate || checkOut || "no-date",
    guestName || details || "no-name",
    grossAmount || netPayout || paidOut || 0,
  ].join("|");

  return {
    company_id: companyId,
    channel,
    line_type: lineType,
    statement_date: statementDate,
    payout_date: payoutDate,
    payout_id: channel === "BOOKING_COM" ? referenceCode || null : null,
    reference_code: referenceCode || null,
    confirmation_code: confirmationCode || null,
    booking_number: bookingNumber || confirmationCode || null,
    guest_name: guestName || null,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    currency,
    gross_amount: grossAmount || 0,
    commission_amount: commission || 0,
    service_fee: serviceFee || 0,
    vat_amount: vat || 0,
    cleaning_fee: cleaningFee || 0,
    tax_amount: tax || 0,
    net_payout: netPayout || 0,
    paid_out: paidOut || 0,
    details: details || null,
    import_key: `${companyId}-${hashKey(rawKey)}`,
  };
}

function buildDirectPayload(row: Record<string, string>, companyId: string) {
  const salesDate = normalizeDate(
    getCSVValue(row, ["sales_date", "Sales Date", "Date", "Transaction Date", "Payment Date"]),
  );

  const referenceNo = getCSVValue(row, ["reference_no", "Reference No", "Reference", "Receipt No", "OR No"]);
  const guestName = getCSVValue(row, ["guest_name", "Guest Name", "Guest", "Name", "Customer"]);
  const room = getCSVValue(row, ["Room", "Room No", "Room Number"]);
  const roomType = getCSVValue(row, ["Room Type", "Room Category", "Accommodation"]);
  const paymentMethod = getCSVValue(row, ["Payment Method", "Payment", "Method"]) || "Cash";
  const source = getCSVValue(row, ["Source", "Channel", "Booking Source"]) || "Walk-in / Direct";
  const grossAmount = cleanMoney(getCSVValue(row, ["gross_amount", "Gross Amount", "Gross", "Room Sales", "Amount", "Total"]));
  const collectedAmount =
    cleanMoney(getCSVValue(row, ["collected_amount", "Collected Amount", "Collected", "Paid", "Amount Paid", "Payment Amount"])) ||
    grossAmount;
  const remarks = getCSVValue(row, ["Remarks", "Notes", "Description"]);

  const hasUsefulData =
    Boolean(salesDate || referenceNo || guestName || room || roomType) || grossAmount !== 0 || collectedAmount !== 0;

  if (!hasUsefulData) return null;

  const rawKey = [
    referenceNo || "no-ref",
    salesDate || "no-date",
    guestName || "no-guest",
    room || roomType || "no-room",
    paymentMethod,
    grossAmount || collectedAmount || 0,
  ].join("|");

  return {
    company_id: companyId,
    sales_date: salesDate,
    reference_no: referenceNo || null,
    guest_name: guestName || null,
    room: room || null,
    room_type: roomType || null,
    payment_method: paymentMethod,
    source,
    gross_amount: grossAmount || collectedAmount || 0,
    collected_amount: collectedAmount || grossAmount || 0,
    remarks: remarks || null,
    import_key: `${companyId}-${hashKey(rawKey)}`,
  };
}

function OtaTable({
  rows,
  loading,
  selectedIds,
  allFilteredSelected,
  onToggleAll,
  onToggleSelected,
}: {
  rows: OtaLine[];
  loading: boolean;
  selectedIds: string[];
  allFilteredSelected: boolean;
  onToggleAll: () => void;
  onToggleSelected: (id: any) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1420px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-4 py-3">
              <input type="checkbox" checked={allFilteredSelected} onChange={onToggleAll} />
            </th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Guest / Details</th>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Stay</th>
            <th className="px-4 py-3 text-right">Gross</th>
            <th className="px-4 py-3 text-right">Commission</th>
            <th className="px-4 py-3 text-right">Fees / VAT</th>
            <th className="px-4 py-3 text-right">Net Payout</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
          {loading ? (
            <tr>
              <td colSpan={11} className="px-4 py-14 text-center text-slate-500">
                Loading OTA sales...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-4 py-14 text-center text-slate-500">
                No OTA statement rows found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id || index} className="transition-all duration-200 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(String(row.id))}
                    onChange={() => onToggleSelected(row.id)}
                  />
                </td>
                <td className="px-4 py-3">{formatDate(row.payout_date || row.statement_date || "")}</td>
                <td className="px-4 py-3">
                  <ChannelBadge channel={row.channel || "-"} />
                </td>
                <td className="px-4 py-3">{row.line_type || "-"}</td>
                <td className="px-4 py-3 font-black text-slate-950">{row.guest_name || row.details || "-"}</td>
                <td className="px-4 py-3">{row.booking_number || row.confirmation_code || row.reference_code || row.payout_id || "-"}</td>
                <td className="px-4 py-3">{formatDate(row.check_in || "")} - {formatDate(row.check_out || "")}</td>
                <td className="px-4 py-3 text-right font-black text-slate-950">{peso(n(row.gross_amount))}</td>
                <td className="px-4 py-3 text-right">{peso(Math.abs(n(row.commission_amount)))}</td>
                <td className="px-4 py-3 text-right">{peso(Math.abs(n(row.service_fee)) + Math.abs(n(row.vat_amount)) + Math.abs(n(row.cleaning_fee)) + Math.abs(n(row.tax_amount)))}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-700">{peso(n(row.net_payout) || n(row.paid_out))}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DirectTable({
  rows,
  loading,
  selectedIds,
  allFilteredSelected,
  onToggleAll,
  onToggleSelected,
}: {
  rows: DirectLine[];
  loading: boolean;
  selectedIds: string[];
  allFilteredSelected: boolean;
  onToggleAll: () => void;
  onToggleSelected: (id: any) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-4 py-3">
              <input type="checkbox" checked={allFilteredSelected} onChange={onToggleAll} />
            </th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Guest</th>
            <th className="px-4 py-3">Room</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3 text-right">Gross</th>
            <th className="px-4 py-3 text-right">Collected</th>
            <th className="px-4 py-3">Remarks</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
          {loading ? (
            <tr>
              <td colSpan={10} className="px-4 py-14 text-center text-slate-500">
                Loading direct sales...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-14 text-center text-slate-500">
                No direct sales import rows found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id || index} className="transition-all duration-200 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(String(row.id))}
                    onChange={() => onToggleSelected(row.id)}
                  />
                </td>
                <td className="px-4 py-3">{formatDate(row.sales_date || "")}</td>
                <td className="px-4 py-3">{row.reference_no || "-"}</td>
                <td className="px-4 py-3 font-black text-slate-950">{row.guest_name || "-"}</td>
                <td className="px-4 py-3">{row.room || row.room_type || "-"}</td>
                <td className="px-4 py-3">{row.payment_method || "-"}</td>
                <td className="px-4 py-3">{row.source || "Walk-in / Direct"}</td>
                <td className="px-4 py-3 text-right font-black text-slate-950">{peso(n(row.gross_amount))}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-700">{peso(n(row.collected_amount))}</td>
                <td className="px-4 py-3">{row.remarks || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Transactions
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function SourceAside({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: { source: string; amount: number; count: number }[];
}) {
  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Summary
      </p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">No source data found.</p>
        ) : (
          items.map((item) => (
            <div key={item.source} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{item.source}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.count} row(s)</p>
                </div>
                <p className="font-black text-slate-950">{peso(item.amount)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
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
      <p className={`mt-3 text-3xl font-black tracking-tight ${valueClass}`}>{value}</p>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const label = channel === "BOOKING_COM" ? "Booking.com" : channel === "AIRBNB" ? "Airbnb" : channel;

  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {label}
    </span>
  );
}

function normalizeHeader(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function splitCSVLine(line: string) {
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
}

function parseCSV(text: string) {
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
}

async function parseXLSX(file: File) {
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
}

async function parseImportFile(file: File) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseXLSX(file);
  }

  const text = await file.text();
  return parseCSV(text);
}

function getCSVValue(row: Record<string, string>, keys: string[]) {
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
}

function cleanMoney(value: any) {
  const raw = String(value || "0").trim();
  if (!raw) return 0;

  const negative = raw.startsWith("(") && raw.endsWith(")");
  const cleaned = raw.replace(/[₱,$,\s()]/g, "");
  const number = Number(cleaned) || 0;

  return negative ? -number : number;
}

function normalizeDate(value: any) {
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
}

function groupBy<T>(
  rows: T[],
  sourceGetter: (row: T) => string,
  amountGetter: (row: T) => number,
) {
  return Object.values(
    rows.reduce((acc: Record<string, { source: string; amount: number; count: number }>, row) => {
      const source = sourceGetter(row) || "Unknown";
      if (!acc[source]) acc[source] = { source, amount: 0, count: 0 };
      acc[source].amount += amountGetter(row);
      acc[source].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.amount - a.amount);
}

function n(value: any) {
  return Number(value || 0) || 0;
}

function peso(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH");
}

function hashKey(value: string) {
  let hash = 0;
  const text = String(value || "");

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}


