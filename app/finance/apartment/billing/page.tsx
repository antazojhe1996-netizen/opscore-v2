"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";

export default function ApartmentBillingPage() {
  /// STATES
  const [units, setUnits] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  const [unitId, setUnitId] = useState("");
  const [billMonth, setBillMonth] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [electricAmount, setElectricAmount] = useState("");
  const [waterAmount, setWaterAmount] = useState("");
  const [internetAmount, setInternetAmount] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [saving, setSaving] = useState(false);

  /// FUNCTIONS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getData = async () => {
    const { data: unitsData, error: unitsError } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    if (unitsError) {
      console.log("GET APARTMENT UNITS ERROR:", unitsError);
      return;
    }

    const { data: billsData, error: billsError } = await supabase
      .from("apartment_bills")
      .select(`
        *,
        apartment_payments (
          amount
        )
      `)
      .order("due_date", { ascending: false });

    if (billsError) {
      console.log("GET APARTMENT BILLS ERROR:", billsError);
      return;
    }

    setUnits(unitsData || []);
    setBills(billsData || []);
  };

  const resetForm = () => {
    setUnitId("");
    setBillMonth("");
    setDueDate("");
    setRentAmount("");
    setElectricAmount("");
    setWaterAmount("");
    setInternetAmount("");
    setOtherAmount("");
  };

  const saveBill = async () => {
    if (!unitId || !billMonth || !dueDate) {
      alert("Please complete Unit, Bill Month, and Due Date.");
      return;
    }

    const selectedUnit = units.find((item) => String(item.id) === String(unitId));

    const billPayload = {
      unit_id: unitId,
      bill_month: billMonth,
      due_date: dueDate,
      rent_amount: Number(rentAmount || 0),
      electric_amount: Number(electricAmount || 0),
      water_amount: Number(waterAmount || 0),
      internet_amount: Number(internetAmount || 0),
      other_amount: Number(otherAmount || 0),
    };

    const billTotal =
      Number(rentAmount || 0) +
      Number(electricAmount || 0) +
      Number(waterAmount || 0) +
      Number(internetAmount || 0) +
      Number(otherAmount || 0);

    setSaving(true);

    const { data, error } = await supabase
      .from("apartment_bills")
      .insert(billPayload)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.log("SAVE BILL ERROR:", error);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Apartment Billing",
        action: "Create Bill Failed",
        description: `Failed to create bill for ${selectedUnit?.unit_name || "Unknown Unit"} (${billMonth}). Error: ${error.message}`,
        severity: "critical",
        newValue: {
          ...billPayload,
          unitName: selectedUnit?.unit_name || null,
          tenantName: selectedUnit?.tenant_name || null,
          total: billTotal,
          error: error.message,
        },
      });

      alert(error.message);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Apartment Billing",
      action: "Create Bill",
      description: `${selectedUnit?.unit_name || "Unknown Unit"} ${selectedUnit?.tenant_name ? `(${selectedUnit.tenant_name})` : ""} bill created for ${billMonth}. Total: ${formatMoney(billTotal)}`,
      severity: "warning",
      recordId: data?.id || null,
      newValue: {
        ...billPayload,
        id: data?.id || null,
        unitName: selectedUnit?.unit_name || null,
        tenantName: selectedUnit?.tenant_name || null,
        total: billTotal,
      },
    });

    resetForm();
    getData();
  };

  const deleteBill = async (bill: any) => {
    const totalPaid = getTotalPaid(bill);
    const totalBill = getTotalBill(bill);
    const balance = getBalance(bill);
    const unitName = getUnitName(bill.unit_id);
    const tenantName = getTenantName(bill.unit_id);

    if (totalPaid > 0) {
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Apartment Billing",
        action: "Delete Locked Bill Attempt",
        description: `Attempted to delete locked bill for ${unitName} (${tenantName}) ${bill.bill_month}. Paid: ${formatMoney(totalPaid)}, Balance: ${formatMoney(balance)}`,
        severity: "warning",
        recordId: bill.id,
        oldValue: {
          ...bill,
          unitName,
          tenantName,
          totalBill,
          totalPaid,
          balance,
        },
        newValue: {
          deleteBlocked: true,
          reason: "Bill has recorded payment",
        },
      });

      alert("This bill already has payment recorded. Delete is disabled to protect collection records.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this bill permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("apartment_bills")
      .delete()
      .eq("id", bill.id);

    if (error) {
      console.log("DELETE BILL ERROR:", error);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Apartment Billing",
        action: "Delete Bill Failed",
        description: `Failed to delete bill for ${unitName} (${tenantName}) ${bill.bill_month}. Error: ${error.message}`,
        severity: "critical",
        recordId: bill.id,
        oldValue: {
          ...bill,
          unitName,
          tenantName,
          totalBill,
          totalPaid,
          balance,
        },
        newValue: {
          error: error.message,
        },
      });

      alert(error.message);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Apartment Billing",
      action: "Delete Bill",
      description: `Deleted bill for ${unitName} (${tenantName}) ${bill.bill_month}. Total: ${formatMoney(totalBill)}`,
      severity: "critical",
      recordId: bill.id,
      oldValue: {
        ...bill,
        unitName,
        tenantName,
        totalBill,
        totalPaid,
        balance,
      },
      newValue: {
        deleted: true,
      },
    });

    getData();
  };

  const getUnitName = (id: string) => {
    const unit = units.find((item) => String(item.id) === String(id));
    return unit?.unit_name || "-";
  };

  const getTenantName = (id: string) => {
    const unit = units.find((item) => String(item.id) === String(id));
    return unit?.tenant_name || "-";
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

    return (bill.apartment_payments || []).reduce(
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
    const dueDateValue = new Date(`${bill.due_date}T00:00:00`);

    if (balance <= 0) return "PAID";
    if (paid > 0) return "PARTIAL";
    if (today > dueDateValue) return "OVERDUE";
    return "UNPAID";
  };

  const getStatusStyle = (status: string) => {
    if (status === "PAID") return "bg-emerald-500/10 text-emerald-400";
    if (status === "PARTIAL") return "bg-amber-500/10 text-amber-400";
    if (status === "OVERDUE") return "bg-red-500/10 text-red-400";
    if (status === "UNPAID") return "bg-orange-500/10 text-orange-400";
    return "bg-slate-700 text-slate-300";
  };

  /// CALCULATIONS
  const activeUnits = useMemo(() => {
    return units.filter((unit) =>
      ["active", "occupied", "maintenance"].includes(
        String(unit.status || "").toLowerCase()
      )
    );
  }, [units]);

  const totalBills = bills.reduce((sum, bill) => sum + getTotalBill(bill), 0);
  const totalPaid = bills.reduce((sum, bill) => sum + getTotalPaid(bill), 0);
  const totalBalance = totalBills - totalPaid;

  /// EFFECTS
  useEffect(() => {
    getData();
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

            <h1 className="mt-2 text-3xl font-bold">Apartment Billing</h1>

            <p className="mt-1 text-sm text-slate-400">
              Create monthly apartment bills for rent, utilities, and other charges.
            </p>
          </div>

          <Link
            href="/finance/apartment"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard title="Total Billed" value={formatMoney(totalBills)} />
          <SummaryCard title="Total Paid" value={formatMoney(totalPaid)} color="text-emerald-400" />
          <SummaryCard title="Total Balance" value={formatMoney(totalBalance)} color="text-red-400" />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Create Bill</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-slate-400">Unit</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              >
                <option value="">Select unit</option>
                {activeUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_name} {unit.tenant_name ? `- ${unit.tenant_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400">Bill Month</label>
              <input
                type="month"
                value={billMonth}
                onChange={(e) => setBillMonth(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              />
            </div>

            <AmountInput label="Rent" value={rentAmount} setValue={setRentAmount} />
            <AmountInput label="Electric" value={electricAmount} setValue={setElectricAmount} />
            <AmountInput label="Water" value={waterAmount} setValue={setWaterAmount} />
            <AmountInput label="Internet" value={internetAmount} setValue={setInternetAmount} />
            <AmountInput label="Other Charges" value={otherAmount} setValue={setOtherAmount} />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={saveBill}
              disabled={saving}
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Bill"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Billing History</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Rent</th>
                  <th className="px-4 py-3 text-right">Electric</th>
                  <th className="px-4 py-3 text-right">Water</th>
                  <th className="px-4 py-3 text-right">Internet</th>
                  <th className="px-4 py-3 text-right">Other</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {bills.map((bill) => {
                  const paid = getTotalPaid(bill);
                  const balance = getBalance(bill);
                  const status = getBillStatus(bill);
                  const hasPayment = paid > 0;

                  return (
                    <tr
                      key={bill.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-bold">
                        {getUnitName(bill.unit_id)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {getTenantName(bill.unit_id)}
                      </td>

                      <td className="px-4 py-3">{bill.bill_month}</td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(bill.rent_amount)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(bill.electric_amount)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(bill.water_amount)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(bill.internet_amount)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(bill.other_amount)}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-amber-400">
                        {formatMoney(getTotalBill(bill))}
                      </td>

                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatMoney(paid)}
                      </td>

                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(balance)}
                      </td>

                      <td className="px-4 py-3">{bill.due_date}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => deleteBill(bill)}
                          disabled={hasPayment}
                          title={
                            hasPayment
                              ? "Delete disabled because this bill already has payment."
                              : "Delete bill"
                          }
                          className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500 disabled:hover:bg-transparent"
                        >
                          {hasPayment ? "Locked" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {bills.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-4 py-12 text-center text-slate-500">
                      No apartment bills yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Bills with recorded payments are locked to protect collection records.
          </p>
        </section>
      </main>
    </div>
  );
}

function AmountInput({ label, value, setValue }: any) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0.00"
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
      />
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
