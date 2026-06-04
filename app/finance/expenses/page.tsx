"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  DollarSign,
  Hotel,
  Receipt,
  ShieldAlert,
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
  const [rangeType, setRangeType] = useState<RangeType>("monthly");
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [hotelReservations, setHotelReservations] = useState<any[]>([]);
  const [restaurantSales, setRestaurantSales] = useState<any[]>([]);
  const [apartmentSales, setApartmentSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payrollRows, setPayrollRows] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [hcRules, setHcRules] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [cashDrawers, setCashDrawers] = useState<any[]>([]);

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
        row.payroll_date ||
        row.period_start ||
        row.due_date ||
        row.opened_at ||
        row.created_at ||
        ""
    ).slice(0, 10);

  const getAmountValue = (row: any) => {
    const amount =
      row.net_pay ??
      row.total_net_pay ??
      row.payroll_total ??
      row.grand_total ??
      row.amount ??
      row.total_amount ??
      row.total ??
      row.revenue ??
      row.sales ??
      row.net_sales ??
      row.gross_sales ??
      row.total_sales ??
      row.collection_amount ??
      row.payment_amount ??
      0;

    return Number(amount || 0);
  };

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

    const apartmentSalesData = await getRowsFromTables([
      "apartment_payments",
      "apartment_sales",
      "apartment_billing",
      "finance_apartment_payments",
      "finance_apartment",
    ]);

    const payrollData = await getRowsFromTables([
      "payroll_register",
      "payroll_runs",
      "payroll_records",
      "payroll_history",
      "finance_payroll_register",
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
    setApartmentSales(apartmentSalesData || []);
    setPayrollRows(payrollData || []);
    setExpenses(expensesData || []);
    setBills(billsData || []);
    setCashDrawers(drawerData || []);
    setEvents(eventsData || []);
    setSchedules(schedulesData || []);
    setEmployees(employeesData || []);
    setLeaveRequests(leavesData || []);
    setHcRules(hcData?.setting_data || null);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getLatestFinanceDate = () => {
    const dates = [
      ...hotelReservations,
      ...restaurantSales,
      ...apartmentSales,
      ...expenses,
    ]
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

  const getExpenseBusinessUnit = (row: any) =>
    String(
      row.business_unit ||
        row.expense_unit ||
        row.department ||
        row.category ||
        "Shared"
    ).toLowerCase();

  const sumExpensesByUnit = (unitKeywords: string[]) =>
    expenses
      .filter((row) => isWithinRange(getDateValue(row)))
      .filter((row) => {
        const unit = getExpenseBusinessUnit(row);
        return unitKeywords.some((keyword) => unit.includes(keyword));
      })
      .reduce((sum, row) => sum + getAmountValue(row), 0);

  const getDaysLeft = (dueDateValue: string | null) => {
    if (!dueDateValue) return null;

    const due = new Date(`${dueDateValue}T00:00:00`);
    const now = new Date(`${todayKey}T00:00:00`);
    const diff = due.getTime() - now.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

  const roomRevenue = sumAmount(hotelReservations);
  const restaurantRevenue = sumAmount(restaurantSales);
  const apartmentRevenue = sumAmount(apartmentSales);
  const totalRevenue = roomRevenue + restaurantRevenue + apartmentRevenue;

  const totalExpenses = Math.abs(sumAmount(expenses));
  const payrollTotal = Math.abs(sumAmount(payrollRows));

  const roomDirectExpenses = sumExpensesByUnit([
    "room",
    "hotel",
    "housekeeping",
    "laundry",
  ]);

  const restaurantDirectExpenses = sumExpensesByUnit([
    "restaurant",
    "kitchen",
    "bar",
    "food",
  ]);

  const apartmentDirectExpenses = sumExpensesByUnit(["apartment", "tenant"]);

  const netProfit = totalRevenue - totalExpenses - payrollTotal;

  const profitMargin =
    totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const roomsProfit = roomRevenue - roomDirectExpenses;
  const restaurantProfit = restaurantRevenue - restaurantDirectExpenses;
  const apartmentProfit = apartmentRevenue - apartmentDirectExpenses;

  const payrollRatio =
    totalRevenue > 0 ? Math.round((payrollTotal / totalRevenue) * 100) : 0;

  const payrollStatus =
    totalRevenue <= 0 && payrollTotal > 0
      ? "Critical"
      : payrollRatio >= 80
      ? "Critical"
      : payrollRatio >= 60
      ? "High Risk"
      : payrollRatio >= 40
      ? "Watch"
      : "Healthy";

  const payrollStatusStyle =
    payrollStatus === "Critical" || payrollStatus === "High Risk"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : payrollStatus === "Watch"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      : "border-green-500/30 bg-green-500/10 text-green-300";

  const filteredReservations = hotelReservations.filter((row) =>
    isWithinRange(getDateValue(row))
  );

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

  const unpaidBills = bills.filter((bill) => {
    const status = String(bill.status || "").toLowerCase();
    return status !== "paid" && status !== "cancelled";
  });

  const overdueBills = unpaidBills.filter((bill) => {
    const daysLeft = getDaysLeft(bill.due_date);
    return daysLeft !== null && daysLeft < 0;
  });

  const upcomingBills = unpaidBills.filter((bill) => {
    const daysLeft = getDaysLeft(bill.due_date);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
  });

  const upcomingBillsTotal = upcomingBills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0
  );

  const overdueBillsTotal = overdueBills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0
  );

  const outstandingBills = unpaidBills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0
  );

  const openDrawers = cashDrawers.filter((drawer) => {
    const status = getDrawerStatus(drawer);
    return status === "open" || status === "active" || status === "pending";
  });

  const closedDrawers = cashDrawers.filter((drawer) => {
    const status = getDrawerStatus(drawer);
    return status === "closed" || status === "completed";
  });

  const drawerRowsForSummary =
    openDrawers.length > 0
      ? openDrawers
      : cashDrawers.filter((drawer) => isWithinRange(getDateValue(drawer)));

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

  const expectedCollections = outstandingBalance + apartmentRevenue;
  const cashAvailable = actualCash > 0 ? actualCash : totalRevenue - totalExpenses;

  const projectedCashPosition =
    cashAvailable + expectedCollections - upcomingBillsTotal - payrollTotal;

  const cashFlowStatus =
    projectedCashPosition < 0
      ? "Critical"
      : projectedCashPosition < upcomingBillsTotal * 0.25
      ? "Watch"
      : "Safe";

  const cashFlowStyle =
    cashFlowStatus === "Critical"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : cashFlowStatus === "Watch"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      : "border-green-500/30 bg-green-500/10 text-green-300";

  const potentialRecovery =
    outstandingBalance + overdueBillsTotal + Math.abs(totalVariance);

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

    const peakRule = hcRules.peakRules?.find((rule: any) => rule.day === dayName);

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
    { name: "Apartment", value: apartmentRevenue },
  ].sort((a, b) => b.value - a.value);

  const topSource = revenueSources[0] || { name: "-", value: 0 };

  const topShare =
    totalRevenue > 0 ? Math.round((topSource.value / totalRevenue) * 100) : 0;

  const criticalAlerts = [
    ...(cashFlowStatus === "Critical"
      ? [
          `Cash flow is critical. Projected shortage: ${formatPeso(
            Math.abs(projectedCashPosition)
          )}.`,
        ]
      : []),
    ...(cashFlowStatus === "Watch"
      ? [`Cash flow needs monitoring. Projected position: ${formatPeso(projectedCashPosition)}.`]
      : []),
    ...(overdueBills.length > 0
      ? [
          `${overdueBills.length} overdue bill(s) worth ${formatPeso(
            overdueBillsTotal
          )} need payment review.`,
        ]
      : []),
    ...(payrollRatio >= 80
      ? [`Payroll ratio is critical at ${payrollRatio}%. Target is 35%-40%.`]
      : []),
    ...(payrollRatio >= 40 && payrollRatio < 80
      ? [`Payroll ratio is on watch at ${payrollRatio}%.`]
      : []),
    ...(potentialRecovery > 0
      ? [`Potential cash recovery detected: ${formatPeso(potentialRecovery)}.`]
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
    ...(netProfit < 0 ? ["Expenses and payroll are higher than revenue."] : []),
    ...(occupancyToday < 40 ? [`Room occupancy is low at ${occupancyToday}%.`] : []),
  ];

  const recommendations = [
    ...(cashFlowStatus === "Critical"
      ? [
          "Collect unpaid reservations and overdue balances immediately.",
          "Delay non-essential purchases until projected cash position improves.",
        ]
      : []),
    ...(overdueBills.length > 0
      ? ["Prioritize overdue bills before additional cash releases."]
      : []),
    ...(payrollRatio >= 40
      ? ["Review manpower schedule because payroll ratio is above ideal target."]
      : []),
    ...(potentialRecovery > 0
      ? [
          `Recovering pending balances can improve cash position by ${formatPeso(
            potentialRecovery
          )}.`,
        ]
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
      ? [
          `Revenue is heavily dependent on ${topSource.name}. Improve other revenue channels.`,
        ]
      : []),
    ...(netProfit < 0
      ? ["Check expenses immediately because current profit is negative."]
      : []),
  ];

  const financeScore = Math.max(
    0,
    100 -
      (netProfit < 0 ? 30 : 0) -
      (cashFlowStatus === "Critical" ? 25 : 0) -
      (cashFlowStatus === "Watch" ? 10 : 0) -
      (outstandingBalance > 0 ? 15 : 0) -
      (overdueBills.length > 0 ? 15 : 0) -
      (Math.abs(totalVariance) > 0 ? 10 : 0) -
      (profitMargin < 20 ? 10 : 0) -
      (payrollRatio >= 80 ? 20 : payrollRatio >= 40 ? 10 : 0)
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

      map[groupKey][type] += Math.abs(Number(amount || 0));
    };

    hotelReservations.forEach((row) => {
      addToMap(getDateValue(row), "revenue", getAmountValue(row));
    });

    restaurantSales.forEach((row) => {
      addToMap(getDateValue(row), "revenue", getAmountValue(row));
    });

    apartmentSales.forEach((row) => {
      addToMap(getDateValue(row), "revenue", getAmountValue(row));
    });

    expenses.forEach((row) => {
      addToMap(getDateValue(row), "expenses", getAmountValue(row));
    });

    payrollRows.forEach((row) => {
      addToMap(getDateValue(row), "expenses", getAmountValue(row));
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        label: getChartLabel(row.date),
        profit: row.revenue - row.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [
    hotelReservations,
    restaurantSales,
    apartmentSales,
    expenses,
    payrollRows,
    rangeType,
  ]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              OPSCORE Owner View
            </p>

            <h1 className="mt-2 text-4xl font-black">Executive Dashboard</h1>

            <p className="mt-2 text-slate-400">
              AI-style cash flow, leaks, revenue, payroll, bills, and operation health.
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
          <KpiCard icon={<Users size={22} />} title="Payroll" value={formatPeso(payrollTotal)} danger={payrollRatio >= 40} subtitle={`${payrollRatio}% of revenue`} />
          <KpiCard icon={<DollarSign size={22} />} title="Net Profit" value={formatPeso(netProfit)} success={netProfit >= 0} danger={netProfit < 0} subtitle={`${profitMargin}% margin`} />
          <KpiCard icon={<Hotel size={22} />} title="Occupancy" value={`${occupancyToday}%`} subtitle={`${roomsSoldToday} / ${availableRoomsToday} rooms`} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <InsightCard
            icon={<Wallet size={22} />}
            title="Cash Flow Health"
            status={cashFlowStatus}
            statusClass={cashFlowStyle}
            rows={[
              ["Cash Available", formatPeso(cashAvailable)],
              ["Expected Collections", formatPeso(expectedCollections)],
              ["Upcoming Bills", formatPeso(upcomingBillsTotal)],
              ["Payroll Load", formatPeso(payrollTotal)],
              ["Projected Position", formatPeso(projectedCashPosition)],
            ]}
          />

          <InsightCard
            icon={<ShieldAlert size={22} />}
            title="Revenue Leak Detector"
            status={potentialRecovery > 0 ? "Leak Found" : "Clean"}
            statusClass={
              potentialRecovery > 0
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            }
            rows={[
              ["Unpaid Rooms", formatPeso(outstandingBalance)],
              ["Overdue Bills", formatPeso(overdueBillsTotal)],
              ["Cash Variance", formatPeso(Math.abs(totalVariance))],
              ["Potential Recovery", formatPeso(potentialRecovery)],
            ]}
          />

          <InsightCard
            icon={<Users size={22} />}
            title="Payroll Health"
            status={payrollStatus}
            statusClass={payrollStatusStyle}
            rows={[
              ["Revenue", formatPeso(totalRevenue)],
              ["Payroll", formatPeso(payrollTotal)],
              ["Payroll Ratio", `${payrollRatio}%`],
              ["Target", "35% - 40%"],
            ]}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
          <div className="h-[520px] rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <h2 className="text-xl font-bold">Revenue vs Expenses Trend</h2>

            <p className="mt-1 text-sm text-slate-400">
              Includes rooms, restaurant, apartment, expenses, and payroll when available.
            </p>

            <div className="mt-6 h-[390px]">
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
                    <Area type="monotone" dataKey="expenses" name="Expenses + Payroll" stroke="#ef4444" strokeWidth={3} fill="#ef4444" fillOpacity={0.12} />
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

          <section className={`h-[520px] overflow-hidden rounded-2xl border p-5 xl:col-span-2 ${statusStyle}`}>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Brain size={18} /> OPSCORE AI Advisor
            </p>

            <h2 className="mt-1 text-2xl font-black">{businessStatus}</h2>

            <div className="mt-3 rounded-2xl bg-slate-950/60 p-4 text-center">
              <p className="text-sm text-slate-400">OPSCORE Health Score</p>

              <h3 className="mt-1 text-4xl font-black text-white">
                {businessHealthScore}
              </h3>

              <p className="text-xs text-slate-500">out of 100</p>
            </div>

            <div className="mt-3">
              <BriefingBox title="Critical Alerts" items={criticalAlerts} empty="No major issue detected." />
            </div>

            <div className="mt-3">
              <BriefingBox title="Recommended Actions" items={recommendations} empty="Maintain current operation and continue monitoring." />
            </div>
          </section>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <ProfitCard title="Rooms" sales={roomRevenue} expenses={roomDirectExpenses} profit={roomsProfit} />
          <ProfitCard title="Restaurant" sales={restaurantRevenue} expenses={restaurantDirectExpenses} profit={restaurantProfit} />
          <ProfitCard title="Apartment" sales={apartmentRevenue} expenses={apartmentDirectExpenses} profit={apartmentProfit} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<AlertTriangle size={22} />} title="Bills Outstanding" value={formatPeso(outstandingBills)} danger={outstandingBills > 0} subtitle={`${overdueBills.length} overdue • ${upcomingBills.length} due soon`} />
          <KpiCard icon={<Hotel size={22} />} title="Room Sales" value={formatPeso(roomRevenue)} />
          <KpiCard icon={<Utensils size={22} />} title="Restaurant Revenue" value={formatPeso(restaurantRevenue)} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Outstanding Guest Balance" value={formatPeso(outstandingBalance)} danger={outstandingBalance > 0} subtitle={`${unpaidReservations.length} unpaid reservation(s)`} />
        </section>

        <section className="mb-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
          <Panel title="Employee Details" icon={<Users size={22} />}>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat title="Active Employees" value={activeEmployees.length} />
              <MiniStat title="Inactive / Resigned" value={resignedEmployees.length} />
              <MiniStat title="Scheduled Today" value={scheduledHCToday} />
              <MiniStat title="Pending Leaves" value={pendingLeaves.length} />
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-bold text-slate-300">Department Headcount</p>
              {topDepartments.length > 0 ? (
                topDepartments.map((dept) => (
                  <MiniRow key={dept.department} label={dept.department} value={String(dept.count)} />
                ))
              ) : (
                <p className="text-sm text-slate-500">No employee data found.</p>
              )}
            </div>
          </Panel>

          <Panel title="Workforce Coverage" icon={<Users size={22} />}>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat title="Required" value={requiredHCToday} />
              <MiniStat title="Scheduled" value={scheduledHCToday} />
              <MiniStat title="Gap" value={hcGapToday > 0 ? `+${hcGapToday}` : hcGapToday} danger={hcGapToday < 0} />
            </div>

            <div className="mt-5 space-y-3">
              {departmentStatus.length > 0 ? (
                departmentStatus.slice(0, 6).map((dept) => (
                  <MiniRow
                    key={dept.department}
                    label={`${dept.department} • Req ${dept.required} / Sch ${dept.scheduled}`}
                    value={dept.gap > 0 ? `+${dept.gap}` : String(dept.gap)}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-500">No workforce rule data found.</p>
              )}
            </div>
          </Panel>

          <Panel title="Cash Drawer Summary" icon={<Wallet size={22} />}>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat title="Open Drawers" value={openDrawers.length} danger={openDrawers.length > 0} />
              <MiniStat title="Closed Drawers" value={closedDrawers.length} />
              <MiniStat title="Expected Cash" value={formatPeso(expectedCash)} />
              <MiniStat title="Variance" value={formatPeso(totalVariance)} danger={totalVariance !== 0} />
            </div>

            <div className="mt-5 space-y-3">
              {drawerAlerts.length > 0 ? (
                drawerAlerts.slice(0, 5).map((drawer) => {
                  const variance = getDrawerVariance(drawer);
                  const status = getDrawerStatus(drawer);

                  return (
                    <div
                      key={drawer.id}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{getDrawerCashier(drawer)}</p>
                          <p className="text-xs text-slate-400">
                            Status: {status || "No status"} • {getDateValue(drawer) || "No date"}
                          </p>
                        </div>

                        <p className="font-bold text-red-300">
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
          </Panel>
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

function InsightCard({
  icon,
  title,
  status,
  statusClass,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  statusClass: string;
  rows: [string, string][];
}) {
  return (
    <div className={`rounded-2xl border p-6 ${statusClass}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-950/60 p-3">{icon}</div>
          <h2 className="text-xl font-black text-white">{title}</h2>
        </div>

        <span className="rounded-full bg-slate-950/50 px-3 py-1 text-xs font-black">
          {status}
        </span>
      </div>

      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <MiniRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function ProfitCard({
  title,
  sales,
  expenses,
  profit,
}: {
  title: string;
  sales: number;
  expenses: number;
  profit: number;
}) {
  const margin = sales > 0 ? Math.round((profit / sales) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-black">{title} Profitability</h2>

      <div className="mt-5 space-y-3">
        <MiniRow label="Sales" value={`₱${sales.toLocaleString("en-PH")}`} />
        <MiniRow label="Direct Expenses" value={`₱${expenses.toLocaleString("en-PH")}`} />
        <MiniRow label="Profit" value={`₱${profit.toLocaleString("en-PH")}`} />
        <MiniRow label="Margin" value={`${margin}%`} />
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="font-black">{value}</p>
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
    <div className="rounded-xl bg-slate-950/60 p-3">
      <p className="mb-2 text-sm font-bold text-white">{title}</p>

      {items.length > 0 ? (
        <div className="space-y-1">
          {items.slice(0, 4).map((item, index) => (
            <p key={index} className="text-[13px] leading-5">
              • {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-[13px] leading-5">{empty}</p>
      )}
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