"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ApartmentPaymentsPage() {
  /// STATES
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [billId, setBillId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [remarks, setRemarks] = useState("");

  /// FUNCTIONS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getBills = async () => {
    const { data, error } = await supabase
      .from("apartment_bills")
      .select(`
        *,
        apartment_units (
          unit_name,
          tenant_name
        ),
        apartment_payments (
          amount
        )
      `)
      .order("due_date", { ascending: false });

    if (error) {
      console.log("GET PAYMENT BILLS ERROR:", error);
      return;
    }

    setBills(data || []);
  };

  const getPayments = async () => {
    const { data, error } = await supabase
      .from("apartment_payments")
      .select(`
        *,
        apartment_bills (
          bill_month,
          apartment_units (
            unit_name,
            tenant_name
          )
        )
      `)
      .order("payment_date", { ascending: false });

    if (error) {
      console.log("GET PAYMENTS ERROR:", error);
      return;
    }

    setPayments(data || []);
  };

  const getTotalBill = (bill: any) => {
    return (
      Number(bill.rent_amount || 0) +
      Number(bill.electric_amount || 0) +
      Number(bill.water_amount || 0) +
      Number(bill.internet_amount || 0) +
      Number(bill.other_amount || 0)
    );
  };

  const getTotalPaid = (bill: any) => {
    return (bill.apartment_payments || []).reduce(
      (sum: number, payment: any) => sum + Number(payment.amount || 0),
      0
    );
  };

  const getBalance = (bill: any) => {
    return getTotalBill(bill) - getTotalPaid(bill);
  };

  const unpaidBills = bills.filter((bill) => getBalance(bill) > 0);

  const addPayment = async () => {
    if (!billId || !paymentDate || !amount) {
      alert("Please select bill, payment date, and amount.");
      return;
    }

    const { error } = await supabase.from("apartment_payments").insert({
      bill_id: billId,
      payment_date: paymentDate,
      amount: Number(amount || 0),
      payment_method: paymentMethod,
      remarks,
    });

    if (error) {
      console.log("ADD PAYMENT ERROR:", error);
      alert("Failed to record payment.");
      return;
    }

    setBillId("");
    setPaymentDate("");
    setAmount("");
    setPaymentMethod("");
    setRemarks("");

    getBills();
    getPayments();
  };

  const deletePayment = async (id: string) => {
    const confirmDelete = confirm("Delete this payment?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("apartment_payments").delete().eq("id", id);

    if (error) {
      console.log("DELETE PAYMENT ERROR:", error);
      alert("Failed to delete payment.");
      return;
    }

    getBills();
    getPayments();
  };

  /// EFFECTS
  useEffect(() => {
    getBills();
    getPayments();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 space-y-6 p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Apartment Module
          </p>
          <h1 className="mt-2 text-3xl font-bold">Apartment Payments</h1>
          <p className="mt-1 text-sm text-slate-400">
            Record partial or full payments for rent, electric, water, internet, and other apartment charges.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Record Payment</h2>

            <div className="mt-5 space-y-4">
              <select
                value={billId}
                onChange={(e) => setBillId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              >
                <option value="">Select unpaid bill</option>
                {unpaidBills.map((bill) => (
                  <option key={bill.id} value={bill.id}>
                    {bill.apartment_units?.unit_name} - {bill.apartment_units?.tenant_name || "No tenant"} - {bill.bill_month} - Balance {formatMoney(getBalance(bill))}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                placeholder="Payment amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              >
                <option value="">Payment method</option>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>

              <textarea
                placeholder="Remarks / Reference number"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <button
                onClick={addPayment}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500"
              >
                Save Payment
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <h2 className="mb-4 text-xl font-bold">Unpaid Bills</h2>

            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Total Bill</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {unpaidBills.map((bill) => (
                    <tr key={bill.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-white">
                        {bill.apartment_units?.unit_name}
                      </td>
                      <td className="px-4 py-3">{bill.apartment_units?.tenant_name || "-"}</td>
                      <td className="px-4 py-3">{bill.bill_month}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(getTotalBill(bill))}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatMoney(getTotalPaid(bill))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(getBalance(bill))}
                      </td>
                    </tr>
                  ))}

                  {unpaidBills.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No unpaid apartment bills.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Payment History</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Bill Month</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="px-4 py-3">{payment.payment_date}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      {payment.apartment_bills?.apartment_units?.unit_name}
                    </td>
                    <td className="px-4 py-3">
                      {payment.apartment_bills?.apartment_units?.tenant_name || "-"}
                    </td>
                    <td className="px-4 py-3">{payment.apartment_bills?.bill_month}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-4 py-3">{payment.payment_method || "-"}</td>
                    <td className="px-4 py-3">{payment.remarks || "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deletePayment(payment.id)}
                        className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No apartment payments recorded yet.
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