"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Brain,
  DollarSign,
  Hotel,
  Info,
  Receipt,
  ShieldAlert,
  TrendingUp,
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
  const [rangeType, setRangeType] = useState<RangeType>("yearly");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);

  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [hotelReservations, setHotelReservations] = useState<any[]>([]);
  const [restaurantSales, setRestaurantSales] = useState<any[]>([]);
  const [apartmentPayments, setApartmentPayments] = useState<any[]>([]);
  const [apartmentUnits, setApartmentUnits] = useState<any[]>([]);
  const [apartmentBills, setApartmentBills] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payrollRows, setPayrollRows] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [cashDrawers, setCashDrawers] = useState<any[]>([]);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [employeeBalances, setEmployeeBalances] = useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<any[]>([]);
  const [allocationRules, setAllocationRules] = useState<any[]>([]);
  const [chartReady, setChartReady] = useState(false);

  const todayKey = new Date().toISOString().slice(0, 10);

  /// HELPERS
  const formatPeso = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      maximumFractionDigits: 2,
    })}`;

  const getDateValue = (row: any) =>
    String(
      row.business_date ||
        row.service_date ||
        row.sale_date ||
        row.sales_date ||
        row.payment_date ||
        row.check_in ||
        row.date ||
        row.expense_date ||
        row.due_date ||
        row.opened_at ||
        row.closed_at ||
        row.created_at ||
        "",
    ).slice(0, 10);

  const getAmountValue = (row: any) => {
    const amount =
      row.credit ??
      row.revenue ??
      row.amount ??
      row.total_amount ??
      row.total ??
      row.net_sales ??
      row.gross_sales ??
      row.total_sales ??
      row.payment_amount ??
      row.collection_amount ??
      row.net_pay ??
      row.total_net_pay ??
      row.payroll_total ??
      0;

    return Number(amount || 0);
  };

  const fetchAllRows = async (
    tableName: string,
    orderColumn?: string,
    ascending = false,
  ) => {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];

    while (true) {
      let query = supabase.from(tableName).select("*");

      if (orderColumn) {
        query = query.order(orderColumn, { ascending });
      }

      const { data, error } = await query.range(from, from + pageSize - 1);

      if (error) {
        console.log(
          `${tableName.toUpperCase()} LOAD ERROR:`,
          JSON.stringify(error, null, 2),
        );
        return allRows;
      }

      const batch = data || [];
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

  const getLatestFinanceDate = () => {
    const dates = [
      ...hotelReservations,
      ...restaurantSales,
      ...apartmentPayments,
      ...expenses,
      ...cashDrawers,
      ...cashMovements,
      ...attendanceEntries,
      ...payrollPeriods,
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

  const getDrawerExpectedCash = (drawer: any) =>
    Number(drawer.expected_cash ?? drawer.expected_amount ?? 0);

  const getDrawerActualCash = (drawer: any) =>
    Number(drawer.actual_cash ?? drawer.actual_amount ?? 0);

  const getDrawerVariance = (drawer: any) => {
    const saved = drawer.variance ?? drawer.cash_variance ?? drawer.difference;

    if (saved !== undefined && saved !== null) return Number(saved || 0);

    return getDrawerActualCash(drawer) - getDrawerExpectedCash(drawer);
  };

  const getDrawerStatus = (drawer: any) =>
    String(drawer.status || drawer.drawer_status || "").toLowerCase();

  const getDrawerHolder = (drawer: any) =>
    drawer.holder_name ||
    drawer.cashier_name ||
    drawer.cashier ||
    drawer.employee_name ||
    drawer.opened_by ||
    "Cash Holder";

  const getApartmentBillTotal = (bill: any) =>
    Number(bill.rent_amount || 0) +
    Number(bill.electric_amount || 0) +
    Number(bill.water_amount || 0) +
    Number(bill.internet_amount || 0) +
    Number(bill.other_amount || 0);

  const getApartmentBillPaid = (bill: any) =>
    (bill.apartment_payments || []).reduce(
      (sum: number, payment: any) => sum + Number(payment.amount || 0),
      0,
    );

  const getApartmentBillBalance = (bill: any) =>
    getApartmentBillTotal(bill) - getApartmentBillPaid(bill);

  const getApartmentBillStatus = (bill: any) => {
    const balance = getApartmentBillBalance(bill);
    const paid = getApartmentBillPaid(bill);
    const dueDate = new Date(`${bill.due_date}T00:00:00`);
    const today = new Date(`${todayKey}T00:00:00`);

    if (balance <= 0) return "PAID";
    if (paid > 0) return "PARTIAL";
    if (today > dueDate) return "OVERDUE";
    return "UNPAID";
  };

  const normalizeExpenseCategory = (category: string) => {
    const value = String(category || "").toLowerCase();

    if (value.includes("water")) return "Water";
    if (value.includes("internet")) return "Internet";
    if (value.includes("netflix")) return "Netflix";
    if (value.includes("electric")) return "Electric";
    if (value.includes("food")) return "Food";
    if (value.includes("beverage")) return "Beverages";
    if (value.includes("laundry")) return "Laundry";
    if (value.includes("housekeeping")) return "Housekeeping";
    if (value.includes("frontdesk") || value.includes("front desk"))
      return "Frontdesk";
    if (value.includes("pool league")) return "Pool League";
    if (value.includes("pool")) return "Pool Maintenance";
    if (value.includes("gas") || value.includes("rfid"))
      return "Gas Vehicle/RFID";
    if (value.includes("sanitary")) return "Sanitary";
    if (value.includes("tax")) return "Taxes";
    if (value.includes("rent")) return "Rent";
    if (value.includes("system")) return "System Fee";
    if (value.includes("salary") || value.includes("payroll"))
      return "Employee Salary";
    if (value.includes("hotel asset")) return "Housekeeping";
    if (value.includes("kitchen asset")) return "Food";
    if (value.includes("apartment asset")) return "Rent";
    if (value.includes("cash advance")) return "Employee Salary";

    return category || "Uncategorized";
  };

  /// LOAD DATA
  const loadDashboardData = async () => {
    const { data: occupancy } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: true });

    const hotelReservationsData = await fetchAllRows(
      "finance_hotel_reservations",
      "check_in",
      false,
    );

    const restaurantSalesData = await getRowsFromTables(
      ["restaurant_sales"],
      "sale_date",
      false,
    );
    const apartmentPaymentData = await getRowsFromTables(
      ["apartment_payments"],
      "payment_date",
      false,
    );
    const payrollData = await getRowsFromTables(
      ["payroll_records"],
      "created_at",
      false,
    );

    const { data: apartmentUnitsData } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    const { data: apartmentBillsData } = await supabase
      .from("apartment_bills")
      .select(
        `
        *,
        apartment_units (
          unit_name,
          tenant_name,
          status
        ),
        apartment_payments (
          amount
        )
      `,
      )
      .order("due_date", { ascending: false });

    const { data: expensesData } = await supabase.from("expenses").select("*");

    const { data: billsData } = await supabase
      .from("finance_bills")
      .select("*")
      .order("due_date", { ascending: true });

    const { data: drawerData } = await supabase
      .from("finance_cash_drawers")
      .select("*")
      .order("opened_at", { ascending: false });

    const { data: cashMovementData } = await supabase
      .from("finance_cash_movements")
      .select("*")
      .order("business_date", { ascending: false });

    const { data: employeeBalanceData } = await supabase
      .from("employee_balances")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: payrollPeriodData } = await supabase
      .from("payroll_periods")
      .select("*")
      .order("start_date", { ascending: false });

    const { data: attendanceData } = await supabase
      .from("attendance_entries")
      .select("*")
      .order("attendance_date", { ascending: false });

    const { data: allocationData } = await supabase
      .from("expense_allocation_rules")
      .select("*")
      .eq("is_active", true);

    setOccupancyData(occupancy || []);
    setHotelReservations(hotelReservationsData || []);
    setRestaurantSales(restaurantSalesData || []);
    setApartmentPayments(apartmentPaymentData || []);
    setApartmentUnits(apartmentUnitsData || []);
    setApartmentBills(apartmentBillsData || []);
    setPayrollRows(payrollData || []);
    setExpenses(expensesData || []);
    setBills(billsData || []);
    setCashDrawers(drawerData || []);
    setCashMovements(cashMovementData || []);
    setEmployeeBalances(employeeBalanceData || []);
    setPayrollPeriods(payrollPeriodData || []);
    setAttendanceEntries(attendanceData || []);
    setAllocationRules(allocationData || []);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setChartReady(true), 150);
    return () => window.clearTimeout(timer);
  }, []);

  /// FINANCE CALCULATIONS
  const hotelRowsInRange = hotelReservations.filter((row) =>
    isWithinRange(getDateValue(row)),
  );

  const isCancelledReservation = (row: any) =>
    String(row.status || "").toLowerCase().includes("cancel");

  const getHotelGrossValue = (row: any) =>
    Number(
      row.total_sales ??
        row.total_amount ??
        row.gross_sales ??
        row.reservation_total ??
        row.total ??
        0,
    );

  const getHotelPaidValue = (row: any) =>
    Number(row.amount_paid ?? row.paid_amount ?? 0);

  const getHotelBalanceValue = (row: any) =>
    Number(row.unpaid_balance ?? row.balance_due ?? row.balance ?? 0);

  const activeHotelRowsInRange = hotelRowsInRange.filter(
    (row) => !isCancelledReservation(row),
  );

  const cancelledHotelRowsInRange = hotelRowsInRange.filter((row) =>
    isCancelledReservation(row),
  );

  const grossRoomSales = activeHotelRowsInRange.reduce(
    (sum, row) => sum + getHotelGrossValue(row),
    0,
  );

  const cancelledGrossRoomSales = cancelledHotelRowsInRange.reduce(
    (sum, row) => sum + getHotelGrossValue(row),
    0,
  );

  const collectedRoomRevenue = activeHotelRowsInRange.reduce(
    (sum, row) => sum + getHotelPaidValue(row),
    0,
  );

  const roomRevenue = collectedRoomRevenue;
  const restaurantRevenue = sumAmount(restaurantSales);
  const apartmentRevenue = sumAmount(apartmentPayments);

  // Owner dashboard revenue rules:
  // Gross Revenue = active hotel sales + restaurant sales + apartment collections.
  // Collected Revenue = actual collected hotel payments + restaurant sales + apartment collections.
  // Net Position uses collected revenue, not gross revenue.
  const grossOperatingSales = grossRoomSales + restaurantRevenue + apartmentRevenue;
  const collectedOperatingRevenue =
    collectedRoomRevenue + restaurantRevenue + apartmentRevenue;
  const totalRevenue = collectedOperatingRevenue;

  const totalExpenses = sumAmount(expenses);
  const payrollTotal = sumAmount(payrollRows);
  const netPosition = totalRevenue - totalExpenses - payrollTotal;

  const profitMargin =
    totalRevenue > 0 ? Math.round((netPosition / totalRevenue) * 100) : 0;

  const todayOccupancy =
    occupancyData.find((day) => String(day.business_date) === todayKey) ||
    occupancyData[occupancyData.length - 1];

  const roomsSoldToday = Number(todayOccupancy?.rooms_sold || 0);
  const availableRoomsToday = Number(todayOccupancy?.available_rooms || 0);
  const occupancyToday = Number(todayOccupancy?.occupancy || 0);

  /// APARTMENT CALCULATIONS
  const apartmentOccupiedUnits = apartmentUnits.filter(
    (unit) => String(unit.status || "").toLowerCase() === "occupied",
  );

  const apartmentVacantUnits = apartmentUnits.filter(
    (unit) => String(unit.status || "").toLowerCase() === "vacant",
  );

  const apartmentMaintenanceUnits = apartmentUnits.filter(
    (unit) => String(unit.status || "").toLowerCase() === "maintenance",
  );

  const apartmentInactiveUnits = apartmentUnits.filter(
    (unit) => String(unit.status || "").toLowerCase() === "inactive",
  );

  const apartmentReceivables = apartmentBills.reduce(
    (sum, bill) => sum + Math.max(getApartmentBillBalance(bill), 0),
    0,
  );

  const apartmentOverdueBills = apartmentBills.filter(
    (bill) => getApartmentBillStatus(bill) === "OVERDUE",
  );

  const apartmentOverdueTotal = apartmentOverdueBills.reduce(
    (sum, bill) => sum + Math.max(getApartmentBillBalance(bill), 0),
    0,
  );

  const apartmentNoBillUnits = apartmentUnits.filter((unit) => {
    const status = String(unit.status || "").toLowerCase();
    if (!["active", "occupied", "maintenance"].includes(status)) return false;

    return !apartmentBills.some(
      (bill) => String(bill.unit_id) === String(unit.id),
    );
  });

  /// CASH DRAWER CALCULATIONS
  const openDrawers = cashDrawers.filter((drawer) => {
    const status = getDrawerStatus(drawer);
    return status === "open" || status === "active" || status === "pending";
  });

  const closedDrawers = cashDrawers.filter(
    (drawer) => getDrawerStatus(drawer) === "closed",
  );

  const drawerRowsForSummary =
    openDrawers.length > 0
      ? openDrawers
      : cashDrawers.filter((drawer) => isWithinRange(getDateValue(drawer)));

  const expectedCash = drawerRowsForSummary.reduce(
    (sum, drawer) => sum + getDrawerExpectedCash(drawer),
    0,
  );

  const actualCash = drawerRowsForSummary.reduce(
    (sum, drawer) => sum + getDrawerActualCash(drawer),
    0,
  );

  const totalVariance = drawerRowsForSummary.reduce(
    (sum, drawer) => sum + getDrawerVariance(drawer),
    0,
  );

  const drawerVarianceRows = drawerRowsForSummary
    .map((drawer) => {
      const expected = getDrawerExpectedCash(drawer);
      const actual = getDrawerActualCash(drawer);
      const variance = getDrawerVariance(drawer);

      return {
        id: drawer.id,
        cashier: getDrawerHolder(drawer),
        businessDate: getDateValue(drawer),
        expected,
        actual,
        variance,
        status: getDrawerStatus(drawer) || "unknown",
      };
    })
    .filter((drawer) => drawer.variance !== 0)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  const varianceDrawerCount = drawerVarianceRows.length;

  const largestShortage =
    drawerVarianceRows
      .filter((drawer) => drawer.variance < 0)
      .sort((a, b) => a.variance - b.variance)[0] || null;

  const largestOverage =
    drawerVarianceRows
      .filter((drawer) => drawer.variance > 0)
      .sort((a, b) => b.variance - a.variance)[0] || null;

  const balancedDrawerCount = Math.max(
    drawerRowsForSummary.length - varianceDrawerCount,
    0,
  );

  const cashMovementRows = cashMovements.filter((row) =>
    isWithinRange(getDateValue(row)),
  );

  const cashMovementCashIn = cashMovementRows
    .filter(
      (row) =>
        (row.payment_type || "Cash") === "Cash" &&
        (row.movement_type === "Opening Float" ||
          row.movement_type === "Cash In"),
    )
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const cashMovementCashOut = cashMovementRows
    .filter(
      (row) =>
        (row.payment_type || "Cash") === "Cash" &&
        (row.movement_type === "Cash Out" ||
          row.source === "Bank Deposit" ||
          row.source === "Owner Withdrawal"),
    )
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const cashMovementRemittance = cashMovementRows
    .filter(
      (row) =>
        (row.payment_type || "Cash") === "Cash" &&
        row.movement_type === "Remittance",
    )
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const movementBasedCash =
    cashMovementCashIn - cashMovementCashOut - cashMovementRemittance;

  const cashAvailable =
    actualCash > 0
      ? actualCash
      : movementBasedCash > 0
        ? movementBasedCash
        : Math.max(netPosition, 0);

  const expenseReleasedFromDrawer = cashMovementRows
    .filter((row) => String(row.source || "").includes("Expense Release"))
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  /// PAYROLL / STAFF CONTROL
  const activeEmployeeBalances = employeeBalances.filter(
    (balance) =>
      String(balance.status || "Active") === "Active" &&
      Number(balance.remaining_balance || 0) > 0,
  );

  const outstandingCashAdvances = activeEmployeeBalances
    .filter((balance) =>
      String(balance.balance_type || "")
        .toLowerCase()
        .includes("cash advance"),
    )
    .reduce((sum, balance) => sum + Number(balance.remaining_balance || 0), 0);

  const outstandingCarryForward = activeEmployeeBalances
    .filter(
      (balance) =>
        String(balance.balance_type || "")
          .toLowerCase()
          .includes("carry forward") ||
        String(balance.source_module || "") === "Payroll Manager",
    )
    .reduce((sum, balance) => sum + Number(balance.remaining_balance || 0), 0);

  const employeesWithOutstandingBalances = new Set(
    activeEmployeeBalances.map((balance) => String(balance.employee_id)),
  ).size;

  const payrollNeedsRegeneration = payrollPeriods.filter((period) =>
    Boolean(period.needs_regeneration),
  );

  const payrollForApproval = payrollRows.filter((row) =>
    ["For Approval", "Approved"].includes(String(row.status || "")),
  );

  const pendingPayrollReleaseAmount = payrollForApproval.reduce(
    (sum, row) =>
      sum +
      Math.max(
        Number(row.net_pay || row.release_amount || row.released_amount || 0),
        0,
      ),
    0,
  );

  const attendanceRowsInRange = attendanceEntries.filter((row) =>
    isWithinRange(getDateValue(row)),
  );

  const attendanceIssueRows = attendanceRowsInRange.filter((row) => {
    const status = String(row.status || "").toLowerCase();
    const isAbsent = status === "absent";
    const isLate = Number(row.late_minutes || 0) > 0;
    const isUndertime = Number(row.undertime_minutes || 0) > 0;
    const missingOut = Boolean(row.time_in) && !row.time_out;
    return isAbsent || isLate || isUndertime || missingOut;
  });

  const absentRows = attendanceRowsInRange.filter(
    (row) => String(row.status || "").toLowerCase() === "absent",
  );

  const lateRows = attendanceRowsInRange.filter(
    (row) => Number(row.late_minutes || 0) > 0,
  );

  const missingOutRows = attendanceRowsInRange.filter(
    (row) => Boolean(row.time_in) && !row.time_out,
  );

  /// BILLS / COLLECTIONS
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

  const outstandingBills = unpaidBills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0,
  );

  const overdueBillsTotal = overdueBills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0,
  );

  const upcomingBillsTotal = upcomingBills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0,
  );

  const filteredReservations = activeHotelRowsInRange;

  const outstandingGuestBalance = filteredReservations.reduce((sum, row) => {
    const balance = getHotelBalanceValue(row);
    return balance > 0 ? sum + balance : sum;
  }, 0);

  const unpaidGuestReservations = filteredReservations.filter(
    (row) => getHotelBalanceValue(row) > 0,
  );

  const activeGuestReservations = activeHotelRowsInRange;

  const cancelledGuestReservations = cancelledHotelRowsInRange.length;

  const averagePaidPerReservation =
    filteredReservations.length > 0 ? roomRevenue / filteredReservations.length : 0;

  const expectedCollections = outstandingGuestBalance + apartmentReceivables;

  const projectedCashPosition =
    cashAvailable + expectedCollections - upcomingBillsTotal - payrollTotal;

  const avgDailyExpenses =
    rangeType === "daily"
      ? totalExpenses
      : rangeType === "weekly"
        ? totalExpenses / 7
        : rangeType === "monthly"
          ? totalExpenses / 30
          : totalExpenses / 365;

  const cashRunway =
    avgDailyExpenses > 0 ? Math.floor(cashAvailable / avgDailyExpenses) : 0;

  const recoverableCash = expectedCollections + Math.abs(totalVariance);

  const cashFlowStatus =
    projectedCashPosition < 0
      ? "Critical"
      : cashRunway > 0 && cashRunway <= 7
        ? "Watch"
        : "Safe";

  const cashFlowStyle =
    cashFlowStatus === "Critical"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : cashFlowStatus === "Watch"
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
        : "border-green-500/30 bg-green-500/10 text-green-300";

  const payrollRatio =
    totalRevenue > 0 ? Math.round((payrollTotal / totalRevenue) * 100) : 0;

  const payrollStatus =
    payrollRatio >= 50 ? "High Risk" : payrollRatio >= 40 ? "Watch" : "Healthy";

  /// PROFITABILITY
  const allocationRuleMap = allocationRules.reduce(
    (acc: Record<string, any>, rule) => {
      acc[String(rule.expense_type || "").toLowerCase()] = rule;
      return acc;
    },
    {},
  );

  const allocatedExpenses = expenses
    .filter((row) => isWithinRange(getDateValue(row)))
    .reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0);
        const normalizedCategory = normalizeExpenseCategory(row.category);
        const rule = allocationRuleMap[normalizedCategory.toLowerCase()];

        if (!rule) {
          acc.shared += amount;
          acc.unmapped += amount;
          acc.unmappedItems[normalizedCategory] =
            (acc.unmappedItems[normalizedCategory] || 0) + amount;
          return acc;
        }

        acc.rooms += amount * (Number(rule.rooms_percent || 0) / 100);
        acc.restaurant += amount * (Number(rule.restaurant_percent || 0) / 100);
        acc.sportsBar += amount * (Number(rule.sports_bar_percent || 0) / 100);
        acc.apartment += amount * (Number(rule.apartment_percent || 0) / 100);
        acc.shared += amount * (Number(rule.shared_percent || 0) / 100);

        return acc;
      },
      {
        rooms: 0,
        restaurant: 0,
        sportsBar: 0,
        apartment: 0,
        shared: 0,
        unmapped: 0,
        unmappedItems: {} as Record<string, number>,
      },
    );

  const departmentProfitability = [
    {
      name: "Rooms",
      revenue: grossRoomSales,
      allocatedExpenses: allocatedExpenses.rooms,
      profit: grossRoomSales - allocatedExpenses.rooms,
    },
    {
      name: "Restaurant",
      revenue: restaurantRevenue,
      allocatedExpenses: allocatedExpenses.restaurant,
      profit: restaurantRevenue - allocatedExpenses.restaurant,
    },
    {
      name: "Sports Bar",
      revenue: 0,
      allocatedExpenses: allocatedExpenses.sportsBar,
      profit: 0 - allocatedExpenses.sportsBar,
    },
    {
      name: "Apartment",
      revenue: apartmentRevenue,
      allocatedExpenses: allocatedExpenses.apartment,
      profit: apartmentRevenue - allocatedExpenses.apartment,
    },
  ];

  const topProfitCenter = [...departmentProfitability].sort(
    (a, b) => b.profit - a.profit,
  )[0];

  const weakestProfitCenter = [...departmentProfitability].sort(
    (a, b) => a.profit - b.profit,
  )[0];

  const topExpenseCategories = Object.values(
    expenses
      .filter((row) => isWithinRange(getDateValue(row)))
      .reduce((acc: Record<string, any>, row) => {
        const category = row.category || "Uncategorized";

        if (!acc[category]) acc[category] = { category, amount: 0 };

        acc[category].amount += Number(row.amount || 0);
        return acc;
      }, {}),
  )
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 8) as any[];

  const revenueBreakdown = [
    { name: "Rooms", value: roomRevenue },
    { name: "Restaurant", value: restaurantRevenue },
    { name: "Apartment", value: apartmentRevenue },
  ].sort((a, b) => b.value - a.value);

  const topRevenueSource = revenueBreakdown[0] || { name: "-", value: 0 };
  const topRevenueShare =
    totalRevenue > 0
      ? Math.round((topRevenueSource.value / totalRevenue) * 100)
      : 0;

  /// ALERTS / ADVICE
  const criticalAlerts = [
    ...(cashFlowStatus === "Critical"
      ? [
          `Projected cash shortage: ${formatPeso(Math.abs(projectedCashPosition))}.`,
        ]
      : []),
    ...(cashFlowStatus === "Watch"
      ? [`Cash runway is tight: ${cashRunway} day(s) remaining.`]
      : []),
    ...(drawerRowsForSummary.length === 0
      ? ["No cash drawer data found for this period."]
      : []),
    ...(Math.abs(totalVariance) > 0
      ? [`Cash drawer variance detected: ${formatPeso(totalVariance)}.`]
      : []),
    ...drawerVarianceRows
      .slice(0, 3)
      .map(
        (drawer) =>
          `${drawer.cashier} has cash variance ${formatPeso(drawer.variance)}.`,
      ),
    ...(openDrawers.length > 0
      ? [`${openDrawers.length} cash drawer(s) still open.`]
      : []),
    ...(apartmentReceivables > 0
      ? [`Apartment receivables: ${formatPeso(apartmentReceivables)}.`]
      : []),
    ...(apartmentOverdueBills.length > 0
      ? [
          `${apartmentOverdueBills.length} apartment overdue bill(s): ${formatPeso(apartmentOverdueTotal)}.`,
        ]
      : []),
    ...(apartmentMaintenanceUnits.length > 0
      ? [
          `${apartmentMaintenanceUnits.length} apartment unit(s) under maintenance.`,
        ]
      : []),
    ...(apartmentNoBillUnits.length > 0
      ? [`${apartmentNoBillUnits.length} apartment unit(s) have no bill yet.`]
      : []),
    ...(payrollNeedsRegeneration.length > 0
      ? [
          `${payrollNeedsRegeneration.length} payroll cutoff(s) need regeneration.`,
        ]
      : []),
    ...(pendingPayrollReleaseAmount > 0
      ? [
          `Payroll waiting for release: ${formatPeso(pendingPayrollReleaseAmount)}.`,
        ]
      : []),
    ...(outstandingCashAdvances > 0
      ? [
          `Outstanding employee cash advances: ${formatPeso(outstandingCashAdvances)}.`,
        ]
      : []),
    ...(attendanceIssueRows.length > 0
      ? [
          `${attendanceIssueRows.length} attendance issue(s) found in selected range.`,
        ]
      : []),
    ...(overdueBills.length > 0
      ? [
          `${overdueBills.length} overdue bill(s) worth ${formatPeso(overdueBillsTotal)}.`,
        ]
      : []),
    ...(upcomingBills.length > 0
      ? [`${upcomingBills.length} bill(s) due within 14 days.`]
      : []),
    ...(payrollRatio >= 50
      ? [`Payroll ratio is high at ${payrollRatio}%.`]
      : []),
    ...(outstandingGuestBalance > 0
      ? [
          `Collectible Balance Review needs verification: ${formatPeso(outstandingGuestBalance)}.`,
        ]
      : []),
    ...(allocatedExpenses.unmapped > 0
      ? [
          `${formatPeso(allocatedExpenses.unmapped)} expenses are not mapped to allocation rules.`,
        ]
      : []),
    ...(weakestProfitCenter && weakestProfitCenter.profit < 0
      ? [`${weakestProfitCenter.name} is showing negative department profit.`]
      : []),
    ...(occupancyToday < 40 ? [`Occupancy is low at ${occupancyToday}%.`] : []),
    ...(netPosition < 0
      ? ["Expenses and payroll are higher than revenue."]
      : []),
  ];

  const recommendations = [
    ...(projectedCashPosition < 0
      ? [
          "Prioritize guest balances and apartment receivables before approving new cash releases.",
          "Delay non-critical expenses until projected cash position improves.",
        ]
      : []),
    ...(apartmentReceivables > 0
      ? ["Follow up apartment tenants with outstanding balances."]
      : []),
    ...(apartmentNoBillUnits.length > 0
      ? [
          "Create missing apartment monthly bills before accepting new payments.",
        ]
      : []),
    ...(overdueBills.length > 0
      ? ["Prioritize overdue bills and avoid new supplier commitments."]
      : []),
    ...(Math.abs(totalVariance) > 0
      ? ["Review cash drawer variance before closing the daily report."]
      : []),
    ...(openDrawers.length > 0
      ? ["Follow up open cash drawers before end-of-day reporting."]
      : []),
    ...(payrollNeedsRegeneration.length > 0
      ? [
          "Regenerate outdated payroll cutoffs before sending to Payroll Manager.",
        ]
      : []),
    ...(attendanceIssueRows.length > 0
      ? ["Review attendance issues before payroll generation."]
      : []),
    ...(outstandingCashAdvances > 0
      ? ["Monitor outstanding cash advances and verify payroll deductions."]
      : []),
    ...(payrollRatio >= 40
      ? ["Review schedule and overtime because payroll is above target ratio."]
      : []),
    ...(allocatedExpenses.unmapped > 0
      ? [
          "Review unmapped expense categories and update Expense Allocation rules.",
        ]
      : []),
    ...(weakestProfitCenter && weakestProfitCenter.profit < 0
      ? [
          `Review ${weakestProfitCenter.name} expenses because it is currently negative.`,
        ]
      : []),
    ...(topProfitCenter
      ? [
          `Protect ${topProfitCenter.name} because it is currently the strongest profit center.`,
        ]
      : []),
    ...(topRevenueShare >= 75 && totalRevenue > 0
      ? [
          `Revenue depends heavily on ${topRevenueSource.name}. Strengthen other income sources.`,
        ]
      : []),
    ...(occupancyToday < 40
      ? ["Push direct bookings and OTA visibility to lift room occupancy."]
      : []),
    ...recommendationFallback(totalRevenue, totalExpenses, cashAvailable),
  ];

  const financeScore = Math.max(
    0,
    100 -
      (projectedCashPosition < 0 ? 35 : 0) -
      (cashRunway > 0 && cashRunway <= 7 ? 20 : 0) -
      (overdueBills.length > 0 ? 15 : 0) -
      (apartmentOverdueBills.length > 0 ? 10 : 0) -
      (Math.abs(totalVariance) > 0 ? 10 : 0) -
      (payrollRatio >= 50 ? 15 : payrollRatio >= 40 ? 8 : 0) -
      (netPosition < 0 ? 20 : 0) -
      (allocatedExpenses.unmapped > 0 ? 8 : 0),
  );

  const operationsScore = Math.max(
    0,
    100 -
      (occupancyToday < 40 ? 25 : 0) -
      (apartmentMaintenanceUnits.length > 0 ? 8 : 0),
  );

  const collectionsScore = Math.max(
    0,
    100 -
      (outstandingGuestBalance > 0 ? 10 : 0) -
      (apartmentReceivables > 0 ? 15 : 0) -
      (Math.abs(totalVariance) > 0 ? 10 : 0),
  );

  const businessHealthScore = Math.round(
    financeScore * 0.55 + operationsScore * 0.25 + collectionsScore * 0.2,
  );

  const businessStatus =
    businessHealthScore >= 85
      ? "Stable"
      : businessHealthScore >= 70
        ? "Watchlist"
        : "Critical";

  const statusStyle =
    businessStatus === "Stable"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : businessStatus === "Watchlist"
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";

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

    hotelReservations.forEach((row) =>
      addToMap(getDateValue(row), "revenue", Number(row.amount_paid || 0)),
    );

    restaurantSales.forEach((row) =>
      addToMap(getDateValue(row), "revenue", getAmountValue(row)),
    );

    apartmentPayments.forEach((row) =>
      addToMap(getDateValue(row), "revenue", getAmountValue(row)),
    );

    expenses.forEach((row) =>
      addToMap(getDateValue(row), "expenses", getAmountValue(row)),
    );

    payrollRows.forEach((row) =>
      addToMap(getDateValue(row), "expenses", getAmountValue(row)),
    );

    cashDrawers.forEach((row) =>
      addToMap(getDateValue(row), "cash", getDrawerActualCash(row)),
    );

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
    apartmentPayments,
    expenses,
    payrollRows,
    cashDrawers,
    rangeType,
    useCustomRange,
    customFromDate,
    customToDate,
  ]);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              OPSCORE Owner Command Center
            </p>

            <h1 className="mt-2 text-4xl font-black">Executive Dashboard</h1>

            <p className="mt-2 text-slate-400">
              Clean owner view for cash, revenue, expenses, apartment status,
              payroll, and alerts.
            </p>
          </div>

          <div className="w-full space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 lg:w-auto">
            <div className="flex flex-wrap gap-2">
              {(["daily", "weekly", "monthly", "yearly"] as RangeType[]).map(
                (range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setUseCustomRange(false);
                      setRangeType(range);
                    }}
                    className={
                      !useCustomRange && rangeType === range
                        ? "rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-slate-950"
                        : "rounded-lg px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800"
                    }
                  >
                    {range === "daily"
                      ? "Latest Day"
                      : range === "weekly"
                        ? "Latest Week"
                        : range === "monthly"
                          ? "Latest Month"
                          : "Latest Year"}
                  </button>
                ),
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
              />

              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
              />

              <button
                onClick={applyCustomRange}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
              >
                Apply
              </button>

              <button
                onClick={resetToLatestRange}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
              >
                Reset
              </button>
            </div>

            <p className="text-xs font-semibold text-amber-300">
              {getActiveRangeLabel()}
            </p>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            icon={<Wallet size={22} />}
            title="Cash Available"
            value={formatPeso(cashAvailable)}
            danger={cashAvailable <= 0}
            success={cashAvailable > 0}
            subtitle={`${cashRunway} day runway`}
            formula="Actual drawer cash, cash movement balance, or positive net position"
          />

          <KpiCard
            icon={<Hotel size={22} />}
            title="Gross Revenue"
            value={formatPeso(grossOperatingSales)}
            success
            formula="Hotel active sales + restaurant sales + apartment collections."
          />

          <KpiCard
            icon={<DollarSign size={22} />}
            title="Collected Revenue"
            value={formatPeso(collectedOperatingRevenue)}
            success
            formula="Hotel collections + restaurant sales + apartment collections."
          />

          <KpiCard
            icon={<Receipt size={22} />}
            title="Expenses + Payroll"
            value={formatPeso(totalExpenses + payrollTotal)}
            danger
            subtitle={`Payroll ${payrollRatio}%`}
            formula="Operating expenses plus payroll"
          />

          <KpiCard
            icon={<ShieldAlert size={22} />}
            title="Collectible Receivables"
            value={formatPeso(expectedCollections)}
            danger={expectedCollections > 0}
            subtitle="Positive guest balance"
            formula="Hotel collectible balance + apartment receivables. Negative credits/refunds are excluded."
          />

          <KpiCard
            icon={<Brain size={22} />}
            title="Health Score"
            value={`${businessHealthScore}/100`}
            success={businessStatus === "Stable"}
            danger={businessStatus === "Critical"}
            subtitle={businessStatus}
            formula="Cash, operations, and collections weighted score"
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <InsightCard
            icon={<Wallet size={22} />}
            title="Cash Flow Health"
            status={cashFlowStatus}
            statusClass={cashFlowStyle}
            rows={[
              {
                label: "Cash Available",
                value: formatPeso(cashAvailable),
                formula: "Current usable cash estimate",
              },
              {
                label: "Collected Revenue",
                value: formatPeso(collectedOperatingRevenue),
                formula: "Hotel collections + restaurant sales + apartment collections in selected range.",
              },
              {
                label: "Collectible Receivables",
                value: formatPeso(expectedCollections),
                formula: "Hotel collectible balance + apartment receivables. Negative credits/refunds are excluded.",
              },
              {
                label: "Upcoming Bills",
                value: formatPeso(upcomingBillsTotal),
                formula: "Bills due within 14 days",
              },
              {
                label: "Payroll Load",
                value: formatPeso(payrollTotal),
                formula: "Total payroll in selected range",
              },
              {
                label: "Cash If Collected",
                value: formatPeso(projectedCashPosition),
                formula: "Cash + collectible receivables - bills - payroll",
              },
            ]}
          />

          <InsightCard
            icon={<Hotel size={22} />}
            title="Hotel Sales Control"
            status={outstandingGuestBalance > 0 ? "Collect" : "Clean"}
            statusClass={
              outstandingGuestBalance > 0
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            }
            rows={[
              {
                label: "Gross Hotel Sales",
                value: formatPeso(grossRoomSales),
                formula: "Active/non-cancelled hotel sales from room-sales import",
              },
              {
                label: "Cancelled Gross",
                value: formatPeso(cancelledGrossRoomSales),
                formula: "Cancelled reservation totals excluded from gross hotel sales",
              },
              {
                label: "Room Collections",
                value: formatPeso(collectedRoomRevenue),
                formula: "Paid hotel room collections in selected range",
              },
              {
                label: "Collectible Balance",
                value: formatPeso(outstandingGuestBalance),
                formula: "Positive unpaid hotel guest balance from Cloudbeds import",
              },
              {
                label: "Collectible Reservations",
                value: String(unpaidGuestReservations.length),
                formula: "Reservations with positive remaining guest balance",
              },
              {
                label: "Active / Cancelled",
                value: `${activeGuestReservations.length}/${cancelledGuestReservations}`,
                formula: "Active reservations versus cancelled reservations",
              },
              {
                label: "Avg Paid / Reservation",
                value: formatPeso(averagePaidPerReservation),
                formula: "Room collections divided by reservation count",
              },
            ]}
          />

          <InsightCard
            icon={<Brain size={22} />}
            title="Business Health"
            status={businessStatus}
            statusClass={statusStyle}
            rows={[
              {
                label: "Cash Status",
                value: cashFlowStatus,
                formula: "Cash safety level",
              },
              {
                label: "Payroll Status",
                value: payrollStatus,
                formula: "Staff cost level",
              },
              {
                label: "Top Revenue Source",
                value: `${topRevenueSource.name} (${topRevenueShare}%)`,
                formula: "Biggest income source",
              },
              {
                label: "Recoverable Cash",
                value: formatPeso(recoverableCash),
                formula: "Hotel + apartment collectible receivables + drawer variance",
              },
            ]}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
          <div className="h-[520px] rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <h2 className="text-xl font-bold">Cash, Revenue & Expense Trend</h2>
            <p className="mt-1 text-sm text-slate-400">
              Owner-level trend without duplicate cash drawer cards.
            </p>

            <div className="mt-6 h-[390px] min-h-[390px] min-w-0">
              {chartReady && trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={390}>
                  <AreaChart
                    data={trendData}
                    margin={{ top: 35, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#94a3b8" />
                    <YAxis
                      stroke="#94a3b8"
                      tickFormatter={(value) => `₱${Number(value) / 1000}k`}
                    />
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
                      fill="#3b82f6"
                      fillOpacity={0.18}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses + Payroll"
                      stroke="#ef4444"
                      strokeWidth={3}
                      fill="#ef4444"
                      fillOpacity={0.12}
                    />
                    <Area
                      type="monotone"
                      dataKey="cash"
                      name="Actual Cash"
                      stroke="#eab308"
                      strokeWidth={3}
                      fill="#eab308"
                      fillOpacity={0.15}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Net Position"
                      stroke="#22c55e"
                      strokeWidth={3}
                      fill="#22c55e"
                      fillOpacity={0.12}
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

          <section
            className={`h-[520px] overflow-hidden rounded-2xl border p-5 xl:col-span-2 ${statusStyle}`}
          >
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Brain size={18} /> OPSCORE AI Advisor
            </p>

            <h2 className="mt-1 text-2xl font-black">{businessStatus}</h2>

            <div className="mt-3 rounded-2xl bg-slate-950/60 p-4 text-center">
              <p className="text-sm text-slate-400">Owner Health Score</p>
              <h3 className="mt-1 text-4xl font-black text-white">
                {businessHealthScore}
              </h3>
              <p className="text-xs text-slate-500">cash-weighted score</p>
            </div>

            <div className="mt-3">
              <BriefingBox
                title="Critical Alerts"
                items={criticalAlerts}
                empty="No major issue detected."
              />
            </div>

            <div className="mt-3">
              <BriefingBox
                title="Recommended Actions"
                items={recommendations}
                empty="Maintain current operation and monitor daily cash."
              />
            </div>
          </section>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <RevenueCard
            title="Rooms"
            value={grossRoomSales}
            total={grossOperatingSales}
            formula="Active/non-cancelled hotel sales from room-sales import"
          />
          <RevenueCard
            title="Restaurant"
            value={restaurantRevenue}
            total={grossOperatingSales}
            formula="Restaurant sales"
          />
          <RevenueCard
            title="Apartment"
            value={apartmentRevenue}
            total={grossOperatingSales}
            formula="Apartment collections"
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <InsightCard
            icon={<Users size={22} />}
            title="Payroll & Attendance"
            status={
              payrollNeedsRegeneration.length > 0
                ? "Regenerate"
                : pendingPayrollReleaseAmount > 0
                  ? "For Release"
                  : attendanceIssueRows.length > 0
                    ? "Review"
                    : "Clean"
            }
            statusClass={
              payrollNeedsRegeneration.length > 0 ||
              attendanceIssueRows.length > 0
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : pendingPayrollReleaseAmount > 0
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  : "border-green-500/30 bg-green-500/10 text-green-300"
            }
            rows={[
              {
                label: "Needs Regeneration",
                value: String(payrollNeedsRegeneration.length),
                formula: "Cutoffs changed after generation",
              },
              {
                label: "For Release",
                value: formatPeso(pendingPayrollReleaseAmount),
                formula: "Approved payroll not yet released",
              },
              {
                label: "Attendance Issues",
                value: String(attendanceIssueRows.length),
                formula: `${absentRows.length} absent • ${lateRows.length} late • ${missingOutRows.length} missing out`,
              },
              {
                label: "Cash Advances",
                value: formatPeso(outstandingCashAdvances),
                formula: `${employeesWithOutstandingBalances} employee(s) affected`,
              },
            ]}
          />

          <InsightCard
            icon={<ShieldAlert size={22} />}
            title="Cash Recovery"
            status={recoverableCash > 0 ? "Recoverable" : "Clean"}
            statusClass={
              recoverableCash > 0
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            }
            rows={[
              {
                label: "Hotel Collectible Balance",
                value: formatPeso(outstandingGuestBalance),
                formula: "Positive unpaid hotel guest balance",
              },
              {
                label: "Drawer Variance",
                value: formatPeso(Math.abs(totalVariance)),
                formula: "Cash difference",
              },
              {
                label: "Total Recovery",
                value: formatPeso(recoverableCash),
                formula: "Hotel + apartment collectible receivables and drawer variance",
              },
            ]}
          />

          <InsightCard
            icon={<Wallet size={22} />}
            title="Cash Drawer Accountability"
            status={
              openDrawers.length > 0 || totalVariance !== 0 ? "Review" : "Clean"
            }
            statusClass={
              openDrawers.length > 0 || totalVariance !== 0
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            }
            rows={[
              {
                label: "Open / Closed Drawers",
                value: `${openDrawers.length}/${closedDrawers.length}`,
                formula: "Drawer status count",
              },
              {
                label: "Balanced / Variance",
                value: `${balancedDrawerCount}/${varianceDrawerCount}`,
                formula: "Cashiers with clean vs variance drawers",
              },
              {
                label: "Largest Shortage",
                value: largestShortage
                  ? `${largestShortage.cashier} ${formatPeso(largestShortage.variance)}`
                  : formatPeso(0),
                formula: "Most negative drawer variance",
              },
              {
                label: "Largest Overage",
                value: largestOverage
                  ? `${largestOverage.cashier} +${formatPeso(largestOverage.variance).replace("₱", "₱")}`
                  : formatPeso(0),
                formula: "Most positive drawer variance",
              },
            ]}
          />
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <TrendingUp className="text-emerald-400" size={28} />

            <div>
              <h2 className="text-2xl font-black">Department Profitability</h2>
              <p className="text-sm text-slate-400">
                Revenue minus allocated expenses based on Expense Allocation
                Rules.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {departmentProfitability.map((department) => {
              const margin =
                department.revenue > 0
                  ? Math.round((department.profit / department.revenue) * 100)
                  : 0;

              return (
                <div
                  key={department.name}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <h3 className="text-xl font-black">{department.name}</h3>

                  <div className="mt-5 space-y-3">
                    <MiniRow
                      label="Revenue"
                      value={formatPeso(department.revenue)}
                      formula="Income per department"
                    />
                    <MiniRow
                      label="Allocated Expenses"
                      value={formatPeso(department.allocatedExpenses)}
                      formula="Assigned department costs"
                    />
                    <MiniRow
                      label="Profit"
                      value={formatPeso(department.profit)}
                      formula="Income minus costs"
                    />
                    <MiniRow
                      label="Margin"
                      value={`${margin}%`}
                      formula="Profit percentage"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {Object.keys(allocatedExpenses.unmappedItems).length > 0 && (
          <section className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6">
            <h2 className="text-xl font-black text-yellow-300">
              Allocation Review Needed
            </h2>

            <p className="mt-1 text-sm text-yellow-200">
              These categories do not match allocation rules.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(allocatedExpenses.unmappedItems).map(
                ([category, amount]) => (
                  <div key={category} className="rounded-xl bg-slate-950 p-4">
                    <p className="font-semibold">{category}</p>
                    <p className="mt-1 text-yellow-300">
                      {formatPeso(Number(amount))}
                    </p>
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        <section className="mb-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Receipt size={22} /> Top Expense Categories
            </h2>

            <div className="mt-5 space-y-3">
              {topExpenseCategories.length > 0 ? (
                topExpenseCategories.map((item: any) => (
                  <MiniRow
                    key={item.category}
                    label={item.category}
                    value={formatPeso(item.amount)}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-500">No expense data found.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <AlertTriangle size={22} /> Bills & Obligations
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat
                title="Outstanding"
                value={formatPeso(outstandingBills)}
                danger={outstandingBills > 0}
                formula="Bills not yet paid"
              />
              <MiniStat
                title="Overdue"
                value={formatPeso(overdueBillsTotal)}
                danger={overdueBillsTotal > 0}
                formula="Late bills"
              />
              <MiniStat
                title="Due Soon"
                value={formatPeso(upcomingBillsTotal)}
                danger={upcomingBillsTotal > 0}
                formula="Bills due soon"
              />
              <MiniStat
                title="Payroll Load"
                value={formatPeso(payrollTotal)}
                danger={payrollRatio >= 40}
                formula="Total staff payout"
              />
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-300">
                    Cashier Variance Review
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Shows who has shortage or overage in the selected period.
                  </p>
                </div>

                <span
                  className={
                    varianceDrawerCount > 0
                      ? "rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300"
                      : "rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300"
                  }
                >
                  {varianceDrawerCount > 0
                    ? `${varianceDrawerCount} variance`
                    : "Balanced"}
                </span>
              </div>

              <div className="mt-4 overflow-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-900 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Cashier</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Expected</th>
                      <th className="px-4 py-3 text-right">Actual</th>
                      <th className="px-4 py-3 text-right">Variance</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {drawerRowsForSummary.length > 0 ? (
                      drawerRowsForSummary.slice(0, 8).map((drawer) => {
                        const expected = getDrawerExpectedCash(drawer);
                        const actual = getDrawerActualCash(drawer);
                        const variance = getDrawerVariance(drawer);
                        const status =
                          variance < 0
                            ? "Short"
                            : variance > 0
                              ? "Over"
                              : "Balanced";

                        return (
                          <tr
                            key={drawer.id}
                            className="border-t border-slate-800 hover:bg-slate-900/70"
                          >
                            <td className="px-4 py-3 font-bold text-white">
                              {getDrawerHolder(drawer)}
                            </td>

                            <td className="px-4 py-3 text-slate-300">
                              {getDateValue(drawer) || "-"}
                            </td>

                            <td className="px-4 py-3 text-right">
                              {formatPeso(expected)}
                            </td>

                            <td className="px-4 py-3 text-right">
                              {formatPeso(actual)}
                            </td>

                            <td
                              className={
                                variance < 0
                                  ? "px-4 py-3 text-right font-bold text-red-400"
                                  : variance > 0
                                    ? "px-4 py-3 text-right font-bold text-amber-400"
                                    : "px-4 py-3 text-right font-bold text-emerald-400"
                              }
                            >
                              {formatPeso(variance)}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={
                                  variance < 0
                                    ? "rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300"
                                    : variance > 0
                                      ? "rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300"
                                      : "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300"
                                }
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          No cash drawer data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function recommendationFallback(
  totalRevenue: number,
  totalExpenses: number,
  cashAvailable: number,
) {
  if (totalRevenue === 0 && totalExpenses === 0) {
    return [
      "Import revenue and expense data to activate full AI recommendations.",
    ];
  }

  if (cashAvailable <= 0) {
    return [
      "Submit or close the latest cash drawer to update real cash position.",
    ];
  }

  return ["Review cash position daily before approving expenses."];
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  formula,
  source,
  success,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  subtitle?: string;
  formula?: string;
  source?: string;
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

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-400">{title}</p>
            <MetricHelp formula={formula} source={source} />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold">{value}</h2>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}

      {formula && (
        <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-4 text-slate-400">
          {formula}
        </p>
      )}
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
  rows: { label: string; value: string; formula?: string; source?: string }[];
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
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl bg-slate-950/50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-300">{row.label}</p>
                <MetricHelp formula={row.formula} source={row.source} />
              </div>
              <p className="font-black text-white">{row.value}</p>
            </div>

            {row.formula && (
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                {row.formula}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueCard({
  title,
  value,
  total,
  formula,
  source,
}: {
  title: string;
  value: number;
  total: number;
  formula?: string;
  source?: string;
}) {
  const share = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-black">{title} Revenue</h2>
        <MetricHelp formula={formula} source={source} />
      </div>

      <div className="mt-5 space-y-3">
        <MiniRow
          label="Revenue"
          value={`₱${value.toLocaleString("en-PH")}`}
          formula={formula}
          source={source}
        />

        <MiniRow
          label="Contribution"
          value={`${share}%`}
          formula="Share of total revenue"
        />
      </div>
    </div>
  );
}

function MiniRow({
  label,
  value,
  formula,
  source,
}: {
  label: string;
  value: string;
  formula?: string;
  source?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-400">{label}</p>
          <MetricHelp formula={formula} source={source} />
        </div>

        <p className="font-black">{value}</p>
      </div>

      {formula && (
        <p className="mt-1 text-[11px] leading-4 text-slate-500">{formula}</p>
      )}
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
          {items.slice(0, 5).map((item, index) => (
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
  formula,
  source,
}: {
  title: string;
  value: any;
  danger?: boolean;
  formula?: string;
  source?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">{title}</p>
        <MetricHelp formula={formula} source={source} />
      </div>

      <h3
        className={
          danger
            ? "mt-1 text-xl font-black text-red-400"
            : "mt-1 text-xl font-black text-white"
        }
      >
        {value}
      </h3>

      {formula && (
        <p className="mt-1 text-[11px] leading-4 text-slate-500">{formula}</p>
      )}
    </div>
  );
}

function MetricHelp({
  formula,
  source,
}: {
  formula?: string;
  source?: string;
}) {
  if (!formula && !source) return null;

  return (
    <span
      title={formula || ""}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400"
    >
      <Info size={12} />
    </span>
  );
}
