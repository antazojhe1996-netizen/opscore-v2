"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabase";

export default function RestaurantImportPage() {
  /// STATES
  const [restaurantSales, setRestaurantSales] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [isImporting, setIsImporting] = useState(false);

  /// FUNCTIONS
  const cleanNumber = (value: any) => {
    if (!value) return 0;

    return Number(
      String(value)
        .replace("₱", "")
        .replace(/,/g, "")
        .trim()
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
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const normalizeDate = (value: any) => {
    if (!value) return null;

    if (typeof value === "number") {
      const excelDate = XLSX.SSF.parse_date_code(value);
      if (!excelDate) return null;

      return `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(
        excelDate.d
      ).padStart(2, "0")}`;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split("T")[0];
  };

  const getRestaurantSales = async () => {
    const { data, error } = await supabase
      .from("restaurant_sales")
      .select("*")
      .order("sale_date", { ascending: false });

    if (error) {
      console.log("GET RESTAURANT SALES ERROR:", error);
      return;
    }

    setRestaurantSales(data || []);
  };

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    const parsedData = rows
      .map((row: any) => {
        return {
          sale_date: normalizeDate(row.Date || row.date || row["Sale Date"]),
          revenue: cleanNumber(row.Revenue || row.revenue),
          receipts: cleanNumber(row.Receipts || row.receipts),
          customers: cleanNumber(row.Customers || row.customers),
          average_receipt: cleanNumber(
            row["Average Receipt"] || row.average_receipt || row["Avg Receipt"]
          ),
          source: "Poster POS",
          uploaded_at: new Date().toISOString(),
        };
      })
      .filter((row) => row.sale_date);

    setPreviewData(parsedData);
  };

  const importData = async () => {
    if (previewData.length === 0) {
      alert("Please upload a Poster export first.");
      return;
    }

    setIsImporting(true);

    const { error } = await supabase.from("restaurant_sales").upsert(
      previewData,
      {
        onConflict: "sale_date",
      }
    );

    setIsImporting(false);

    if (error) {
      console.log("IMPORT RESTAURANT SALES ERROR:", error);
      alert("Failed to import restaurant sales.");
      return;
    }

    alert("Restaurant sales imported successfully.");
    setPreviewData([]);
    getRestaurantSales();
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

    return restaurantSales.filter((row) =>
      String(row.sale_date).startsWith(selectedMonth)
    );
  }, [restaurantSales, selectedMonth]);

  const totalRevenue = filteredSales.reduce(
    (sum, row) => sum + Number(row.revenue || 0),
    0
  );

  const totalReceipts = filteredSales.reduce(
    (sum, row) => sum + Number(row.receipts || 0),
    0
  );

  const totalCustomers = filteredSales.reduce(
    (sum, row) => sum + Number(row.customers || 0),
    0
  );

  const averageReceipt =
    totalReceipts > 0 ? totalRevenue / totalReceipts : 0;

  const previewRevenue = previewData.reduce(
    (sum, row) => sum + Number(row.revenue || 0),
    0
  );

  /// EFFECTS
  useEffect(() => {
    getRestaurantSales();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 space-y-6 p-6">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Finance Import
            </p>
            <h1 className="mt-2 text-3xl font-bold">Restaurant Sales</h1>
            <p className="mt-1 text-sm text-slate-400">
              Import Poster POS sales export and review daily restaurant performance.
            </p>
          </div>

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
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Revenue</p>
            <h2 className="mt-3 text-3xl font-bold text-emerald-400">
              {formatMoney(totalRevenue)}
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Based on imported restaurant sales
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Receipts</p>
            <h2 className="mt-3 text-3xl font-bold">{totalReceipts}</h2>
            <p className="mt-2 text-xs text-slate-500">
              Number of paid transactions
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Customers</p>
            <h2 className="mt-3 text-3xl font-bold">{totalCustomers}</h2>
            <p className="mt-2 text-xs text-slate-500">
              Guest/customer count from POS
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Average Receipt</p>
            <h2 className="mt-3 text-3xl font-bold text-amber-400">
              {formatMoney(averageReceipt)}
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Revenue divided by receipts
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Upload Poster Export</h2>
            <p className="mt-2 text-sm text-slate-400">
              Upload Excel or CSV file from Poster POS.
            </p>

            <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white"
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

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Preview Summary</p>
              <h3 className="mt-2 text-2xl font-bold">
                {previewData.length} rows
              </h3>
              <p className="mt-1 text-sm text-emerald-400">
                {formatMoney(previewRevenue)} total preview revenue
              </p>
            </div>

            <button
              onClick={importData}
              disabled={isImporting}
              className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? "Importing..." : "Import / Update Sales"}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">File Preview</h2>
                <p className="text-sm text-slate-400">
                  Check the uploaded data before saving.
                </p>
              </div>

              {previewData.length > 0 && (
                <button
                  onClick={() => setPreviewData([])}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Clear
                </button>
              )}
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
                  {previewData.map((row, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-800 text-slate-200"
                    >
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
                      <td
                        colSpan={5}
                        className="px-4 py-16 text-center text-slate-500"
                      >
                        Upload a Poster export to preview restaurant sales data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Imported Restaurant Sales</h2>
              <p className="text-sm text-slate-400">
                Saved daily sales records from Supabase.
              </p>
            </div>

            <p className="text-sm text-slate-400">
              Showing <span className="font-semibold text-white">{filteredSales.length}</span>{" "}
              records
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
                {filteredSales.map((row) => (
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
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-slate-500"
                    >
                      No restaurant sales found for this filter.
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