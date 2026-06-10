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

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 xl:p-8">
        <div className="mx-auto w-full max-w-[1800px]">
          <section className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                Apartment Operations
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Apartment Payments
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                Record tenant payments, monitor unpaid balances, review ledger totals, and void incorrect receipts with audit trail.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/finance/apartment"
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Back to Apartment
              </Link>
              <a
                href="#record-payment"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500"
              >
                Record Payment
              </a>
            </div>
          </section>

          <section className="sticky top-0 z-30 mb-5 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 shadow-xl shadow-black/20 backdrop-blur">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <CompactMetric label="Billed" value={formatMoney(totalBilled)} />
              <CompactMetric label="Collected" value={formatMoney(totalCollected)} />
              <CompactMetric label="Balance" value={formatMoney(totalBalance)} danger={totalBalance > 0} />
              <CompactMetric label="Overdue" value={overdueCount} danger={overdueCount > 0} />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-2xl border border-slate-800 bg-slate-900">
                <div className="flex flex-col gap-3 border-b border-slate-800 p-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">Unpaid Bills Queue</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {unpaidBills.length} bill{unpaidBills.length === 1 ? "" : "s"} available for payment posting.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300">
                    Select a bill in the right panel to post payment.
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-slate-950 text-left text-xs uppercase tracking-wide text-slate-500">
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
                        const active = String(bill.id) === String(billId);

                        return (
                          <tr
                            key={bill.id}
                            onClick={() => setBillId(String(bill.id))}
                            className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800/50 ${
                              active ? "bg-blue-500/10" : ""
                            }`}
                          >
                            <td className="px-4 py-3 font-black text-white">
                              {bill.apartment_units?.unit_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {bill.apartment_units?.tenant_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-300">{bill.bill_month}</td>
                            <td className="px-4 py-3 text-slate-300">{bill.due_date}</td>
                            <td className="px-4 py-3 text-right text-slate-200">
                              {formatMoney(getTotalBill(bill))}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-300">
                              {formatMoney(getTotalPaid(bill))}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-white">
                              {formatMoney(getBalance(bill))}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(status)}`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {unpaidBills.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-14 text-center text-slate-500">
                            No unpaid apartment bills.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900">
                <div className="border-b border-slate-800 p-4">
                  <h2 className="text-xl font-black text-white">Tenant Ledger</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Running balance by unit and tenant.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="bg-slate-950 text-left text-xs uppercase tracking-wide text-slate-500">
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
                        <tr key={row.unitName} className="border-t border-slate-800 hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-black text-white">{row.unitName}</td>
                          <td className="px-4 py-3 text-slate-300">{row.tenantName}</td>
                          <td className="px-4 py-3 text-slate-300">{row.unitStatus}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{row.billCount}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{formatMoney(row.totalBill)}</td>
                          <td className="px-4 py-3 text-right text-emerald-300">{formatMoney(row.totalPaid)}</td>
                          <td className="px-4 py-3 text-right font-black text-white">{formatMoney(row.totalBalance)}</td>
                          <td className="px-4 py-3 text-slate-300">{row.latestDueDate || "-"}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-300">{row.overdueCount}</td>
                        </tr>
                      ))}

                      {tenantLedger.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-14 text-center text-slate-500">
                            No tenant ledger records yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900">
                <div className="border-b border-slate-800 p-4">
                  <h2 className="text-xl font-black text-white">Payment History</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Voided payments remain visible for audit review.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-sm">
                    <thead className="bg-slate-950 text-left text-xs uppercase tracking-wide text-slate-500">
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
                            <td className="px-4 py-3 text-slate-300">{payment.payment_date}</td>
                            <td className="px-4 py-3 font-bold text-white">
                              {payment.apartment_bills?.apartment_units?.unit_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {payment.apartment_bills?.apartment_units?.tenant_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {payment.apartment_bills?.bill_month || "-"}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${isVoided ? "text-slate-500 line-through" : "text-emerald-300"}`}>
                              {formatMoney(payment.amount)}
                            </td>
                            <td className="px-4 py-3 text-slate-300">{payment.payment_method || "-"}</td>
                            <td className="max-w-[360px] px-4 py-3 text-slate-400">
                              <span className={isVoided ? "line-through text-slate-500" : "line-clamp-2"}>
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
                                <span className="text-xs font-semibold text-slate-500">—</span>
                              ) : (
                                <button
                                  onClick={() => voidPayment(payment.id)}
                                  disabled={saving}
                                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
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
                          <td colSpan={9} className="px-4 py-14 text-center text-slate-500">
                            No apartment payments recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside id="record-payment" className="space-y-5">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-black text-white">Record Payment</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Post payments against unpaid apartment bills only.
                  </p>
                </div>

                <div className="space-y-4">
                  <Field label="Unpaid Bill">
                    <select
                      value={billId}
                      onChange={(e) => setBillId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Select unpaid bill</option>
                      {unpaidBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {bill.apartment_units?.unit_name} - {bill.apartment_units?.tenant_name || "No tenant"} - {bill.bill_month} - Balance {formatMoney(getBalance(bill))}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {selectedBill && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-400">Selected Balance</span>
                        <span className="font-black text-white">{formatMoney(selectedBalance)}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-slate-400">Due Date</span>
                        <span className="text-slate-300">{selectedBill.due_date || "-"}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-slate-400">Bill Status</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getStatusStyle(getBillStatus(selectedBill))}`}>
                          {getBillStatus(selectedBill)}
                        </span>
                      </div>
                    </div>
                  )}

                  <Field label="Payment Date">
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </Field>

                  <Field label="Amount">
                    <input
                      type="number"
                      placeholder="Payment amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </Field>

                  <Field label="Payment Method">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Payment method</option>
                      <option value="Cash">Cash</option>
                      <option value="GCash">GCash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>

                  <Field label="Remarks / Reference Number">
                    <textarea
                      placeholder="Optional remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </Field>

                  <button
                    onClick={addPayment}
                    disabled={saving}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Payment"}
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-lg font-black text-white">Payment Controls</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-400">
                  <p className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    Payments cannot exceed the remaining balance of the selected bill.
                  </p>
                  <p className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    Voided payments stay in history and reopen bill balance through active-payment totals.
                  </p>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function CompactMetric({ label, value, danger }: any) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        danger ? "border-red-500/20 bg-red-500/10" : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={danger ? "mt-1 text-lg font-black text-red-300" : "mt-1 text-lg font-black text-white"}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
