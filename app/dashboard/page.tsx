"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Brain,
  DollarSign,
  Hotel,
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
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/app/lib/supabase";

type RangeType = "daily" | "weekly" | "monthly" | "yearly";

export default function ExecutiveDashboardPage() {
  /// STATES
  const [rangeType, setRangeType] = useState<RangeType>("yearly");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("User");

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
        const parsedUser = JSON.parse(storedUser);

        setLoggedInUser(
          parsedUser.employee_name ||
            parsedUser.full_name ||
            parsedUser.name ||
            parsedUser.email ||
            "User",
        );
      } catch {
        setLoggedInUser("User");
      }
    }
  }, []);

  /// FINANCE CALCULATIONS
  const hotelRowsInRange = hotelReservations.filter((row) =>
    isWithinRange(getDateValue(row)),
  );

  const isCancelledReservation = (row: any) =>
    String(row.status || "")
      .toLowerCase()
      .includes("cancel");

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
  const grossOperatingSales =
    grossRoomSales + restaurantRevenue + apartmentRevenue;
  const collectedOperatingRevenue =
    collectedRoomRevenue + restaurantRevenue + apartmentRevenue;
  const totalRevenue = collectedOperatingRevenue;

  const isExcludedFromOperatingExpenses = (row: any) => {
    const category = String(
      row.category || row.expense_category || "",
    ).toLowerCase();
    const description = String(
      row.description || row.remarks || "",
    ).toLowerCase();
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
            (row.movement_type === "Adjustment" &&
              Number(row.amount || 0) > 0)),
      )
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const drawerCashOut = drawerMovements
      .filter(
        (row) =>
          (row.payment_type || "Cash") === "Cash" &&
          (row.movement_type === "Cash Out" ||
            row.source === "Bank Deposit" ||
            row.source === "Owner Withdrawal" ||
            (row.movement_type === "Adjustment" &&
              Number(row.amount || 0) < 0)),
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
    operationalCashOut +
    totalRemitted +
    bankDepositTotal +
    ownerWithdrawalTotal +
    cashAvailable;
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
    filteredReservations.length > 0
      ? roomRevenue / filteredReservations.length
      : 0;

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
    Number(
      row.ot_pay || row.overtime_pay || row.total_ot_pay || row.ot_amount || 0,
    );

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

        acc[key].amount += Number(
          balance.remaining_balance || balance.amount || 0,
        );
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
      reservation:
        row.reservation_number || row.reservation_no || row.id || "-",
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
      ? [
          `Cash accountability variance needs review: ${formatPeso(cashAccountabilityVariance)}.`,
        ]
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
      ? [
          "Confirm remittance or bank deposit for any unremitted cash before closing finance reports.",
        ]
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

  const getChartGroup = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);

    if (rangeType === "yearly") {
      return dateString.slice(0, 7);
    }

    if (rangeType === "monthly") {
      const weekNumber = Math.ceil(date.getDate() / 7);
      return `${dateString.slice(0, 7)}-W${weekNumber}`;
    }

    return dateString;
  };

  const getChartLabel = (groupKey: string) => {
    if (rangeType === "yearly") {
      const date = new Date(`${groupKey}-01T00:00:00`);
      return date.toLocaleDateString("en-US", { month: "short" });
    }

    if (rangeType === "monthly" && groupKey.includes("-W")) {
      return `Week ${groupKey.split("-W")[1]}`;
    }

    const date = new Date(`${groupKey}T00:00:00`);

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

      const groupKey = getChartGroup(date);

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

    activeHotelRowsInRange.forEach((row) =>
      addToMap(getDateValue(row), "revenue", getHotelPaidValue(row)),
    );

    restaurantSales.forEach((row) =>
      addToMap(getDateValue(row), "revenue", getAmountValue(row)),
    );

    apartmentPayments.forEach((row) =>
      addToMap(getDateValue(row), "revenue", getAmountValue(row)),
    );

    operatingExpenseRows.forEach((row) =>
      addToMap(getDateValue(row), "expenses", getAmountValue(row)),
    );

    payrollRows.forEach((row) =>
      addToMap(getDateValue(row), "expenses", getPayrollDashboardValue(row)),
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
    activeHotelRowsInRange,
    restaurantSales,
    apartmentPayments,
    operatingExpenseRows,
    payrollRows,
    cashDrawers,
    rangeType,
    useCustomRange,
    customFromDate,
    customToDate,
  ]);

  const currentHour = new Date().getHours();
  const executiveGreeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 18
        ? "Good Afternoon"
        : "Good Evening";
  const operationMood =
    businessStatus === "Stable"
      ? "Vincent Resort is operating normally today."
      : businessStatus === "Watchlist"
        ? "Vincent Resort is stable, with a few items needing review."
        : "Vincent Resort needs management attention today.";
  const revenueMood =
    collectedOperatingRevenue > 0
      ? "Revenue is active"
      : "Revenue data is pending";
  const cashMood =
    cashAvailable > 0
      ? "cash position is visible"
      : "cash position needs drawer update";
  const payrollMood =
    payrollStatus === "Healthy"
      ? "payroll is within normal range"
      : payrollStatus === "Watch"
        ? "payroll needs monitoring"
        : "payroll exposure is high";
  const ownerAction =
    recommendations[0] ||
    "Review cash position daily before approving expenses.";

  const todayArrivals = activeHotelRowsInRange.filter(
    (row) =>
      String(row.check_in || row.arrival_date || row.date || "").slice(
        0,
        10,
      ) === todayKey,
  ).length;

  const todayDepartures = activeHotelRowsInRange.filter(
    (row) =>
      String(
        row.check_out || row.departure_date || row.checkout_date || "",
      ).slice(0, 10) === todayKey,
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
      ? [
          `Collections need follow-up: ${formatPeso(expectedCollections)} collectible receivables.`,
        ]
      : ["No major collectible balance pressure detected."]),
  ];


  const primaryRisk =
    criticalAlerts[0] ||
    (businessStatus === "Stable"
      ? "No major executive risk detected."
      : "Review the highest-risk operational item.");

  const primaryRiskValue =
    outstandingGuestBalance > 0
      ? formatPeso(outstandingGuestBalance)
      : apartmentReceivables > 0
        ? formatPeso(apartmentReceivables)
        : Math.abs(totalVariance) > 0
          ? formatPeso(totalVariance)
          : businessStatus;

  const compactAlerts = criticalAlerts.slice(0, 5);

  /// UI
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
              {executiveGreeting}, {loggedInUser}. Review revenue, cash,
              payroll, occupancy, collections, and operational risk in one
              management view.
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
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>

            <label className="min-w-[155px]">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                From
              </span>
              <input
                type="date"
                value={customFromDate}
                onChange={(event) => setCustomFromDate(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <label className="min-w-[155px]">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                To
              </span>
              <input
                type="date"
                value={customToDate}
                onChange={(event) => setCustomToDate(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <button
              type="button"
              onClick={applyCustomRange}
              className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={resetToLatestRange}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
            >
              Latest
            </button>
          </div>
        </section>

        <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={getStatusBadgeClass(businessStatus)}>
              {businessStatus}
            </span>
            <span className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 shadow-sm">
              {getActiveRangeLabel()}
            </span>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<TrendingUp size={20} />}
            title="Collected Revenue"
            value={formatPeso(collectedOperatingRevenue)}
            subtitle={`Gross operating sales: ${formatPeso(grossOperatingSales)}`}
          />
          <KpiCard
            icon={<Wallet size={20} />}
            title="Verified Cash"
            value={formatPeso(cashAvailable)}
            subtitle={`${openDrawers.length} open drawer(s), ${varianceDrawerCount} variance item(s)`}
          />
          <KpiCard
            icon={<Receipt size={20} />}
            title="Net Position"
            value={formatPeso(netPosition)}
            subtitle={`${profitMargin}% profit margin`}
            tone={netPosition < 0 ? "danger" : "success"}
          />
          <KpiCard
            icon={<Hotel size={20} />}
            title="Occupancy"
            value={`${occupancyToday}%`}
            subtitle={`${roomsSoldToday}/${availableRoomsToday} rooms sold today`}
            tone={occupancyToday < 40 ? "warning" : "info"}
          />
        </section>

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Trend
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Revenue, Expenses, Cash
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
                Hero View
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                {getActiveRangeLabel()}
              </span>
            </div>
          </div>
          <div className="h-[360px] p-6">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip formatter={(value: any) => formatPeso(Number(value || 0))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0f172a"
                    fill="url(#revenueFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#64748b"
                    fill="url(#expenseFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="cash"
                    stroke="#94a3b8"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No trend data found"
                helper="Load revenue, expense, payroll, or cash drawer rows to activate this chart."
              />
            )}
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                OPSCORE Intelligence
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Executive Briefing
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {operationMood}
              </p>
            </div>

            <div className="p-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr_1fr]">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                      <Brain size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Health Score
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-3xl font-black tracking-tight text-slate-950">
                          {businessHealthScore}
                        </p>
                        <span className={getStatusBadgeClass(businessStatus)}>
                          {businessStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Primary Risk
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">
                      {primaryRiskValue}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">
                      {primaryRisk}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Top Action
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">
                      Management Priority
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">
                      {ownerAction}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  <MiniMetric label="Finance" value={financeScore} />
                  <MiniMetric label="Ops" value={operationsScore} />
                  <MiniMetric label="Collect" value={collectionsScore} />
                  <MiniMetric label="Arrivals" value={todayArrivals} />
                  <MiniMetric label="Departures" value={todayDepartures} />
                  <MiniMetric label="Payroll" value={`${payrollRatio}%`} />
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Compact Alerts
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
                    {compactAlerts.length > 0 ? (
                      compactAlerts.map((item, index) => (
                        <div
                          key={`compact-alert-${index}`}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700"
                        >
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                        No critical alerts found for the selected range.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Quick Control
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Risk Snapshot
              </h2>
            </div>
            <div className="space-y-3 p-6">
              <SnapshotRow
                label="Cash Flow"
                value={cashFlowStatus}
                tone={
                  cashFlowStatus === "Critical"
                    ? "danger"
                    : cashFlowStatus === "Watch"
                      ? "warning"
                      : "success"
                }
              />
              <SnapshotRow
                label="Payroll Status"
                value={payrollStatus}
                tone={
                  payrollStatus === "High Risk"
                    ? "danger"
                    : payrollStatus === "Watch"
                      ? "warning"
                      : "success"
                }
              />
              <SnapshotRow
                label="Guest Balances"
                value={formatPeso(outstandingGuestBalance)}
                tone={outstandingGuestBalance > 0 ? "warning" : "success"}
              />
              <SnapshotRow
                label="Apartment Receivables"
                value={formatPeso(apartmentReceivables)}
                tone={apartmentReceivables > 0 ? "warning" : "success"}
              />
              <SnapshotRow
                label="Drawer Variance"
                value={formatPeso(totalVariance)}
                tone={Math.abs(totalVariance) > 0 ? "danger" : "success"}
              />
              <SnapshotRow
                label="Upcoming Bills"
                value={formatPeso(upcomingBillsTotal)}
                tone={upcomingBillsTotal > 0 ? "info" : "success"}
              />
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Profitability
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Department Profit Centers
              </h2>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Revenue</th>
                    <th className="px-6 py-4">Allocated Expense</th>
                    <th className="px-6 py-4">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {departmentProfitability.map((row) => (
                    <tr
                      key={row.name}
                      className="transition-all duration-200 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-black text-slate-950">
                        {row.name}
                      </td>
                      <td className="px-6 py-4">{formatPeso(row.revenue)}</td>
                      <td className="px-6 py-4">
                        {formatPeso(row.allocatedExpenses)}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-950">
                        {formatPeso(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Collections
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Revenue and Receivables
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <MiniMetric label="Rooms Revenue" value={formatPeso(roomRevenue)} />
              <MiniMetric label="Restaurant" value={formatPeso(restaurantRevenue)} />
              <MiniMetric label="Apartment" value={formatPeso(apartmentRevenue)} />
              <MiniMetric label="Recoverable" value={formatPeso(recoverableCash)} />
              <div className="rounded-3xl border border-slate-200 bg-white p-5 md:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Collection Pressure
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  {formatPeso(expectedCollections)}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Guest balances and apartment receivables requiring follow-up.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<DollarSign size={20} />}
            title="Rooms Revenue"
            value={formatPeso(roomRevenue)}
            subtitle={`Unpaid guest balance: ${formatPeso(outstandingGuestBalance)}`}
          />
          <KpiCard
            icon={<Banknote size={20} />}
            title="Restaurant Revenue"
            value={formatPeso(restaurantRevenue)}
            subtitle={`Top source share: ${topRevenueShare}%`}
          />
          <KpiCard
            icon={<Users size={20} />}
            title="Payroll Exposure"
            value={formatPeso(payrollTotal)}
            subtitle={`${payrollRatio}% of collected revenue`}
            tone={
              payrollRatio >= 50
                ? "danger"
                : payrollRatio >= 40
                  ? "warning"
                  : "success"
            }
          />
          <KpiCard
            icon={<ShieldAlert size={20} />}
            title="Recoverable Cash"
            value={formatPeso(recoverableCash)}
            subtitle="Receivables plus cash variance recovery"
            tone="info"
          />
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <TableCard
            title="Payroll Cost Watchlist"
            label="People Risk"
            headers={["Employee", "Department", "Payroll", "OT"]}
            rows={payrollCulpritRows.map((row: any) => [
              row.employeeName,
              row.department,
              formatPeso(row.payrollCost),
              formatPeso(row.otCost),
            ])}
          />
          <TableCard
            title="Cash Advance Watchlist"
            label="Balance Risk"
            headers={["Employee", "Department", "Amount", "Records"]}
            rows={cashAdvanceWatchlist.map((row: any) => [
              row.employeeName,
              row.department,
              formatPeso(row.amount),
              row.records,
            ])}
          />
          <TableCard
            title="Uncollected Guest Balances"
            label="Collections"
            headers={["Guest", "Room", "Reservation", "Balance"]}
            rows={uncollectedGuestRows.map((row: any) => [
              row.guest,
              row.room,
              row.reservation,
              formatPeso(row.balance),
            ])}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            href="/finance/cash-management"
            label="Cash"
            title="Cash Management"
            description="Open drawers, record movements, close shifts, and review variance."
          />
          <ActionCard
            href="/finance/expenses"
            label="Finance"
            title="Expense Ledger"
            description="Review operating expenses and export ledger records."
          />
          <ActionCard
            href="/payroll"
            label="Payroll"
            title="Payroll Manager"
            description="Review payroll exposure, cutoffs, approvals, and release status."
          />
          <ActionCard
            href="/manager/approval-center"
            label="Approvals"
            title="Approval Center"
            description="Review requests through the locked OPSCORE workflow pattern."
          />
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

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

function getToneBadgeClass(tone: Tone) {
  if (tone === "success")
    return "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700";
  if (tone === "warning")
    return "inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700";
  if (tone === "danger")
    return "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-700";
  if (tone === "info")
    return "inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700";
  return "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700";
}

function getStatusBadgeClass(status: string) {
  const value = String(status || "").toLowerCase();
  if (
    ["stable", "safe", "healthy", "paid", "approved", "active"].some((word) =>
      value.includes(word),
    )
  )
    return getToneBadgeClass("success");
  if (
    ["watch", "pending", "partial", "warning"].some((word) =>
      value.includes(word),
    )
  )
    return getToneBadgeClass("warning");
  if (
    ["critical", "risk", "overdue", "danger", "rejected"].some((word) =>
      value.includes(word),
    )
  )
    return getToneBadgeClass("danger");
  return getToneBadgeClass("neutral");
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
          {icon}
        </div>
        <span className={getToneBadgeClass(tone)}>{tone}</span>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: Tone;
}) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
    >
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-2">
        <span className={getToneBadgeClass(tone)}>{value}</span>
        <span className="text-sm font-black text-slate-400">→</span>
      </div>
    </button>
  );
}

function BriefingCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.slice(0, 6).map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700"
            >
              {item}
            </div>
          ))
        ) : (
          <EmptyState title="No records found" helper={empty} compact />
        )}
      </div>
    </div>
  );
}

function TableCard({
  title,
  label,
  headers,
  rows,
}: {
  title: string;
  label: string;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-6 py-4">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="transition-all duration-200 hover:bg-slate-50"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={
                        cellIndex === 0
                          ? "px-6 py-4 font-black text-slate-950"
                          : "px-6 py-4"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No records found"
          helper="No matching rows in the selected range."
        />
      )}
    </div>
  );
}

function ActionCard({
  href,
  label,
  title,
  description,
}: {
  href: string;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-500 transition-all duration-200 group-hover:border-slate-300 group-hover:bg-slate-50 group-hover:text-slate-950">
          →
        </span>
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </a>
  );
}

function EmptyState({
  title,
  helper,
  compact = false,
}: {
  title: string;
  helper: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "py-6 text-center" : "py-14 text-center"}>
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}
