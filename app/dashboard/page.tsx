/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Brain,
  Database,
  Hotel,
  Receipt,
  RefreshCcw,
  TrendingUp,
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
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/app/lib/supabase";

type RangeType = "daily" | "weekly" | "monthly" | "yearly";
type Tone = "success" | "warning" | "danger" | "info" | "neutral";
type Row = Record<string, unknown>;

type DashboardData = {
  occupancyData: Row[];
  hotelReservations: Row[];
  restaurantSales: Row[];
  apartmentPayments: Row[];
  apartmentBills: Row[];
  expenses: Row[];
  payrollRows: Row[];
  financeBills: Row[];
  cashDrawers: Row[];
  cashMovements: Row[];
  employeeBalances: Row[];
  payrollPeriods: Row[];
  attendanceEntries: Row[];
};

const emptyDashboardData: DashboardData = {
  occupancyData: [],
  hotelReservations: [],
  restaurantSales: [],
  apartmentPayments: [],
  apartmentBills: [],
  expenses: [],
  payrollRows: [],
  financeBills: [],
  cashDrawers: [],
  cashMovements: [],
  employeeBalances: [],
  payrollPeriods: [],
  attendanceEntries: [],
};

const realtimeTables = [
  "occupancy_data",
  "finance_hotel_revenue",
  "finance_hotel_reservations",
  "restaurant_sales",
  "pos_orders",
  "apartment_payments",
  "apartment_bills",
  "expenses",
  "finance_bills",
  "finance_cash_management",
  "finance_cash_movements",
  "employee_balances",
  "payroll_periods",
  "payroll_records",
  "attendance_entries",
];

