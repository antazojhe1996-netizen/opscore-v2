"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabase";

export default function RestaurantImportPage() {
  /// STATES
  const [restaurantSales, setRestaurantSales] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

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

    const parsedData = rows.map((row: any) => {
      return {
        sale_date: row.Date || row.date || row["Sale Date"],
        revenue: cleanNumber(row.Revenue || row.revenue),
        receipts: cleanNumber(row.Receipts || row.receipts),
        customers: cleanNumber(row.Customers || row.customers),
        average_receipt: cleanNumber(
          row["Average Receipt"] ||
            row.average_receipt ||
            row["Avg Receipt"]
        ),
        source: "Poster POS",
        uploaded_at: new Date().toISOString(),
      };
    });

    setPreviewData(parsedData.filter((row) => row.sale_date));
  };

  const importData = async () => {
    if (previewData.length === 0) {
      alert("Please upload a Poster export first.");
      return;
    }

    const { error } = await supabase.from("restaurant_sales").upsert(
      previewData,
      {
        onConflict: "sale_date",
      }
    );

    if (error) {
      console.log("IMPORT RESTAURANT SALES ERROR:", error);
      alert("Failed to import restaurant sales.");
      return;
    }

    alert("Restaurant sales imported successfully.");
    setPreviewData([]);
    getRestaurantSales();
  };

  useEffect(() => {
    getRestaurantSales();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Restaurant Sales Import</h1>
          <p className="text-sm text-slate-400">
            Upload Poster POS sales export for finance and revenue dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Upload Poster Export</h2>

            <p className="mb-4 text-sm text-slate-400">
              Upload the Poster POS sales export file.
            </p>

            <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Expected columns:</p>
              <p className="mt-2">Date</p>
              <p>Revenue</p>
              <p>Receipts</p>
              <p>Customers</p>
              <p>Average Receipt</p>
            </div>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />

            <button
              onClick={importData}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500"
            >
              Import / Update Sales
            </button>
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">File Preview</h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Revenue</th>
                    <th className="py-3 pr-4">Receipts</th>
                    <th className="py-3 pr-4">Customers</th>
                    <th className="py-3 pr-4">Avg Receipt</th>
                  </tr>
                </thead>

                <tbody>
                  {previewData.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-800/70 text-slate-200"
                    >
                      <td className="py-3 pr-4">{row.sale_date}</td>
                      <td className="py-3 pr-4">₱{row.revenue}</td>
                      <td className="py-3 pr-4">{row.receipts}</td>
                      <td className="py-3 pr-4">{row.customers}</td>
                      <td className="py-3 pr-4">₱{row.average_receipt}</td>
                    </tr>
                  ))}

                  {previewData.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500"
                      >
                        Upload a Poster export to preview sales data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">Imported Restaurant Sales</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Revenue</th>
                  <th className="py-3 pr-4">Receipts</th>
                  <th className="py-3 pr-4">Customers</th>
                  <th className="py-3 pr-4">Avg Receipt</th>
                </tr>
              </thead>

              <tbody>
                {restaurantSales.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800/70 text-slate-200 transition hover:bg-slate-800/30"
                  >
                    <td className="py-3 pr-4">{row.sale_date}</td>
                    <td className="py-3 pr-4">₱{row.revenue}</td>
                    <td className="py-3 pr-4">{row.receipts}</td>
                    <td className="py-3 pr-4">{row.customers}</td>
                    <td className="py-3 pr-4">₱{row.average_receipt}</td>
                  </tr>
                ))}

                {restaurantSales.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-slate-500"
                    >
                      No restaurant sales imported yet.
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