"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type TimeFilter = "today" | "month" | "year" | "all";

type HotelSale = {
  id?: number;
  reservation_number?: string | null;
  guest_name?: string | null;
  room?: string | null;
  room_type?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  nights?: number | null;
  booking_source?: string | null;
  status?: string | null;
  total_sales?: number | null;
  amount_paid?: number | null;
  unpaid_balance?: number | null;
};

const RESERVATIONS_TABLE = "finance_hotel_reservations";
const AUDIT_TABLE = "audit_logs";
const FETCH_PAGE_SIZE = 1000;
const INSERT_BATCH_SIZE = 500;
const DISPLAY_LIMIT = 300;

export default function RoomSalesPage() {
  /// STATES
  const [sales, setSales] = useState<HotelSale[]>([]);
  const [previewRows, setPreviewRows] = useState<HotelSale[]>([]);
  const [previewFileName, setPreviewFileName] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /// HELPERS
  const peso = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(value || 0);

  const toNumber = (value: any) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;

    return (
      Number(
        String(value)
          .replaceAll("₱", "")
          .replaceAll(",", "")
          .replaceAll("PHP", "")
          .trim(),
      ) || 0
    );
  };

  const getValue = (row: any, possibleKeys: string[]) => {
    const keys = Object.keys(row);

    for (const target of possibleKeys) {
      const foundKey = keys.find(
        (key) => key.toLowerCase().trim() === target.toLowerCase().trim(),
      );

      if (foundKey) return row[foundKey];
    }

    return null;
  };

  const normalizeRoomType = (value: any) => {
    const text = String(value || "Unknown").toLowerCase().trim();

    if (text.includes("standard") || text === "str") return "Standard Room";
    if (text.includes("deluxe") || text === "del") return "Deluxe Room";
    if (text.includes("premium") || text.includes("superior") || text === "pre") {
      return "Premium Room";
    }
    if (text.includes("family") || text === "fam") return "Family Room";
    if (text.includes("penthouse")) return "Penthouse";

    return value || "Unknown";
  };

  const normalizeDate = (value: any) => {
    if (!value) return null;

    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return null;

      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
        parsed.d,
      ).padStart(2, "0")}`;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split("T")[0];
  };

  const isCancelledReservation = (item: HotelSale) =>
    String(item.status || "").toLowerCase().includes("cancel");

  const getSummary = (rows: HotelSale[]) => {
    const activeRows = rows.filter((item) => !isCancelledReservation(item));
    const cancelledRows = rows.filter((item) => isCancelledReservation(item));

    const totalSales = activeRows.reduce(
      (sum, item) => sum + toNumber(item.total_sales),
      0,
    );

    const cancelledSales = cancelledRows.reduce(
      (sum, item) => sum + toNumber(item.total_sales),
      0,
    );

    const amountPaid = activeRows.reduce(
      (sum, item) => sum + toNumber(item.amount_paid),
      0,
    );

    const unpaidBalance = activeRows.reduce((sum, item) => {
      const balance = toNumber(item.unpaid_balance);
      return balance > 0 ? sum + balance : sum;
    }, 0);

    return {
      totalSales,
      amountPaid,
      unpaidBalance,
      reservations: activeRows.length,
      cancelledReservations: cancelledRows.length,
      cancelledSales,
      unpaidRooms: activeRows.filter((item) => toNumber(item.unpaid_balance) > 0)
        .length,
    };
  };

  const buildRecordsFromExcelRows = (rows: any[]) => {
    return rows.map((row, index) => {
      const reservationNumber =
        getValue(row, [
          "Reservation Number",
          "Reservation #",
          "Reservation ID",
          "Reservation",
          "Confirmation Number",
          "Booking ID",
          "ID",
        ]) || `IMPORT-${Date.now()}-${index}`;

      return {
        reservation_number: String(reservationNumber),
        guest_name: String(
          getValue(row, ["Guest Name", "Guest", "Name", "Customer"]) || "",
        ),
        room: String(
          getValue(row, ["Room", "Room Number", "Accommodation"]) || "",
        ),
        room_type: normalizeRoomType(
          getValue(row, ["Room Type", "Accommodation Type", "Room Category"]),
        ),
        check_in: normalizeDate(
          getValue(row, ["Check In", "Check-in", "Arrival", "Start Date"]),
        ),
        check_out: normalizeDate(
          getValue(row, ["Check Out", "Check-out", "Departure", "End Date"]),
        ),
        nights: toNumber(getValue(row, ["Nights", "Night"])),
        booking_source: String(
          getValue(row, ["Booking Source", "Source", "Channel", "Origin"]) ||
            "Unknown",
        ),
        status: String(
          getValue(row, ["Status", "Reservation Status", "Booking Status"]) ||
            "",
        ),
        total_sales: toNumber(
          getValue(row, [
            "Grand Total",
            "Total",
            "Total Sales",
            "Reservation Total",
            "Amount",
          ]),
        ),
        amount_paid: toNumber(
          getValue(row, ["Amount Paid", "Paid", "Payments", "Total Paid"]),
        ),
        unpaid_balance: toNumber(
          getValue(row, [
            "Balance Due",
            "Balance",
            "Unpaid Balance",
            "Amount Due",
          ]),
        ),
      };
    });
  };

  /// AUDIT
  const createAuditEntry = async (
    action: string,
    description: string,
    newValue?: any,
    severity: "info" | "warning" | "critical" = "info",
    oldValue?: any,
  ) => {
    const { error } = await supabase.from(AUDIT_TABLE).insert({
      module: "Hotel Sales",
      action,
      description,
      severity,
      record_id: null,
      old_value: oldValue || null,
      new_value: newValue || null,
    });

    if (error) {
      console.log("HOTEL SALES AUDIT ERROR:", JSON.stringify(error, null, 2));
    }
  };

  /// PERMISSIONS
  const getCurrentUserPermissions = async () => {
    const currentEmployeeId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_id")
        : null;

    if (!currentEmployeeId) {
      setPermissions([]);
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, system_role_id")
      .eq("id", currentEmployeeId)
      .maybeSingle();

    if (employeeError || !employee?.system_role_id) {
      console.log("ROOM SALES PERMISSION EMPLOYEE ERROR:", employeeError?.message);
      setPermissions([]);
      return;
    }

    const { data: rolePermissions, error: permissionError } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", employee.system_role_id);

    if (permissionError) {
      console.log("ROOM SALES PERMISSION ERROR:", permissionError.message);
      setPermissions([]);
      return;
    }

    setPermissions(rolePermissions || []);
  };

  const hasPermission = (
    moduleKey: string,
    field:
      | "can_view"
      | "can_create"
      | "can_edit"
      | "can_delete"
      | "can_approve"
      | "can_release",
  ) => {
    return permissions.some(
      (permission) =>
        permission.module_key === moduleKey && permission[field] === true,
    );
  };

  const getImportValidation = (rows: HotelSale[]) => {
    const duplicateMap: Record<string, number> = {};

    rows.forEach((row) => {
      const key = String(row.reservation_number || "").trim();
      if (!key) return;
      duplicateMap[key] = (duplicateMap[key] || 0) + 1;
    });

    const invalidDateRows = rows.filter(
      (row) => !row.check_in && !row.check_out,
    ).length;

    const zeroTotalRows = rows.filter(
      (row) => toNumber(row.total_sales) === 0,
    ).length;

    const duplicateReservationRows = Object.values(duplicateMap).reduce(
      (sum, count) => (count > 1 ? sum + count : sum),
      0,
    );

    const cancelledRows = rows.filter((row) =>
      isCancelledReservation(row),
    ).length;

    const negativeBalanceRows = rows.filter(
      (row) => toNumber(row.unpaid_balance) < 0,
    ).length;

    const activeRows = rows.filter((row) => !isCancelledReservation(row));
    const activeTotalSales = activeRows.reduce(
      (sum, row) => sum + toNumber(row.total_sales),
      0,
    );

    return {
      rows: rows.length,
      activeRows: activeRows.length,
      cancelledRows,
      invalidDateRows,
      zeroTotalRows,
      duplicateReservationRows,
      negativeBalanceRows,
      activeTotalSales,
      canImport: rows.length > 0 && activeTotalSales > 0,
    };
  };

  /// FUNCTIONS
  const getHotelSales = async () => {
    setLoading(true);

    let from = 0;
    let allRows: HotelSale[] = [];

    while (true) {
      const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select("*")
        .order("check_in", { ascending: false })
        .range(from, from + FETCH_PAGE_SIZE - 1);

      if (error) {
        console.log("HOTEL SALES ERROR:", JSON.stringify(error, null, 2));
        setLoading(false);
        return;
      }

      const batch = (data || []) as HotelSale[];
      allRows = [...allRows, ...batch];

      if (batch.length < FETCH_PAGE_SIZE) break;
      from += FETCH_PAGE_SIZE;
    }

    const rows = allRows.map((item) => ({
      ...item,
      room_type: normalizeRoomType(item.room_type),
      total_sales: toNumber(item.total_sales),
      amount_paid: toNumber(item.amount_paid),
      unpaid_balance: toNumber(item.unpaid_balance),
    }));

    setSales(rows);
    setLoading(false);
  };

  const filteredSales = useMemo(() => {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const month = today.getMonth();
    const year = today.getFullYear();

    return sales.filter((item) => {
      if (timeFilter === "all") return true;

      const rawDate = item.check_in || item.check_out || null;
      if (!rawDate) return false;

      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return false;

      if (timeFilter === "today") {
        return date.toISOString().split("T")[0] === todayString;
      }

      if (timeFilter === "month") {
        return date.getMonth() === month && date.getFullYear() === year;
      }

      if (timeFilter === "year") {
        return date.getFullYear() === year;
      }

      return true;
    });
  }, [sales, timeFilter]);

  const activeFilteredSales = useMemo(
    () => filteredSales.filter((item) => !isCancelledReservation(item)),
    [filteredSales],
  );

  const summary = useMemo(() => getSummary(filteredSales), [filteredSales]);
  const previewSummary = useMemo(() => getSummary(previewRows), [previewRows]);

  const canImportSales = hasPermission("hotel_room_sales", "can_create");
  const canDeleteSales = hasPermission("hotel_room_sales", "can_delete");

  const salesByRoomType = useMemo(() => {
    const grouped: Record<string, number> = {};

    activeFilteredSales.forEach((item) => {
      const key = normalizeRoomType(item.room_type);
      grouped[key] = (grouped[key] || 0) + toNumber(item.total_sales);
    });

    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [activeFilteredSales]);

  const salesByBookingSource = useMemo(() => {
    const grouped: Record<string, number> = {};

    activeFilteredSales.forEach((item) => {
      const key = item.booking_source || "Unknown";
      grouped[key] = (grouped[key] || 0) + toNumber(item.total_sales);
    });

    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [activeFilteredSales]);

  const exportExcel = async () => {
    const rows = filteredSales.map((item) => ({
      "Reservation Number": item.reservation_number || "",
      Guest: item.guest_name || "",
      Room: item.room || "",
      "Room Type": item.room_type || "",
      "Check In": item.check_in || "",
      "Check Out": item.check_out || "",
      Nights: item.nights || 0,
      "Booking Source": item.booking_source || "",
      Status: item.status || "",
      "Total Sales": toNumber(item.total_sales),
      "Amount Paid": toNumber(item.amount_paid),
      "Collectible Balance": Math.max(toNumber(item.unpaid_balance), 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Hotel Sales");

    XLSX.writeFile(
      workbook,
      `hotel-sales-${timeFilter}-${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    await createAuditEntry("EXPORT_EXCEL", "Exported hotel sales Excel report", {
      filter: timeFilter,
      rows: rows.length,
      activeSales: summary.totalSales,
      amountPaid: summary.amountPaid,
      collectibleBalance: summary.unpaidBalance,
      cancelledReservations: summary.cancelledReservations,
      cancelledSales: summary.cancelledSales,
    });
  };

  const handlePreviewExcel = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!canImportSales) {
      alert("Access denied. You do not have permission to import hotel sales data.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json<any>(worksheet, {
          defval: "",
        });

        const records = buildRecordsFromExcelRows(rows);
        const validation = getImportValidation(records);

        if (!validation.canImport) {
          await createAuditEntry(
            "IMPORT_VALIDATION_FAILED",
            `Hotel sales import validation failed for file: ${file.name}`,
            {
              fileName: file.name,
              validation,
            },
            "warning",
          );

          alert(
            "Import validation failed. File has no active sales total or no readable reservation rows.",
          );
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        if (validation.invalidDateRows > 0 || validation.duplicateReservationRows > 0) {
          await createAuditEntry(
            "IMPORT_VALIDATION_WARNING",
            `Hotel sales import validation warning for file: ${file.name}`,
            {
              fileName: file.name,
              validation,
            },
            "warning",
          );
        }

        setPreviewRows(records);
        setPreviewFileName(file.name);
        setImporting(false);

        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        console.log("PREVIEW PARSE ERROR:", error);
        alert("Excel preview failed.");
        setImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    if (!canImportSales) {
      alert("Access denied. You do not have permission to import hotel sales data.");
      return;
    }

    if (previewRows.length === 0) return;

    const validation = getImportValidation(previewRows);

    if (!validation.canImport) {
      await createAuditEntry(
        "IMPORT_VALIDATION_FAILED",
        `Hotel sales confirm import blocked: ${previewFileName}`,
        { fileName: previewFileName, validation },
        "warning",
      );
      alert("Import blocked. No active sales total found in preview.");
      return;
    }

    const hasExistingData = sales.length > 0;
    const shouldReplace = hasExistingData
      ? window.confirm(
          `Existing hotel sales data detected (${sales.length} rows).\n\nOK = Replace existing data before import\nCancel = Append new import to existing data`,
        )
      : false;

    if (shouldReplace && !canDeleteSales) {
      alert("Access denied. You can import new hotel sales data, but you cannot replace or delete existing hotel sales records.");
      return;
    }

    const confirmMessage = `${shouldReplace ? "Replace and import" : "Import"} ${
      previewRows.length
    } reservations?\n\nActive Sales: ${peso(
      previewSummary.totalSales,
    )}\nAmount Paid: ${peso(previewSummary.amountPaid)}\nCollectible Balance: ${peso(
      previewSummary.unpaidBalance,
    )}\nCancelled Excluded: ${previewSummary.cancelledReservations} reservations worth ${peso(
      previewSummary.cancelledSales,
    )}`;

    if (!window.confirm(confirmMessage)) return;

    setImporting(true);

    if (shouldReplace) {
      const oldSummary = getSummary(sales);

      const { error: deleteError } = await supabase
        .from(RESERVATIONS_TABLE)
        .delete()
        .not("id", "is", null);

      if (deleteError) {
        console.log("REPLACE DELETE ERROR:", JSON.stringify(deleteError, null, 2));
        alert("Replace failed while clearing existing hotel sales data.");
        setImporting(false);
        return;
      }

      await createAuditEntry(
        "IMPORT_REPLACE_CLEAR",
        `Cleared existing hotel sales data before importing file: ${previewFileName}`,
        {
          fileName: previewFileName,
          incomingRows: previewRows.length,
          incomingSummary: previewSummary,
        },
        "warning",
        {
          previousRows: sales.length,
          previousSummary: oldSummary,
        },
      );
    }

    for (let i = 0; i < previewRows.length; i += INSERT_BATCH_SIZE) {
      const batch = previewRows.slice(i, i + INSERT_BATCH_SIZE);

      const { error } = await supabase.from(RESERVATIONS_TABLE).insert(batch);

      if (error) {
        console.log("IMPORT ERROR:", JSON.stringify(error, null, 2));

        await createAuditEntry(
          "IMPORT_FAILED",
          `Hotel sales import failed for file: ${previewFileName}`,
          {
            fileName: previewFileName,
            failedBatchStart: i + 1,
            failedBatchEnd: i + batch.length,
            error,
          },
          "critical",
        );

        alert(`Import failed at rows ${i + 1} to ${i + batch.length}.`);
        setImporting(false);
        return;
      }
    }

    await createAuditEntry(
      shouldReplace ? "IMPORT_REPLACE" : "IMPORT_APPEND",
      `${shouldReplace ? "Replaced" : "Imported"} hotel reservations Excel file: ${previewFileName}`,
      {
        fileName: previewFileName,
        rows: previewRows.length,
        activeSales: previewSummary.totalSales,
        amountPaid: previewSummary.amountPaid,
        collectibleBalance: previewSummary.unpaidBalance,
        cancelledReservations: previewSummary.cancelledReservations,
        cancelledSales: previewSummary.cancelledSales,
        validation,
      },
      shouldReplace ? "warning" : "info",
    );

    setPreviewRows([]);
    setPreviewFileName("");

    await getHotelSales();
    setImporting(false);
  };

  const clearHotelSalesData = async () => {
    if (!canDeleteSales) {
      alert("Access denied. You do not have permission to delete hotel sales data.");
      return;
    }

    if (sales.length === 0) {
      alert("No hotel sales records to clear.");
      return;
    }

    const oldSummary = getSummary(sales);

    const confirmed = window.confirm(
      `Delete all hotel sales records?\n\nRows: ${sales.length}\nActive Sales: ${peso(
        oldSummary.totalSales,
      )}\nAmount Paid: ${peso(oldSummary.amountPaid)}\nCollectible Balance: ${peso(
        oldSummary.unpaidBalance,
      )}\n\nThis will only clear the hotel sales import table.`,
    );

    if (!confirmed) return;

    setLoading(true);

    const { error } = await supabase
      .from(RESERVATIONS_TABLE)
      .delete()
      .not("id", "is", null);

    if (error) {
      console.log("CLEAR HOTEL SALES ERROR:", JSON.stringify(error, null, 2));

      await createAuditEntry(
        "DELETE_ALL_RECORDS_FAILED",
        "Failed to clear all hotel sales records",
        { error },
        "critical",
        { previousRows: sales.length, previousSummary: oldSummary },
      );

      alert("Failed to clear hotel sales data. Check console error.");
      setLoading(false);
      return;
    }

    await createAuditEntry(
      "DELETE_ALL_RECORDS",
      "Cleared all hotel sales records",
      null,
      "warning",
      {
        previousRows: sales.length,
        previousSummary: oldSummary,
      },
    );

    setSales([]);
    setPreviewRows([]);
    setPreviewFileName("");
    setLoading(false);
  };

  const cancelPreview = () => {
    setPreviewRows([]);
    setPreviewFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    getCurrentUserPermissions();
    getHotelSales();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handlePreviewExcel}
          className="hidden"
        />

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                Finance / Room Sales
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Room Sales Workbench
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Cloudbeds reservation ledger for import preview, validation,
                export, and finance review.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                {(["today", "month", "year", "all"] as TimeFilter[]).map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={
                        timeFilter === filter
                          ? "rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
                          : "rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-900 hover:text-white"
                      }
                    >
                      {filter === "today"
                        ? "Today"
                        : filter === "month"
                          ? "Month"
                          : filter === "year"
                            ? "Year"
                            : "All"}
                    </button>
                  ),
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {canImportSales && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {importing ? "Reading..." : "Preview Import"}
                  </button>
                )}

                <button
                  onClick={exportExcel}
                  disabled={loading || filteredSales.length === 0}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-100 hover:bg-blue-500/20 disabled:opacity-50"
                >
                  Export Excel
                </button>

                {canDeleteSales && (
                  <button
                    onClick={clearHotelSalesData}
                    disabled={loading || importing || sales.length === 0}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-black text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Clear Data
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Active Sales"
            value={peso(summary.totalSales)}
            subtitle="Cancelled excluded"
          />
          <MetricCard
            title="Amount Paid"
            value={peso(summary.amountPaid)}
            subtitle="Actual collection"
          />
          <MetricCard
            title="Collectible Balance"
            value={peso(summary.unpaidBalance)}
            subtitle={`${summary.unpaidRooms} reservation(s)`}
            emphasized={summary.unpaidBalance > 0}
          />
          <MetricCard
            title="Active Reservations"
            value={String(summary.reservations)}
            subtitle={`${summary.cancelledReservations} cancelled excluded`}
          />
        </section>

        {previewRows.length > 0 && (
          <section className="mb-6 overflow-hidden rounded-3xl border border-blue-300/20 bg-slate-900 shadow-xl shadow-black/20">
            <div className="border-b border-slate-800 bg-blue-500/10 p-5 lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                    Import Preview
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Review Cloudbeds File
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    File: <span className="font-semibold text-blue-100">{previewFileName}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={cancelPreview}
                    disabled={importing}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  {canImportSales && (
                    <button
                      onClick={confirmImport}
                      disabled={importing}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {importing ? "Importing..." : "Confirm Import"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                <MetricCard
                  title="Preview Rows"
                  value={String(previewSummary.reservations)}
                  subtitle="Active reservations"
                />
                <MetricCard
                  title="Preview Sales"
                  value={peso(previewSummary.totalSales)}
                  subtitle="Active sales"
                />
                <MetricCard
                  title="Preview Paid"
                  value={peso(previewSummary.amountPaid)}
                  subtitle="Collection"
                />
                <MetricCard
                  title="Preview Collectible"
                  value={peso(previewSummary.unpaidBalance)}
                  subtitle="Balance due"
                  emphasized={previewSummary.unpaidBalance > 0}
                />
              </div>

              {(() => {
                const validation = getImportValidation(previewRows);

                return (
                  <div className="mt-4 grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
                    <InfoPill label="Cancelled excluded" value={validation.cancelledRows} />
                    <InfoPill label="Negative credits" value={validation.negativeBalanceRows} />
                    <InfoPill label="Missing dates" value={validation.invalidDateRows} />
                    <InfoPill label="Duplicate IDs" value={validation.duplicateReservationRows} />
                  </div>
                );
              })()}
            </div>

            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[1000px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-950 text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="p-3">Reservation</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Room Type</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Paid</th>
                    <th className="pr-3 text-right">Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {previewRows.slice(0, 20).map((item, index) => (
                    <tr
                      key={`${item.reservation_number}-${index}`}
                      className="border-b border-slate-800 text-slate-200 hover:bg-slate-950/50"
                    >
                      <td className="p-3 font-semibold text-white">
                        {item.reservation_number || "-"}
                      </td>
                      <td>{item.guest_name || "-"}</td>
                      <td>{item.room || "-"}</td>
                      <td>{item.room_type || "-"}</td>
                      <td>{item.booking_source || "-"}</td>
                      <td>{item.status || "-"}</td>
                      <td className="text-right">{peso(toNumber(item.total_sales))}</td>
                      <td className="text-right">{peso(toNumber(item.amount_paid))}</td>
                      <td className="pr-3 text-right font-bold text-blue-200">
                        {peso(toNumber(item.unpaid_balance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewRows.length > 20 && (
              <p className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">
                Showing first 20 rows only. Full import will include all{" "}
                {previewRows.length} rows.
              </p>
            )}
          </section>
        )}

        {(summary.unpaidRooms > 0 || summary.cancelledReservations > 0) && (
          <section className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {summary.unpaidRooms > 0 && (
              <NoticeCard
                title="Collectible Rooms Review"
                text={`There are ${summary.unpaidRooms} active reservation(s) with collectible balance. Cancelled reservations and negative credits are excluded.`}
              />
            )}

            {summary.cancelledReservations > 0 && (
              <NoticeCard
                title="Cancelled Reservations Excluded"
                text={`${summary.cancelledReservations} cancelled reservation(s) worth ${peso(
                  summary.cancelledSales,
                )} are excluded from Active Sales, room type totals, and booking source totals.`}
              />
            )}
          </section>
        )}

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:p-6">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                Reservation Ledger
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                Room Sales Records
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Table-first workbench view. Export includes the full filtered dataset.
              </p>
            </div>

            <div className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400">
              Showing {Math.min(filteredSales.length, DISPLAY_LIMIT)} of{" "}
              {filteredSales.length} record(s)
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="p-4">Reservation</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Room Type</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Paid</th>
                  <th className="pr-4 text-right">Balance</th>
                </tr>
              </thead>

              <tbody>
                {filteredSales.slice(0, DISPLAY_LIMIT).map((item, index) => {
                  const balance = toNumber(item.unpaid_balance);
                  const cancelled = isCancelledReservation(item);

                  return (
                    <tr
                      key={item.id || item.reservation_number || index}
                      className="border-t border-slate-800 text-slate-200 hover:bg-slate-950/50"
                    >
                      <td className="p-4 font-semibold text-white">
                        {item.reservation_number || "-"}
                      </td>
                      <td>{item.guest_name || "-"}</td>
                      <td>{item.room || "-"}</td>
                      <td>{item.room_type || "-"}</td>
                      <td>{item.booking_source || "-"}</td>
                      <td>
                        <span
                          className={
                            cancelled
                              ? "rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-400"
                              : "rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-200"
                          }
                        >
                          {item.status || "Active"}
                        </span>
                      </td>
                      <td className="text-right">{peso(toNumber(item.total_sales))}</td>
                      <td className="text-right">{peso(toNumber(item.amount_paid))}</td>
                      <td className="pr-4 text-right font-black text-blue-200">
                        {peso(Math.max(balance, 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSales.length === 0 && <EmptyState />}
          </div>

          {filteredSales.length > DISPLAY_LIMIT && (
            <p className="mt-3 text-xs text-slate-500">
              Showing first {DISPLAY_LIMIT} rows only. Export Excel still includes
              all {filteredSales.length} records.
            </p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Sales by Room Type">
            {salesByRoomType.length === 0 ? (
              <EmptyState compact />
            ) : (
              salesByRoomType.map(([name, amount]) => (
                <ListRow key={name} name={name} value={peso(amount)} />
              ))
            )}
          </Panel>

          <Panel title="Sales by Booking Source">
            {salesByBookingSource.length === 0 ? (
              <EmptyState compact />
            ) : (
              salesByBookingSource.map(([name, amount]) => (
                <ListRow key={name} name={name} value={peso(amount)} />
              ))
            )}
          </Panel>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  emphasized = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className={emphasized ? "mt-2 text-2xl font-black text-blue-200" : "mt-2 text-2xl font-black text-white"}>
        {value}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-blue-300/20 bg-slate-950 px-3 py-2 text-blue-100">
      <span className="text-slate-500">{label}:</span>{" "}
      <span className="font-black text-blue-200">{value}</span>
    </div>
  );
}

function NoticeCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
      <h2 className="text-lg font-black text-blue-100">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:p-6">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
        Breakdown
      </p>
      <h2 className="mt-1 mb-5 text-xl font-black text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ListRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="min-w-0 truncate font-semibold text-white">{name}</p>
      <p className="shrink-0 font-black text-blue-200">{value}</p>
    </div>
  );
}

function EmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500"
          : "p-8 text-center text-sm text-slate-500"
      }
    >
      No hotel sales records found.
    </div>
  );
}