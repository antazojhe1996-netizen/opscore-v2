"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);

  const [billMonth, setBillMonth] = useState(new Date().getMonth() + 1);
  const [category, setCategory] = useState("Electric");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

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
      `Mark ${bill.category} ₱${Number(bill.amount).toLocaleString()} as PAID and create expense entry?`
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
  })
  .eq("id", bill.id);
  

    if (billError) {
      console.error("MARK BILL PAID ERROR:", billError);
      alert("Expense was created but bill status failed to update.");
      return;
    }

    await getBills();
  };

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

  useEffect(() => {
    getBills();
  }, [selectedYear]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Finance
          </p>
          <h1 className="mt-2 text-4xl font-black">Bills Monitoring</h1>
          <p className="mt-2 text-sm text-slate-400">
            Track due dates, monthly hotel bills, overdue obligations, and auto-create expenses when paid.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          <SummaryCard title="Total Bills" value={grandTotal} />
          <SummaryCard title="Pending" value={pendingTotal} />
          <SummaryCard title="Due in 7 Days" value={dueSoonTotal} warning />
          <SummaryCard title="Overdue" value={overdueTotal} danger />
          <SummaryCard title="Paid" value={paidTotal} success />
        </section>

        <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h2 className="text-lg font-bold text-amber-300">Finance AI Alerts</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {overdueBills.map((bill) => {
              const daysLeft = getDaysLeft(bill.due_date);

              return (
                <AlertCard
                  key={bill.id}
                  type="OVERDUE BILL"
                  title={bill.category}
                  amount={bill.amount}
                  message={`${Math.abs(daysLeft || 0)} day(s) overdue`}
                  danger
                />
              );
            })}

            {upcomingBills.map((bill) => {
              const daysLeft = getDaysLeft(bill.due_date);

              return (
                <AlertCard
                  key={bill.id}
                  type="DUE SOON"
                  title={bill.category}
                  amount={bill.amount}
                  message={
                    daysLeft === 0
                      ? "Due today"
                      : `Due in ${daysLeft} day(s)`
                  }
                  warning
                />
              );
            })}

            {overdueBills.length === 0 && upcomingBills.length === 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="font-bold text-emerald-300">✅ No bill alerts</p>
                <p className="mt-1 text-sm text-slate-300">
                  All tracked bills are currently healthy.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-lg font-bold">Add Monthly Bill</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <Field label="Year">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Month">
              <select
                value={billMonth}
                onChange={(e) => setBillMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </Field>

            <Field label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </Field>

            <Field label="Remarks">
              <input
                placeholder="Optional"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </Field>

            <div className="flex items-end">
              <button
                onClick={addBill}
                className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400"
              >
                Add Bill
              </button>
            </div>
          </div>
        </section>

        <section className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Monthly Bills - {selectedYear}</h2>
            <p className="text-sm text-slate-400">
              Includes due date, status, days left, and payment action.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-400">
              Payment Method for Paid Bills
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[1300px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-200">
                <th className="border border-slate-700 px-3 py-3 text-left">
                  Month
                </th>

                {BILL_CATEGORIES.map((cat) => (
                  <th
                    key={cat}
                    className="border border-slate-700 px-3 py-3 text-center"
                  >
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {MONTHS.map((month, monthIndex) => (
                <tr key={month} className="hover:bg-slate-800/60">
                  <td className="border border-slate-800 px-3 py-3 font-bold">
                    {month}
                  </td>

                  {BILL_CATEGORIES.map((cat) => {
                    const bill = getBill(monthIndex + 1, cat);
                    const displayStatus = bill ? getDisplayStatus(bill) : "";
                    const daysLeft = bill ? getDaysLeft(bill.due_date) : null;

                    return (
                      <td
                        key={cat}
                        className="border border-slate-800 px-3 py-3 text-center"
                      >
                        {bill ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="font-bold">
                              ₱{Number(bill.amount).toLocaleString()}
                            </span>

                            <span className="text-xs text-slate-400">
                              Due: {bill.due_date || "No due date"}
                            </span>

                            <StatusBadge status={displayStatus} />

                            {bill.status !== "Paid" && bill.status !== "Cancelled" && (
                              <span
                                className={`text-[10px] ${
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
                              </span>
                            )}

                            <div className="flex flex-wrap justify-center gap-1">
                              {bill.status !== "Paid" && bill.status !== "Cancelled" && (
                                <button
                                  onClick={() => markPaid(bill)}
                                  className="rounded bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-400"
                                >
                                  Paid
                                </button>
                              )}

                              {bill.status !== "Paid" && bill.status !== "Cancelled" && (
                                <button
                                  onClick={() => cancelBill(bill)}
                                  className="rounded bg-slate-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-500"
                                >
                                  Cancel
                                </button>
                              )}

                              {bill.status !== "Paid" && (
                                <button
                                  onClick={() => deleteBill(bill)}
                                  className="rounded bg-red-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-400"
                                >
                                  Del
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">0.00</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr className="bg-slate-800 font-black">
                <td className="border border-slate-700 px-3 py-3">Total</td>

                {categoryTotals.map((total, index) => (
                  <td
                    key={BILL_CATEGORIES[index]}
                    className="border border-slate-700 px-3 py-3 text-center"
                  >
                    ₱{total.toLocaleString()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        {loading && (
          <p className="mt-4 text-sm text-slate-400">Loading bills...</p>
        )}
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
      <label className="mb-1 block text-xs font-bold text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  danger,
  warning,
  success,
}: {
  title: string;
  value: number;
  danger?: boolean;
  warning?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h3
        className={`mt-2 text-2xl font-black ${
          danger
            ? "text-red-400"
            : warning
            ? "text-amber-400"
            : success
            ? "text-emerald-400"
            : "text-white"
        }`}
      >
        ₱{Number(value || 0).toLocaleString()}
      </h3>
    </div>
  );
}

function AlertCard({
  type,
  title,
  amount,
  message,
  danger,
  warning,
}: {
  type: string;
  title: string;
  amount: number;
  message: string;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        danger
          ? "border-red-500/30 bg-red-500/10"
          : warning
          ? "border-amber-500/30 bg-slate-950/60"
          : "border-slate-700 bg-slate-950"
      }`}
    >
      <p
        className={`text-xs font-black tracking-[0.2em] ${
          danger ? "text-red-300" : "text-amber-300"
        }`}
      >
        ⚠️ {type}
      </p>

      <p className="mt-2 font-bold">{title}</p>

      <p className="mt-1 text-sm text-slate-300">
        ₱{Number(amount || 0).toLocaleString()}
      </p>

      <p className="mt-1 text-xs text-slate-400">{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${
        status === "Paid"
          ? "bg-emerald-500/20 text-emerald-300"
          : status === "Overdue"
          ? "bg-red-500/20 text-red-300"
          : status === "Cancelled"
          ? "bg-slate-500/20 text-slate-300"
          : "bg-amber-500/20 text-amber-300"
      }`}
    >
      {status}
    </span>
  );
}