"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";
import { createAuditLog } from "@/lib/audit";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /// FUNCTIONS
  const formatMoney = (value: any) =>
    `â‚±${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getData = async () => {
    const { data: unitsData, error: unitsError } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    if (unitsError) return console.log("GET APARTMENT UNITS ERROR:", unitsError);

    const { data: billsData, error: billsError } = await supabase
      .from("apartment_bills")
      .select(`*, apartment_payments(amount)`)
      .order("due_date", { ascending: false });

    if (billsError) return console.log("GET APARTMENT BILLS ERROR:", billsError);

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

  const getUnitName = (id: string) =>
    units.find((item) => String(item.id) === String(id))?.unit_name || "-";

  const getTenantName = (id: string) =>
    units.find((item) => String(item.id) === String(id))?.tenant_name || "-";

  const getTotalBill = (bill: any) =>
    Number(bill?.rent_amount || 0) +
    Number(bill?.electric_amount || 0) +
    Number(bill?.water_amount || 0) +
    Number(bill?.internet_amount || 0) +
    Number(bill?.other_amount || 0);

  const getTotalPaid = (bill: any) =>
    (bill?.apartment_payments || []).reduce(
      (sum: number, payment: any) => sum + Number(payment.amount || 0),
      0
    );

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
    if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "PARTIAL") return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === "OVERDUE") return "border-red-200 bg-red-50 text-red-700";
    if (status === "UNPAID") return "border-slate-200 bg-slate-100 text-slate-700";
    return "border-blue-200 bg-blue-50 text-blue-700";
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

    const billTotal = getTotalBill(billPayload);

    setSaving(true);

    const { data, error } = await supabase
      .from("apartment_bills")
      .insert(billPayload)
      .select()
      .single();

    setSaving(false);

    if (error) {
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Apartment Billing",
        action: "Create Bill Failed",
        description: `Failed to create bill for ${selectedUnit?.unit_name || "Unknown Unit"} (${billMonth}). Error: ${error.message}`,
        severity: "critical",
        newValue: { ...billPayload, total: billTotal, error: error.message },
      });

      alert(error.message);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Apartment Billing",
      action: "Create Bill",
      description: `${selectedUnit?.unit_name || "Unknown Unit"} bill created for ${billMonth}. Total: ${formatMoney(billTotal)}`,
      severity: "warning",
      recordId: data?.id || null,
      newValue: { ...billPayload, id: data?.id || null, total: billTotal },
    });

    resetForm();
    getData();
  };

  const deleteBill = async (bill: any) => {
    const totalPaid = getTotalPaid(bill);

    if (totalPaid > 0) {
      alert("This bill already has payment recorded. Delete is disabled to protect collection records.");
      return;
    }

    const confirmed = window.confirm("Delete this bill permanently? This action cannot be undone.");
    if (!confirmed) return;

    const { error } = await supabase.from("apartment_bills").delete().eq("id", bill.id);

    if (error) {
      alert(error.message);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Apartment Billing",
      action: "Delete Bill",
      description: `Deleted bill for ${getUnitName(bill.unit_id)} ${bill.bill_month}.`,
      severity: "critical",
      recordId: bill.id,
      oldValue: bill,
      newValue: { deleted: true },
    });

    getData();
  };

  /// CALCULATIONS
  const activeUnits = useMemo(() => {
    return units.filter((unit) =>
      ["active", "occupied", "maintenance"].includes(String(unit.status || "").toLowerCase())
    );
  }, [units]);

  const totalBills = bills.reduce((sum, bill) => sum + getTotalBill(bill), 0);
  const totalPaid = bills.reduce((sum, bill) => sum + getTotalPaid(bill), 0);
  const totalBalance = totalBills - totalPaid;

  const overdueBills = bills.filter((bill) => getBillStatus(bill) === "OVERDUE");
  const unpaidBills = bills.filter((bill) =>
    ["UNPAID", "PARTIAL", "OVERDUE"].includes(getBillStatus(bill))
  );

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const status = getBillStatus(bill);
      const searchable = `${getUnitName(bill.unit_id)} ${getTenantName(
        bill.unit_id
      )} ${bill.bill_month} ${bill.due_date} ${status}`.toLowerCase();

      return (
        searchable.includes(searchTerm.toLowerCase()) &&
        (statusFilter === "ALL" || status === statusFilter)
      );
    });
  }, [bills, units, searchTerm, statusFilter]);

  const currentBillTotal =
    Number(rentAmount || 0) +
    Number(electricAmount || 0) +
    Number(waterAmount || 0) +
    Number(internetAmount || 0) +
    Number(otherAmount || 0);

  const assistantReminders = [
    ...(overdueBills.length > 0
      ? [{ type: "critical", text: `${overdueBills.length} apartment bill(s) are overdue.` }]
      : []),
    ...(unpaidBills.length > 0
      ? [{ type: "warning", text: `${unpaidBills.length} bill(s) still have open balances.` }]
      : []),
    ...(totalBalance <= 0 && bills.length > 0
      ? [{ type: "success", text: "Apartment billing balances are currently cleared." }]
      : []),
  ].slice(0, 5);

  /// EFFECTS
  useEffect(() => {
    getData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="FINANCE / APARTMENT BILLING" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              FINANCE
            </p>

            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  Apartment Billing
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Create tenant bills, review billing status, and protect paid collection records.
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
                  Create Bill
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  New Apartment Bill
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Workbench entry for rent, utilities, due date, and other tenant charges.
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Unit">
                    <select
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="">Select unit</option>
                      {activeUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unit_name} {unit.tenant_name ? `- ${unit.tenant_name}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Bill Month">
                    <input
                      type="month"
                      value={billMonth}
                      onChange={(e) => setBillMonth(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </Field>

                  <Field label="Due Date">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </Field>

                  <AmountInput label="Rent" value={rentAmount} setValue={setRentAmount} />
                  <AmountInput label="Electric" value={electricAmount} setValue={setElectricAmount} />
                  <AmountInput label="Water" value={waterAmount} setValue={setWaterAmount} />
                  <AmountInput label="Internet" value={internetAmount} setValue={setInternetAmount} />
                  <AmountInput label="Other Charges" value={otherAmount} setValue={setOtherAmount} />
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
                    onClick={saveBill}
                    disabled={saving}
                    type="button"
                    className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Bill"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Bill Summary
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Current Entry
              </h2>

              <div className="mt-5 space-y-3">
                <SummaryRow label="Bill Total" value={formatMoney(currentBillTotal)} />
                <SummaryRow label="Active Billable Units" value={activeUnits.length} />
                <SummaryRow label="Open Balance" value={formatMoney(totalBalance)} danger={totalBalance > 0} />
                <SummaryRow label="Overdue Bills" value={overdueBills.length} danger={overdueBills.length > 0} />
              </div>

              <p className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-700">
                Paid bills are locked from deletion to protect collection and audit records.
              </p>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Billed" value={formatMoney(totalBills)} helper={`${bills.length} bill(s) recorded`} />
            <KpiCard label="Total Paid" value={formatMoney(totalPaid)} helper="Recorded apartment payments" />
            <KpiCard label="Open Balance" value={formatMoney(totalBalance)} helper={`${unpaidBills.length} open bill(s)`} danger={totalBalance > 0} />
            <KpiCard label="Overdue Bills" value={overdueBills.length} helper="Needs collection follow-up" danger={overdueBills.length > 0} />
          </section>

          <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Filters
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Billing Queue
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-[minmax(0,1fr)_220px]">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search unit, tenant, month, due date..."
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All Status</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partial</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Billing Ledger
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Apartment Bills
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {filteredBills.length} bill{filteredBills.length === 1 ? "" : "s"} shown.
              </p>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1250px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Unit / Tenant</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Rent</th>
                    <th className="px-4 py-3 text-right">Electric</th>
                    <th className="px-4 py-3 text-right">Water</th>
                    <th className="px-4 py-3 text-right">Internet</th>
                    <th className="px-4 py-3 text-right">Other</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredBills.map((bill) => {
                    const paid = getTotalPaid(bill);
                    const balance = getBalance(bill);
                    const total = getTotalBill(bill);
                    const status = getBillStatus(bill);
                    const hasPayment = paid > 0;

                    return (
                      <tr key={bill.id} className="transition-all duration-200 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-950">{getUnitName(bill.unit_id)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{getTenantName(bill.unit_id)}</p>
                        </td>
                        <td className="px-4 py-3">{bill.bill_month}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(bill.rent_amount)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(bill.electric_amount)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(bill.water_amount)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(bill.internet_amount)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(bill.other_amount)}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(total)}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(paid)}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">{formatMoney(balance)}</td>
                        <td className="px-4 py-3">{bill.due_date}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteBill(bill)}
                            disabled={hasPayment}
                            className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                          >
                            {hasPayment ? "Locked" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBills.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-4 py-14 text-center">
                        <p className="font-black text-slate-950">No records found</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          No apartment bills match the current filters.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <OpscoreAssistant reminders={assistantReminders} />
      </main>
    </div>
  );
}

function KpiCard({ label, value, helper, danger }: any) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className={danger ? "mt-1 text-sm font-bold text-red-700" : "mt-1 text-sm font-medium text-slate-500"}>{helper}</p>
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

function AmountInput({ label, value, setValue }: any) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0.00"
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </Field>
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





