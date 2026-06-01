"use client";

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
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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

  const getDateValue = (row: any) =>
    String(
      row.business_date ||
        row.date ||
        row.sale_date ||
        row.sales_date ||
        row.expense_date ||
        row.event_date ||
        row.created_at ||
        ""
    ).slice(0, 10);

  const getAmountValue = (row: any) =>
    Number(
      row.amount ||
        row.total_amount ||
        row.total ||
        row.revenue ||
        row.sales ||
        row.net_sales ||
        row.gross_sales ||
        row.room_revenue ||
        row.restaurant_revenue ||
        row.apartment_revenue ||
        0
    );

  const isWithinRange = (dateString: string) => {
    if (!dateString) return false;

    const date = new Date(dateString);
    const today = new Date(todayKey);

    if (rangeType === "daily") return dateString === todayKey;

    if (rangeType === "weekly") {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);
      return date >= weekAgo && date <= today;
    }

    if (rangeType === "monthly") {
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth()
      );
    }

    return date.getFullYear() === today.getFullYear();
  };

  const sumAmount = (rows: any[]) =>
    rows
      .filter((row) => isWithinRange(getDateValue(row)))
      .reduce((sum, row) => sum + getAmountValue(row), 0);

  const getFirstAvailableTable = async (tableNames: string[]) => {
    for (const tableName of tableNames) {
      const { data, error } = await supabase.from(tableName).select("*");
      if (!error) return data || [];
    }

    return [];
  };

  /// FUNCTIONS
  const loadDashboardData = async () => {
    const { data: occupancy } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: true });

    const roomSalesData = await getFirstAvailableTable([
      "room_sales",
      "rooms_sales",
      "hotel_sales",
      "sales_rooms",
      "room_revenue",
    ]);

    const restaurantSalesData = await getFirstAvailableTable([
      "restaurant_sales",
      "resto_sales",
      "restaurant_revenue",
      "food_sales",
      "pos_sales",
    ]);

    const apartmentSalesData = await getFirstAvailableTable([
      "apartment_sales",
      "apartment_revenue",
      "rental_sales",
      "rental_revenue",
    ]);

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
    setRoomSales(roomSalesData || []);
    setRestaurantSales(restaurantSalesData || []);
    setApartmentSales(apartmentSalesData || []);
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
  const trendData = useMemo(() => {
    const map: Record<
      string,
      { date: string; revenue: number; expenses: number; profit: number }
    > = {};

    [...roomSales, ...restaurantSales, ...apartmentSales].forEach((row) => {
      const date = getDateValue(row);
      if (!date || !isWithinRange(date)) return;

      if (!map[date]) map[date] = { date, revenue: 0, expenses: 0, profit: 0 };
      map[date].revenue += getAmountValue(row);
    });

    expenses.forEach((row) => {
      const date = getDateValue(row);
      if (!date || !isWithinRange(date)) return;

      if (!map[date]) map[date] = { date, revenue: 0, expenses: 0, profit: 0 };
      map[date].expenses += getAmountValue(row);
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        profit: row.revenue - row.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
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
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(value) => `₱${Number(value) / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                      }}
                      formatter={(value: any) => formatPeso(Number(value))}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} dot />
                    <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No financial data found for selected range.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="text-xl font-bold">Revenue Breakdown</h2>
            <p className="mt-1 text-sm text-slate-400">
              Rooms, restaurant, and apartment contribution.
            </p>

            <div className="mt-6 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={2}
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#22c55e" />
                    <Cell fill="#a855f7" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                    formatter={(value: any) => formatPeso(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {revenueBreakdown.map((item) => (
                <div key={item.name} className="flex justify-between text-sm">
                  <span className="text-slate-400">{item.name}</span>
                  <span className="font-bold">{formatPeso(item.value)}</span>
                </div>
              ))}
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
        <div className="rounded-full bg-slate-800 p-3 text-yellow-400">{icon}</div>
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
        <div className="rounded-full bg-slate-800 p-3 text-blue-400">{icon}</div>
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