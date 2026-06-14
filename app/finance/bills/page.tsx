"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/app/lib/supabase";

type Bill = {
  id: string;
  company_id: string | null;
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

const companyIdKey = "opscore_current_company_id";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const [companyId, setCompanyId] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);

  const [billMonth, setBillMonth] = useState(new Date().getMonth() + 1);
  const [category, setCategory] = useState("Electric");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const formatMoney = (value: number | string | null | undefined) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getBills = async (activeCompanyId = companyId) => {
    if (!activeCompanyId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("finance_bills")
      .select("*")
      .eq("company_id", activeCompanyId)
      .eq("bill_year", selectedYear)
      .order("bill_month", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) {
      console.error("GET BILLS ERROR:", error);
      alert(error.message || "Failed to load bills.");
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

    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const addBill = async () => {
    if (!companyId) {
      alert("No active company session. Please login again.");
      return;
    }

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
      company_id: companyId,
      bill_year: selectedYear,
      bill_month: billMonth,
      category,
      amount: numericAmount,
      due_date: dueDate,
      remarks: remarks.trim() || null,
      status: "Pending",
    });

    if (error) {
      console.error("ADD BILL ERROR:", error);
      alert(error.message || "Failed to add bill.");
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

    if (!confirm("Delete this bill?")) return;

    const { error } = await supabase
      .from("finance_bills")
      .delete()
      .eq("id", bill.id)
      .eq("company_id", companyId);

    if (error) {
      console.error("DELETE BILL ERROR:", error);
      alert(error.message || "Failed to delete bill.");
      return;
    }

    await getBills();
  };

  const cancelBill = async (bill: Bill) => {
    if (bill.status === "Paid") {
      alert("Paid bills cannot be cancelled. Adjust it from expenses instead.");
      return;
    }

    if (!confirm("Cancel this bill?")) return;

    const { error } = await supabase
      .from("finance_bills")
      .update({ status: "Cancelled" })
      .eq("id", bill.id)
      .eq("company_id", companyId);

    if (error) {
      console.error("CANCEL BILL ERROR:", error);
      alert(error.message || "Failed to cancel bill.");
      return;
    }

    await getBills();
  };

  const markPaid = async (bill: Bill) => {
    if (!companyId) {
      alert("No active company session. Please login again.");
      return;
    }

    if (bill.status === "Paid") return;

    const confirmed = confirm(
      `Mark ${bill.category} ${formatMoney(bill.amount)} as PAID and create expense entry?`
    );

    if (!confirmed) return;

    const paidDate = today;

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        company_id: companyId,
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
      alert(expenseError.message || "Failed to create expense entry.");
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
      .eq("id", bill.id)
      .eq("company_id", companyId);

    if (billError) {
      console.error("MARK BILL PAID ERROR:", billError);
      alert(billError.message || "Expense was created but bill status failed to update.");
      return;
    }

    await getBills();
  };

  const activeBills = bills.filter((bill) => bill.status !== "Cancelled");

  const overdueBills = useMemo(
    () =>
      activeBills
        .filter((bill) => getDisplayStatus(bill) === "Overdue")
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))),
    [bills]
  );

  const upcomingBills = useMemo(
    () =>
      activeBills
        .filter((bill) => {
          const daysLeft = getDaysLeft(bill.due_date);
          return bill.status !== "Paid" && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
        })
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))),
    [bills]
  );

  const getBill = (month: number, categoryName: string) =>
    bills.find((bill) => bill.bill_month === month && bill.category === categoryName);

  const pendingTotal = activeBills
    .filter((bill) => getDisplayStatus(bill) === "Pending")
    .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

  const dueSoonTotal = upcomingBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const overdueTotal = overdueBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

  const paidTotal = activeBills
    .filter((bill) => bill.status === "Paid")
    .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

  const grandTotal = activeBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

  const categoryTotals = BILL_CATEGORIES.map((cat) =>
    activeBills
      .filter((bill) => bill.category === cat)
      .reduce((sum, bill) => sum + Number(bill.amount || 0), 0)
  );

  const alertBills = [...overdueBills, ...upcomingBills];

  useEffect(() => {
    const storedCompanyId = localStorage.getItem(companyIdKey) || "";
    setCompanyId(storedCompanyId);
  }, []);

  useEffect(() => {
    if (companyId) getBills(companyId);
  }, [companyId, selectedYear]);

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="FINANCE / BILLS WORKBENCH" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Finance
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Finance Bills Workbench
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Track recurring hotel bills, monitor due dates, mark paid bills, and auto-create expense entries.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <NavButton href="/finance" label="Financial Command Center" />
              <NavButton href="/finance/expenses" label="Expenses Ledger" />
              <NavButton href="/finance/cash" label="Cash Management" />
            </div>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Outstanding" value={formatMoney(pendingTotal + dueSoonTotal + overdueTotal)} subtitle="Pending, due soon, and overdue bills" />
            <MetricCard title="Due Soon" value={formatMoney(dueSoonTotal)} subtitle={`${upcomingBills.length} bill(s) within 7 days`} tone="warning" />
            <MetricCard title="Overdue" value={formatMoney(overdueTotal)} subtitle={`${overdueBills.length} overdue bill(s)`} tone="danger" />
            <MetricCard title="Paid" value={formatMoney(paidTotal)} subtitle={`${selectedYear} paid bill total`} tone="success" />
          </section>

          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Bill Controls
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Monthly Bills - {selectedYear}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Use the grid to review status, due dates, and payment actions.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[160px_240px]">
                <Field label="Year">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                    {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Payment Method">
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Monthly Category Report
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Bills Matrix
                </h2>
              </div>

              <div className="overflow-auto p-4">
                <table className="w-full min-w-[1300px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="border border-slate-200 px-3 py-3">Month</th>
                      {BILL_CATEGORIES.map((cat) => (
                        <th key={cat} className="border border-slate-200 px-3 py-3 text-center">{cat}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {MONTHS.map((month, monthIndex) => (
                      <tr key={month} className="transition-all duration-200 hover:bg-slate-50">
                        <td className="border border-slate-200 bg-slate-50 px-3 py-3 font-black text-slate-950">
                          {month}
                        </td>

                        {BILL_CATEGORIES.map((cat) => {
                          const bill = getBill(monthIndex + 1, cat);
                          const displayStatus = bill ? getDisplayStatus(bill) : "";
                          const daysLeft = bill ? getDaysLeft(bill.due_date) : null;

                          return (
                            <td key={cat} className="border border-slate-200 px-3 py-3 text-center align-top">
                              {bill ? (
                                <div className="flex min-h-[138px] flex-col items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                                  <div>
                                    <p className="font-black text-slate-950">{formatMoney(bill.amount)}</p>
                                    <p className="mt-1 text-xs font-bold text-slate-500">
                                      Due: {bill.due_date || "No due date"}
                                    </p>
                                    <div className="mt-2 flex justify-center">
                                      <StatusBadge status={displayStatus} />
                                    </div>
                                    {bill.status !== "Paid" && bill.status !== "Cancelled" && (
                                      <p className="mt-2 text-[10px] font-bold text-slate-500">
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
                                      <button onClick={() => markPaid(bill)} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]">
                                        Paid
                                      </button>
                                    )}
                                    {bill.status !== "Paid" && bill.status !== "Cancelled" && (
                                      <button onClick={() => cancelBill(bill)} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                                        Cancel
                                      </button>
                                    )}
                                    {bill.status !== "Paid" && (
                                      <button onClick={() => deleteBill(bill)} className="rounded-xl bg-red-600 px-3 py-1.5 text-[10px] font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]">
                                        Del
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-slate-400">No bill</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    <tr className="bg-slate-50 font-black text-slate-950">
                      <td className="border border-slate-200 px-3 py-3">Total</td>
                      {categoryTotals.map((total, index) => (
                        <td key={BILL_CATEGORIES[index]} className="border border-slate-200 px-3 py-3 text-center">
                          {formatMoney(total)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>

                {loading && <p className="mt-4 text-sm font-semibold text-slate-500">Loading bills...</p>}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Add Bill
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    New Monthly Bill
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Add recurring or one-time bill for tracking.
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  <Field label="Month">
                    <select value={billMonth} onChange={(e) => setBillMonth(Number(e.target.value))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                      {MONTHS.map((month, index) => (
                        <option key={month} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Bill Category">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                      {BILL_CATEGORIES.map((cat) => (
                        <option key={cat}>{cat}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Amount">
                    <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                  </Field>

                  <Field label="Due Date">
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                  </Field>

                  <Field label="Remarks">
                    <textarea placeholder="Optional notes" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                  </Field>

                  <div className="border-t border-slate-100 pt-4">
                    <button onClick={addBill} className="h-11 w-full rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]">
                      Add Bill
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Bill Alerts
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
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
                        amount={formatMoney(bill.amount)}
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
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                      <p className="font-black">No bill alerts</p>
                      <p className="mt-1 text-sm font-semibold">
                        All tracked bills are currently healthy.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Ledger Rule
                </p>
                <p className="mt-2 leading-6">
                  Marking a bill as paid creates an expense entry. Paid bills are locked from deletion to protect reporting history.
                </p>
                <p className="mt-3 text-xs font-bold text-slate-500">
                  Total tracked bills: {formatMoney(grandTotal)}
                </p>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function NavButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
    >
      {label}
    </Link>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
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
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const valueClass =
    tone === "danger"
      ? "text-red-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "success"
      ? "text-emerald-700"
      : "text-slate-950";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h3 className={`mt-2 break-words text-3xl font-black tracking-tight ${valueClass}`}>
        {value}
      </h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {subtitle}
      </p>
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
  amount: string;
  message: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${
        danger
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <p className="uppercase tracking-[0.18em]">{type}</p>
      <p className="mt-2 text-sm font-black">{title}</p>
      <p>{amount}</p>
      <p>{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "Paid"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Overdue"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "Cancelled"
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${style}`}>
      {status}
    </span>
  );
}