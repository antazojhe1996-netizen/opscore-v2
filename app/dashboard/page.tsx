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

  const isExcludedFromOperatingExpenses = (row: any) => {
    const category = String(row.category || row.expense_category || "").toLowerCase();
    const description = String(row.description || row.remarks || "").toLowerCase();
    const source = String(row.source || "").toLowerCase();

    return (
      category.includes("payroll") ||
      category.includes("salary") ||
      category.includes("cash advance") ||
      description.includes("cash advance") ||
      source.includes("cash advance")
    );
  };

  const getPayrollDashboardValue = (row: any) =>
    Number(
      row.net_pay ??
        row.release_amount ??
        row.released_amount ??
        row.total_net_pay ??
        row.payroll_total ??
        row.gross_pay ??
        row.total_cost ??
        0,
    );

  const operatingExpenseRows = expenses.filter(
    (row) => !isExcludedFromOperatingExpenses(row),
  );

  const excludedExpenseRows = expenses.filter(isExcludedFromOperatingExpenses);

  const totalExpenses = sumAmount(operatingExpenseRows);

  const excludedExpenseTotal = sumAmount(excludedExpenseRows);

  const payrollTotal = payrollRows
    .filter((row) => isWithinRange(getDateValue(row)))
    .reduce((sum, row) => sum + getPayrollDashboardValue(row), 0);

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

  const bankDepositTotal = cashMovementRows
    .filter(
      (row) =>
        (row.payment_type || "Cash") === "Cash" &&
        String(row.source || "") === "Bank Deposit",
    )
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const ownerWithdrawalTotal = cashMovementRows
    .filter(
      (row) =>
        (row.payment_type || "Cash") === "Cash" &&
        String(row.source || "") === "Owner Withdrawal",
    )
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const operationalCashOut = cashMovementRows
    .filter(
      (row) =>
        (row.payment_type || "Cash") === "Cash" &&
        row.movement_type === "Cash Out" &&
        String(row.source || "") !== "Bank Deposit" &&
        String(row.source || "") !== "Owner Withdrawal",
    )
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const totalRemitted = cashMovementRemittance;

  const movementBasedCash =
    cashMovementCashIn - cashMovementCashOut - cashMovementRemittance;

  const getDrawerMovementLiveCash = (drawerId: any) => {
    const drawerMovements = cashMovements.filter(
      (row) => String(row.cash_drawer_id || "") === String(drawerId || ""),
    );

    const drawerCashIn = drawerMovements
      .filter(
        (row) =>
          (row.payment_type || "Cash") === "Cash" &&
          (row.movement_type === "Opening Float" ||
            row.movement_type === "Cash In" ||
            (row.movement_type === "Adjustment" && Number(row.amount || 0) > 0)),
      )
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const drawerCashOut = drawerMovements
      .filter(
        (row) =>
          (row.payment_type || "Cash") === "Cash" &&
          (row.movement_type === "Cash Out" ||
            row.source === "Bank Deposit" ||
            row.source === "Owner Withdrawal" ||
            (row.movement_type === "Adjustment" && Number(row.amount || 0) < 0)),
      )
      .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

    const drawerRemittance = drawerMovements
      .filter(
        (row) =>
          (row.payment_type || "Cash") === "Cash" &&
          row.movement_type === "Remittance",
      )
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return drawerCashIn - drawerCashOut - drawerRemittance;
  };

  const openDrawerLiveCash = openDrawers.reduce(
    (sum, drawer) => sum + getDrawerMovementLiveCash(drawer.id),
    0,
  );

  const latestClosedDrawer = [...closedDrawers]
    .filter((drawer) => isWithinRange(getDateValue(drawer)))
    .sort((a, b) =>
      String(b.closed_at || b.opened_at || b.created_at || "").localeCompare(
        String(a.closed_at || a.opened_at || a.created_at || ""),
      ),
    )[0];

  const latestClosedActualCash = latestClosedDrawer
    ? getDrawerActualCash(latestClosedDrawer)
    : 0;

  const verifiedCash = Math.max(
    openDrawerLiveCash > 0
      ? openDrawerLiveCash
      : actualCash > 0
        ? actualCash
        : latestClosedActualCash,
    0,
  );

  const cashAvailable = verifiedCash;

  const unremittedCash = Math.max(movementBasedCash, 0);
  const cashAccountedFor =
    operationalCashOut + totalRemitted + bankDepositTotal + ownerWithdrawalTotal + cashAvailable;
  const cashAccountabilityVariance = cashMovementCashIn - cashAccountedFor;

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
      ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
      : cashFlowStatus === "Watch"
        ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
        : "border-blue-500/20 bg-blue-500/10 text-blue-300";

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

  const allocatedExpenses = operatingExpenseRows
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
    operatingExpenseRows
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


  /// CULPRIT FINDER CALCULATIONS
  const getEmployeeDisplayName = (row: any) =>
    String(
      row.employee_name ||
        row.full_name ||
        row.name ||
        `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
        row.employee_id ||
        "Unknown Employee",
    );

  const getPayrollCostValue = (row: any) => getPayrollDashboardValue(row);

  const getPayrollOtValue = (row: any) =>
    Number(row.ot_pay || row.overtime_pay || row.total_ot_pay || row.ot_amount || 0);

  const payrollCulpritRows = Object.values(
    payrollRows
      .filter((row) => isWithinRange(getDateValue(row)))
      .reduce((acc: Record<string, any>, row) => {
        const employeeName = getEmployeeDisplayName(row);
        const key = String(row.employee_id || employeeName);

        if (!acc[key]) {
          acc[key] = {
            employeeName,
            department: row.department || row.employee_department || "-",
            payrollCost: 0,
            otCost: 0,
            records: 0,
          };
        }

        acc[key].payrollCost += getPayrollCostValue(row);
        acc[key].otCost += getPayrollOtValue(row);
        acc[key].records += 1;
        return acc;
      }, {}),
  )
    .sort((a: any, b: any) => b.payrollCost - a.payrollCost)
    .slice(0, 8) as any[];

  const cashAdvanceWatchlist = Object.values(
    activeEmployeeBalances
      .filter((balance) =>
        String(balance.balance_type || balance.category || "")
          .toLowerCase()
          .includes("cash advance"),
      )
      .reduce((acc: Record<string, any>, balance) => {
        const employeeName = getEmployeeDisplayName(balance);
        const key = String(balance.employee_id || employeeName);

        if (!acc[key]) {
          acc[key] = {
            employeeName,
            department: balance.department || "-",
            amount: 0,
            records: 0,
          };
        }

        acc[key].amount += Number(balance.remaining_balance || balance.amount || 0);
        acc[key].records += 1;
        return acc;
      }, {}),
  )
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 8) as any[];

  const uncollectedGuestRows = filteredReservations
    .map((row) => ({
      guest: row.guest_name || row.guest || row.name || "Unknown Guest",
      room: row.room || row.room_number || "-",
      reservation: row.reservation_number || row.reservation_no || row.id || "-",
      balance: getHotelBalanceValue(row),
    }))
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8);

  const expenseCulpritRows = Object.values(
    operatingExpenseRows
      .filter((row) => isWithinRange(getDateValue(row)))
      .reduce((acc: Record<string, any>, row) => {
        const department = row.department || row.area || "Unassigned";

        if (!acc[department]) {
          acc[department] = {
            department,
            amount: 0,
            records: 0,
          };
        }

        acc[department].amount += Number(row.amount || 0);
        acc[department].records += 1;
        return acc;
      }, {}),
  )
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 8) as any[];

  const highestPayrollCulprit = payrollCulpritRows[0] || null;
  const highestCashAdvanceCulprit = cashAdvanceWatchlist[0] || null;
  const highestGuestBalanceCulprit = uncollectedGuestRows[0] || null;
  const highestExpenseDepartment = expenseCulpritRows[0] || null;

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
    ...(unremittedCash > 0
      ? [`Unremitted cash still visible: ${formatPeso(unremittedCash)}.`]
      : []),
    ...(Math.abs(cashAccountabilityVariance) > 1
      ? [`Cash accountability variance needs review: ${formatPeso(cashAccountabilityVariance)}.`]
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
    ...(excludedExpenseTotal > 0
      ? [
          `${formatPeso(excludedExpenseTotal)} payroll/cash advance expense rows are excluded from operating expenses to prevent double count.`,
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
    ...(unremittedCash > 0
      ? ["Confirm remittance or bank deposit for any unremitted cash before closing finance reports."]
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
      ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
      : businessStatus === "Watchlist"
        ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
        : "border-blue-500/20 bg-blue-500/10 text-blue-300";

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



  const currentHour = new Date().getHours();
  const executiveGreeting =
    currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";
  const ownerDisplayName = "Annabelle";
  const operationMood =
    businessStatus === "Stable"
      ? "Vincent Resort is operating normally today."
      : businessStatus === "Watchlist"
        ? "Vincent Resort is stable, with a few items needing review."
        : "Vincent Resort needs management attention today.";
  const revenueMood = collectedOperatingRevenue > 0 ? "Revenue is active" : "Revenue data is pending";
  const cashMood = cashAvailable > 0 ? "cash position is visible" : "cash position needs drawer update";
  const payrollMood =
    payrollStatus === "Healthy"
      ? "payroll is within normal range"
      : payrollStatus === "Watch"
        ? "payroll needs monitoring"
        : "payroll exposure is high";
  const ownerAction = recommendations[0] || "Review cash position daily before approving expenses.";

  const todayArrivals = activeHotelRowsInRange.filter(
    (row) => String(row.check_in || row.arrival_date || row.date || "").slice(0, 10) === todayKey,
  ).length;

  const todayDepartures = activeHotelRowsInRange.filter(
    (row) => String(row.check_out || row.departure_date || row.checkout_date || "").slice(0, 10) === todayKey,
  ).length;

  const occupancyMood =
    occupancyToday >= 80
      ? "Strong occupancy"
      : occupancyToday >= 50
        ? "Moderate occupancy"
        : "Occupancy needs lift";

  const executiveBriefingPoints = [
    `${revenueMood} with ${formatPeso(collectedOperatingRevenue)} collected in the selected range.`,
    `Cash control shows ${formatPeso(cashAvailable)} verified cash available.`,
    `Payroll status is ${payrollStatus.toLowerCase()} at ${payrollRatio}% of collected revenue.`,
    `${occupancyMood}: ${occupancyToday}% occupancy with ${roomsSoldToday} room(s) sold.`,
    ...(expectedCollections > 0
      ? [`Collections need follow-up: ${formatPeso(expectedCollections)} collectible receivables.`]
      : ["No major collectible balance pressure detected."]),
  ];


  /// UI
  return (
    <div className="flex min-h-screen bg-[#07111f] text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-[#0B1220] via-[#13203D] to-[#07111f] p-5 shadow-2xl shadow-blue-950/30 lg:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_520px]">
            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">
                  Owner Executive Suite
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-bold text-slate-200">
                  {getActiveRangeLabel()}
                </span>
              </div>

              <p className="text-sm font-black uppercase tracking-[0.35em] text-blue-100/80">
                OPSCORE Hospitality Intelligence
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">
                {executiveGreeting}, {ownerDisplayName}
              </h1>

              <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-slate-200">
                {operationMood}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/70">
                    Occupancy
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">{occupancyMood}</p>
                  <p className="mt-1 text-3xl font-black text-blue-100">
                    {occupancyToday}%
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {roomsSoldToday}/{availableRoomsToday} rooms sold
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/70">
                    Revenue
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">{revenueMood}</p>
                  <p className="mt-1 text-3xl font-black text-blue-100">
                    {formatPeso(collectedOperatingRevenue)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Collected revenue
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/70">
                    Cash Position
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">{cashMood}</p>
                  <p className="mt-1 text-3xl font-black text-blue-100">
                    {formatPeso(cashAvailable)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Verified cash control
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="rounded-2xl border border-blue-200/20 bg-blue-300/10 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100/80">
                    Recommended action
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                    {ownerAction}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Arrivals</p>
                    <p className="mt-1 text-2xl font-black text-white">{todayArrivals}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Departures</p>
                    <p className="mt-1 text-2xl font-black text-white">{todayDepartures}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Payroll</p>
                    <p className="mt-1 text-2xl font-black text-white">{payrollRatio}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200/80">
                    Business Health
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-white">
                    {businessHealthScore}
                  </h2>
                  <p className="mt-1 text-sm font-black uppercase tracking-[0.22em] text-blue-200">
                    {businessStatus}
                  </p>
                </div>

                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-blue-300/20 bg-blue-300/10">
                  <div className="absolute inset-2 rounded-full border border-blue-300/20" />
                  <div className="text-center">
                    <p className="text-3xl font-black text-white">{businessHealthScore}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/70">/100</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-300 to-cyan-200"
                  style={{ width: `${Math.min(Math.max(businessHealthScore, 0), 100)}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Alerts
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">{criticalAlerts.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Actions
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">{recommendations.length}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                            ? "rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                            : "rounded-xl border border-slate-800 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-slate-900"
                        }
                      >
                        {range === "daily"
                          ? "Day"
                          : range === "weekly"
                            ? "Week"
                            : range === "monthly"
                              ? "Month"
                              : "Year"}
                      </button>
                    ),
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr]">
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none [color-scheme:dark]"
                  />

                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none [color-scheme:dark]"
                  />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={applyCustomRange}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-500"
                  >
                    Apply Range
                  </button>

                  <button
                    onClick={resetToLatestRange}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:bg-slate-800"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            icon={<Wallet size={22} />}
            title="Verified Cash"
            value={formatPeso(cashAvailable)}
            danger={cashAvailable <= 0}
            success={cashAvailable > 0}
            subtitle={openDrawers.length > 0 ? "Open drawer live cash" : "Latest closed drawer cash"}
            formula="Open drawer live cash or latest closed drawer actual cash. Revenue net position is excluded."
          />

          <KpiCard
            icon={<Hotel size={22} />}
            title="Gross Revenue"
            value={formatPeso(grossOperatingSales)}
            success
            subtitle="Active sales"
            formula="Hotel active sales + restaurant sales + apartment collections."
          />

          <KpiCard
            icon={<DollarSign size={22} />}
            title="Collected Revenue"
            value={formatPeso(collectedOperatingRevenue)}
            success
            subtitle="Actual collections"
            formula="Hotel collections + restaurant sales + apartment collections."
          />

          <KpiCard
            icon={<Receipt size={22} />}
            title="Expenses + Payroll"
            value={formatPeso(totalExpenses + payrollTotal)}
            danger
            subtitle={`Payroll ${payrollRatio}%`}
            formula="Operating expenses plus payroll. Payroll/cash advance expense rows are excluded to prevent double count."
          />

          <KpiCard
            icon={<ShieldAlert size={22} />}
            title="Receivables"
            value={formatPeso(expectedCollections)}
            danger={expectedCollections > 0}
            subtitle="Collectible balance"
            formula="Hotel collectible balance + apartment receivables. Negative credits/refunds are excluded."
          />

          <KpiCard
            icon={<Brain size={22} />}
            title="Health Score"
            value={`${businessHealthScore}/100`}
            success={businessHealthScore >= 85}
            danger={businessHealthScore < 70}
            subtitle={businessStatus}
            formula="Weighted score from finance, operations, and collections risk."
          />
        </section>

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                Financial Trend
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Revenue, Expense & Cash Position
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Executive trend for revenue, expenses, verified cash, and net position.
              </p>
            </div>

            <div className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400">
              Net Position:{" "}
              <span className={netPosition < 0 ? "text-red-300" : "text-blue-300"}>
                {formatPeso(netPosition)}
              </span>
            </div>
          </div>

          <div className="h-[260px] min-h-[260px] min-w-0 sm:h-[320px]">
            {chartReady && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis
                    stroke="#94a3b8"
                    width={52}
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
                  <Legend verticalAlign="top" height={28} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#60a5fa"
                    strokeWidth={3}
                    fill="#60a5fa"
                    fillOpacity={0.18}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses + Payroll"
                    stroke="#94a3b8"
                    strokeWidth={3}
                    fill="#94a3b8"
                    fillOpacity={0.12}
                  />
                  <Area
                    type="monotone"
                    dataKey="cash"
                    name="Verified Cash"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    fill="#38bdf8"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Net Position"
                    stroke="#67e8f9"
                    strokeWidth={3}
                    fill="#67e8f9"
                    fillOpacity={0.12}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
                No financial data found for selected range.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-blue-950/20 lg:p-6">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                <Brain size={18} /> AI Executive Briefing
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {businessStatus === "Stable" ? "Business performance is under control." : businessStatus === "Watchlist" ? "Business is stable, but needs review." : "Immediate management attention is recommended."}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                OPSCORE summarized the current operating position based on cash, revenue, payroll, receivables, and occupancy signals.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {executiveBriefingPoints.slice(0, 4).map((item, index) => (
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
                Owner Action Center
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Prioritized shortcuts for the most important executive workflows.
              </p>

              <div className="mt-5 space-y-3">
                <a
                  href="/manager/approval-center"
                  className="block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-blue-300/40 hover:bg-blue-400/10"
                >
                  Review Approvals →
                </a>
                <a
                  href="/finance/payroll/manager"
                  className="block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-blue-300/40 hover:bg-blue-400/10"
                >
                  Open Payroll Manager →
                </a>
                <a
                  href="/finance/cash-management"
                  className="block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-blue-300/40 hover:bg-blue-400/10"
                >
                  Review Cash Position →
                </a>
                <a
                  href="/finance/expenses"
                  className="block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-blue-300/40 hover:bg-blue-400/10"
                >
                  Review Expenses →
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <InsightCard
            icon={<Wallet size={22} />}
            title="Cash Control"
            status={Math.abs(cashAccountabilityVariance) <= 1 ? "Balanced" : "Review"}
            statusClass="border-blue-500/20 bg-blue-500/10 text-blue-300"
            rows={[
              {
                label: "Cash In",
                value: formatPeso(cashMovementCashIn),
                formula: "Opening float + cash collections",
              },
              {
                label: "Remitted",
                value: formatPeso(totalRemitted),
                formula: "Cash transferred out through remittance process",
              },
              {
                label: "Cash Out",
                value: formatPeso(operationalCashOut),
                formula: "Expenses and cash advances",
              },
              {
                label: "Bank / Owner",
                value: formatPeso(bankDepositTotal + ownerWithdrawalTotal),
                formula: "Bank deposit + owner withdrawal",
              },
              {
                label: "Variance",
                value: formatPeso(cashAccountabilityVariance),
                formula: "Cash in minus accounted cash",
              },
            ]}
          />

          <InsightCard
            icon={<Hotel size={22} />}
            title="Revenue Control"
            status={topRevenueSource.name || "Review"}
            statusClass="border-blue-500/20 bg-blue-500/10 text-blue-300"
            rows={[
              {
                label: "Top Source",
                value: `${topRevenueSource.name} (${topRevenueShare}%)`,
                formula: "Biggest income source in selected range",
              },
              {
                label: "Rooms",
                value: formatPeso(grossRoomSales),
                formula: "Active/non-cancelled hotel sales from room-sales import",
              },
              {
                label: "Restaurant",
                value: formatPeso(restaurantRevenue),
                formula: "Restaurant sales",
              },
              {
                label: "Apartment",
                value: formatPeso(apartmentRevenue),
                formula: "Apartment collections",
              },
              {
                label: "Cancelled Gross",
                value: formatPeso(cancelledGrossRoomSales),
                formula: "Cancelled reservation totals excluded from gross hotel sales",
              },
            ]}
          />

          <InsightCard
            icon={<Users size={22} />}
            title="People & Payroll"
            status={payrollStatus}
            statusClass="border-blue-500/20 bg-blue-500/10 text-blue-300"
            rows={[
              {
                label: "For Release",
                value: formatPeso(pendingPayrollReleaseAmount),
                formula: "Approved payroll not yet released",
              },
              {
                label: "Attendance Issues",
                value: String(attendanceIssueRows.length),
                formula: "Absences, late, undertime, or missing time-out entries",
              },
              {
                label: "Cash Advances",
                value: formatPeso(outstandingCashAdvances),
                formula: "Active employee cash advance balances",
              },
              {
                label: "Needs Regeneration",
                value: String(payrollNeedsRegeneration.length),
                formula: "Cutoffs changed after generation",
              },
              {
                label: "Payroll Ratio",
                value: `${payrollRatio}%`,
                formula: "Payroll divided by total collected revenue",
              },
            ]}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          <a
            href="/manager/approval-center"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/50 hover:bg-slate-800/70"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              Approvals
            </p>
            <h3 className="mt-2 text-xl font-black">Approval Center</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Review leave, cash, expense, and operations approval queues.
            </p>
          </a>

          <a
            href="/finance/payroll/manager"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/50 hover:bg-slate-800/70"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              Payroll
            </p>
            <h3 className="mt-2 text-xl font-black">Payroll Manager</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Release payroll, audit history, and review remaining balances.
            </p>
          </a>

          <a
            href="/finance/cash-management"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/50 hover:bg-slate-800/70"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              Cash
            </p>
            <h3 className="mt-2 text-xl font-black">Cash Management</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open drawers, record movements, close shifts, and print reports.
            </p>
          </a>

          <a
            href="/finance/expenses"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/50 hover:bg-slate-800/70"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              Finance
            </p>
            <h3 className="mt-2 text-xl font-black">Expenses Ledger</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Review operating expenses, advances, and export ledger data.
            </p>
          </a>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
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
  const featuredRows = rows.slice(0, 2);
  const detailRows = rows.slice(2);

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/10 shadow-2xl shadow-blue-950/20">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-400/10 p-3 text-blue-300">{icon}</div>
            <div>
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Executive summary
              </p>
            </div>
          </div>

          <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-200">
            {status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {featuredRows.map((row) => (
            <div key={row.label} className="rounded-2xl border border-blue-400/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  {row.label}
                </p>
                <MetricHelp formula={row.formula} source={row.source} />
              </div>
              <p className="mt-2 text-2xl font-black text-white">{row.value}</p>
              {row.formula && (
                <p className="mt-2 text-[11px] leading-4 text-slate-400">
                  {row.formula}
                </p>
              )}
            </div>
          ))}
        </div>

        {detailRows.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-blue-400/10 bg-slate-950/40 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm text-slate-300">{row.label}</p>
                  <MetricHelp formula={row.formula} source={row.source} />
                </div>
                <p className="shrink-0 text-sm font-black text-white">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        )}
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
