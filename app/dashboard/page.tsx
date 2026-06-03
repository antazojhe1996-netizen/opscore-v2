"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  DollarSign,
  Hotel,
  Receipt,
  TrendingDown,
  TrendingUp,
  Utensils,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type RangeType = "daily" | "weekly" | "monthly" | "yearly";

export default function ExecutiveDashboardPage() {
  /// STATES
  const [rangeType, setRangeType] = useState<RangeType>("monthly");
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [hotelReservations, setHotelReservations] = useState<any[]>([]);
  const [restaurantSales, setRestaurantSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [hcRules, setHcRules] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [cashDrawers, setCashDrawers] = useState<any[]>([]);

  /// DATA
  const todayKey = new Date().toISOString().slice(0, 10);

  const formatPeso = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      maximumFractionDigits: 2,
    })}`;

  const getDateValue = (row: any) =>
    String(
      row.business_date ||
        row.check_in ||
        row.date ||
        row.sale_date ||
        row.sales_date ||
        row.transaction_date ||
        row.expense_date ||
        row.event_date ||
        row.drawer_date ||
        row.opened_at ||
        row.created_at ||
        ""
    ).slice(0, 10);

  const getAmountValue = (row: any) => {
    const amount =
      row.grand_total ??
      row.amount ??
      row.total_amount ??
      row.total ??
      row.revenue ??
      row.sales ??
      row.net_sales ??
      row.gross_sales ??
      row.total_sales ??
      0;

    return Number(amount || 0);
  };

  const getDrawerExpectedCash = (drawer: any) =>
    Number(
      drawer.expected_cash ??
        drawer.expected_amount ??
        drawer.expected_total ??
        drawer.system_cash ??
        drawer.total_expected ??
        drawer.cash_expected ??
        0
    );

  const getDrawerActualCash = (drawer: any) =>
    Number(
      drawer.actual_cash ??
        drawer.actual_amount ??
        drawer.actual_total ??
        drawer.counted_cash ??
        drawer.cash_count ??
        drawer.total_actual ??
        0
    );

  const getDrawerVariance = (drawer: any) => {
    const savedVariance =
      drawer.variance ??
      drawer.cash_variance ??
      drawer.drawer_variance ??
      drawer.difference;

    if (savedVariance !== undefined && savedVariance !== null) {
      return Number(savedVariance || 0);
    }

    return getDrawerActualCash(drawer) - getDrawerExpectedCash(drawer);
  };

  const getDrawerStatus = (drawer: any) =>
    String(drawer.status || drawer.drawer_status || "").toLowerCase();

  const getDrawerCashier = (drawer: any) =>
    drawer.cashier_name ||
    drawer.cashier ||
    drawer.employee_name ||
    drawer.opened_by ||
    "Cashier";

  /// FUNCTIONS
  const getRowsFromTables = async (tableNames: string[]) => {
    for (const tableName of tableNames) {
      const { data, error } = await supabase.from(tableName).select("*");
      if (!error && data) return data || [];
    }

    return [];
  };

  const loadDashboardData = async () => {
    const { data: occupancy } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: true });

    const { data: hotelReservationsData } = await supabase
      .from("finance_hotel_reservations")
      .select("*")
      .order("check_in", { ascending: false });

    const restaurantSalesData = await getRowsFromTables([
      "restaurant_sales",
      "resto_sales",
      "restaurant_revenue",
      "food_sales",
      "pos_sales",
    ]);

    const { data: expensesData } = await supabase.from("expenses").select("*");

    const { data: billsData } = await supabase
      .from("finance_bills")
      .select("*")
      .order("due_date", { ascending: true });

    const drawerData = await getRowsFromTables([
      "finance_cash_drawers",
      "cash_drawers",
      "finance_cash_management",
      "cash_management",
    ]);

    const { data: eventsData } = await supabase
      .from("event_addons")
      .select("*")
      .order("event_date", { ascending: true });

    const { data: schedulesData } = await supabase.from("schedules").select("*");
    const { data: employeesData } = await supabase.from("employees").select("*");
    const { data: leavesData } = await supabase.from("leave_requests").select("*");

    const { data: hcData } = await supabase
      .from("hc_rule_settings")
      .select("setting_data")
      .eq("setting_name", "hc_rules")
      .maybeSingle();

    setOccupancyData(occupancy || []);
    setHotelReservations(hotelReservationsData || []);
    setRestaurantSales(restaurantSalesData || []);
    setExpenses(expensesData || []);
    setBills(billsData || []);
    setCashDrawers(drawerData || []);
    setEvents(eventsData || []);
    setSchedules(schedulesData || []);
    setEmployees(employeesData || []);
    setLeaveRequests(leavesData || []);
    setHcRules(hcData?.setting_data || null);
  };

  const getLatestFinanceDate = () => {
    const dates = [...hotelReservations, ...restaurantSales, ...expenses]
      .map((row) => getDateValue(row))
      .filter(Boolean)
      .sort();

    return dates[dates.length - 1] || todayKey;
  };

  const isWithinRange = (dateString: string) => {
    if (!dateString) return false;

    const anchorKey = getLatestFinanceDate();
    const date = new Date(dateString);
    const anchorDate = new Date(anchorKey);

    if (Number.isNaN(date.getTime())) return false;

    if (rangeType === "daily") return dateString === anchorKey;

    if (rangeType === "weekly") {
      const weekAgo = new Date(anchorDate);
      weekAgo.setDate(anchorDate.getDate() - 6);
      return date >= weekAgo && date <= anchorDate;
    }

    if (rangeType === "monthly") {
      return (
        date.getFullYear() === anchorDate.getFullYear() &&
        date.getMonth() === anchorDate.getMonth()
      );
    }

    return date.getFullYear() === anchorDate.getFullYear();
  };

  const sumAmount = (rows: any[]) =>
    rows
      .filter((row) => isWithinRange(getDateValue(row)))
      .reduce((sum, row) => sum + getAmountValue(row), 0);

  const getDaysLeft = (dueDateValue: string | null) => {
    if (!dueDateValue) return null;

    const due = new Date(`${dueDateValue}T00:00:00`);
    const now = new Date(`${todayKey}T00:00:00`);
    const diff = due.getTime() - now.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  /// EFFECTS
  useEffect(() => {
    loadDashboardData();
  }, []);

  /// CALCULATIONS
  const filteredReservations = hotelReservations.filter((row) =>
    isWithinRange(getDateValue(row))
  );

  const roomRevenue = sumAmount(hotelReservations);
  const restaurantRevenue = sumAmount(restaurantSales);
  const totalRevenue = roomRevenue + restaurantRevenue;
  const totalExpenses = sumAmount(expenses);
  const netProfit = totalRevenue - totalExpenses;

  const profitMargin =
    totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const outstandingBalance = filteredReservations.reduce(
    (sum, row) => sum + Number(row.balance_due || 0),
    0
  );

  const unpaidReservations = filteredReservations.filter(
    (row) => Number(row.balance_due || 0) > 0
  );

  const todayOccupancy =
    occupancyData.find((day) => String(day.business_date) === todayKey) ||
    occupancyData[0];

  const roomsSoldToday = Number(todayOccupancy?.rooms_sold || 0);
  const availableRoomsToday = Number(todayOccupancy?.available_rooms || 0);
  const occupancyToday = Number(todayOccupancy?.occupancy || 0);

  const unpaidBills = bills.filter(
    (bill) => bill.status !== "Paid" && bill.status !== "Cancelled"
  );

  const overdueBills = unpaidBills.filter((bill) => {
    const daysLeft = getDaysLeft(bill.due_date);
    return daysLeft !== null && daysLeft < 0;
  });

  const upcomingBills = unpaidBills.filter((bill) => {
    const daysLeft = getDaysLeft(bill.due_date);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  });

  const outstandingBills = unpaidBills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0
  );

  const todayEvents = events.filter(
    (event) => String(event.event_date) === todayKey
  );

  const getRequiredHCByDepartment = () => {
    if (!hcRules || !todayOccupancy) return [];

    const roomsSold = Number(todayOccupancy.rooms_sold || 0);
    const date = String(todayOccupancy.business_date || todayKey);

    const occupancyRule = hcRules.occupancyRules?.find((rule: any) => {
      return (
        roomsSold >= Number(rule.min || 0) &&
        roomsSold <= Number(rule.max || 999999)
      );
    });

    const dayName = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const peakRule = hcRules.peakRules?.find(
      (rule: any) => rule.day === dayName
    );

    const eventToday = events.find((event) => String(event.event_date) === date);
    const eventPax = Number(eventToday?.expected_pax || 0);

    const eventRule = hcRules.eventRules?.find((rule: any) => {
      return (
        eventPax >= Number(rule.min || 0) &&
        eventPax <= Number(rule.max || 999999)
      );
    });

    const departments = new Set<string>([
      ...Object.keys(occupancyRule?.rules || {}),
      ...Object.keys(peakRule?.rules || {}),
      ...Object.keys(eventRule?.rules || {}),
    ]);

    return Array.from(departments).map((department) => {
      const required =
        Number(occupancyRule?.rules?.[department] || 0) +
        Number(peakRule?.rules?.[department] || 0) +
        Number(eventToday ? eventRule?.rules?.[department] || 0 : 0);

      const scheduled = schedules.filter((schedule) => {
        const employee = employees.find(
          (emp) => String(emp.id) === String(schedule.employee_id)
        );

        return (
          String(schedule.day) === date &&
          String(schedule.shift).toUpperCase() !== "OFF" &&
          String(employee?.department || "").trim() === department
        );
      }).length;

      return {
        department,
        required,
        scheduled,
        gap: scheduled - required,
      };
    });
  };

  const departmentStatus = getRequiredHCByDepartment();

  const requiredHCToday = departmentStatus.reduce(
    (sum, dept) => sum + Number(dept.required || 0),
    0
  );

  const scheduledHCToday = departmentStatus.reduce(
    (sum, dept) => sum + Number(dept.scheduled || 0),
    0
  );

  const hcGapToday = scheduledHCToday - requiredHCToday;

  const pendingLeaves = leaveRequests.filter(
    (leave) => String(leave.status || "").toLowerCase() === "pending"
  );

  const activeEmployees = employees.filter((emp) => {
    const status = String(emp.employment_status || emp.status || "").toLowerCase();
    return status !== "resigned" && status !== "inactive";
  });

  const resignedEmployees = employees.filter((emp) => {
    const status = String(emp.employment_status || emp.status || "").toLowerCase();
    return status === "resigned" || status === "inactive";
  });

  const departmentCounts = activeEmployees.reduce(
    (acc: Record<string, number>, emp) => {
      const dept = emp.department || "Unassigned";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    },
    {}
  );

  const topDepartments = Object.entries(departmentCounts)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const criticalDepartments = departmentStatus.filter((dept) => dept.gap < 0);

  const revenueSources = [
    { name: "Rooms", value: roomRevenue },
    { name: "Restaurant", value: restaurantRevenue },
  ].sort((a, b) => b.value - a.value);

  const topSource = revenueSources[0];
  const topShare =
    totalRevenue > 0 ? Math.round((topSource.value / totalRevenue) * 100) : 0;

  const openDrawers = cashDrawers.filter((drawer) => {
    const status = getDrawerStatus(drawer);
    return status === "open" || status === "active" || status === "pending";
  });

  const closedDrawers = cashDrawers.filter((drawer) => {
    const status = getDrawerStatus(drawer);
    return status === "closed" || status === "completed";
  });

  const drawerRowsForSummary =
    openDrawers.length > 0 ? openDrawers : cashDrawers.filter((drawer) => isWithinRange(getDateValue(drawer)));

  const expectedCash = drawerRowsForSummary.reduce(
    (sum, drawer) => sum + getDrawerExpectedCash(drawer),
    0
  );

  const actualCash = drawerRowsForSummary.reduce(
    (sum, drawer) => sum + getDrawerActualCash(drawer),
    0
  );

  const totalVariance = drawerRowsForSummary.reduce(
    (sum, drawer) => sum + getDrawerVariance(drawer),
    0
  );

  const drawerAlerts = drawerRowsForSummary.filter(
    (drawer) =>
      Math.abs(getDrawerVariance(drawer)) > 0 ||
      ["open", "active", "pending"].includes(getDrawerStatus(drawer))
  );

  const criticalAlerts = [
    ...(overdueBills.length > 0
      ? [`${overdueBills.length} overdue bill(s) need payment review.`]
      : []),
    ...(upcomingBills.length > 0
      ? [`${upcomingBills.length} bill(s) due within 7 days.`]
      : []),
    ...(Math.abs(totalVariance) > 0
      ? [`Cash drawer variance detected: ${formatPeso(totalVariance)}.`]
      : []),
    ...(openDrawers.length > 0
      ? [`${openDrawers.length} cash drawer(s) still open.`]
      : []),
    ...(outstandingBalance > 0
      ? [
          `${unpaidReservations.length} unpaid reservation(s) with ${formatPeso(
            outstandingBalance
          )} outstanding balance.`,
        ]
      : []),
    ...criticalDepartments.map(
      (dept) => `${dept.department} short by ${Math.abs(dept.gap)} staff.`
    ),
    ...(pendingLeaves.length > 0
      ? [`${pendingLeaves.length} leave request(s) pending approval.`]
      : []),
    ...(todayEvents.length > 0
      ? todayEvents.map(
          (event) =>
            `${event.event_name} today with ${event.expected_pax || 0} pax.`
        )
      : []),
    ...(netProfit < 0 ? ["Expenses are higher than revenue."] : []),
    ...(occupancyToday < 40 ? [`Room occupancy is low at ${occupancyToday}%.`] : []),
  ];

  const recommendations = [
    ...(overdueBills.length > 0
      ? ["Prioritize overdue bills before additional cash releases."]
      : []),
    ...(Math.abs(totalVariance) > 0
      ? ["Review cash drawer variance before closing daily report."]
      : []),
    ...(openDrawers.length > 0
      ? ["Follow up pending cash drawer closures."]
      : []),
    ...(outstandingBalance > 0
      ? ["Review unpaid reservations and update balances."]
      : []),
    ...(hcGapToday < 0
      ? [`Fill staffing gap of ${Math.abs(hcGapToday)} staff for today's operation.`]
      : []),
    ...(occupancyToday < 40
      ? ["Review OTA visibility and consider room promotions."]
      : []),
    ...(topShare >= 80 && totalRevenue > 0
      ? [`Revenue is heavily dependent on ${topSource.name}. Improve other revenue channels.`]
      : []),
    ...(netProfit < 0
      ? ["Check expenses immediately because current profit is negative."]
      : []),
  ];

  const financeScore = Math.max(
    0,
    100 -
      (netProfit < 0 ? 30 : 0) -
      (outstandingBalance > 0 ? 15 : 0) -
      (overdueBills.length > 0 ? 15 : 0) -
      (Math.abs(totalVariance) > 0 ? 10 : 0) -
      (profitMargin < 20 ? 10 : 0)
  );

  const operationsScore = Math.max(
    0,
    100 - (occupancyToday < 40 ? 20 : 0) - (todayEvents.length > 0 ? 5 : 0)
  );

  const workforceScore = Math.max(
    0,
    100 - (hcGapToday < 0 ? Math.abs(hcGapToday) * 8 : 0)
  );

  const businessHealthScore = Math.round(
    (financeScore + operationsScore + workforceScore) / 3
  );

  const businessStatus =
    businessHealthScore >= 85
      ? "Stable"
      : businessHealthScore >= 70
      ? "Watchlist"
      : "Needs Attention";

  const statusStyle =
    businessStatus === "Stable"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : businessStatus === "Watchlist"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  const getChartLabel = (dateString: string) => {
    const date = new Date(dateString);

    if (rangeType === "yearly") {
      return date.toLocaleDateString("en-US", { month: "short" });
    }

    if (rangeType === "monthly") {
      const weekNumber = Math.ceil(date.getDate() / 7);
      return `Week ${weekNumber}`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const trendData = useMemo(() => {
    const map: Record<
      string,
      { date: string; revenue: number; expenses: number; profit: number }
    > = {};

    const addToMap = (
      date: string,
      type: "revenue" | "expenses",
      amount: number
    ) => {
      if (!date || !isWithinRange(date)) return;

      const groupKey = rangeType === "yearly" ? date.slice(0, 7) : date;

      if (!map[groupKey]) {
        map[groupKey] = {
          date: groupKey,
          revenue: 0,
          expenses: 0,
          profit: 0,
        };
      }

      map[groupKey][type] += Number(amount || 0);
    };

    hotelReservations.forEach((row) => {
      addToMap(getDateValue(row), "revenue", Number(row.grand_total || 0));
    });

    restaurantSales.forEach((row) => {
      addToMap(getDateValue(row), "revenue", getAmountValue(row));
    });

    expenses.forEach((row) => {
      addToMap(getDateValue(row), "expenses", getAmountValue(row));
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        label: getChartLabel(row.date),
        profit: row.revenue - row.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [hotelReservations, restaurantSales, expenses, rangeType]);

  const miniOccupancyTrend = occupancyData.slice(-7).map((row) => ({
    date: String(row.business_date || "").slice(5),
    occupancy: Number(row.occupancy || 0),
  }));

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Executive Dashboard</h1>
            <p className="mt-2 text-slate-400">
              Income, expenses, profit, bills, cash drawer, occupancy, and operation health.
            </p>
          </div>

          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            {(["daily", "weekly", "monthly", "yearly"] as RangeType[]).map(
              (range) => (
                <button
                  key={range}
                  onClick={() => setRangeType(range)}
                  className={
                    rangeType === range
                      ? "rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-slate-950"
                      : "rounded-lg px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800"
                  }
                >
                  {range === "daily"
                    ? "Today"
                    : range === "weekly"
                    ? "This Week"
                    : range === "monthly"
                    ? "This Month"
                    : "This Year"}
                </button>
              )
            )}
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={<DollarSign size={22} />} title="Total Revenue" value={formatPeso(totalRevenue)} success />
          <KpiCard icon={<Receipt size={22} />} title="Expenses" value={formatPeso(totalExpenses)} danger />
          <KpiCard icon={<DollarSign size={22} />} title="Net Profit" value={formatPeso(netProfit)} success={netProfit >= 0} danger={netProfit < 0} subtitle={`${profitMargin}% margin`} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Bills Outstanding" value={formatPeso(outstandingBills)} danger={outstandingBills > 0} subtitle={`${overdueBills.length} overdue • ${upcomingBills.length} due soon`} />
          <KpiCard icon={<Hotel size={22} />} title="Occupancy" value={`${occupancyToday}%`} subtitle={`${roomsSoldToday} / ${availableRoomsToday} rooms`} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <h2 className="text-xl font-bold">Revenue vs Expenses Trend</h2>
            <p className="mt-1 text-sm text-slate-400">
              Top graph for owner review. Based on selected range.
            </p>

            <div className="mt-6 h-[340px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 35, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(value) => `₱${Number(value) / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(value: any) => formatPeso(Number(value))}
                    />
                    <Legend verticalAlign="top" height={35} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.18} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={3} fill="#ef4444" fillOpacity={0.12} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={3} fill="#22c55e" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No financial data found for selected range.
                </div>
              )}
            </div>
          </div>

          <section className={`rounded-2xl border p-6 xl:col-span-2 ${statusStyle}`}>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Brain size={18} /> Executive Briefing
            </p>

            <h2 className="mt-2 text-3xl font-black">{businessStatus}</h2>

            <div className="mt-4 rounded-2xl bg-slate-950/60 p-5 text-center">
              <p className="text-sm text-slate-400">Business Health Score</p>
              <h3 className="mt-2 text-5xl font-black text-white">
                {businessHealthScore}
              </h3>
              <p className="text-xs text-slate-500">out of 100</p>
            </div>

            <div className="mt-5">
              <BriefingBox
                title="Critical Alerts"
                items={criticalAlerts}
                empty="No major issue detected."
              />
            </div>

            <div className="mt-4">
              <BriefingBox
                title="Recommended Actions"
                items={recommendations}
                empty="Maintain current operation and continue monitoring."
              />
            </div>
          </section>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<Hotel size={22} />} title="Room Sales" value={formatPeso(roomRevenue)} />
          <KpiCard icon={<Utensils size={22} />} title="Restaurant Revenue" value={formatPeso(restaurantRevenue)} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Outstanding Guest Balance" value={formatPeso(outstandingBalance)} danger={outstandingBalance > 0} subtitle={`${unpaidReservations.length} unpaid reservation(s)`} />
          <MiniChartCard title="Room Occupancy Trend" value={`${occupancyToday}%`} subtitle={`${roomsSoldToday} / ${availableRoomsToday} rooms`} icon={<TrendingUp size={22} />} data={miniOccupancyTrend} dataKey="occupancy" />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Users size={22} /> Employee Details
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat title="Active Employees" value={activeEmployees.length} />
              <MiniStat title="Inactive / Resigned" value={resignedEmployees.length} />
              <MiniStat title="Scheduled Today" value={scheduledHCToday} />
              <MiniStat title="Pending Leaves" value={pendingLeaves.length} />
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-bold text-slate-300">
                Department Headcount
              </p>

              {topDepartments.length > 0 ? (
                topDepartments.map((dept) => (
                  <div
                    key={dept.department}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                  >
                    <p className="text-sm font-semibold">{dept.department}</p>
                    <p className="font-bold text-yellow-400">{dept.count}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No employee data found.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Users size={22} /> Workforce Coverage
            </h2>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat title="Required" value={requiredHCToday} />
              <MiniStat title="Scheduled" value={scheduledHCToday} />
              <MiniStat title="Gap" value={hcGapToday > 0 ? `+${hcGapToday}` : hcGapToday} danger={hcGapToday < 0} />
            </div>

            <div className="mt-5 space-y-3">
              {departmentStatus.length > 0 ? (
                departmentStatus.slice(0, 6).map((dept) => (
                  <div
                    key={dept.department}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold">{dept.department}</p>
                      <p className="text-xs text-slate-500">
                        Required {dept.required} • Scheduled {dept.scheduled}
                      </p>
                    </div>

                    <p className={dept.gap < 0 ? "font-bold text-red-400" : "font-bold text-green-400"}>
                      {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No workforce rule data found.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Wallet size={22} /> Cash Drawer Summary
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat title="Open Drawers" value={openDrawers.length} danger={openDrawers.length > 0} />
              <MiniStat title="Closed Drawers" value={closedDrawers.length} />
              <MiniStat title="Expected Cash" value={formatPeso(expectedCash)} />
              <MiniStat title="Variance" value={formatPeso(totalVariance)} danger={totalVariance < 0 || totalVariance > 0} />
            </div>

            <div className="mt-5 space-y-3">
              {drawerAlerts.length > 0 ? (
                drawerAlerts.slice(0, 5).map((drawer) => {
                  const variance = getDrawerVariance(drawer);
                  const status = getDrawerStatus(drawer);

                  return (
                    <div
                      key={drawer.id}
                      className={`rounded-xl border p-4 ${
                        Math.abs(variance) > 0
                          ? "border-red-500/20 bg-red-500/10"
                          : "border-amber-500/20 bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{getDrawerCashier(drawer)}</p>
                          <p className="text-xs text-slate-400">
                            Status: {status || "No status"} • {getDateValue(drawer) || "No date"}
                          </p>
                        </div>

                        <p
                          className={
                            Math.abs(variance) > 0
                              ? "font-bold text-red-300"
                              : "font-bold text-amber-300"
                          }
                        >
                          {formatPeso(variance)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                  <p className="font-semibold text-green-300">
                    ✅ All cash drawers balanced
                  </p>
                  <p className="mt-1 text-xs text-green-200">
                    No open drawers or variance detected.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  success,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  subtitle?: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/20 bg-red-500/10"
          : success
          ? "border-green-500/20 bg-green-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-yellow-400">
          {icon}
        </div>

        <p className="text-sm text-slate-400">{title}</p>
      </div>

      <h2 className="text-2xl font-bold">{value}</h2>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function BriefingBox({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-4">
      <p className="mb-2 text-sm font-bold text-white">{title}</p>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.slice(0, 4).map((item, index) => (
            <p key={index} className="text-sm">
              • {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm">{empty}</p>
      )}
    </div>
  );
}

function MiniChartCard({
  icon,
  title,
  value,
  subtitle,
  data,
  dataKey,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  subtitle?: string;
  data: any[];
  dataKey: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-blue-400">
          {icon}
        </div>

        <p className="text-sm text-slate-400">{title}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <h2 className="text-2xl font-bold">{value}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.25}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  danger,
}: {
  title: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <h3
        className={
          danger
            ? "mt-1 text-2xl font-black text-red-400"
            : "mt-1 text-2xl font-black text-white"
        }
      >
        {value}
      </h3>
    </div>
  );
}