"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import PageGuard from "@/components/PageGuard";type ReportRow = {
  transactionDate: string;
  referenceNo: string;
  source: string;
  name: string;
  category: string;
  subcategory: string;
  amount: number;
  paidAmount: number;
  balance: number;
  paymentMethod: string;
  status: string;
  createdBy: string;
  createdAt: string;
};

export default function FinanceReportsPage() {
  const [loading, setLoading] = useState(true);
  const [incomeRows, setIncomeRows] = useState<ReportRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ReportRow[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "income" | "expenses" | "pl">("summary");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);

    const income: ReportRow[] = [];
    const expenses: ReportRow[] = [];

    const { data: expenseData } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    expenseData?.forEach((row: any) => {
      if (row.status === "VOIDED") return;

      expenses.push({
        transactionDate: row.expense_date || "",
        referenceNo: row.reference_no || String(row.id || ""),
        source: row.source || row.source_type || "Expense",
        name: row.employee_name || "",
        category: row.category || "",
        subcategory: row.subcategory || "",
        amount: Number(row.amount || 0),
        paidAmount: Number(row.amount || 0),
        balance: 0,
        paymentMethod: row.payment_method || "",
        status: row.status || "ACTIVE",
        createdBy: row.encoded_by || row.released_by || "",
        createdAt: row.created_at || "",
      });
    });

    const { data: roomSales } = await supabase
      .from("finance_hotel_reservations")
      .select("*")
      .order("check_in", { ascending: false });

    roomSales?.forEach((row: any) => {
      income.push({
        transactionDate: row.check_in || row.created_at || "",
        referenceNo: row.reservation_number || String(row.id || ""),
        source: row.booking_source || "Room Sales",
        name: row.guest_name || "",
        category: row.room_type || "Rooms",
        subcategory: row.room || "",
        amount: Number(row.grand_total || row.total_sales || 0),
        paidAmount: Number(row.amount_paid || 0),
        balance: Number(row.balance_due || row.unpaid_balance || 0),
        paymentMethod: "",
        status: row.status || "",
        createdBy: "",
        createdAt: row.created_at || "",
      });
    });

    const { data: apartmentBills } = await supabase
      .from("apartment_bills")
      .select("*, apartment_units(unit_name, tenant_name)")
      .order("created_at", { ascending: false });

    const { data: apartmentPayments } = await supabase
      .from("apartment_payments")
      .select("*");

    apartmentBills?.forEach((bill: any) => {
      const payments =
        apartmentPayments?.filter(
          (p: any) => p.bill_id === bill.id && p.status !== "VOIDED"
        ) || [];

      const paid = payments.reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0
      );

      const total =
        Number(bill.rent_amount || 0) +
        Number(bill.electric_amount || 0) +
        Number(bill.water_amount || 0) +
        Number(bill.internet_amount || 0) +
        Number(bill.other_amount || 0);

      income.push({
        transactionDate: bill.due_date || bill.created_at || "",
        referenceNo: String(bill.id || ""),
        source: "Apartment",
        name: bill.apartment_units?.tenant_name || "",
        category: "Apartment Rent",
        subcategory: bill.apartment_units?.unit_name || "",
        amount: total,
        paidAmount: paid,
        balance: Math.max(total - paid, 0),
        paymentMethod: payments[0]?.payment_method || "",
        status: paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
        createdBy: "",
        createdAt: bill.created_at || "",
      });
    });

    setIncomeRows(income);
    setExpenseRows(expenses);
    setLoading(false);
  }

  const filteredIncome = useMemo(() => filterByDate(incomeRows), [incomeRows, dateFrom, dateTo]);
  const filteredExpenses = useMemo(() => filterByDate(expenseRows), [expenseRows, dateFrom, dateTo]);

  function filterByDate(rows: ReportRow[]) {
    return rows.filter((row) => {
      if (!row.transactionDate) return true;
      const d = row.transactionDate.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }

  const totalIncome = filteredIncome.reduce((s, r) => s + r.paidAmount, 0);
  const totalExpenses = filteredExpenses.reduce((s, r) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const receivables = filteredIncome.reduce((s, r) => s + r.balance, 0);

  function exportCSV(filename: string, rows: ReportRow[]) {
    const headers = [
      "Transaction Date",
      "Reference No",
      "Source",
      "Name",
      "Category",
      "Subcategory",
      "Amount",
      "Paid Amount",
      "Balance",
      "Payment Method",
      "Status",
      "Created By",
      "Created At",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.transactionDate,
          r.referenceNo,
          r.source,
          r.name,
          r.category,
          r.subcategory,
          r.amount,
          r.paidAmount,
          r.balance,
          r.paymentMethod,
          r.status,
          r.createdBy,
          r.createdAt,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageGuard moduleKey="finance_dashboard">
      <div className="flex min-h-screen bg-slate-950 text-white">
<main className="min-w-0 flex-1 overflow-x-hidden p-6">
          <section className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Reports Center
            </p>
            <h1 className="mt-2 text-4xl font-black">Finance Reports</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Standardized income, expense, apartment, room sales, and profit reports.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:grid-cols-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={loadReports}
                className="w-full rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-300"
              >
                Refresh Reports
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => exportCSV("opscore_all_income_expense_report.csv", [...filteredIncome, ...filteredExpenses])}
                className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Export All
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Kpi title="Total Income" value={peso(totalIncome)} />
            <Kpi title="Total Expenses" value={peso(totalExpenses)} />
            <Kpi title="Net Profit" value={peso(netProfit)} />
            <Kpi title="Receivables" value={peso(receivables)} />
          </section>

          <section className="mb-6 flex flex-wrap gap-3">
            <TabButton label="Summary" active={activeTab === "summary"} onClick={() => setActiveTab("summary")} />
            <TabButton label="Income Report" active={activeTab === "income"} onClick={() => setActiveTab("income")} />
            <TabButton label="Expense Report" active={activeTab === "expenses"} onClick={() => setActiveTab("expenses")} />
            <TabButton label="Profit & Loss" active={activeTab === "pl"} onClick={() => setActiveTab("pl")} />
          </section>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
              Loading reports...
            </div>
          ) : (
            <>
              {activeTab === "summary" && (
                <ReportTable
                  title="All Income & Expenses"
                  rows={[...filteredIncome, ...filteredExpenses]}
                  onExport={() =>
                    exportCSV("opscore_all_income_expense_report.csv", [
                      ...filteredIncome,
                      ...filteredExpenses,
                    ])
                  }
                />
              )}

              {activeTab === "income" && (
                <ReportTable
                  title="Income Report"
                  rows={filteredIncome}
                  onExport={() => exportCSV("opscore_income_report.csv", filteredIncome)}
                />
              )}

              {activeTab === "expenses" && (
                <ReportTable
                  title="Expense Report"
                  rows={filteredExpenses}
                  onExport={() => exportCSV("opscore_expense_report.csv", filteredExpenses)}
                />
              )}

              {activeTab === "pl" && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                  <h2 className="text-2xl font-black">Profit & Loss Summary</h2>

                  <div className="mt-6 space-y-4">
                    <PLRow label="Total Income" value={totalIncome} />
                    <PLRow label="Total Expenses" value={totalExpenses} />
                    <div className="border-t border-slate-700 pt-4">
                      <PLRow label="Net Profit" value={netProfit} bold />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </PageGuard>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-bold ${
        active
          ? "bg-amber-400 text-slate-950"
          : "border border-slate-700 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function ReportTable({
  title,
  rows,
  onExport,
}: {
  title: string;
  rows: ReportRow[];
  onExport: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-sm text-slate-400">Showing {rows.length} records</p>
        </div>

        <button
          onClick={onExport}
          className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-300"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1400px] w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3">Transaction Date</th>
              <th className="px-4 py-3">Reference No</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Subcategory</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Payment Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3">Created At</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-800/60">
                  <td className="px-4 py-3">{formatDate(row.transactionDate)}</td>
                  <td className="px-4 py-3">{row.referenceNo}</td>
                  <td className="px-4 py-3">{row.source}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3">{row.subcategory}</td>
                  <td className="px-4 py-3 text-right">{peso(row.amount)}</td>
                  <td className="px-4 py-3 text-right">{peso(row.paidAmount)}</td>
                  <td className="px-4 py-3 text-right">{peso(row.balance)}</td>
                  <td className="px-4 py-3">{row.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold">
                      {row.status || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.createdBy}</td>
                  <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PLRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "text-xl font-black" : "text-base"}`}>
      <span>{label}</span>
      <span>{peso(value)}</span>
    </div>
  );
}

function peso(value: number) {
  return `â‚±${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-PH");
}

function formatDateTime(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-PH");
}



