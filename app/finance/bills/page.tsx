"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type Bill = {
  id: string;
  bill_year: number;
  bill_month: number;
  category: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  remarks: string | null;
  expense_id: string | null;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const BILL_CATEGORIES = [
  "Electric",
  "Water",
  "Internet",
  "Netflix",
  "Rent",
  "System Fee",
  "Sanitary",
  "Pool League",
];

const PAYMENT_METHODS = ["Cash", "GCash", "Bank", "Card", "Other"];

export default function BillsPage() {
  /// STATES
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);

  const [billMonth, setBillMonth] = useState(new Date().getMonth() + 1);
  const [category, setCategory] = useState("Electric");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  /// FUNCTIONS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getBills = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("finance_bills")
      .select("*")
      .eq("bill_year", selectedYear)
      .order("bill_month", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) {
      console.error("GET BILLS ERROR:", error);
      alert("Failed to load bills.");
    } else {
      setBills((data || []) as Bill[]);
    }

    setLoading(false);
  };

  const getDisplayStatus = (bill: Bill) => {
    if (bill.status === "Paid") return "Paid";
    if (bill.status === "Cancelled") return "Cancelled";
    if (bill.due_date && bill.due_date < today) return "Overdue";
    return "Pending";
  };

  const getDaysLeft = (dueDateValue: string | null) => {
    if (!dueDateValue) return null;

    const due = new Date(`${dueDateValue}T00:00:00`);
    const now = new Date(`${today}T00:00:00`);
    const diff = due.getTime() - now.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const addBill = async () => {
    if (!category || !amount || !dueDate) {
      alert("Please complete category, amount, and due date.");
      return;
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      alert("Invalid amount.");
      return;
    }

    const existingBill = bills.find(
      (bill) =>
        bill.bill_year === selectedYear &&
        bill.bill_month === billMonth &&
        bill.category === category
    );

    if (existingBill) {
      alert("This bill category already exists for this month.");
      return;
    }

    const { error } = await supabase.from("finance_bills").insert({
      bill_year: selectedYear,
      bill_month: billMonth,
      category,
      amount: numericAmount,
      due_date: dueDate,
      remarks: remarks || null,
      status: "Pending",
    });

    if (error) {
      console.error("ADD BILL ERROR:", error);
      alert("Failed to add bill.");
      return;
    }

    setAmount("");
    setDueDate("");
    setRemarks("");
    await getBills();
  };

  const deleteBill = async (bill: Bill) => {
    if (bill.status === "Paid") {
      alert("Paid bills cannot be deleted because an expense entry was already created.");
      return;
    }

    const confirmed = confirm("Delete this bill?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("finance_bills")
      .delete()
      .eq("id", bill.id);

    if (error) {
      console.error("DELETE BILL ERROR:", error);
      alert("Failed to delete bill.");
      return;
    }

    await getBills();
  };

  const cancelBill = async (bill: Bill) => {
    if (bill.status === "Paid") {
      alert("Paid bills cannot be cancelled. Adjust it from expenses instead.");
      return;
    }

    const confirmed = confirm("Cancel this bill?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("finance_bills")
      .update({ status: "Cancelled" })
      .eq("id", bill.id);

    if (error) {
      console.error("CANCEL BILL ERROR:", error);
      alert("Failed to cancel bill.");
      return;
    }

    await getBills();
  };

  const markPaid = async (bill: Bill) => {
    if (bill.status === "Paid") return;

    const confirmed = confirm(
      `Mark ${bill.category} ${formatMoney(bill.amount)} as PAID and create expense entry?`
    );

    if (!confirmed) return;

    const paidDate = today;

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        expense_date: paidDate,
        category: bill.category,
        department: "General",
        description: `${bill.category} Bill - ${MONTHS[bill.bill_month - 1]} ${bill.bill_year}`,
        amount: bill.amount,
        payment_method: paymentMethod,
        remarks: bill.remarks || "Generated from Bills Module",
        source: "Bills Module",
      })
      .select("id")
      .single();

    if (expenseError) {
      console.error("CREATE EXPENSE FROM BILL ERROR:", expenseError);
      alert("Failed to create expense entry. Check expenses table columns.");
      return;
    }

    const { error: billError } = await supabase
      .from("finance_bills")
      .update({
        status: "Paid",
        paid_date: paidDate,
        payment_method: paymentMethod,
        expense_id: expenseData?.id || null,
      })
      .eq("id", bill.id);

    if (billError) {
      console.error("MARK BILL PAID ERROR:", billError);
      alert("Expense was created but bill status failed to update.");
      return;
    }

    await getBills();
  };

  /// CALCULATIONS
  const activeBills = bills.filter((bill) => bill.status !== "Cancelled");

  const overdueBills = useMemo(() => {
    return activeBills
      .filter((bill) => getDisplayStatus(bill) === "Overdue")
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  }, [bills]);

  const upcomingBills = useMemo(() => {
    return activeBills
      .filter((bill) => {
        const daysLeft = getDaysLeft(bill.due_date);

        return (
          bill.status !== "Paid" &&
          daysLeft !== null &&
          daysLeft >= 0 &&
          daysLeft <= 7
        );
      })
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  }, [bills]);

  const getBill = (month: number, categoryName: string) => {
    return bills.find(
      (bill) => bill.bill_month === month && bill.category === categoryName
    );
  };

  const grandTotal = useMemo(() => {
    return activeBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  }, [bills]);

  const pendingTotal = useMemo(() => {
    return activeBills
      .filter((bill) => getDisplayStatus(bill) === "Pending")
      .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  }, [bills]);

  const dueSoonTotal = useMemo(() => {
    return upcomingBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  }, [upcomingBills]);

  const overdueTotal = useMemo(() => {
    return overdueBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  }, [overdueBills]);

  const paidTotal = useMemo(() => {
    return activeBills
      .filter((bill) => bill.status === "Paid")
      .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  }, [bills]);

  const categoryTotals = useMemo(() => {
    return BILL_CATEGORIES.map((cat) =>
      activeBills
        .filter((bill) => bill.category === cat)
        .reduce((sum, bill) => sum + Number(bill.amount || 0), 0)
    );
  }, [bills]);

  const alertBills = [...overdueBills, ...upcomingBills];

  /// EFFECTS
  useEffect(() => {
    getBills();
  }, [selectedYear]);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
              Finance Workbench
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Finance Bills Workbench
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Track recurring hotel bills, monitor due dates, mark paid bills, and auto-create expense entries when bills are settled.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/finance"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
            >
              Financial Command Center
            </Link>
            <Link
              href="/finance/expenses"
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500"
            >
              Expenses Ledger
            </Link>
            <Link
              href="/finance/cash"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
            >
              Cash Management
            </Link>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Outstanding" value={formatMoney(pendingTotal + dueSoonTotal + overdueTotal)} subtitle="Pending, due soon, and overdue bills" />
          <MetricCard title="Due Soon" value={formatMoney(dueSoonTotal)} subtitle={`${upcomingBills.length} bill(s) within 7 days`} warning />
          <MetricCard title="Overdue" value={formatMoney(overdueTotal)} subtitle={`${overdueBills.length} overdue bill(s)`} danger />
          <MetricCard title="Paid" value={formatMoney(paidTotal)} subtitle={`${selectedYear} paid bill total`} success />
        </section>

        <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Bill Controls
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                Monthly Bills - {selectedYear}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Use the grid to review status, due dates, and payment actions.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[160px_220px]">
              <Field label="Year">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Payment Method for Paid Bills">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/10">
            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1300px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-slate-300">
                  <tr>
                    <th className="border border-slate-800 px-3 py-3 text-left">
                      Month
                    </th>

                    {BILL_CATEGORIES.map((cat) => (
                      <th
                        key={cat}
                        className="border border-slate-800 px-3 py-3 text-center"
                      >
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {MONTHS.map((month, monthIndex) => (
                    <tr key={month} className="hover:bg-slate-800/50">
                      <td className="border border-slate-800 bg-slate-950/50 px-3 py-3 font-black text-white">
                        {month}
                      </td>

                      {BILL_CATEGORIES.map((cat) => {
                        const bill = getBill(monthIndex + 1, cat);
                        const displayStatus = bill ? getDisplayStatus(bill) : "";
                        const daysLeft = bill ? getDaysLeft(bill.due_date) : null;

                        return (
                          <td
                            key={cat}
                            className="border border-slate-800 px-3 py-3 text-center align-top"
                          >
                            {bill ? (
                              <div className="flex min-h-[138px] flex-col items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                                <div>
                                  <p className="font-black text-white">
                                    {formatMoney(bill.amount)}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Due: {bill.due_date || "No due date"}
                                  </p>

                                  <div className="mt-2 flex justify-center">
                                    <StatusBadge status={displayStatus} />
                                  </div>

                                  {bill.status !== "Paid" && bill.status !== "Cancelled" && (
                                    <p
                                      className={`mt-2 text-[10px] font-bold ${
                                        daysLeft !== null && daysLeft < 0
                                          ? "text-red-300"
                                          : daysLeft === 0
                                          ? "text-amber-300"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {daysLeft === null
                                        ? "No due date"
                                        : daysLeft < 0
                                        ? `${Math.abs(daysLeft)} day(s) overdue`
                                        : daysLeft === 0
                                        ? "Due today"
                                        : `${daysLeft} day(s) left`}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-wrap justify-center gap-1">
                                  {bill.status !== "Paid" && bill.status !== "Cancelled" && (
                                    <button
                                      onClick={() => markPaid(bill)}
                                      className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black text-white hover:bg-emerald-500"
                                    >
                                      Paid
                                    </button>
                                  )}

                                  {bill.status !== "Paid" && bill.status !== "Cancelled" && (
                                    <button
                                      onClick={() => cancelBill(bill)}
                                      className="rounded-lg bg-slate-700 px-2 py-1 text-[10px] font-black text-white hover:bg-slate-600"
                                    >
                                      Cancel
                                    </button>
                                  )}

                                  {bill.status !== "Paid" && (
                                    <button
                                      onClick={() => deleteBill(bill)}
                                      className="rounded-lg border border-red-500/40 px-2 py-1 text-[10px] font-black text-red-300 hover:bg-red-500/10"
                                    >
                                      Del
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-slate-700">No bill</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  <tr className="bg-slate-950 font-black text-white">
                    <td className="border border-slate-800 px-3 py-3">Total</td>

                    {categoryTotals.map((total, index) => (
                      <td
                        key={BILL_CATEGORIES[index]}
                        className="border border-slate-800 px-3 py-3 text-center text-blue-200"
                      >
                        {formatMoney(total)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {loading && (
              <p className="mt-4 text-sm text-slate-400">Loading bills...</p>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                    Add Bill
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    New Monthly Bill
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Add recurring or one-time bill for tracking.
                  </p>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200">
                  {selectedYear}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Field label="Month">
                  <select
                    value={billMonth}
                    onChange={(e) => setBillMonth(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Bill Category">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {BILL_CATEGORIES.map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Amount">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </Field>

                <Field label="Due Date">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </Field>

                <Field label="Remarks">
                  <textarea
                    placeholder="Optional notes"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </Field>

                <button
                  onClick={addBill}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500"
                >
                  Add Bill
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Bill Alerts
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                Due and Overdue Watchlist
              </h2>

              <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
                {alertBills.map((bill) => {
                  const daysLeft = getDaysLeft(bill.due_date);
                  const status = getDisplayStatus(bill);

                  return (
                    <AlertCard
                      key={bill.id}
                      type={status === "Overdue" ? "OVERDUE" : "DUE SOON"}
                      title={`${bill.category} • ${MONTHS[bill.bill_month - 1]}`}
                      amount={bill.amount}
                      message={
                        daysLeft === null
                          ? "No due date"
                          : daysLeft < 0
                          ? `${Math.abs(daysLeft)} day(s) overdue`
                          : daysLeft === 0
                          ? "Due today"
                          : `Due in ${daysLeft} day(s)`
                      }
                      danger={status === "Overdue"}
                    />
                  );
                })}

                {alertBills.length === 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <p className="font-black text-emerald-300">No bill alerts</p>
                    <p className="mt-1 text-sm text-slate-300">
                      All tracked bills are currently healthy.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
              <p className="font-black uppercase tracking-[0.2em] text-slate-500">
                Ledger Rule
              </p>
              <p className="mt-2 leading-6">
                Marking a bill as paid creates an expense entry from this module. Paid bills are locked from deletion to protect reporting history.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Total tracked bills: {formatMoney(grandTotal)}
              </p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  danger,
  warning,
  success,
}: {
  title: string;
  value: string;
  subtitle: string;
  danger?: boolean;
  warning?: boolean;
  success?: boolean;
}) {
  const valueClass = danger
    ? "text-red-300"
    : warning
    ? "text-amber-300"
    : success
    ? "text-emerald-300"
    : "text-blue-200";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h3 className={`mt-2 break-words text-2xl font-black ${valueClass}`}>
        {value}
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
    </div>
  );
}

function AlertCard({
  type,
  title,
  amount,
  message,
  danger,
}: {
  type: string;
  title: string;
  amount: number;
  message: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        danger
          ? "border-red-500/30 bg-red-500/10"
          : "border-blue-500/20 bg-blue-500/10"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.2em] ${
          danger ? "text-red-300" : "text-blue-300"
        }`}
      >
        {type}
      </p>

      <p className="mt-2 font-black text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{formatCurrencyLocal(amount)}</p>
      <p className="mt-1 text-xs text-slate-400">{message}</p>
    </div>
  );
}

function formatCurrencyLocal(value: any) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "Paid"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "Overdue"
      ? "bg-red-500/15 text-red-300"
      : status === "Cancelled"
      ? "bg-slate-500/20 text-slate-300"
      : "bg-blue-500/15 text-blue-300";

  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${style}`}>
      {status}
    </span>
  );
}
