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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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

  const overdueBills = bills.filter((bill) => getBillStatus(bill) === "OVERDUE");
  const unpaidBills = bills.filter((bill) => ["UNPAID", "PARTIAL", "OVERDUE"].includes(getBillStatus(bill)));

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const status = getBillStatus(bill);
      const searchable = `${getUnitName(bill.unit_id)} ${getTenantName(bill.unit_id)} ${bill.bill_month} ${bill.due_date} ${status}`.toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bills, units, searchTerm, statusFilter]);


  /// EFFECTS
  useEffect(() => {
    getData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 xl:p-8">
        <div className="mx-auto w-full max-w-[1700px]">
          <section className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                Apartment Operations
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Apartment Billing
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                Create tenant bills, review billing status, and protect paid collection records.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/finance/apartment"
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Back to Apartment Center
              </Link>
              <a
                href="#create-bill"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500"
              >
                Create Bill
              </a>
            </div>
          </section>

          <section className="sticky top-0 z-30 mb-5 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 shadow-xl shadow-black/20 backdrop-blur">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(240px,1fr)_180px]">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search unit, tenant, month, due date..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CompactMetric label="Billed" value={formatMoney(totalBills)} />
                <CompactMetric label="Paid" value={formatMoney(totalPaid)} />
                <CompactMetric label="Balance" value={formatMoney(totalBalance)} danger={totalBalance > 0} />
                <CompactMetric label="Overdue" value={overdueBills.length} danger={overdueBills.length > 0} />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-800 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Billing Queue</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {filteredBills.length} bill{filteredBills.length === 1 ? "" : "s"} shown. Paid bills are locked from deletion.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <button
                    onClick={() => setStatusFilter("UNPAID")}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
                  >
                    Unpaid
                  </button>
                  <button
                    onClick={() => setStatusFilter("OVERDUE")}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
                  >
                    Overdue
                  </button>
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-sm">
                  <thead className="bg-slate-950 text-left text-xs uppercase tracking-wide text-slate-500">
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

                  <tbody>
                    {filteredBills.map((bill) => {
                      const paid = getTotalPaid(bill);
                      const balance = getBalance(bill);
                      const total = getTotalBill(bill);
                      const status = getBillStatus(bill);
                      const hasPayment = paid > 0;

                      return (
                        <tr key={bill.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                          <td className="px-4 py-3 align-top">
                            <p className="font-black text-white">{getUnitName(bill.unit_id)}</p>
                            <p className="mt-1 text-xs text-slate-500">{getTenantName(bill.unit_id)}</p>
                          </td>
                          <td className="px-4 py-3 align-top text-slate-300">{bill.bill_month}</td>
                          <td className="px-4 py-3 text-right align-top text-slate-300">{formatMoney(bill.rent_amount)}</td>
                          <td className="px-4 py-3 text-right align-top text-slate-300">{formatMoney(bill.electric_amount)}</td>
                          <td className="px-4 py-3 text-right align-top text-slate-300">{formatMoney(bill.water_amount)}</td>
                          <td className="px-4 py-3 text-right align-top text-slate-300">{formatMoney(bill.internet_amount)}</td>
                          <td className="px-4 py-3 text-right align-top text-slate-300">{formatMoney(bill.other_amount)}</td>
                          <td className="px-4 py-3 text-right align-top font-black text-white">{formatMoney(total)}</td>
                          <td className="px-4 py-3 text-right align-top font-bold text-slate-200">{formatMoney(paid)}</td>
                          <td className={balance > 0 ? "px-4 py-3 text-right align-top font-black text-red-300" : "px-4 py-3 text-right align-top font-black text-emerald-300"}>
                            {formatMoney(balance)}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-300">{bill.due_date}</td>
                          <td className="px-4 py-3 align-top">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <button
                              onClick={() => deleteBill(bill)}
                              disabled={hasPayment}
                              title={hasPayment ? "Delete disabled because payment is recorded." : "Delete bill"}
                              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500 disabled:hover:bg-transparent"
                            >
                              {hasPayment ? "Locked" : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredBills.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-4 py-14 text-center text-slate-500">
                          No apartment bills found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="space-y-5">
              <section id="create-bill" className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-black text-white">Create Bill</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Rent, utilities, and other charges are saved as one billing record.
                  </p>
                </div>

                <div className="space-y-3">
                  <Field label="Unit">
                    <select
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Select unit</option>
                      {activeUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unit_name} {unit.tenant_name ? `- ${unit.tenant_name}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Bill Month">
                      <input
                        type="month"
                        value={billMonth}
                        onChange={(e) => setBillMonth(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </Field>

                    <Field label="Due Date">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <AmountInput label="Rent" value={rentAmount} setValue={setRentAmount} />
                    <AmountInput label="Electric" value={electricAmount} setValue={setElectricAmount} />
                    <AmountInput label="Water" value={waterAmount} setValue={setWaterAmount} />
                    <AmountInput label="Internet" value={internetAmount} setValue={setInternetAmount} />
                  </div>

                  <AmountInput label="Other Charges" value={otherAmount} setValue={setOtherAmount} />

                  <div className="grid grid-cols-[1fr_auto] gap-3 pt-2">
                    <MiniStat
                      title="Bill Total"
                      value={formatMoney(
                        Number(rentAmount || 0) +
                          Number(electricAmount || 0) +
                          Number(waterAmount || 0) +
                          Number(internetAmount || 0) +
                          Number(otherAmount || 0)
                      )}
                    />
                    <button
                      onClick={saveBill}
                      disabled={saving}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-lg font-black text-white">Collection Snapshot</h2>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <MiniStat title="Open Balance" value={formatMoney(totalBalance)} danger={totalBalance > 0} />
                  <MiniStat title="Unpaid / Partial / Overdue" value={unpaidBills.length} danger={unpaidBills.length > 0} />
                  <MiniStat title="Active Billable Units" value={activeUnits.length} />
                </div>
                <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-500">
                  Bills with recorded payments are locked to protect collection records and audit history.
                </p>
              </section>
            </aside>
          </section>
        </div>
      </main>
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
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </Field>
  );
}

function CompactMetric({ label, value, danger }: any) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${danger ? "border-red-500/20 bg-red-500/10" : "border-slate-800 bg-slate-900"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={danger ? "mt-1 text-sm font-black text-red-300" : "mt-1 text-sm font-black text-white"}>{value}</p>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function MiniStat({ title, value, danger }: any) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <h3 className={danger ? "mt-1 text-lg font-black text-red-300" : "mt-1 text-lg font-black text-white"}>{value}</h3>
    </div>
  );
}
