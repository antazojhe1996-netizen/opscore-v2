"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";
import { supabase } from "@/lib/supabase";
import { createAuditLog } from "@/lib/audit";

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
      .select(`
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
      `)
      .order("due_date", { ascending: false });

    if (error) {
      console.log("GET PAYMENT BILLS ERROR:", error.message);
      alert(error.message);
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
      `)
      .order("payment_date", { ascending: false });

    if (error) {
      console.log("GET PAYMENTS ERROR:", error.message);
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
          String(payment.status || "ACTIVE").toUpperCase() !== "VOIDED"
      )
      .reduce(
        (sum: number, payment: any) => sum + Number(payment.amount || 0),
        0
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
    if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "PARTIAL") return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === "OVERDUE") return "border-red-200 bg-red-50 text-red-700";
    if (status === "UNPAID") return "border-slate-200 bg-slate-100 text-slate-700";
    if (status === "VOIDED") return "border-red-200 bg-red-50 text-red-700";
    if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-blue-200 bg-blue-50 text-blue-700";
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
      alert(`Payment is higher than the remaining balance: ${formatMoney(selectedBalance)}`);
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

    const unitName = payment?.apartment_bills?.apartment_units?.unit_name || "-";
    const tenantName = payment?.apartment_bills?.apartment_units?.tenant_name || "-";
    const billMonth = payment?.apartment_bills?.bill_month || "-";
    const paymentAmount = Number(payment?.amount || 0);
    const voidedBy = getCurrentUserName();
    const voidedAt = new Date().toISOString();

    const reason = window.prompt(
      `Void this apartment payment?\n\n${unitName} (${tenantName}) ${billMonth}\nAmount: ${formatMoney(paymentAmount)}\n\nReason is required:`
    );

    if (reason === null) return;

    const cleanReason = reason.trim();

    if (!cleanReason) {
      alert("Void reason is required.");
      return;
    }

    const oldRemarks = String(payment?.remarks || "").trim();
    const voidTrail = `[VOIDED by ${voidedBy} at ${voidedAt
      .slice(0, 16)
      .replace("T", " ")}] Reason: ${cleanReason}`;

    const updatedRemarks = oldRemarks ? `${oldRemarks} ${voidTrail}` : voidTrail;

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
  const totalCollected = bills.reduce((sum, bill) => sum + getTotalPaid(bill), 0);
  const totalBalance = totalBilled - totalCollected;

  const overdueCount = bills.filter(
    (bill) => getBillStatus(bill) === "OVERDUE"
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
      String(a.unitName || "").localeCompare(String(b.unitName || ""))
    );
  }, [bills]);

  const assistantReminders = [
    ...(overdueCount > 0
      ? [{ type: "critical", text: `${overdueCount} apartment bill(s) are overdue.` }]
      : []),
    ...(totalBalance > 0
      ? [{ type: "warning", text: `${formatMoney(totalBalance)} apartment balance remains outstanding.` }]
      : []),
    ...(unpaidBills.length === 0
      ? [{ type: "success", text: "No unpaid apartment bills are currently pending." }]
      : []),
  ].slice(0, 5);

  /// EFFECTS
  useEffect(() => {
    refreshData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="FINANCE / APARTMENT PAYMENTS" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              FINANCE
            </p>

            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  Apartment Payments
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Workbench for recording tenant payments, monitoring balances, and preserving payment audit trails.
                </p>
              </div>

              <Link
                href="/finance/apartment"
                className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                Back to Apartment Center
              </Link>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Payment Workbench
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Record Apartment Payment
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Post tenant payments against unpaid apartment bills only.
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Unpaid Bill">
                    <select
                      value={billId}
                      onChange={(e) => setBillId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="">Select unpaid bill</option>
                      {unpaidBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {bill.apartment_units?.unit_name} -{" "}
                          {bill.apartment_units?.tenant_name || "No tenant"} -{" "}
                          {bill.bill_month} - Balance {formatMoney(getBalance(bill))}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Payment Date">
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </Field>

                  <Field label="Amount">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </Field>

                  <Field label="Payment Method">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="">Payment method</option>
                      <option value="Cash">Cash</option>
                      <option value="GCash">GCash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Remarks / Reference Number">
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Optional remarks"
                        className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    onClick={resetForm}
                    type="button"
                    className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Reset
                  </button>

                  <button
                    onClick={addPayment}
                    disabled={saving}
                    type="button"
                    className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Payment"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Workbench Summary
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Selected Bill
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Live payment control for the selected apartment bill.
              </p>

              <div className="mt-5 space-y-3">
                <SummaryRow label="Selected Balance" value={formatMoney(selectedBalance)} danger={selectedBalance > 0} />
                <SummaryRow label="Bill Status" value={selectedBill ? getBillStatus(selectedBill) : "-"} />
                <SummaryRow label="Due Date" value={selectedBill?.due_date || "-"} />
                <SummaryRow label="Payment Amount" value={formatMoney(amount)} />
              </div>

              <p className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-700">
                Payments cannot exceed the remaining balance. Voided payments remain visible in history.
              </p>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Billed" value={formatMoney(totalBilled)} helper={`${bills.length} bill(s) recorded`} />
            <KpiCard label="Total Collected" value={formatMoney(totalCollected)} helper={`${payments.length} payment record(s)`} />
            <KpiCard label="Outstanding Balance" value={formatMoney(totalBalance)} helper={`${unpaidBills.length} unpaid bill(s)`} danger={totalBalance > 0} />
            <KpiCard label="Overdue Bills" value={overdueCount} helper="Needs follow-up" danger={overdueCount > 0} />
          </section>

          <TableCard
            label="Payment Queue"
            title="Unpaid Bills Queue"
            subtitle={`${unpaidBills.length} bill${unpaidBills.length === 1 ? "" : "s"} available for payment posting.`}
            className="mb-6"
          >
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
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

              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {unpaidBills.map((bill) => {
                  const status = getBillStatus(bill);
                  const active = String(bill.id) === String(billId);

                  return (
                    <tr
                      key={bill.id}
                      onClick={() => setBillId(String(bill.id))}
                      className={`cursor-pointer transition-all duration-200 hover:bg-slate-50 ${
                        active ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-black text-slate-950">
                        {bill.apartment_units?.unit_name || "-"}
                      </td>
                      <td className="px-4 py-3">{bill.apartment_units?.tenant_name || "-"}</td>
                      <td className="px-4 py-3">{bill.bill_month}</td>
                      <td className="px-4 py-3">{bill.due_date}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(getTotalBill(bill))}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(getTotalPaid(bill))}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(getBalance(bill))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(status)}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {unpaidBills.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <p className="font-black text-slate-950">No records found</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        No unpaid apartment bills.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>

          <TableCard
            label="Payment History"
            title="Apartment Payment History"
            subtitle="Voided payments remain visible for audit review."
            className="mb-6"
          >
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
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

              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {payments.map((payment) => {
                  const isVoided = isVoidedPayment(payment);

                  return (
                    <tr key={payment.id} className={isVoided ? "bg-red-50/40" : "transition-all duration-200 hover:bg-slate-50"}>
                      <td className="px-4 py-3">{payment.payment_date}</td>
                      <td className="px-4 py-3 font-black text-slate-950">
                        {payment.apartment_bills?.apartment_units?.unit_name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {payment.apartment_bills?.apartment_units?.tenant_name || "-"}
                      </td>
                      <td className="px-4 py-3">{payment.apartment_bills?.bill_month || "-"}</td>
                      <td className={`px-4 py-3 text-right font-black ${isVoided ? "text-slate-400 line-through" : "text-slate-950"}`}>
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="px-4 py-3">{payment.payment_method || "-"}</td>
                      <td className="max-w-[360px] px-4 py-3">
                        <span className={isVoided ? "line-through text-slate-400" : "line-clamp-2"}>
                          {payment.remarks || "-"}
                        </span>
                        {isVoided && payment.void_reason && (
                          <div className="mt-1 text-xs font-bold text-red-700">
                            Void reason: {payment.void_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(isVoided ? "VOIDED" : "ACTIVE")}`}>
                          {isVoided ? "VOIDED" : "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isVoided ? (
                          <span className="text-xs font-bold text-slate-400">—</span>
                        ) : (
                          <button
                            onClick={() => voidPayment(payment.id)}
                            disabled={saving}
                            className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
                    <td colSpan={9} className="px-4 py-14 text-center">
                      <p className="font-black text-slate-950">No records found</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        No apartment payments recorded yet.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>

          <TableCard
            label="Tenant Ledger"
            title="Apartment Tenant Ledger"
            subtitle="Running balance by unit and tenant."
          >
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
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

              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {tenantLedger.map((row: any) => (
                  <tr key={row.unitName} className="transition-all duration-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-black text-slate-950">{row.unitName}</td>
                    <td className="px-4 py-3">{row.tenantName}</td>
                    <td className="px-4 py-3">{row.unitStatus}</td>
                    <td className="px-4 py-3 text-right">{row.billCount}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(row.totalBill)}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(row.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(row.totalBalance)}</td>
                    <td className="px-4 py-3">{row.latestDueDate || "-"}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-950">{row.overdueCount}</td>
                  </tr>
                ))}

                {tenantLedger.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center">
                      <p className="font-black text-slate-950">No records found</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        No tenant ledger records yet.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>
        </div>

        <OpscoreAssistant reminders={assistantReminders} />
      </main>
    </div>
  );
}

function KpiCard({ label, value, helper, danger }: any) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className={danger ? "mt-1 text-sm font-bold text-red-700" : "mt-1 text-sm font-medium text-slate-500"}>
        {helper}
      </p>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, danger }: any) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={danger ? "text-sm font-black text-red-700" : "text-sm font-black text-slate-950"}>
        {value}
      </p>
    </div>
  );
}

function TableCard({ label, title, subtitle, children, className = "" }: any) {
  return (
    <section className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <h2 className="mt-2 text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      </div>

      <div className="overflow-auto">{children}</div>
    </section>
  );
}


