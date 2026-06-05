"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ApartmentDashboardPage() {
  /// STATES
  const [units, setUnits] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

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
      console.log("UNITS ERROR:", unitsError.message);
      return;
    }

    const { data: billsData, error: billsError } = await supabase
      .from("apartment_bills")
      .select("*")
      .order("due_date", { ascending: false });

    if (billsError) {
      console.log("BILLS ERROR:", billsError.message);
      return;
    }

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("apartment_payments")
      .select("*");

    if (paymentsError) {
      console.log("PAYMENTS ERROR:", paymentsError.message);
      setPayments([]);
    } else {
      setPayments(paymentsData || []);
    }

    setUnits(unitsData || []);
    setBills(billsData || []);
  };

  const getUnit = (unitId: string) =>
    units.find((unit) => String(unit.id) === String(unitId));

  const getBillPayments = (billId: string) =>
    payments.filter((payment) => String(payment.bill_id) === String(billId));

  const getTotalBill = (bill: any) =>
    Number(bill?.rent_amount || 0) +
    Number(bill?.electric_amount || 0) +
    Number(bill?.water_amount || 0) +
    Number(bill?.internet_amount || 0) +
    Number(bill?.other_amount || 0);

  const getTotalPaid = (bill: any) =>
    getBillPayments(bill?.id).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

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
    if (status === "NO BILL") return "bg-slate-700 text-slate-300";
    return "bg-slate-700 text-slate-300";
  };

  const getUnitStatusStyle = (status: string) => {
    const value = String(status || "").toLowerCase();

    if (value === "occupied") return "bg-emerald-500/10 text-emerald-400";
    if (value === "active") return "bg-blue-500/10 text-blue-400";
    if (value === "vacant") return "bg-slate-700 text-slate-300";
    if (value === "maintenance") return "bg-amber-500/10 text-amber-400";
    if (value === "inactive") return "bg-red-500/10 text-red-400";

    return "bg-slate-700 text-slate-300";
  };

  const getActionNeeded = (row: any) => {
    const unitStatus = String(row.unit.status || "").toLowerCase();

    if (unitStatus === "maintenance") return "Check maintenance issue";
    if (unitStatus === "vacant") return "Available for tenant";
    if (unitStatus === "inactive") return "Inactive unit";

    if (row.status === "NO BILL") return "Create monthly bill";
    if (row.status === "OVERDUE") return "Follow up payment";
    if (row.status === "PARTIAL") return "Collect remaining balance";
    if (row.status === "UNPAID") return "Awaiting payment";
    if (row.status === "PAID") return "Cleared";

    return "-";
  };

  const getActionStyle = (row: any) => {
    const unitStatus = String(row.unit.status || "").toLowerCase();

    if (unitStatus === "maintenance") return "text-amber-400";
    if (unitStatus === "vacant") return "text-slate-300";
    if (unitStatus === "inactive") return "text-red-400";

    if (row.status === "NO BILL") return "text-slate-400";
    if (row.status === "OVERDUE") return "text-red-400";
    if (row.status === "PARTIAL") return "text-amber-400";
    if (row.status === "UNPAID") return "text-orange-400";
    if (row.status === "PAID") return "text-emerald-400";

    return "text-slate-400";
  };

  /// CALCULATIONS
  const activeUnits = units.filter((unit) =>
    ["active", "occupied"].includes(String(unit.status || "").toLowerCase())
  );

  const billableUnits = units.filter((unit) =>
    ["active", "occupied", "maintenance"].includes(
      String(unit.status || "").toLowerCase()
    )
  );

  const occupiedUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "occupied"
  );

  const vacantUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "vacant"
  );

  const maintenanceUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "maintenance"
  );

  const inactiveUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "inactive"
  );

  const unitMonitoring = useMemo(() => {
    return billableUnits.map((unit) => {
      const unitBills = bills
        .filter((bill) => String(bill.unit_id) === String(unit.id))
        .sort((a, b) =>
          String(b.due_date || "").localeCompare(String(a.due_date || ""))
        );

      const latestBill = unitBills[0] || null;

      const totalReceivable = unitBills.reduce(
        (sum, bill) => sum + getTotalBill(bill),
        0
      );

      const totalPaid = unitBills.reduce(
        (sum, bill) => sum + getTotalPaid(bill),
        0
      );

      const totalBalance = totalReceivable - totalPaid;

      const unpaidBills = unitBills.filter((bill) => getBalance(bill) > 0);
      const overdueBills = unitBills.filter(
        (bill) => getBillStatus(bill) === "OVERDUE"
      );

      const status = latestBill ? getBillStatus(latestBill) : "NO BILL";

      return {
        unit,
        latestBill,
        unitBills,
        totalReceivable,
        totalPaid,
        totalBalance,
        unpaidBills,
        overdueBills,
        status,
      };
    });
  }, [billableUnits, bills, payments]);

  const totalReceivable = unitMonitoring.reduce(
    (sum, row) => sum + row.totalReceivable,
    0
  );

  const totalCollected = unitMonitoring.reduce(
    (sum, row) => sum + row.totalPaid,
    0
  );

  const totalUnpaid = unitMonitoring.reduce(
    (sum, row) => sum + row.totalBalance,
    0
  );

  const overdueCount = unitMonitoring.filter(
    (row) => row.overdueBills.length > 0
  ).length;

  const noBillCount = unitMonitoring.filter(
    (row) => row.status === "NO BILL"
  ).length;

  /// EFFECTS
  useEffect(() => {
    getData();
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

          <h1 className="mt-2 text-3xl font-bold">Apartment Dashboard</h1>

          <p className="mt-1 text-sm text-slate-400">
            Monitor apartment status, tenant balances, collections, unpaid bills, and units for maintenance.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ModuleCard
            href="/finance/apartment/settings"
            title="Apartment Settings"
            description="Create apartment units, assign tenants, update status, rent setup, and maintenance notes."
            action="Open Settings →"
            color="amber"
          />

          <ModuleCard
            href="/finance/apartment/billing"
            title="Apartment Billing"
            description="Create monthly bills for rent, electricity, water, internet, and other charges."
            action="Open Billing →"
            color="blue"
          />

          <ModuleCard
            href="/finance/apartment/payment"
            title="Apartment Payments"
            description="Record partial or full payments and review apartment collection history."
            action="Open Payments →"
            color="emerald"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Total Units" value={units.length} />
          <SummaryCard title="Active Units" value={activeUnits.length} color="text-blue-400" />
          <SummaryCard title="Occupied Units" value={occupiedUnits.length} color="text-emerald-400" />
          <SummaryCard title="Vacant Units" value={vacantUnits.length} color="text-slate-300" />
          <SummaryCard title="For Maintenance" value={maintenanceUnits.length} color="text-amber-400" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Inactive Units" value={inactiveUnits.length} color="text-red-400" />
          <SummaryCard title="Overdue Units" value={overdueCount} color="text-red-400" />
          <SummaryCard title="No Bill Yet" value={noBillCount} color="text-slate-300" />
          <SummaryCard title="Total Bills" value={bills.length} />
          <SummaryCard title="Payments Recorded" value={payments.length} color="text-blue-400" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard title="Total Receivable" value={formatMoney(totalReceivable)} />
          <SummaryCard title="Total Collected" value={formatMoney(totalCollected)} color="text-emerald-400" />
          <SummaryCard title="Total Unpaid" value={formatMoney(totalUnpaid)} color="text-red-400" />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Apartment Unit Monitoring</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1300px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Unit Status</th>
                  <th className="px-4 py-3">Latest Month</th>
                  <th className="px-4 py-3 text-right">Latest Bill</th>
                  <th className="px-4 py-3 text-right">Latest Paid</th>
                  <th className="px-4 py-3 text-right">Latest Balance</th>
                  <th className="px-4 py-3 text-right">Total Balance</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Bill Status</th>
                  <th className="px-4 py-3">Action Needed</th>
                </tr>
              </thead>

              <tbody>
                {unitMonitoring.map((row) => {
                  const latestBill = row.latestBill;
                  const latestBalance = latestBill ? getBalance(latestBill) : 0;

                  return (
                    <tr
                      key={row.unit.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-bold text-white">
                        {row.unit.unit_name || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {row.unit.tenant_name || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getUnitStatusStyle(
                            row.unit.status
                          )}`}
                        >
                          {row.unit.status || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {latestBill?.bill_month || "-"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(getTotalBill(latestBill))}
                      </td>

                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatMoney(getTotalPaid(latestBill))}
                      </td>

                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(latestBalance)}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-amber-400">
                        {formatMoney(row.totalBalance)}
                      </td>

                      <td className="px-4 py-3">
                        {latestBill?.due_date || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className={`px-4 py-3 text-xs font-bold ${getActionStyle(row)}`}>
                        {getActionNeeded(row)}
                      </td>
                    </tr>
                  );
                })}

                {unitMonitoring.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No apartment units found. Open Apartment Settings to create units.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">All Apartment Bills</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Bill</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {bills.map((bill) => {
                  const unit = getUnit(bill.unit_id);
                  const status = getBillStatus(bill);

                  return (
                    <tr
                      key={bill.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-bold">
                        {unit?.unit_name || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {unit?.tenant_name || "-"}
                      </td>

                      <td className="px-4 py-3">{bill.bill_month}</td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(getTotalBill(bill))}
                      </td>

                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatMoney(getTotalPaid(bill))}
                      </td>

                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(getBalance(bill))}
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
                    </tr>
                  );
                })}

                {bills.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No apartment bills yet.
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

function ModuleCard({ href, title, description, action, color }: any) {
  const colorClass =
    color === "amber"
      ? "hover:border-amber-400 text-amber-400"
      : color === "blue"
      ? "hover:border-blue-400 text-blue-400"
      : "hover:border-emerald-400 text-emerald-400";

  return (
    <Link
      href={href}
      className={`block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:scale-[1.02] hover:bg-slate-800 ${colorClass}`}
    >
      <h2 className="text-xl font-bold text-white">{title}</h2>

      <p className="mt-2 text-sm text-slate-400">{description}</p>

      <p className={`mt-5 text-sm font-semibold ${colorClass}`}>{action}</p>
    </Link>
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
