"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  DollarSign,
  Hotel,
  Receipt,
  TrendingDown,
  TrendingUp,
  Utensils,
  Users,
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
  const [rangeType, setRangeType] = useState<RangeType>("daily");
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [roomSales, setRoomSales] = useState<any[]>([]);
  const [restaurantSales, setRestaurantSales] = useState<any[]>([]);
  const [apartmentSales, setApartmentSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [hcRules, setHcRules] = useState<any>(null);

  /// HELPERS
  const todayKey = new Date().toISOString().slice(0, 10);

  const formatPeso = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      maximumFractionDigits: 2,
    })}`;

  const normalizeText = (value: any) =>
    String(value || "").trim().toLowerCase();

  const getDateValue = (row: any) =>
    String(
      row.business_date ||
        row.date ||
        row.sale_date ||
        row.sales_date ||
        row.transaction_date ||
        row.expense_date ||
        row.event_date ||
        row.created_at ||
        ""
    ).slice(0, 10);

  const getAmountValue = (row: any) => {
    const possibleAmount =
      row.amount ??
      row.total_amount ??
      row.total ??
      row.revenue ??
      row.sales ??
      row.net_sales ??
      row.gross_sales ??
      row.room_revenue ??
      row.restaurant_revenue ??
      row.apartment_revenue ??
      row.room_sales ??
      row.restaurant_sales ??
      row.apartment_sales ??
      row.sales_amount ??
      row.total_sales ??
      row.cash_sales ??
      row.gcash_sales ??
      row.card_sales ??
      row.bank_sales ??
      0;

    return Number(possibleAmount || 0);
  };

  const getCategoryValue = (row: any) =>
    normalizeText(
      row.category ||
        row.department ||
        row.revenue_category ||
        row.income_category ||
        row.sales_category ||
        row.sales_type ||
        row.type ||
        row.source ||
        row.business_unit ||
        row.description
    );

  const isRoomSale = (row: any) => {
    const category = getCategoryValue(row);
    return (
      category.includes("room") ||
      category.includes("hotel") ||
      category.includes("accommodation")
    );
  };

  const isRestaurantSale = (row: any) => {
    const category = getCategoryValue(row);
    return (
      category.includes("restaurant") ||
      category.includes("resto") ||
      category.includes("food") ||
      category.includes("bar") ||
      category.includes("pos")
    );
  };

  const isApartmentSale = (row: any) => {
    const category = getCategoryValue(row);
    return category.includes("apartment") || category.includes("rental");
  };

  const getChartLabel = (dateString: string) => {
    const date = new Date(dateString);

    if (rangeType === "yearly") {
  return date.toLocaleDateString("en-US", {
    month: "short",
  });
}

    if (rangeType === "weekly") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    if (rangeType === "monthly") {
      const weekNumber = Math.ceil(date.getDate() / 7);
      return `Week ${weekNumber}`;
    }

    return date.toLocaleDateString("en-US", { month: "short" });
  };

 const getLatestFinanceDate = () => {
  const dates = [
    ...roomSales,
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

  if (rangeType === "daily") {
    return dateString === anchorKey;
  }

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

  const getRowsFromTables = async (tableNames: string[]) => {
    for (const tableName of tableNames) {
      const { data, error } = await supabase.from(tableName).select("*");

      if (!error && data) {
        return data || [];
      }
    }

    return [];
  };

  /// FUNCTIONS
  const loadDashboardData = async () => {
    const { data: occupancy } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: true });

    const roomSalesData = await getRowsFromTables([
      "room_sales",
      "rooms_sales",
      "hotel_sales",
      "sales_rooms",
      "room_revenue",
    ]);

    const restaurantSalesData = await getRowsFromTables([
      "restaurant_sales",
      "resto_sales",
      "restaurant_revenue",
      "food_sales",
      "pos_sales",
    ]);

    const apartmentSalesData = await getRowsFromTables([
      "apartment_sales",
      "apartment_revenue",
      "rental_sales",
      "rental_revenue",
    ]);

    const combinedSalesData = await getRowsFromTables([
      "sales",
      "daily_sales",
      "finance_sales",
      "sales_reports",
      "revenue",
      "revenues",
      "income",
      "income_entries",
    ]);

    const finalRoomSales =
      roomSalesData.length > 0
        ? roomSalesData
        : combinedSalesData.filter(isRoomSale);

    const finalRestaurantSales =
      restaurantSalesData.length > 0
        ? restaurantSalesData
        : combinedSalesData.filter(isRestaurantSale);

    const finalApartmentSales =
      apartmentSalesData.length > 0
        ? apartmentSalesData
        : combinedSalesData.filter(isApartmentSale);

    const { data: expensesData } = await supabase.from("expenses").select("*");

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
    setRoomSales(finalRoomSales || []);
    setRestaurantSales(finalRestaurantSales || []);
    setApartmentSales(finalApartmentSales || []);
    setExpenses(expensesData || []);
    setEvents(eventsData || []);
    setSchedules(schedulesData || []);
    setEmployees(employeesData || []);
    setLeaveRequests(leavesData || []);
    setHcRules(hcData?.setting_data || null);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  /// HC CALCULATIONS
  const todayOccupancy =
    occupancyData.find((day) => String(day.business_date) === todayKey) ||
    occupancyData[0];

  const todayEvents = events.filter(
    (event) => String(event.event_date) === todayKey
  );

  const upcomingEvents = events.filter(
    (event) => String(event.event_date) >= todayKey
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

  /// FINANCE
  const roomRevenue = sumAmount(roomSales);
  const restaurantRevenue = sumAmount(restaurantSales);
  const apartmentRevenue = sumAmount(apartmentSales);

  const totalRevenue = roomRevenue + restaurantRevenue + apartmentRevenue;
  const totalExpenses = sumAmount(expenses);
  const netProfit = totalRevenue - totalExpenses;

  const profitMargin =
    totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const revenueBreakdown = [
    { name: "Rooms", value: roomRevenue },
    { name: "Restaurant", value: restaurantRevenue },
    { name: "Apartment", value: apartmentRevenue },
  ];

  const sortedSources = [...revenueBreakdown].sort(
    (a, b) => Number(b.value || 0) - Number(a.value || 0)
  );

  const topSource = sortedSources[0];
  const topValue = Number(topSource?.value || 0);

  const dependency =
    totalRevenue > 0 ? Math.round((topValue / totalRevenue) * 100) : 0;

  const mixStatus =
    dependency >= 80
      ? "Single-source heavy"
      : dependency >= 50
      ? "Main source dominant"
      : "Balanced revenue mix";

  const riskLevel =
    dependency >= 80 ? "High" : dependency >= 50 ? "Moderate" : "Healthy";

  const riskStyle =
    riskLevel === "High"
      ? "border-red-500/30 bg-red-500/10 text-red-400"
      : riskLevel === "Moderate"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
      : "border-green-500/30 bg-green-500/10 text-green-400";

  /// OPERATIONS
  const roomsSoldToday = Number(todayOccupancy?.rooms_sold || 0);
  const availableRoomsToday = Number(todayOccupancy?.available_rooms || 0);
  const occupancyToday = Number(todayOccupancy?.occupancy || 0);

  const pendingLeaves = leaveRequests.filter(
    (leave) => String(leave.status || "").toLowerCase() === "pending"
  );

  const criticalDepartments = departmentStatus.filter((dept) => dept.gap < 0);

  const criticalAlerts = [
    ...criticalDepartments.map(
      (dept) => `${dept.department} short by ${Math.abs(dept.gap)} staff`
    ),
    ...(pendingLeaves.length > 0
      ? [`${pendingLeaves.length} leave request(s) pending approval`]
      : []),
    ...(todayEvents.length > 0
      ? todayEvents.map(
          (event) =>
            `${event.event_name} today with ${event.expected_pax || 0} pax`
        )
      : []),
    ...(netProfit < 0 ? ["Expenses are higher than revenue"] : []),
  ];

  /// TREND DATA

/// TREND DATA
/// TREND DATA
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

    const groupKey =
      rangeType === "yearly"
        ? date.slice(0, 7)
        : date;

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

  restaurantSales.forEach((row) => {
    addToMap(
      String(row.sale_date || row.date || row.created_at || "").slice(0, 10),
      "revenue",
      Number(row.revenue || 0)
    );
  });

  roomSales.forEach((row) => {
    addToMap(getDateValue(row), "revenue", getAmountValue(row));
  });

  apartmentSales.forEach((row) => {
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
}, [roomSales, restaurantSales, apartmentSales, expenses, rangeType]);

const miniOccupancyTrend = occupancyData.slice(-7).map((row) => ({
  date: String(row.business_date || "").slice(5),
  occupancy: Number(row.occupancy || 0),
}));

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Executive Dashboard</h1>
            <p className="mt-2 text-slate-400">
              Sales, expenses, profit, occupancy, staffing health, and critical alerts.
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
                      ? "rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold capitalize text-slate-950"
                      : "rounded-lg px-4 py-2 text-sm font-bold capitalize text-slate-400 hover:bg-slate-800"
                  }
                >
                  {range}
                </button>
              )
            )}
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={<Hotel size={22} />} title="Room Revenue" value={formatPeso(roomRevenue)} />
          <KpiCard icon={<Utensils size={22} />} title="Restaurant Revenue" value={formatPeso(restaurantRevenue)} />
          <KpiCard icon={<Building2 size={22} />} title="Apartment Revenue" value={formatPeso(apartmentRevenue)} />
          <KpiCard icon={<Receipt size={22} />} title="Expenses" value={formatPeso(totalExpenses)} danger />
          <KpiCard
            icon={<DollarSign size={22} />}
            title="Net Profit"
            value={formatPeso(netProfit)}
            success={netProfit >= 0}
            danger={netProfit < 0}
            subtitle={`${profitMargin}% margin`}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MiniChartCard
            title="Room Occupancy"
            value={`${occupancyToday}%`}
            subtitle={`${roomsSoldToday} / ${availableRoomsToday} rooms`}
            icon={<TrendingUp size={22} />}
            data={miniOccupancyTrend}
            dataKey="occupancy"
          />

          <KpiCard icon={<Users size={22} />} title="Required HC Today" value={requiredHCToday} />
          <KpiCard icon={<Users size={22} />} title="Scheduled HC Today" value={scheduledHCToday} />
          <KpiCard
            icon={hcGapToday < 0 ? <TrendingDown size={22} /> : <TrendingUp size={22} />}
            title="HC Gap"
            value={hcGapToday > 0 ? `+${hcGapToday}` : hcGapToday}
            success={hcGapToday >= 0}
            danger={hcGapToday < 0}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <h2 className="text-xl font-bold">Revenue vs Expenses Trend</h2>
            <p className="mt-1 text-sm text-slate-400">
              Sales, expenses, and profit based on selected range.
            </p>

            <div className="mt-6 h-[340px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 35, right: 30, left: 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>

                      <linearGradient id="expensesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>

                      <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>

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

                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#revenueFill)"
                      fillOpacity={1}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />

                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#ef4444"
                      strokeWidth={3}
                      fill="url(#expensesFill)"
                      fillOpacity={1}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />

                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Profit"
                      stroke="#22c55e"
                      strokeWidth={3}
                      fill="url(#profitFill)"
                      fillOpacity={1}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No financial data found for selected range.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="text-xl font-bold">Revenue Intelligence</h2>
            <p className="mt-1 text-sm text-slate-400">
              Quick business read based on current revenue mix.
            </p>

            <div className="mt-6 space-y-4">
              

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Source Ranking</p>

                <div className="mt-4 space-y-3">
                  {sortedSources.map((item, index) => {
                    const sourceShare =
                      totalRevenue > 0
                        ? Math.round(
                            (Number(item.value || 0) / totalRevenue) * 100
                          )
                        : 0;

                    const dotColor =
                      item.name === "Rooms"
                        ? "text-blue-400"
                        : item.name === "Restaurant"
                        ? "text-green-400"
                        : "text-purple-400";

                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3"
                      >
                        <div>
                          <p className={`font-semibold ${dotColor}`}>
                            #{index + 1} • {item.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {sourceShare}% contribution
                          </p>
                        </div>

                        <p className="font-bold text-white">
                          {formatPeso(Number(item.value || 0))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-red-300">
              <AlertTriangle size={22} /> Critical Alerts
            </h2>

            <div className="mt-4 space-y-3">
              {criticalAlerts.length > 0 ? (
                criticalAlerts.slice(0, 6).map((alert, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-red-500/20 bg-slate-950 p-3 text-sm text-red-300"
                  >
                    ⚠ {alert}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
                  ✅ Operations healthy. No critical alerts.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <CalendarDays size={22} /> Upcoming Events
            </h2>

            <div className="mt-4 space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div>
                      <p className="font-semibold">{event.event_name}</p>
                      <p className="text-xs text-slate-400">{event.event_date}</p>
                    </div>

                    <p className="font-bold text-green-400">
                      {event.expected_pax || 0} pax
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No upcoming events.</p>
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