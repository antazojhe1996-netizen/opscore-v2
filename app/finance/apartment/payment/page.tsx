"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";

export default function ApartmentPaymentsPage() {
  /// STATES
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [billId, setBillId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  /// FUNCTIONS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getBills = async () => {
    const { data, error } = await supabase
      .from("apartment_bills")
      .select(
        `
        *,
        apartment_units (
          id,
          unit_name,
          tenant_name,
          status
        ),
        apartment_payments (
          id,
          amount,
          status
        )
      `,
      )
      .order("due_date", { ascending: false });

    if (error) {
      console.log("GET PAYMENT BILLS ERROR:", error);
      alert(error.message);
      return;
    }

    setBills(data || []);
  };

  const getPayments = async () => {
    const { data, error } = await supabase
      .from("apartment_payments")
      .select(
        `
        *,
        apartment_bills (
          id,
          bill_month,
          due_date,
          rent_amount,
          electric_amount,
          water_amount,
          internet_amount,
          other_amount,
          apartment_units (
            id,
            unit_name,
            tenant_name
          )
        )
      `,
      )
      .order("payment_date", { ascending: false });

    if (error) {
      console.log("GET PAYMENTS ERROR:", error);
      alert(error.message);
      return;
    }

    setPayments(data || []);
  };

  const refreshData = async () => {
    await getBills();
    await getPayments();
  };

  const getTotalBill = (bill: any) => {
    if (!bill) return 0;

    return (
      Number(bill.rent_amount || 0) +
      Number(bill.electric_amount || 0) +
      Number(bill.water_amount || 0) +
      Number(bill.internet_amount || 0) +
      Number(bill.other_amount || 0)
    );
  };

  const getTotalPaid = (bill: any) => {
    if (!bill) return 0;

    return (bill.apartment_payments || [])
      .filter(
        (payment: any) =>
          String(payment.status || "ACTIVE").toUpperCase() !== "VOIDED",
      )
      .reduce(
        (sum: number, payment: any) => sum + Number(payment.amount || 0),
        0,
      );
  };

  const getBalance = (bill: any) => getTotalBill(bill) - getTotalPaid(bill);

  const getBillStatus = (bill: any) => {
    if (!bill) return "NO BILL";

    const balance = getBalance(bill);
    const paid = getTotalPaid(bill);
    const today = new Date();
    const dueDate = new Date(`${bill.due_date}T00:00:00`);

    if (balance <= 0) return "PAID";
    if (paid > 0) return "PARTIAL";
    if (today > dueDate) return "OVERDUE";
    return "UNPAID";
  };

  const getStatusStyle = (status: string) => {
    if (status === "PAID") return "bg-emerald-500/10 text-emerald-400";
    if (status === "PARTIAL") return "bg-amber-500/10 text-amber-400";
    if (status === "OVERDUE") return "bg-red-500/10 text-red-400";
    if (status === "UNPAID") return "bg-orange-500/10 text-orange-400";
    return "bg-slate-700 text-slate-300";
  };

  const selectedBill = bills.find((bill) => String(bill.id) === String(billId));
  const selectedBalance = selectedBill ? getBalance(selectedBill) : 0;

  const resetForm = () => {
    setBillId("");
    setPaymentDate("");
    setAmount("");
    setPaymentMethod("");
    setRemarks("");
  };

  const addPayment = async () => {
    if (!billId || !paymentDate || !amount) {
      alert("Please select bill, payment date, and amount.");
      return;
    }

    const paymentAmount = Number(amount || 0);

    if (paymentAmount <= 0) {
      alert("Payment amount must be greater than zero.");
      return;
    }

    if (selectedBill && paymentAmount > selectedBalance) {
      alert(
        `Payment is higher than the remaining balance: ${formatMoney(selectedBalance)}`,
      );
      return;
    }

    const unitName = selectedBill?.apartment_units?.unit_name || "-";
    const tenantName = selectedBill?.apartment_units?.tenant_name || "-";
    const billMonth = selectedBill?.bill_month || "-";
    const balanceBefore = selectedBalance;
    const balanceAfter = balanceBefore - paymentAmount;

    setSaving(true);

    const paymentPayload = {
      bill_id: billId,
      payment_date: paymentDate,
      amount: paymentAmount,
      payment_method: paymentMethod,
      remarks,
      status: "ACTIVE",
    };

    const { data, error } = await supabase
      .from("apartment_payments")
      .insert(paymentPayload)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.log("ADD PAYMENT ERROR:", error);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Apartment Payments",
        action: "Receive Payment Failed",
        description: `Failed to record payment for ${unitName} (${tenantName}) ${billMonth}. Amount: ${formatMoney(paymentAmount)}. Error: ${error.message}`,
        severity: "critical",
        recordId: billId,
        newValue: {
          ...paymentPayload,
          unitName,
          tenantName,
          billMonth,
          balanceBefore,
          balanceAfter,
          error: error.message,
        },
      });

      alert(error.message);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Apartment Payments",
      action: "Receive Payment",
      description: `${unitName} (${tenantName}) payment received for ${billMonth}. Amount: ${formatMoney(paymentAmount)}. Balance: ${formatMoney(balanceBefore)} → ${formatMoney(balanceAfter)}`,
      severity: "warning",
      recordId: data?.id || null,
      newValue: {
        ...paymentPayload,
        id: data?.id || null,
        unitName,
        tenantName,
        billMonth,
        balanceBefore,
        balanceAfter,
      },
    });

    resetForm();
    refreshData();
  };

  const getCurrentUserName = () => {
    if (typeof window === "undefined") return "OPSCORE USER";

    const possibleKeys = [
      "opscore_user_name",
      "opscore_current_user_name",
      "opscore_employee_name",
      "currentEmployeeName",
      "userName",
    ];

    for (const key of possibleKeys) {
      const value = String(localStorage.getItem(key) || "").trim();
      if (value) return value;
    }

    return "OPSCORE USER";
  };

  const isVoidedPayment = (payment: any) =>
    String(payment?.status || "ACTIVE").toUpperCase() === "VOIDED";

  const voidPayment = async (id: string) => {
    const payment = payments.find((item) => String(item.id) === String(id));

    if (!payment) {
      alert("Payment record not found.");
      return;
    }

    if (isVoidedPayment(payment)) {
      alert("This payment is already voided.");
      return;
    }

    const unitName =
      payment?.apartment_bills?.apartment_units?.unit_name || "-";
    const tenantName =
      payment?.apartment_bills?.apartment_units?.tenant_name || "-";
    const billMonth = payment?.apartment_bills?.bill_month || "-";
    const paymentAmount = Number(payment?.amount || 0);
    const voidedBy = getCurrentUserName();
    const voidedAt = new Date().toISOString();

    const reason = window.prompt(
      `Void this apartment payment?\n\n${unitName} (${tenantName}) ${billMonth}\nAmount: ${formatMoney(paymentAmount)}\n\nReason is required:`,
    );

    if (reason === null) return;

    const cleanReason = reason.trim();

    if (!cleanReason) {
      alert("Void reason is required.");
      return;
    }

    const oldRemarks = String(payment?.remarks || "").trim();
    const voidTrail = `[VOIDED by ${voidedBy} at ${voidedAt.slice(0, 16).replace("T", " ")}] Reason: ${cleanReason}`;
    const updatedRemarks = oldRemarks
      ? `${oldRemarks} ${voidTrail}`
      : voidTrail;

    setSaving(true);

    const { error } = await supabase
      .from("apartment_payments")
      .update({
        status: "VOIDED",
        void_reason: cleanReason,
        voided_by: voidedBy,
        voided_at: voidedAt,
        remarks: updatedRemarks,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      console.log("VOID PAYMENT ERROR:", error);

      await createAuditLog({
        userName: voidedBy,
        module: "Apartment Payments",
        action: "Void Payment Failed",
        description: `Failed to void payment for ${unitName} (${tenantName}) ${billMonth}. Amount: ${formatMoney(paymentAmount)}. Error: ${error.message}`,
        severity: "critical",
        recordId: id,
        oldValue: payment || null,
        newValue: {
          status: "VOIDED",
          voidReason: cleanReason,
          voidedBy,
          voidedAt,
          error: error.message,
        },
      });

      alert(error.message);
      return;
    }

    await createAuditLog({
      userName: voidedBy,
      module: "Apartment Payments",
      action: "Void Payment",
      description: `Voided payment for ${unitName} (${tenantName}) ${billMonth}. Amount: ${formatMoney(paymentAmount)}. Reason: ${cleanReason}. Bill balance reopened.`,
      severity: "critical",
      recordId: id,
      oldValue: payment || null,
      newValue: {
        status: "VOIDED",
        voidReason: cleanReason,
        voidedBy,
        voidedAt,
        balanceReopened: true,
      },
    });

    await refreshData();
  };

  /// CALCULATIONS
  const unpaidBills = bills.filter((bill) => getBalance(bill) > 0);

  const totalBilled = bills.reduce((sum, bill) => sum + getTotalBill(bill), 0);
  const totalCollected = bills.reduce(
    (sum, bill) => sum + getTotalPaid(bill),
    0,
  );
  const totalBalance = totalBilled - totalCollected;
  const overdueCount = bills.filter(
    (bill) => getBillStatus(bill) === "OVERDUE",
  ).length;

  const tenantLedger = useMemo(() => {
    const ledgerMap: Record<string, any> = {};

    bills.forEach((bill) => {
      const unit = bill.apartment_units;
      const key = String(unit?.id || bill.unit_id || "unknown");

      if (!ledgerMap[key]) {
        ledgerMap[key] = {
          unitName: unit?.unit_name || "-",
          tenantName: unit?.tenant_name || "-",
          unitStatus: unit?.status || "-",
          totalBill: 0,
          totalPaid: 0,
          totalBalance: 0,
          latestDueDate: "",
          billCount: 0,
          overdueCount: 0,
        };
      }

      const billTotal = getTotalBill(bill);
      const paidTotal = getTotalPaid(bill);
      const balance = billTotal - paidTotal;

      ledgerMap[key].totalBill += billTotal;
      ledgerMap[key].totalPaid += paidTotal;
      ledgerMap[key].totalBalance += balance;
      ledgerMap[key].billCount += 1;

      if (
        !ledgerMap[key].latestDueDate ||
        String(bill.due_date || "") > ledgerMap[key].latestDueDate
      ) {
        ledgerMap[key].latestDueDate = bill.due_date || "";
      }

      if (getBillStatus(bill) === "OVERDUE") {
        ledgerMap[key].overdueCount += 1;
      }
    });

    return Object.values(ledgerMap).sort((a: any, b: any) =>
      String(a.unitName || "").localeCompare(String(b.unitName || "")),
    );
  }, [bills]);

  /// EFFECTS
  useEffect(() => {
    refreshData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Apartment Module
            </p>

            <h1 className="mt-2 text-3xl font-bold">Apartment Payments</h1>

            <p className="mt-1 text-sm text-slate-400">
              Record tenant payments, monitor balances, and review apartment
              collection ledger.
            </p>
          </div>

          <Link
            href="/finance/apartment"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Billed" value={formatMoney(totalBilled)} />
          <SummaryCard
            title="Total Collected"
            value={formatMoney(totalCollected)}
            color="text-emerald-400"
          />
          <SummaryCard
            title="Total Balance"
            value={formatMoney(totalBalance)}
            color="text-red-400"
          />
          <SummaryCard
            title="Overdue Bills"
            value={overdueCount}
            color="text-amber-400"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Record Payment</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-slate-400">Unpaid Bill</label>
                <select
                  value={billId}
                  onChange={(e) => setBillId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                >
                  <option value="">Select unpaid bill</option>
                  {unpaidBills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.apartment_units?.unit_name} -{" "}
                      {bill.apartment_units?.tenant_name || "No tenant"} -{" "}
                      {bill.bill_month} - Balance{" "}
                      {formatMoney(getBalance(bill))}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBill && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">Selected Balance</span>
                    <span className="font-bold text-red-400">
                      {formatMoney(selectedBalance)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span className="text-slate-400">Due Date</span>
                    <span>{selectedBill.due_date || "-"}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-slate-400">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400">Amount</label>
                <input
                  type="number"
                  placeholder="Payment amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                >
                  <option value="">Payment method</option>
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-400">
                  Remarks / Reference Number
                </label>
                <textarea
                  placeholder="Optional remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="mt-2 h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>

              <button
                onClick={addPayment}
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <h2 className="mb-4 text-xl font-bold">Unpaid Bills</h2>

            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Total Bill</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {unpaidBills.map((bill) => {
                    const status = getBillStatus(bill);

                    return (
                      <tr
                        key={bill.id}
                        className="border-t border-slate-800 hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          {bill.apartment_units?.unit_name || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {bill.apartment_units?.tenant_name || "-"}
                        </td>

                        <td className="px-4 py-3">{bill.bill_month}</td>
                        <td className="px-4 py-3">{bill.due_date}</td>

                        <td className="px-4 py-3 text-right">
                          {formatMoney(getTotalBill(bill))}
                        </td>

                        <td className="px-4 py-3 text-right text-emerald-400">
                          {formatMoney(getTotalPaid(bill))}
                        </td>

                        <td className="px-4 py-3 text-right text-red-400">
                          {formatMoney(getBalance(bill))}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {unpaidBills.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-slate-500"
                      >
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
          <h2 className="mb-4 text-xl font-bold">Tenant Ledger</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Unit Status</th>
                  <th className="px-4 py-3 text-right">Bills</th>
                  <th className="px-4 py-3 text-right">Total Bill</th>
                  <th className="px-4 py-3 text-right">Total Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Latest Due</th>
                  <th className="px-4 py-3 text-right">Overdue</th>
                </tr>
              </thead>

              <tbody>
                {tenantLedger.map((row: any) => (
                  <tr
                    key={row.unitName}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-bold text-white">
                      {row.unitName}
                    </td>
                    <td className="px-4 py-3">{row.tenantName}</td>
                    <td className="px-4 py-3">{row.unitStatus}</td>
                    <td className="px-4 py-3 text-right">{row.billCount}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(row.totalBill)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {formatMoney(row.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">
                      {formatMoney(row.totalBalance)}
                    </td>
                    <td className="px-4 py-3">{row.latestDueDate || "-"}</td>
                    <td className="px-4 py-3 text-right text-amber-400">
                      {row.overdueCount}
                    </td>
                  </tr>
                ))}

                {tenantLedger.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No tenant ledger records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Payment History</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Bill Month</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => {
                  const isVoided = isVoidedPayment(payment);

                  return (
                    <tr
                      key={payment.id}
                      className={`border-t border-slate-800 hover:bg-slate-800/40 ${
                        isVoided ? "bg-red-950/10 opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3">{payment.payment_date}</td>

                      <td className="px-4 py-3 font-medium text-white">
                        {payment.apartment_bills?.apartment_units?.unit_name ||
                          "-"}
                      </td>

                      <td className="px-4 py-3">
                        {payment.apartment_bills?.apartment_units
                          ?.tenant_name || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {payment.apartment_bills?.bill_month || "-"}
                      </td>

                      <td
                        className={`px-4 py-3 text-right ${
                          isVoided
                            ? "text-slate-500 line-through"
                            : "text-emerald-400"
                        }`}
                      >
                        {formatMoney(payment.amount)}
                      </td>

                      <td className="px-4 py-3">
                        {payment.payment_method || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            isVoided ? "line-through text-slate-500" : ""
                          }
                        >
                          {payment.remarks || "-"}
                        </span>
                        {isVoided && payment.void_reason && (
                          <div className="mt-1 text-xs font-semibold text-red-300">
                            Void reason: {payment.void_reason}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isVoided ? (
                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
                            VOIDED
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                            ACTIVE
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isVoided ? (
                          <span className="text-xs font-semibold text-slate-500">
                            —
                          </span>
                        ) : (
                          <button
                            onClick={() => voidPayment(payment.id)}
                            disabled={saving}
                            className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-slate-500"
                    >
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

function SummaryCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-3 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}