export default function ExecutiveDashboardPage() {
  const [rangeType, setRangeType] = useState<RangeType>("yearly");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("User");
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const safeData = useMemo<DashboardData>(
  () => ({
    occupancyData: Array.isArray(data.occupancyData) ? data.occupancyData : [],
    hotelReservations: Array.isArray(data.hotelReservations) ? data.hotelReservations : [],
    restaurantSales: Array.isArray(data.restaurantSales) ? data.restaurantSales : [],
    apartmentPayments: Array.isArray(data.apartmentPayments) ? data.apartmentPayments : [],
    apartmentBills: Array.isArray(data.apartmentBills) ? data.apartmentBills : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    payrollRows: Array.isArray(data.payrollRows) ? data.payrollRows : [],
    financeBills: Array.isArray(data.financeBills) ? data.financeBills : [],
    cashDrawers: Array.isArray(data.cashDrawers) ? data.cashDrawers : [],
    cashMovements: Array.isArray(data.cashMovements) ? data.cashMovements : [],
    employeeBalances: Array.isArray(data.employeeBalances) ? data.employeeBalances : [],
    payrollPeriods: Array.isArray(data.payrollPeriods) ? data.payrollPeriods : [],
    attendanceEntries: Array.isArray(data.attendanceEntries) ? data.attendanceEntries : [],
  }),
  [data],
);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);

  const formatPeso = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      maximumFractionDigits: 2,
    })}`;

  const getText = (row: Row | undefined, keys: string[], fallback = "") => {
    if (!row) return fallback;

    for (const key of keys) {
      const value = row[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return String(value);
      }
    }

    return fallback;
  };

  const getNumber = (row: Row | undefined, keys: string[], fallback = 0) => {
    if (!row) return fallback;

    for (const key of keys) {
      const value = row[key];

      if (value !== null && value !== undefined && value !== "") {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }

    return fallback;
  };

  const getDateValue = (row: Row | undefined) =>
    getText(row, [
      "business_date",
      "service_date",
      "sale_date",
      "sales_date",
      "payment_date",
      "check_in",
      "date",
      "expense_date",
      "due_date",
      "opened_at",
      "closed_at",
      "created_at",
    ]).slice(0, 10);

  const getAmountValue = (row: Row) =>
    getNumber(row, [
      "credit",
      "revenue",
      "amount",
      "total_amount",
      "total",
      "net_sales",
      "gross_sales",
      "total_sales",
      "payment_amount",
      "collection_amount",
      "amount_paid",
      "paid_amount",
      "net_pay",
      "total_net_pay",
      "payroll_total",
      "release_amount",
      "released_amount",
    ]);

  const normalize = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const fetchAllRows = async (
    tableName: string,
    orderColumn?: string,
    ascending = false,
  ) => {
    const pageSize = 1000;
    let from = 0;
    let allRows: Row[] = [];

    while (true) {
      let query = supabase.from(tableName).select("*");

      if (orderColumn) {
        query = query.order(orderColumn, { ascending });
      }

      const { data: rows, error } = await query.range(
        from,
        from + pageSize - 1,
      );

      if (error) {
        console.log(`${tableName.toUpperCase()} LOAD ERROR:`, error.message);
        return allRows;
      }

      const batch = (rows || []) as Row[];
      allRows = [...allRows, ...batch];

      if (batch.length < pageSize) break;
      from += pageSize;
    }

    return allRows;
  };

  const getRowsFromTables = async (
    tableNames: string[],
    orderColumn?: string,
    ascending = false,
  ) => {
    for (const tableName of tableNames) {
      const rows = await fetchAllRows(tableName, orderColumn, ascending);
      if (rows.length > 0) return rows;
    }

    return [];
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);

    const [
      occupancyRows,
      hotelReservationsData,
      restaurantSalesData,
      apartmentPaymentData,
      apartmentBillsData,
      expensesData,
      payrollData,
      financeBillsData,
      drawerData,
      cashMovementData,
      employeeBalanceData,
      payrollPeriodData,
      attendanceData,
    ] = await Promise.all([
      fetchAllRows("occupancy_data", "business_date", true),
      getRowsFromTables(
        ["finance_hotel_revenue", "finance_hotel_reservations"],
        "created_at",
        false,
      ),
      getRowsFromTables(["restaurant_sales", "pos_orders"], "created_at", false),
      fetchAllRows("apartment_payments", "payment_date", false),
      fetchAllRows("apartment_bills", "due_date", false),
      fetchAllRows("expenses", "created_at", false),
      fetchAllRows("payroll_records", "created_at", false),
      fetchAllRows("finance_bills", "due_date", true),
      fetchAllRows("finance_cash_management", "opened_at", false),
      fetchAllRows("finance_cash_movements", "business_date", false),
      fetchAllRows("employee_balances", "created_at", false),
      fetchAllRows("payroll_periods", "start_date", false),
      fetchAllRows("attendance_entries", "attendance_date", false),
    ]);

    setData({
      occupancyData: occupancyRows,
      hotelReservations: hotelReservationsData,
      restaurantSales: restaurantSalesData,
      apartmentPayments: apartmentPaymentData,
      apartmentBills: apartmentBillsData,
      expenses: expensesData,
      payrollRows: payrollData,
      financeBills: financeBillsData,
      cashDrawers: drawerData,
      cashMovements: cashMovementData,
      employeeBalances: employeeBalanceData,
      payrollPeriods: payrollPeriodData,
      attendanceEntries: attendanceData,
    });

    setLastUpdated(new Date().toLocaleTimeString("en-PH"));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboardData();

    const channel = supabase.channel("executive-dashboard-realtime");

    realtimeTables.forEach((tableName) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
        },
        () => {
          void loadDashboardData();
        },
      );
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const employeeName =
      localStorage.getItem("opscore_current_employee_name") ||
      localStorage.getItem("opscore_current_role_name");

    const storedUser = localStorage.getItem("opscore_current_user");

    if (employeeName) {
      setLoggedInUser(employeeName);
      return;
    }

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as Row;

        setLoggedInUser(
          String(
            parsedUser.employee_name ||
              parsedUser.full_name ||
              parsedUser.name ||
              parsedUser.email ||
              "User",
          ),
        );
      } catch {
        setLoggedInUser("User");
      }
    }
  }, []);

  const getLatestFinanceDate = () => {
    const dates = [
      ...data.hotelReservations,
      ...data.restaurantSales,
      ...data.apartmentPayments,
      ...data.expenses,
      ...data.cashMovements,
      ...data.attendanceEntries,
      ...data.payrollPeriods,
    ]
      .map((row) => getDateValue(row))
      .filter(Boolean)
      .sort();

    return dates[dates.length - 1] || todayKey;
  };

  const isWithinRange = (dateString: string) => {
    if (!dateString) return false;

    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;

    if (useCustomRange && customFromDate && customToDate) {
      const from = new Date(`${customFromDate}T00:00:00`);
      const to = new Date(`${customToDate}T23:59:59`);

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return false;
      }

      return date >= from && date <= to;
    }

    const anchorKey = getLatestFinanceDate();
    const anchorDate = new Date(`${anchorKey}T00:00:00`);

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

  const applyCustomRange = () => {
    if (!customFromDate || !customToDate) {
      alert("Please select From Date and To Date.");
      return;
    }

    if (customFromDate > customToDate) {
      alert("From Date cannot be later than To Date.");
      return;
    }

    setUseCustomRange(true);
  };

  const resetToLatestRange = () => {
    setUseCustomRange(false);
    setCustomFromDate("");
    setCustomToDate("");
    setRangeType("monthly");
  };

  const getActiveRangeLabel = () => {
    if (useCustomRange && customFromDate && customToDate) {
      return customFromDate === customToDate
        ? `Viewing ${customFromDate}`
        : `Viewing ${customFromDate} to ${customToDate}`;
    }

    const anchorKey = getLatestFinanceDate();

    if (rangeType === "daily") return `Latest day: ${anchorKey}`;
    if (rangeType === "weekly") return `Latest 7 days ending ${anchorKey}`;
    if (rangeType === "monthly") return `Month of ${anchorKey.slice(0, 7)}`;
    return `Year ${anchorKey.slice(0, 4)}`;
  };

  const isVoidedRow = (row: Row) => {
    const status = normalize(
      getText(row, ["status", "movement_status", "approval_status"], "active"),
    );

    return (
      status.includes("void") ||
      status.includes("cancel") ||
      Boolean(row.voided_at) ||
      Boolean(row.cancelled_at) ||
      Boolean(row.deleted_at)
    );
  };

  const hasRevenueSignal = (row: Row) => {
    const combined = [
      getText(row, ["source"]),
      getText(row, ["transaction_type"]),
      getText(row, ["transaction"]),
      getText(row, ["description"]),
      getText(row, ["remarks"]),
      getText(row, ["reference_type"]),
      getText(row, ["category"]),
    ]
      .join(" ")
      .toLowerCase();

    return (
      combined.includes("sales") ||
      combined.includes("sale") ||
      combined.includes("room sales") ||
      combined.includes("revenue") ||
      combined.includes("pos") ||
      combined.includes("restaurant")
    );
  };

  const isMovementType = (row: Row, target: string) =>
    normalize(getText(row, ["movement_type"])) === normalize(target);

  const activeMovementRows = data.cashMovements
    .filter((row) => !isVoidedRow(row))
    .filter((row) => isWithinRange(getDateValue(row)));

  const movementOpeningFloat = activeMovementRows
    .filter((row) => isMovementType(row, "Opening Float"))
    .reduce((sum, row) => sum + getNumber(row, ["amount"]), 0);

  const movementCashIn = activeMovementRows
    .filter((row) => isMovementType(row, "Cash In"))
    .reduce((sum, row) => sum + getNumber(row, ["amount"]), 0);

  const movementRevenue = activeMovementRows
    .filter((row) => isMovementType(row, "Cash In") && hasRevenueSignal(row))
    .reduce((sum, row) => sum + getNumber(row, ["amount"]), 0);

  const movementCashOut = activeMovementRows
    .filter((row) => isMovementType(row, "Cash Out"))
    .reduce((sum, row) => sum + Math.abs(getNumber(row, ["amount"])), 0);

  const movementRemittance = activeMovementRows
    .filter((row) => isMovementType(row, "Remittance"))
    .reduce((sum, row) => sum + Math.abs(getNumber(row, ["amount"])), 0);

  const cashInOther = movementCashIn - movementRevenue;

  const verifiedCash =
    movementOpeningFloat + movementCashIn - movementCashOut - movementRemittance;

  const hotelCollectedRevenue = data.hotelReservations
    .filter((row) => !isVoidedRow(row))
    .filter((row) => isWithinRange(getDateValue(row)))
    .reduce(
      (sum, row) =>
        sum +
        getNumber(row, [
          "amount_paid",
          "paid_amount",
          "collection_amount",
          "payment_amount",
          "revenue",
          "total_collected",
        ]),
      0,
    );

  const restaurantRevenue = data.restaurantSales
    .filter((row) => !isVoidedRow(row))
    .filter((row) => isWithinRange(getDateValue(row)))
    .reduce((sum, row) => sum + getAmountValue(row), 0);

  const apartmentRevenue = data.apartmentPayments
    .filter((row) => !isVoidedRow(row))
    .filter((row) => isWithinRange(getDateValue(row)))
    .reduce((sum, row) => sum + getAmountValue(row), 0);

  const collectedRevenue =
    hotelCollectedRevenue + restaurantRevenue + apartmentRevenue + movementRevenue;

  const isExpenseCashAdvance = (row: Row) => {
    const combined = [
      getText(row, ["category", "expense_category"]),
      getText(row, ["subcategory"]),
      getText(row, ["source"]),
      getText(row, ["description"]),
      getText(row, ["remarks"]),
    ]
      .join(" ")
      .toLowerCase();

    return combined.includes("cash advance");
  };

  const isPayrollExpense = (row: Row) => {
    const combined = [
      getText(row, ["category", "expense_category"]),
      getText(row, ["subcategory"]),
      getText(row, ["source"]),
      getText(row, ["description"]),
      getText(row, ["remarks"]),
    ]
      .join(" ")
      .toLowerCase();

    return combined.includes("payroll") || combined.includes("salary");
  };

  const operatingExpenses = data.expenses
    .filter((row) => !isVoidedRow(row))
    .filter((row) => isWithinRange(getDateValue(row)))
    .filter((row) => !isExpenseCashAdvance(row))
    .filter((row) => !isPayrollExpense(row))
    .reduce((sum, row) => sum + getAmountValue(row), 0);

  const payrollTotal = data.payrollRows
    .filter((row) => !isVoidedRow(row))
    .filter((row) => isWithinRange(getDateValue(row)))
    .reduce(
      (sum, row) =>
        sum +
        getNumber(row, [
          "net_pay",
          "release_amount",
          "released_amount",
          "total_net_pay",
          "payroll_total",
          "gross_pay",
          "total_cost",
        ]),
      0,
    );

  const netPosition = collectedRevenue - operatingExpenses - payrollTotal;

  const activeEmployeeBalances = data.employeeBalances.filter((balance) => {
    const status = normalize(getText(balance, ["status"], "active"));
    return (
      !status.includes("paid") &&
      !status.includes("closed") &&
      !status.includes("cancel") &&
      !status.includes("void")
    );
  });

  const employeeBalanceTotal = activeEmployeeBalances.reduce(
    (sum, balance) =>
      sum +
      getNumber(balance, [
        "remaining_balance",
        "balance",
        "amount",
        "original_amount",
      ]),
    0,
  );

  const cashAdvanceTotal = activeEmployeeBalances
    .filter((balance) =>
      getText(balance, ["balance_type", "category", "source", "remarks"])
        .toLowerCase()
        .includes("cash advance"),
    )
    .reduce(
      (sum, balance) =>
        sum +
        getNumber(balance, [
          "remaining_balance",
          "balance",
          "amount",
          "original_amount",
        ]),
      0,
    );

  const attendanceRowsInRange = data.attendanceEntries.filter((row) =>
    isWithinRange(getDateValue(row)),
  );

  const attendanceIssueRows = attendanceRowsInRange.filter((row) => {
    const status = normalize(getText(row, ["status"]));
    const isAbsent = status === "absent";
    const isLate = getNumber(row, ["late_minutes"]) > 0;
    const isUndertime = getNumber(row, ["undertime_minutes"]) > 0;
    const missingOut = Boolean(row.time_in) && !row.time_out;

    return isAbsent || isLate || isUndertime || missingOut;
  });

  const hasApartmentBillingStarted =
    data.apartmentBills.length > 0 || data.apartmentPayments.length > 0;

  const apartmentReceivables = hasApartmentBillingStarted
    ? data.apartmentBills
        .filter((row) => !isVoidedRow(row))
        .reduce((sum, bill) => {
          const total =
            getNumber(bill, ["total_amount", "amount", "bill_amount"]) ||
            getNumber(bill, ["rent_amount"]) +
              getNumber(bill, ["electric_amount"]) +
              getNumber(bill, ["water_amount"]) +
              getNumber(bill, ["internet_amount"]) +
              getNumber(bill, ["other_amount"]);

          const paid = getNumber(bill, ["paid_amount", "amount_paid"]);
          return sum + Math.max(total - paid, 0);
        }, 0)
    : 0;

  const unpaidFinanceBills = data.financeBills.filter((bill) => {
    const status = normalize(getText(bill, ["status"]));
    return !status.includes("paid") && !status.includes("cancel");
  });

  const overdueBills = unpaidFinanceBills.filter((bill) => {
    const dueDate = getDateValue(bill);
    if (!dueDate) return false;
    return dueDate < todayKey;
  });

  const upcomingBills = unpaidFinanceBills.filter((bill) => {
    const dueDate = getDateValue(bill);
    if (!dueDate) return false;

    const due = new Date(`${dueDate}T00:00:00`);
    const now = new Date(`${todayKey}T00:00:00`);
    const daysLeft = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysLeft >= 0 && daysLeft <= 14;
  });

  const drawerVarianceRows = data.cashDrawers
    .filter((drawer) => isWithinRange(getDateValue(drawer)))
    .map((drawer) => {
      const expected = getNumber(drawer, ["expected_cash", "expected_amount"]);
      const actual = getNumber(drawer, ["actual_cash", "actual_amount"]);
      const savedVariance = drawer.variance ?? drawer.cash_variance ?? null;

      const hasVarianceData =
        expected > 0 ||
        actual > 0 ||
        savedVariance !== null ||
        savedVariance !== undefined;

      const variance =
        savedVariance !== null && savedVariance !== undefined
          ? Number(savedVariance || 0)
          : actual - expected;

      return {
        id: getText(drawer, ["id"]),
        holder: getText(
          drawer,
          ["holder_name", "cashier_name", "employee_name", "opened_by"],
          "Cash Holder",
        ),
        expected,
        actual,
        variance,
        hasVarianceData,
      };
    })
    .filter((drawer) => drawer.hasVarianceData && drawer.variance !== 0);

  const totalVariance = drawerVarianceRows.reduce(
    (sum, drawer) => sum + drawer.variance,
    0,
  );

  const occupancySourceExists = data.occupancyData.length > 0;
  const latestOccupancy =
    data.occupancyData.find(
      (day) => getText(day, ["business_date"]) === todayKey,
    ) || data.occupancyData[data.occupancyData.length - 1];

  const roomsSoldToday = getNumber(latestOccupancy, ["rooms_sold"]);
  const occupancyToday = getNumber(latestOccupancy, ["occupancy"]);

  const hasLiveData =
    activeMovementRows.length > 0 ||
    data.expenses.length > 0 ||
    data.employeeBalances.length > 0 ||
    data.attendanceEntries.length > 0 ||
    collectedRevenue > 0 ||
    operatingExpenses > 0 ||
    payrollTotal > 0;

  const projectedCashPosition =
    verifiedCash + apartmentReceivables - operatingExpenses - payrollTotal;

  const payrollRatio =
    collectedRevenue > 0 ? Math.round((payrollTotal / collectedRevenue) * 100) : 0;

  const financeScore = hasLiveData
    ? Math.max(
        0,
        100 -
          (projectedCashPosition < 0 ? 20 : 0) -
          (verifiedCash < 0 ? 25 : 0) -
          (overdueBills.length > 0 ? 10 : 0) -
          (Math.abs(totalVariance) > 0 ? 10 : 0) -
          (payrollRatio >= 50 ? 12 : payrollRatio >= 40 ? 6 : 0) -
          (netPosition < 0 ? 15 : 0),
      )
    : 100;

  const operationsScore = hasLiveData
    ? Math.max(
        0,
        100 -
          (occupancySourceExists && occupancyToday < 40 ? 15 : 0) -
          (attendanceIssueRows.length > 0 ? 8 : 0),
      )
    : 100;

  const collectionsScore = hasLiveData
    ? Math.max(
        0,
        100 -
          (apartmentReceivables > 0 ? 10 : 0) -
          (cashAdvanceTotal > 0 ? 5 : 0),
      )
    : 100;

  const businessHealthScore = hasLiveData
    ? Math.round(
        financeScore * 0.55 + operationsScore * 0.25 + collectionsScore * 0.2,
      )
    : 100;

  const businessStatus =
    businessHealthScore >= 85
      ? "Stable"
      : businessHealthScore >= 70
        ? "Watchlist"
        : "Critical";

  const criticalAlerts = [
    ...(verifiedCash < 0
      ? [`Verified cash is negative: ${formatPeso(verifiedCash)}.`]
      : []),
    ...(movementCashOut > movementOpeningFloat + movementCashIn
      ? ["Cash out is higher than opening float plus cash in."]
      : []),
    ...(Math.abs(totalVariance) > 0
      ? [`Drawer variance detected: ${formatPeso(totalVariance)}.`]
      : []),
    ...(cashAdvanceTotal > 0
      ? [`Employee cash advance balance: ${formatPeso(cashAdvanceTotal)}.`]
      : []),
    ...(attendanceIssueRows.length > 0
      ? [`${attendanceIssueRows.length} attendance issue(s) need review.`]
      : []),
    ...(overdueBills.length > 0
      ? [`${overdueBills.length} finance bill(s) overdue.`]
      : []),
    ...(upcomingBills.length > 0
      ? [`${upcomingBills.length} bill(s) due within 14 days.`]
      : []),
    ...(apartmentReceivables > 0
      ? [`Apartment receivables: ${formatPeso(apartmentReceivables)}.`]
      : []),
    ...(payrollRatio >= 50 ? [`Payroll ratio is high at ${payrollRatio}%.`] : []),
    ...(netPosition < 0
      ? ["Net position is negative after operating expenses and payroll."]
      : []),
  ];

  const primaryRisk =
    criticalAlerts[0] ||
    (hasLiveData ? "Live setup is stable." : "Production baseline is clean.");

  const primaryRiskValue =
    criticalAlerts.length > 0 ? businessStatus : "Stable";

  const executiveBriefingPoints = [
    `Collected revenue is ${formatPeso(collectedRevenue)}. Opening float is excluded from revenue.`,
    `Verified cash from active movement ledger is ${formatPeso(verifiedCash)}.`,
    `Active cash in: ${formatPeso(movementCashIn)} • Cash out: ${formatPeso(
      movementCashOut,
    )} • Remittance: ${formatPeso(movementRemittance)}.`,
    cashAdvanceTotal > 0
      ? `Employee cash advance is tracked under balances/control: ${formatPeso(
          cashAdvanceTotal,
        )}.`
      : "No active employee cash advance pressure detected.",
    occupancySourceExists
      ? `Occupancy data is active: ${occupancyToday}% occupancy with ${roomsSoldToday} room(s) sold.`
      : "Occupancy score is neutral because no occupancy data has started.",
  ];

  const getChartLabel = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);

    if (rangeType === "yearly") {
      return date.toLocaleDateString("en-US", { month: "short" });
    }

    if (rangeType === "monthly") {
      return `Week ${Math.ceil(date.getDate() / 7)}`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const trendData = useMemo(() => {
    const map: Record<
      string,
      {
        date: string;
        revenue: number;
        expenses: number;
        cash: number;
        profit: number;
      }
    > = {};

    const addToMap = (
      date: string,
      type: "revenue" | "expenses" | "cash",
      amount: number,
    ) => {
      if (!date || !isWithinRange(date)) return;

      const groupKey = rangeType === "yearly" ? date.slice(0, 7) : date;

      if (!map[groupKey]) {
        map[groupKey] = {
          date: groupKey,
          revenue: 0,
          expenses: 0,
          cash: 0,
          profit: 0,
        };
      }

      map[groupKey][type] += Number(amount || 0);
    };

    data.hotelReservations
      .filter((row) => !isVoidedRow(row))
      .forEach((row) =>
        addToMap(
          getDateValue(row),
          "revenue",
          getNumber(row, [
            "amount_paid",
            "paid_amount",
            "collection_amount",
            "payment_amount",
          ]),
        ),
      );

    data.restaurantSales
      .filter((row) => !isVoidedRow(row))
      .forEach((row) => addToMap(getDateValue(row), "revenue", getAmountValue(row)));

    data.apartmentPayments
      .filter((row) => !isVoidedRow(row))
      .forEach((row) => addToMap(getDateValue(row), "revenue", getAmountValue(row)));

    activeMovementRows
      .filter((row) => isMovementType(row, "Cash In") && hasRevenueSignal(row))
      .forEach((row) => addToMap(getDateValue(row), "revenue", getNumber(row, ["amount"])));

    data.expenses
      .filter((row) => !isVoidedRow(row))
      .filter((row) => !isExpenseCashAdvance(row))
      .filter((row) => !isPayrollExpense(row))
      .forEach((row) => addToMap(getDateValue(row), "expenses", getAmountValue(row)));

    data.payrollRows
      .filter((row) => !isVoidedRow(row))
      .forEach((row) => addToMap(getDateValue(row), "expenses", getAmountValue(row)));

    activeMovementRows.forEach((row) => {
      const amount = getNumber(row, ["amount"]);

      if (isMovementType(row, "Opening Float") || isMovementType(row, "Cash In")) {
        addToMap(getDateValue(row), "cash", amount);
      }

      if (isMovementType(row, "Cash Out") || isMovementType(row, "Remittance")) {
        addToMap(getDateValue(row), "cash", -Math.abs(amount));
      }
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        label: getChartLabel(row.date),
        profit: row.revenue - row.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [
    data,
    rangeType,
    customFromDate,
    customToDate,
    useCustomRange,
    activeMovementRows,
  ]);

  const kpiCards = [
    {
      title: "Collected Revenue",
      value: formatPeso(collectedRevenue),
      note: `Movement revenue: ${formatPeso(movementRevenue)}`,
      icon: TrendingUp,
      tone: "success" as Tone,
    },
    {
      title: "Verified Cash",
      value: formatPeso(verifiedCash),
      note: "Opening + Cash In - Cash Out - Remittance",
      icon: Wallet,
      tone: verifiedCash >= 0 ? ("info" as Tone) : ("danger" as Tone),
    },
    {
      title: "Operating Expenses",
      value: formatPeso(operatingExpenses),
      note: "Excludes voided rows and cash advances",
      icon: Receipt,
      tone: "warning" as Tone,
    },
    {
      title: "Net Position",
      value: formatPeso(netPosition),
      note: "Revenue - Expenses - Payroll",
      icon: Banknote,
      tone: netPosition >= 0 ? ("success" as Tone) : ("danger" as Tone),
    },
  ];

  const toneClass = (tone: Tone) => {
    if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
    if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
    if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
  };

  const statusClass =
    businessStatus === "Stable"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : businessStatus === "Watchlist"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  const executiveGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="EXECUTIVE / DASHBOARD" />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
        <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              EXECUTIVE
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Executive Dashboard
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              {executiveGreeting}, {loggedInUser}. Real-time view powered by the
              live cash movement ledger, revenue rows, expenses, payroll,
              attendance, and employee balance controls.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="min-w-[145px]">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Range
              </span>
              <select
                value={rangeType}
                onChange={(event) => {
                  setRangeType(event.target.value as RangeType);
                  setUseCustomRange(false);
                }}
                className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>

            <label>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                From
              </span>
              <input
                type="date"
                value={customFromDate}
                onChange={(event) => setCustomFromDate(event.target.value)}
                className="mt-1 h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
              />
            </label>

            <label>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                To
              </span>
              <input
                type="date"
                value={customToDate}
                onChange={(event) => setCustomToDate(event.target.value)}
                className="mt-1 h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
              />
            </label>

            <button
              type="button"
              onClick={applyCustomRange}
              className="h-10 rounded-2xl bg-blue-700 px-4 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm hover:bg-blue-800"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={resetToLatestRange}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => void loadDashboardData()}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-xs font-black uppercase tracking-[0.16em] text-blue-700 hover:bg-blue-100"
            >
              <RefreshCcw size={14} />
              Refresh
            </button>
          </div>
        </section>

        <section className="mb-5 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  {getActiveRangeLabel()}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Ledger-Based Executive Control
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
                  `finance_cash_movements` is now the primary source of truth
                  for live cash. Voided and cancelled rows are excluded.
                </p>
              </div>

              <div className={`rounded-3xl border px-5 py-4 ${statusClass}`}>
                <p className="text-[11px] font-black uppercase tracking-[0.2em]">
                  Health Score
                </p>
                <p className="mt-1 text-3xl font-black">
                  {businessHealthScore}%
                </p>
                <p className="text-sm font-bold">{businessStatus}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpiCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClass(
                          card.tone,
                        )}`}
                      >
                        <Icon size={20} />
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                      {card.title}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {card.note}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
                <Brain size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Primary Risk
                </p>
                <h3 className="text-lg font-black text-slate-950">
                  {primaryRiskValue}
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
              {primaryRisk}
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Realtime Status
              </p>
              <p className="mt-2 text-sm font-bold text-slate-700">
                {loading ? "Loading live data..." : "Live subscription active"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Last updated: {lastUpdated || "-"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-4 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Opening Float
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatPeso(movementOpeningFloat)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Cash In
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatPeso(movementCashIn)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Other cash in: {formatPeso(cashInOther)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Cash Out
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatPeso(movementCashOut)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Remittance
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatPeso(movementRemittance)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Employee Balance
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatPeso(employeeBalanceTotal)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Cash advance: {formatPeso(cashAdvanceTotal)}
            </p>
          </div>
        </section>

        <section className="mb-5 grid gap-4 xl:grid-cols-[1.5fr_0.5fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Trend
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  Revenue, Expenses, and Ledger Cash
                </h2>
              </div>
              <p className="text-xs font-bold text-slate-500">
                Cash line uses `finance_cash_movements`, not drawer actual cash.
              </p>
            </div>

            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748B" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748B" />
                  <Tooltip formatter={(value) => formatPeso(Number(value || 0))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#2563eb"
                    fill="url(#revenueGradient)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#f59e0b"
                    fill="url(#expenseGradient)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="cash"
                    name="Ledger Cash"
                    stroke="#10b981"
                    fill="url(#cashGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                <Database size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Ledger Rows
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  {activeMovementRows.length} Active
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-600">
                  Movement Revenue
                </span>
                <span className="text-sm font-black text-slate-950">
                  {formatPeso(movementRevenue)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-600">
                  Voided Excluded
                </span>
                <span className="text-sm font-black text-slate-950">
                  {data.cashMovements.filter((row) => isVoidedRow(row)).length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-600">
                  Drawer Variance
                </span>
                <span className="text-sm font-black text-slate-950">
                  {formatPeso(totalVariance)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-600">
                  Apartment Billing
                </span>
                <span className="text-sm font-black text-slate-950">
                  {hasApartmentBillingStarted ? "Started" : "Not Started"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Hotel size={20} className="text-blue-700" />
              <h2 className="text-lg font-black text-slate-950">
                Revenue Breakdown
              </h2>
            </div>

            <div className="space-y-3">
              {[
                ["Hotel", hotelCollectedRevenue],
                ["Restaurant", restaurantRevenue],
                ["Apartment", apartmentRevenue],
                ["Cash Movement Revenue", movementRevenue],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-bold text-slate-600">
                    {label}
                  </span>
                  <span className="text-sm font-black text-slate-950">
                    {formatPeso(Number(value))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600" />
              <h2 className="text-lg font-black text-slate-950">
                Alerts
              </h2>
            </div>

            <div className="space-y-3">
              {criticalAlerts.slice(0, 6).map((alert) => (
                <div
                  key={alert}
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800"
                >
                  {alert}
                </div>
              ))}

              {criticalAlerts.length === 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  Stable. No major executive risk detected.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Activity size={20} className="text-blue-700" />
              <h2 className="text-lg font-black text-slate-950">
                AI Briefing
              </h2>
            </div>

            <div className="space-y-3">
              {executiveBriefingPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}