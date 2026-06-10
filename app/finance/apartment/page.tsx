"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, Brain, Building2, CheckCircle2, ClipboardList, Home, ShieldAlert, TrendingUp, Users, Wallet } from "lucide-react";
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


  /// EXECUTIVE UI DATA
  const totalUnits = units.length;
  const collectionRate =
    totalReceivable > 0 ? Math.round((totalCollected / totalReceivable) * 100) : 0;
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

  const executiveBriefingPoints = [
    `Occupancy is currently ${occupancyRate}% with ${occupiedUnits.length} occupied unit(s).`,
    `Collections stand at ${formatMoney(totalCollected)} against ${formatMoney(totalReceivable)} total receivables.`,
    `Outstanding exposure is ${formatMoney(totalUnpaid)} across ${overdueCount} overdue unit(s).`,
    noBillCount > 0
      ? `${noBillCount} billable unit(s) still need monthly billing review.`
      : "Monthly billing coverage is currently under control.",
  ];

  const recommendedActions = [
    ...(overdueCount > 0 ? ["Follow up overdue apartment balances before approving new expenses."] : []),
    ...(noBillCount > 0 ? ["Create missing monthly bills for billable apartment units."] : []),
    ...(maintenanceUnits.length > 0 ? ["Review maintenance units and confirm return-to-occupancy timeline."] : []),
    ...(vacantUnits.length > 0 ? ["Prepare vacant units for tenant placement or management review."] : []),
    ...(totalUnpaid > 0 ? ["Monitor collection exposure until outstanding balances are cleared."] : []),
    ...(overdueCount === 0 && noBillCount === 0 && totalUnpaid <= 0
      ? ["Maintain current collection discipline and continue monthly monitoring."]
      : []),
  ];

  /// UI
  return (
    <div className="flex min-h-screen bg-[#07111f] text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-[#0B1220] via-[#13203D] to-[#07111f] p-5 shadow-2xl shadow-blue-950/30 lg:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">
                  Apartment Executive Suite
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-bold text-slate-200">
                  Vincent Resort Hotel
                </span>
              </div>

              <p className="text-sm font-black uppercase tracking-[0.35em] text-blue-100/80">
                OPSCORE Apartment Intelligence
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">
                Apartment Operations Center
              </h1>

              <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-slate-200">
                Monitor occupancy, tenant health, collections, overdue exposure,
                and unit-level operating risk from one executive command center.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
                <HeroMetric
                  label="Occupancy"
                  mood={occupancyRate >= 80 ? "Strong occupancy" : occupancyRate >= 50 ? "Moderate occupancy" : "Needs lift"}
                  value={`${occupancyRate}%`}
                  subvalue={`${occupiedUnits.length}/${totalUnits} units occupied`}
                />

                <HeroMetric
                  label="Tenant Health"
                  mood={activeUnits.length > 0 ? "Active tenant base" : "Needs setup"}
                  value={activeUnits.length}
                  subvalue={`${maintenanceUnits.length} maintenance • ${inactiveUnits.length} inactive`}
                />

                <HeroMetric
                  label="Collection Status"
                  mood={collectionRate >= 90 ? "Healthy collection" : collectionRate >= 70 ? "Needs monitoring" : "Needs follow-up"}
                  value={`${collectionRate}%`}
                  subvalue={`${formatMoney(totalCollected)} collected`}
                />

                <HeroMetric
                  label="Overdue Exposure"
                  mood={overdueCount > 0 ? "Management review" : "Under control"}
                  value={formatMoney(totalUnpaid)}
                  subvalue={`${overdueCount} overdue unit(s)`}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-blue-200/20 bg-blue-300/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100/80">
                  Recommended action
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                  {recommendedActions[0] || "Maintain apartment monitoring and review collections regularly."}
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200/80">
                    Apartment Health
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-white">
                    {healthScore}
                  </h2>
                  <p className="mt-1 text-sm font-black uppercase tracking-[0.22em] text-blue-200">
                    {riskLevel}
                  </p>
                </div>

                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-blue-300/20 bg-blue-300/10">
                  <div className="absolute inset-2 rounded-full border border-blue-300/20" />
                  <div className="text-center">
                    <p className="text-3xl font-black text-white">{healthScore}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/70">/100</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-300 to-cyan-200"
                  style={{ width: `${Math.min(Math.max(healthScore, 0), 100)}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Bills
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">{bills.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Payments
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">{payments.length}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200/70">
                  Executive Focus
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  {totalUnpaid > 0
                    ? "Protect cash flow by closing unpaid apartment exposure."
                    : "Apartment collections are currently protected."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            icon={<Home size={22} />}
            title="Occupancy"
            value={`${occupancyRate}%`}
            success={occupancyRate >= 80}
            danger={occupancyRate < 50}
            subtitle={`${occupiedUnits.length} occupied • ${vacantUnits.length} vacant`}
            formula="Occupied units divided by total apartment units."
          />

          <KpiCard
            icon={<Users size={22} />}
            title="Tenant Health"
            value={activeUnits.length}
            success={activeUnits.length > 0}
            subtitle={`${maintenanceUnits.length} maintenance • ${inactiveUnits.length} inactive`}
            formula="Active and occupied units from apartment unit status."
          />

          <KpiCard
            icon={<Banknote size={22} />}
            title="Collection Status"
            value={formatMoney(totalCollected)}
            success={totalCollected > 0}
            subtitle={`${collectionRate}% collection rate`}
            formula="Total apartment payments recorded against total apartment receivables."
          />

          <KpiCard
            icon={<ShieldAlert size={22} />}
            title="Overdue Exposure"
            value={formatMoney(totalUnpaid)}
            danger={totalUnpaid > 0}
            success={totalUnpaid <= 0}
            subtitle={`${overdueCount} overdue unit(s)`}
            formula="Remaining apartment balances based on bills less recorded payments."
          />

          <KpiCard
            icon={<Brain size={22} />}
            title="Health Score"
            value={`${healthScore}/100`}
            success={healthScore >= 85}
            danger={healthScore < 70}
            subtitle={riskLevel}
            formula="Executive UI score from overdue, billing, maintenance, vacancy, and collection signals."
          />
        </section>

        <section className="mb-6 overflow-hidden rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-blue-950/20 lg:p-6">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                <Brain size={18} /> Apartment Executive Briefing
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {riskLevel === "Stable" ? "Apartment operations are under control." : riskLevel === "Monitor" ? "Apartment operations are stable, with items to monitor." : "Apartment operations need management review."}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                OPSCORE summarized the apartment position using occupancy, tenant status,
                billing coverage, collection performance, and overdue exposure.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {executiveBriefingPoints.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200/60">
                      Insight {index + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-300/20 bg-slate-950/70 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200/70">
                Action Center
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Prioritized actions for apartment collections and operating control.
              </p>

              <div className="mt-5 space-y-3">
                {recommendedActions.slice(0, 5).map((action, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200/60">
                      Priority {index + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                      {action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <IntelligenceCard
            icon={<TrendingUp size={20} />}
            title="Collection Performance"
            description="Receivable, collected, and outstanding apartment exposure."
          >
            <MetricLine label="Total Receivable" value={formatMoney(totalReceivable)} />
            <MetricLine label="Total Collected" value={formatMoney(totalCollected)} valueClass="text-blue-200" />
            <MetricLine label="Outstanding Balance" value={formatMoney(totalUnpaid)} valueClass={totalUnpaid > 0 ? "text-red-300" : "text-blue-200"} />
            <MetricLine label="Collection Rate" value={`${collectionRate}%`} />
          </IntelligenceCard>

          <IntelligenceCard
            icon={<Building2 size={20} />}
            title="Occupancy Monitor"
            description="Live unit state from apartment settings."
          >
            <MetricLine label="Occupied Units" value={occupiedUnits.length} />
            <MetricLine label="Vacant Units" value={vacantUnits.length} />
            <MetricLine label="Maintenance Units" value={maintenanceUnits.length} />
            <MetricLine label="Inactive Units" value={inactiveUnits.length} />
          </IntelligenceCard>

          <IntelligenceCard
            icon={<AlertTriangle size={20} />}
            title="Risk Monitor"
            description="Billing gaps and collection risks requiring review."
          >
            <MetricLine label="Overdue Units" value={overdueCount} valueClass={overdueCount > 0 ? "text-red-300" : "text-blue-200"} />
            <MetricLine label="No Bill Yet" value={noBillCount} valueClass={noBillCount > 0 ? "text-amber-300" : "text-blue-200"} />
            <MetricLine label="Payments Recorded" value={payments.length} />
            <MetricLine label="Total Bills" value={bills.length} />
          </IntelligenceCard>

          <IntelligenceCard
            icon={<ClipboardList size={20} />}
            title="Recommended Actions"
            description="Operational priorities generated from the current apartment data."
          >
            <div className="space-y-3">
              {recommendedActions.slice(0, 4).map((action, index) => (
                <div key={index} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-blue-200" size={16} />
                  <p className="text-xs font-semibold leading-5 text-slate-200">{action}</p>
                </div>
              ))}
            </div>
          </IntelligenceCard>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                Unit Intelligence
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Apartment Unit Monitoring
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Unit-level tenant, billing, collection, balance, and action status.
              </p>
            </div>

            <div className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400">
              Exposure: <span className={totalUnpaid > 0 ? "text-red-300" : "text-blue-300"}>{formatMoney(totalUnpaid)}</span>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950/40">
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

                      <td className="px-4 py-3 text-slate-300">
                        {latestBill?.bill_month || "-"}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-200">
                        {formatMoney(getTotalBill(latestBill))}
                      </td>

                      <td className="px-4 py-3 text-right text-blue-200">
                        {formatMoney(getTotalPaid(latestBill))}
                      </td>

                      <td className="px-4 py-3 text-right text-red-300">
                        {formatMoney(latestBalance)}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-amber-300">
                        {formatMoney(row.totalBalance)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
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

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                Billing Intelligence
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                All Apartment Bills
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Complete apartment billing ledger with payment and balance status.
              </p>
            </div>

            <div className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400">
              Bills: <span className="text-blue-300">{bills.length}</span>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950/40">
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
                      <td className="px-4 py-3 font-bold text-white">
                        {unit?.unit_name || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {unit?.tenant_name || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">{bill.bill_month}</td>

                      <td className="px-4 py-3 text-right text-slate-200">
                        {formatMoney(getTotalBill(bill))}
                      </td>

                      <td className="px-4 py-3 text-right text-blue-200">
                        {formatMoney(getTotalPaid(bill))}
                      </td>

                      <td className="px-4 py-3 text-right text-red-300">
                        {formatMoney(getBalance(bill))}
                      </td>

                      <td className="px-4 py-3 text-slate-300">{bill.due_date}</td>

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

function HeroMetric({ label, mood, value, subvalue }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/70">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-white">{mood}</p>
      <p className="mt-1 text-3xl font-black text-blue-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{subvalue}</p>
    </div>
  );
}

function KpiCard({ icon, title, value, subtitle, formula, danger, success }: any) {
  const tone = danger
    ? "border-red-300/20 bg-red-500/10 text-red-200"
    : success
    ? "border-blue-300/20 bg-blue-500/10 text-blue-200"
    : "border-slate-700 bg-slate-900 text-slate-200";

  return (
    <div className="group rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 transition hover:border-blue-300/30">
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-2xl border p-3 ${tone}`}>{icon}</div>
        <div className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          Live
        </div>
      </div>

      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
        {title}
      </p>
      <h3 className="mt-2 break-words text-2xl font-black text-white xl:text-3xl">
        {value}
      </h3>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
        {subtitle}
      </p>
      <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-5 text-slate-500">
        {formula}
      </p>
    </div>
  );
}

function IntelligenceCard({ icon, title, description, children }: any) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 p-3 text-blue-200">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function MetricLine({ label, value, valueClass = "text-white" }: any) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className={`text-sm font-black ${valueClass}`}>{value}</p>
    </div>
  );
}
