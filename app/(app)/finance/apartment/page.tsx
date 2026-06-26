"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Building2,
  ClipboardList,
  Home,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import OpscoreAssistant from "@/components/OpscoreAssistant";export default function ApartmentDashboardPage() {
  /// STATES
  const [units, setUnits] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

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
    if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "PARTIAL") return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === "OVERDUE") return "border-red-200 bg-red-50 text-red-700";
    if (status === "UNPAID") return "border-slate-200 bg-slate-100 text-slate-700";
    if (status === "NO BILL") return "border-blue-200 bg-blue-50 text-blue-700";
    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  const getUnitStatusStyle = (status: string) => {
    const value = String(status || "").toLowerCase();

    if (value === "occupied") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (value === "active") return "border-blue-200 bg-blue-50 text-blue-700";
    if (value === "vacant") return "border-slate-200 bg-slate-100 text-slate-700";
    if (value === "maintenance") return "border-amber-200 bg-amber-50 text-amber-700";
    if (value === "inactive") return "border-red-200 bg-red-50 text-red-700";

    return "border-slate-200 bg-slate-100 text-slate-700";
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

    if (unitStatus === "maintenance") return "text-amber-700";
    if (unitStatus === "vacant") return "text-slate-700";
    if (unitStatus === "inactive") return "text-red-700";
    if (row.status === "NO BILL") return "text-blue-700";
    if (row.status === "OVERDUE") return "text-red-700";
    if (row.status === "PARTIAL") return "text-amber-700";
    if (row.status === "UNPAID") return "text-slate-700";
    if (row.status === "PAID") return "text-emerald-700";

    return "text-slate-700";
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

  const totalUnits = units.length;

  const collectionRate =
    totalReceivable > 0
      ? Math.round((totalCollected / totalReceivable) * 100)
      : 0;

  const occupancyRate =
    totalUnits > 0 ? Math.round((occupiedUnits.length / totalUnits) * 100) : 0;

  const riskLevel =
    overdueCount > 0 || totalUnpaid > 0
      ? "Watchlist"
      : maintenanceUnits.length > 0 || noBillCount > 0
      ? "Monitor"
      : "Stable";

  const healthScore = Math.max(
    0,
    100 -
      (overdueCount > 0 ? 18 : 0) -
      (noBillCount > 0 ? 10 : 0) -
      (maintenanceUnits.length > 0 ? 8 : 0) -
      (totalReceivable > 0 && collectionRate < 80 ? 14 : 0) -
      (vacantUnits.length > 0 ? 5 : 0)
  );

  const recommendedActions = [
    ...(overdueCount > 0
      ? ["Follow up overdue apartment balances before approving new expenses."]
      : []),
    ...(noBillCount > 0
      ? ["Create missing monthly bills for billable apartment units."]
      : []),
    ...(maintenanceUnits.length > 0
      ? ["Review maintenance units and confirm return-to-occupancy timeline."]
      : []),
    ...(vacantUnits.length > 0
      ? ["Prepare vacant units for tenant placement or management review."]
      : []),
    ...(totalUnpaid > 0
      ? ["Monitor collection exposure until outstanding balances are cleared."]
      : []),
    ...(overdueCount === 0 && noBillCount === 0 && totalUnpaid <= 0
      ? ["Maintain current collection discipline and continue monthly monitoring."]
      : []),
  ];

  const assistantReminders = [
    ...(overdueCount > 0
      ? [
          {
            type: "critical",
            message: `${overdueCount} apartment unit(s) have overdue balances.`,
          },
        ]
      : []),
    ...(noBillCount > 0
      ? [
          {
            type: "warning",
            message: `${noBillCount} billable unit(s) still need monthly billing.`,
          },
        ]
      : []),
    ...(maintenanceUnits.length > 0
      ? [
          {
            type: "warning",
            message: `${maintenanceUnits.length} unit(s) are under maintenance.`,
          },
        ]
      : []),
    ...(vacantUnits.length > 0
      ? [
          {
            type: "info",
            message: `${vacantUnits.length} vacant unit(s) may need tenant placement review.`,
          },
        ]
      : []),
    ...(overdueCount === 0 && noBillCount === 0
      ? [
          {
            type: "success",
            message: "Apartment billing and collection watchlist is under control.",
          },
        ]
      : []),
  ].slice(0, 5);

  /// EFFECTS
  useEffect(() => {
    getData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              FINANCE
            </p>

            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  Apartment Dashboard
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Apartment occupancy, billing, collections and receivable monitoring.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/finance/apartment/billing"
                  className="flex h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  Create / Review Bills
                </Link>

                <Link
                  href="/finance/apartment/payments"
                  className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  Record Payments
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<Home size={22} />}
              title="Occupancy Rate"
              value={`${occupancyRate}%`}
              subtitle={`${occupiedUnits.length} occupied â€¢ ${vacantUnits.length} vacant`}
              tone={occupancyRate >= 80 ? "success" : occupancyRate < 50 ? "danger" : "info"}
            />

            <KpiCard
              icon={<Wallet size={22} />}
              title="Total Receivable"
              value={formatMoney(totalReceivable)}
              subtitle={`${bills.length} apartment bill(s) recorded`}
              tone="info"
            />

            <KpiCard
              icon={<Banknote size={22} />}
              title="Total Collected"
              value={formatMoney(totalCollected)}
              subtitle={`${collectionRate}% collection rate`}
              tone={collectionRate >= 90 ? "success" : collectionRate < 70 ? "danger" : "warning"}
            />

            <KpiCard
              icon={<ShieldAlert size={22} />}
              title="Outstanding Balance"
              value={formatMoney(totalUnpaid)}
              subtitle={`${overdueCount} overdue unit(s)`}
              tone={totalUnpaid > 0 ? "danger" : "success"}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Operations Summary
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Apartment Health Overview
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Summary of apartment occupancy, tenant status, collections, billing coverage and operating risk.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SummaryMetric label="Health Score" value={`${healthScore}/100`} />
                <SummaryMetric label="Risk Level" value={riskLevel} />
                <SummaryMetric label="Active Units" value={activeUnits.length} />
                <SummaryMetric label="Maintenance Units" value={maintenanceUnits.length} />
                <SummaryMetric label="Inactive Units" value={inactiveUnits.length} />
                <SummaryMetric label="No Bill Yet" value={noBillCount} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Recommended Actions
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Daily Review
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Prioritized apartment actions based on current billing and collection data.
              </p>

              <div className="mt-5 space-y-3">
                {recommendedActions.slice(0, 5).map((action, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Priority {index + 1}
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-700">
                      {action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Unit Monitoring
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Apartment Unit Monitoring
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Unit-level tenant, billing, collection, balance and action status.
                  </p>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                  Exposure:{" "}
                  <span className={totalUnpaid > 0 ? "text-red-700" : "text-emerald-700"}>
                    {formatMoney(totalUnpaid)}
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1300px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
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

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {unitMonitoring.map((row) => {
                    const latestBill = row.latestBill;
                    const latestBalance = latestBill ? getBalance(latestBill) : 0;

                    return (
                      <tr
                        key={row.unit.id}
                        className="transition-all duration-200 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-black text-slate-950">
                          {row.unit.unit_name || "-"}
                        </td>

                        <td className="px-4 py-3">{row.unit.tenant_name || "-"}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getUnitStatusStyle(
                              row.unit.status
                            )}`}
                          >
                            {row.unit.status || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-3">{latestBill?.bill_month || "-"}</td>

                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatMoney(getTotalBill(latestBill))}
                        </td>

                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatMoney(getTotalPaid(latestBill))}
                        </td>

                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatMoney(latestBalance)}
                        </td>

                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatMoney(row.totalBalance)}
                        </td>

                        <td className="px-4 py-3">{latestBill?.due_date || "-"}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(
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
                      <td colSpan={11} className="px-4 py-14 text-center">
                        <p className="font-black text-slate-950">No records found</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Open Apartment Settings to create units.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Billing Ledger
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    All Apartment Bills
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Complete apartment billing ledger with payment and balance status.
                  </p>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                  Bills: <span className="text-slate-950">{bills.length}</span>
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
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

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {bills.map((bill) => {
                    const unit = getUnit(bill.unit_id);
                    const status = getBillStatus(bill);

                    return (
                      <tr
                        key={bill.id}
                        className="transition-all duration-200 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-black text-slate-950">
                          {unit?.unit_name || "-"}
                        </td>

                        <td className="px-4 py-3">{unit?.tenant_name || "-"}</td>

                        <td className="px-4 py-3">{bill.bill_month}</td>

                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatMoney(getTotalBill(bill))}
                        </td>

                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatMoney(getTotalPaid(bill))}
                        </td>

                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatMoney(getBalance(bill))}
                        </td>

                        <td className="px-4 py-3">{bill.due_date}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(
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
                      <td colSpan={8} className="px-4 py-14 text-center">
                        <p className="font-black text-slate-950">No records found</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          No apartment bills yet.
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

function KpiCard({ icon, title, value, subtitle, tone }: any) {
  const iconTone =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-2xl border p-3 ${iconTone}`}>{icon}</div>
        <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700">
          Live
        </div>
      </div>

      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
    </div>
  );
}

function SummaryMetric({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}



