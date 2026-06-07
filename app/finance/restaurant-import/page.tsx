"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabase";

type ImportMode = "append" | "replace";

type RestaurantSale = {
  id?: number;
  sale_date: string | null;
  revenue: number;
  receipts: number;
  customers: number;
  average_receipt: number;
  source?: string | null;
  uploaded_at?: string | null;
};

const SALES_TABLE = "restaurant_sales";
const AUDIT_TABLE = "audit_logs";
const MODULE_KEY = "restaurant_sales";
const FETCH_PAGE_SIZE = 1000;
const INSERT_BATCH_SIZE = 500;
const DISPLAY_LIMIT = 300;

export default function RestaurantImportPage() {
  /// STATES
  const [restaurantSales, setRestaurantSales] = useState<RestaurantSale[]>([]);
  const [previewData, setPreviewData] = useState<RestaurantSale[]>([]);
  const [previewFileName, setPreviewFileName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  const [modulePermission, setModulePermission] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /// HELPERS
  const cleanNumber = (value: any) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;

    return (
      Number(
        String(value)
          .replaceAll("₱", "")
          .replaceAll("PHP", "")
          .replace(/,/g, "")
          .trim(),
      ) || 0
    );
  };

  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const canCreate = Boolean(modulePermission?.can_create);
  const canDelete = Boolean(modulePermission?.can_delete);

  const denyAccess = (action: string) => {
    alert(`Access denied. You do not have permission to ${action}.`);
  };

  const normalizeDate = (value: any) => {
    if (!value) return null;

    if (typeof value === "number") {
      const excelDate = XLSX.SSF.parse_date_code(value);
      if (!excelDate) return null;

      return `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(
        excelDate.d,
      ).padStart(2, "0")}`;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split("T")[0];
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

  const getSummary = (rows: RestaurantSale[]) => {
    const totalRevenue = rows.reduce(
      (sum, row) => sum + Number(row.revenue || 0),
      0,
    );

    const totalReceipts = rows.reduce(
      (sum, row) => sum + Number(row.receipts || 0),
      0,
    );

    const totalCustomers = rows.reduce(
      (sum, row) => sum + Number(row.customers || 0),
      0,
    );

    const averageReceipt = totalReceipts > 0 ? totalRevenue / totalReceipts : 0;

    return {
      rows: rows.length,
      totalRevenue,
      totalReceipts,
      totalCustomers,
      averageReceipt,
    };
  };

  const buildRowsFromSheet = (rows: any[]) => {
    const validRows: RestaurantSale[] = [];
    const rejectedRows: any[] = [];

    rows.forEach((row, index) => {
      const saleDate = normalizeDate(
        getValue(row, ["Date", "date", "Sale Date", "Sales Date", "Business Date"]),
      );

      const revenue = cleanNumber(
        getValue(row, ["Revenue", "revenue", "Sales", "Net Sales", "Gross Sales"]),
      );

      const receipts = cleanNumber(
        getValue(row, ["Receipts", "receipts", "Transactions", "Orders"]),
      );

      const customers = cleanNumber(
        getValue(row, ["Customers", "customers", "Guests", "Guest Count"]),
      );

      const averageReceipt = cleanNumber(
        getValue(row, ["Average Receipt", "average_receipt", "Avg Receipt", "Average Check"]),
      );

      if (!saleDate) {
        rejectedRows.push({ rowNumber: index + 2, reason: "Missing or invalid date", row });
        return;
      }

      validRows.push({
        sale_date: saleDate,
        revenue,
        receipts,
        customers,
        average_receipt: averageReceipt || (receipts > 0 ? revenue / receipts : 0),
        source: "Poster POS",
        uploaded_at: new Date().toISOString(),
      });
    });

    return { validRows, rejectedRows };
  };

  /// AUDIT
  const createAuditEntry = async (
    action: string,
    description: string,
    newValue?: any,
    severity: "info" | "warning" | "critical" = "info",
  ) => {
    const { error } = await supabase.from(AUDIT_TABLE).insert({
      module: "Restaurant Sales",
      action,
      description,
      severity,
      record_id: null,
      old_value: null,
      new_value: newValue || null,
    });

    if (error) {
      console.log("RESTAURANT SALES AUDIT ERROR:", JSON.stringify(error, null, 2));
    }
  };

  /// FUNCTIONS
  const getModulePermission = async () => {
    const currentEmployeeId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_id")
        : null;

    if (!currentEmployeeId) {
      setModulePermission(null);
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, system_role_id")
      .eq("id", currentEmployeeId)
      .maybeSingle();

    if (employeeError || !employee?.system_role_id) {
      console.log("RESTAURANT PERMISSION EMPLOYEE ERROR:", employeeError?.message);
      setModulePermission(null);
      return;
    }

    const { data: permission, error: permissionError } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", employee.system_role_id)
      .eq("module_key", MODULE_KEY)
      .maybeSingle();

    if (permissionError) {
      console.log("RESTAURANT PERMISSION ERROR:", permissionError.message);
      setModulePermission(null);
      return;
    }

    setModulePermission(permission || null);
  };

  const getRestaurantSales = async () => {
    setIsLoading(true);

    let from = 0;
    let allRows: RestaurantSale[] = [];

    while (true) {
      const { data, error } = await supabase
        .from(SALES_TABLE)
        .select("*")
        .order("sale_date", { ascending: false })
        .range(from, from + FETCH_PAGE_SIZE - 1);

      if (error) {
        console.log("GET RESTAURANT SALES ERROR:", JSON.stringify(error, null, 2));
        setIsLoading(false);
        return;
      }

      const batch = (data || []) as RestaurantSale[];
      allRows = [...allRows, ...batch];

      if (batch.length < FETCH_PAGE_SIZE) break;
      from += FETCH_PAGE_SIZE;
    }

    setRestaurantSales(allRows);
    setIsLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canCreate) {
      denyAccess("import restaurant sales");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setInvalidRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      const { validRows, rejectedRows } = buildRowsFromSheet(rows);

      setPreviewData(validRows);
      setInvalidRows(rejectedRows);
      setPreviewFileName(file.name);

      if (validRows.length === 0) {
        await createAuditEntry(
          "IMPORT_VALIDATION_FAILED",
          `Restaurant import preview failed: ${file.name}`,
          {
            fileName: file.name,
            sourceRows: rows.length,
            rejectedRows: rejectedRows.length,
          },
          "warning",
        );
        alert("No valid restaurant sales rows found. Please check the file columns.");
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.log("PREVIEW RESTAURANT SALES ERROR:", error);
      await createAuditEntry(
        "IMPORT_VALIDATION_FAILED",
        `Restaurant import preview parse failed: ${file.name}`,
        {
          fileName: file.name,
          error: String(error),
        },
        "warning",
      );
      alert("Excel preview failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const clearRestaurantSales = async () => {
    if (!canDelete) {
      denyAccess("clear restaurant sales data");
      return;
    }

    if (restaurantSales.length === 0) {
      alert("No restaurant sales records to clear.");
      return;
    }

    const confirmClear = window.confirm(
      `Delete all ${restaurantSales.length} imported restaurant sales records?\n\nThis will be recorded in Audit Trail.`,
    );

    if (!confirmClear) return;

    setIsImporting(true);

    const beforeSummary = getSummary(restaurantSales);

    const { error } = await supabase
      .from(SALES_TABLE)
      .delete()
      .not("id", "is", null);

    if (error) {
      console.log("CLEAR RESTAURANT SALES ERROR:", JSON.stringify(error, null, 2));
      await createAuditEntry(
        "DELETE_ALL_FAILED",
        "Failed to clear restaurant sales records",
        {
          error,
          beforeSummary,
        },
        "critical",
      );
      alert("Failed to clear restaurant sales.");
      setIsImporting(false);
      return;
    }

    await createAuditEntry(
      "DELETE_ALL_RECORDS",
      "Deleted all imported restaurant sales records",
      beforeSummary,
      "warning",
    );

    setRestaurantSales([]);
    setPreviewData([]);
    setPreviewFileName("");
    setInvalidRows([]);
    setIsImporting(false);
  };

  const importData = async () => {
    if (!canCreate) {
      denyAccess("import restaurant sales");
      return;
    }

    if (importMode === "replace" && !canDelete) {
      denyAccess("replace restaurant sales data");
      return;
    }

    if (previewData.length === 0) {
      await createAuditEntry(
        "IMPORT_VALIDATION_FAILED",
        "Restaurant import blocked because preview data is empty",
        {
          fileName: previewFileName,
          invalidRows: invalidRows.length,
        },
        "warning",
      );
      alert("Please upload a Poster export first.");
      return;
    }

    const previewSummary = getSummary(previewData);
    const existingSummary = getSummary(restaurantSales);

    const confirmMessage = `${
      importMode === "replace" ? "Replace" : "Append / Update"
    } restaurant sales?\n\nFile: ${previewFileName}\nRows: ${previewSummary.rows}\nRevenue: ${formatMoney(
      previewSummary.totalRevenue,
    )}\nReceipts: ${previewSummary.totalReceipts}\nCustomers: ${previewSummary.totalCustomers}\n\nInvalid rows skipped: ${invalidRows.length}`;

    if (!window.confirm(confirmMessage)) return;

    setIsImporting(true);

    if (importMode === "replace") {
      const { error: deleteError } = await supabase
        .from(SALES_TABLE)
        .delete()
        .not("id", "is", null);

      if (deleteError) {
        console.log("REPLACE DELETE ERROR:", JSON.stringify(deleteError, null, 2));
        await createAuditEntry(
          "IMPORT_REPLACE_FAILED",
          "Restaurant replace import failed while deleting existing records",
          {
            error: deleteError,
            existingSummary,
            previewSummary,
          },
          "critical",
        );
        alert("Replace import failed while clearing existing records.");
        setIsImporting(false);
        return;
      }
    }

    for (let i = 0; i < previewData.length; i += INSERT_BATCH_SIZE) {
      const batch = previewData.slice(i, i + INSERT_BATCH_SIZE);

      const { error } = await supabase.from(SALES_TABLE).upsert(batch, {
        onConflict: "sale_date",
      });

      if (error) {
        console.log("IMPORT RESTAURANT SALES ERROR:", JSON.stringify(error, null, 2));
        await createAuditEntry(
          importMode === "replace" ? "IMPORT_REPLACE_FAILED" : "IMPORT_APPEND_FAILED",
          `Restaurant sales import failed at rows ${i + 1} to ${i + batch.length}`,
          {
            fileName: previewFileName,
            mode: importMode,
            error,
            previewSummary,
          },
          "critical",
        );
        alert(`Import failed at rows ${i + 1} to ${i + batch.length}.`);
        setIsImporting(false);
        return;
      }
    }

    await createAuditEntry(
      importMode === "replace" ? "IMPORT_REPLACE" : "IMPORT_APPEND",
      `${importMode === "replace" ? "Replaced" : "Imported/updated"} restaurant sales from Poster POS file: ${previewFileName}`,
      {
        fileName: previewFileName,
        mode: importMode,
        before: existingSummary,
        imported: previewSummary,
        invalidRows: invalidRows.length,
      },
      importMode === "replace" ? "warning" : "info",
    );

    alert("Restaurant sales imported successfully.");
    setPreviewData([]);
    setPreviewFileName("");
    setInvalidRows([]);
    await getRestaurantSales();
    setIsImporting(false);
  };

  const exportExcel = async () => {
    const rows = filteredSales.map((row) => ({
      Date: row.sale_date || "",
      Revenue: Number(row.revenue || 0),
      Receipts: Number(row.receipts || 0),
      Customers: Number(row.customers || 0),
      "Average Receipt": Number(row.average_receipt || 0),
      Source: row.source || "Poster POS",
      "Uploaded At": row.uploaded_at || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Restaurant Sales");

    XLSX.writeFile(
      workbook,
      `restaurant-sales-${selectedMonth}-${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    await createAuditEntry("EXPORT_EXCEL", "Exported restaurant sales Excel report", {
      filter: selectedMonth,
      rows: rows.length,
      summary,
    });
  };

  const clearPreview = () => {
    setPreviewData([]);
    setPreviewFileName("");
    setInvalidRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /// CALCULATIONS
  const monthOptions = useMemo(() => {
    const months = restaurantSales
      .map((row) => String(row.sale_date).slice(0, 7))
      .filter(Boolean);

    return Array.from(new Set(months)).sort().reverse();
  }, [restaurantSales]);

  const filteredSales = useMemo(() => {
    if (selectedMonth === "all") return restaurantSales;

    return restaurantSales.filter((row) => String(row.sale_date).startsWith(selectedMonth));
  }, [restaurantSales, selectedMonth]);

  const summary = useMemo(() => getSummary(filteredSales), [filteredSales]);
  const previewSummary = useMemo(() => getSummary(previewData), [previewData]);

  /// EFFECTS
  useEffect(() => {
    getModulePermission();
    getRestaurantSales();
  }, []);

  useEffect(() => {
    if (!canDelete && importMode === "replace") {
      setImportMode("append");
    }
  }, [canDelete, importMode]);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 space-y-6 overflow-x-hidden p-6">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Finance Import
            </p>
            <h1 className="mt-2 text-3xl font-bold">Restaurant Sales</h1>
            <p className="mt-1 text-sm text-slate-400">
              Import Poster POS sales export, validate totals, and audit every import/export action.
            </p>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none lg:w-64"
            >
              <option value="all">All months</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={exportExcel}
                disabled={isLoading || filteredSales.length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export Excel
              </button>

              {canDelete && (
                <button
                  onClick={clearRestaurantSales}
                  disabled={isImporting || restaurantSales.length === 0}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Data
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Revenue"
            value={formatMoney(summary.totalRevenue)}
            subtitle="Based on imported restaurant sales"
            success
          />
          <SummaryCard
            title="Total Receipts"
            value={String(summary.totalReceipts)}
            subtitle="Number of paid transactions"
          />
          <SummaryCard
            title="Customers"
            value={String(summary.totalCustomers)}
            subtitle="Guest/customer count from POS"
          />
          <SummaryCard
            title="Average Receipt"
            value={formatMoney(summary.averageReceipt)}
            subtitle="Revenue divided by receipts"
            warning
          />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Upload Poster Export</h2>
            <p className="mt-2 text-sm text-slate-400">
              Upload Excel or CSV file from Poster POS. Preview first, then append/update or replace.
            </p>

            {!canCreate && (
              <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                View-only access. Import and replace actions are disabled for your role.
              </div>
            )}

            <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isImporting || !canCreate}
                className="w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              />

              <div className="mt-5 rounded-xl bg-slate-900 p-4 text-sm">
                <p className="font-semibold text-white">Expected columns</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-slate-400">
                  <p>Date</p>
                  <p>Revenue</p>
                  <p>Receipts</p>
                  <p>Customers</p>
                  <p>Average Receipt</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <button
                onClick={() => setImportMode("append")}
                className={`rounded-lg px-3 py-2 text-sm font-bold ${
                  importMode === "append"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                Append / Update
              </button>
              <button
                onClick={() => {
                  if (!canDelete) {
                    denyAccess("replace restaurant sales data");
                    return;
                  }

                  setImportMode("replace");
                }}
                disabled={!canDelete}
                className={`rounded-lg px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                  importMode === "replace"
                    ? "bg-yellow-400 text-slate-950"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                Replace All
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Preview Summary</p>
              <h3 className="mt-2 text-2xl font-bold">{previewSummary.rows} rows</h3>
              <p className="mt-1 text-sm text-emerald-400">
                {formatMoney(previewSummary.totalRevenue)} total preview revenue
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Invalid rows skipped: {invalidRows.length}
              </p>
              {previewFileName && (
                <p className="mt-1 truncate text-xs text-slate-500">File: {previewFileName}</p>
              )}
            </div>

            <button
              onClick={importData}
              disabled={isImporting || !canCreate || previewData.length === 0}
              className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting
                ? "Importing..."
                : importMode === "replace"
                  ? "Confirm Replace Import"
                  : "Confirm Append / Update"}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">File Preview</h2>
                <p className="text-sm text-slate-400">
                  Check the uploaded data before saving.
                </p>
              </div>

              {previewData.length > 0 && (
                <button
                  onClick={clearPreview}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Clear Preview
                </button>
              )}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <MiniStat title="Rows" value={String(previewSummary.rows)} />
              <MiniStat title="Revenue" value={formatMoney(previewSummary.totalRevenue)} />
              <MiniStat title="Receipts" value={String(previewSummary.totalReceipts)} />
              <MiniStat title="Invalid" value={String(invalidRows.length)} danger={invalidRows.length > 0} />
            </div>

            <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-950">
                  <tr className="text-left text-slate-400">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Receipts</th>
                    <th className="px-4 py-3 text-right">Customers</th>
                    <th className="px-4 py-3 text-right">Avg Receipt</th>
                  </tr>
                </thead>

                <tbody>
                  {previewData.slice(0, DISPLAY_LIMIT).map((row, index) => (
                    <tr key={`${row.sale_date}-${index}`} className="border-t border-slate-800 text-slate-200">
                      <td className="px-4 py-3">{formatDate(row.sale_date)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatMoney(row.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right">{row.receipts}</td>
                      <td className="px-4 py-3 text-right">{row.customers}</td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(row.average_receipt)}
                      </td>
                    </tr>
                  ))}

                  {previewData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-slate-500">
                        Upload a Poster export to preview restaurant sales data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {previewData.length > DISPLAY_LIMIT && (
              <p className="mt-3 text-xs text-slate-400">
                Showing first {DISPLAY_LIMIT} preview rows only. Full import includes all {previewData.length} rows.
              </p>
            )}
          </section>
        </div>

        {invalidRows.length > 0 && (
          <section className="rounded-2xl border border-yellow-700 bg-yellow-950/20 p-5">
            <h2 className="text-xl font-black text-yellow-200">Import Validation Warning</h2>
            <p className="mt-2 text-sm text-yellow-100">
              {invalidRows.length} row(s) were skipped because the date was missing or invalid.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Imported Restaurant Sales</h2>
              <p className="text-sm text-slate-400">
                Saved daily sales records from Supabase.
              </p>
            </div>

            <p className="text-sm text-slate-400">
              Showing <span className="font-semibold text-white">{filteredSales.length}</span> records
            </p>
          </div>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead className="bg-slate-950">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Receipts</th>
                  <th className="px-4 py-3 text-right">Customers</th>
                  <th className="px-4 py-3 text-right">Avg Receipt</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>

              <tbody>
                {filteredSales.slice(0, DISPLAY_LIMIT).map((row) => (
                  <tr
                    key={row.id || row.sale_date}
                    className="border-t border-slate-800 text-slate-200 transition hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {formatDate(row.sale_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                      {formatMoney(row.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right">{row.receipts}</td>
                    <td className="px-4 py-3 text-right">{row.customers}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(row.average_receipt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        {row.source || "Poster POS"}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                      No restaurant sales found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredSales.length > DISPLAY_LIMIT && (
            <p className="mt-3 text-xs text-slate-400">
              Showing first {DISPLAY_LIMIT} rows only. Export Excel still includes all {filteredSales.length} records.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  success = false,
  warning = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  success?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        success
          ? "border-emerald-500/20 bg-emerald-500/10"
          : warning
            ? "border-amber-500/20 bg-amber-500/10"
            : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-3 text-3xl font-bold ${success ? "text-emerald-400" : warning ? "text-amber-400" : "text-white"}`}>
        {value}
      </h2>
      {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function MiniStat({
  title,
  value,
  danger = false,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <h3 className={`mt-1 text-lg font-black ${danger ? "text-red-400" : "text-white"}`}>
        {value}
      </h3>
    </div>
  );
}
