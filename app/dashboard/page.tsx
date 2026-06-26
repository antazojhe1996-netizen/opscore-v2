"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarClock,
  CreditCard,
  Landmark,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";

type RangeType = "daily" | "weekly" | "monthly" | "yearly";
type Row = Record<string, any>;

type DashboardData = {
  cashMovements: Row[];
  cashDrawers: Row[];
  otaStatementLines: Row[];
  directSalesImportLines: Row[];
  restaurantSales: Row[];
  apartmentBills: Row[];
  apartmentPayments: Row[];
  financeBills: Row[];
  employeeBalances: Row[];
  payrollRecords: Row[];
  payrollPeriods: Row[];
};

const emptyDashboardData: DashboardData = {
  cashMovements: [],
  cashDrawers: [],
  otaStatementLines: [],
  directSalesImportLines: [],
  restaurantSales: [],
  apartmentBills: [],
  apartmentPayments: [],
  financeBills: [],
  employeeBalances: [],
  payrollRecords: [],
  payrollPeriods: [],
};

const realtimeTables = [
  "finance_cash_movements",
  "finance_cash_drawers",
  "ota_statement_lines",
  "direct_sales_import_lines",
  "restaurant_sales",
  "apartment_bills",
  "apartment_payments",
  "finance_bills",
  "employee_balances",
  "payroll_records",
  "payroll_periods",
];

const SALES_SOURCES = [
  "Room Sales",
  "Restaurant Sales",
  "Apartment Collection",
  "Laundry Sales",
  "Other Sales",
  "Billiards",
];

export default function ExecutiveDashboardPage() {
  const [rangeType, setRangeType] = useState<RangeType>("weekly");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("User");
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);

  const formatPeso = (value: number) =>
    `â‚±${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const normalize = (value: any) => String(value || "").trim().toLowerCase();

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
      "payment_date",
      "sales_date",
      "report_date",
      "payout_date",
      "statement_date",
      "date",
      "due_date",
      "start_date",
      "opened_at",
      "closed_at",
      "created_at",
    ]).slice(0, 10);

  const getOtaDateValue = (row: Row | undefined) =>
    getText(row, ["payout_date", "statement_date", "check_out", "created_at"]).slice(0, 10);

  const getDirectImportDateValue = (row: Row | undefined) =>
    getText(row, ["sales_date", "report_date", "created_at"]).slice(0, 10);

  const isVoidedRow = (row: Row) => {
    const status = normalize(getText(row, ["status", "movement_status"], "active"));

    return (
      status.includes("void") ||
      status.includes("cancel") ||
      status.includes("duplicate") ||
      Boolean(row.voided_at) ||
      Boolean(row.cancelled_at) ||
      Boolean(row.deleted_at)
    );
  };

  const isMovementType = (row: Row, target: string) =>
    normalize(getText(row, ["movement_type"])) === normalize(target);

  const fetchAllRows = async (tableName: string, orderColumn?: string, ascending = false) => {
    const pageSize = 1000;
    let from = 0;
    let allRows: Row[] = [];

    while (true) {
      let query = supabase.from(tableName).select("*");

      if (orderColumn) {
        query = query.order(orderColumn, { ascending });
      }

      const { data: rows, error } = await query.range(from, from + pageSize - 1);

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

  const loadDashboardData = useCallback(async () => {
    setLoading(true);

    const [
      cashMovements,
      cashDrawers,
      otaStatementLines,
      directSalesImportLines,
      restaurantSales,
      apartmentBills,
      apartmentPayments,
      financeBills,
      employeeBalances,
      payrollRecords,
      payrollPeriods,
    ] = await Promise.all([
      fetchAllRows("finance_cash_movements", "business_date", false),
      fetchAllRows("finance_cash_drawers", "opened_at", false),
      fetchAllRows("ota_statement_lines", "payout_date", false),
      fetchAllRows("direct_sales_import_lines", "sales_date", false),
      fetchAllRows("restaurant_sales", "sale_date", false),
      fetchAllRows("apartment_bills", "due_date", false),
      fetchAllRows("apartment_payments", "payment_date", false),
      fetchAllRows("finance_bills", "due_date", true),
      fetchAllRows("employee_balances", "created_at", false),
      fetchAllRows("payroll_records", "created_at", false),
      fetchAllRows("payroll_periods", "start_date", false),
    ]);

    setData({
      cashMovements,
      cashDrawers,
      otaStatementLines,
      directSalesImportLines,
      restaurantSales,
      apartmentBills,
      apartmentPayments,
      financeBills,
      employeeBalances,
      payrollRecords,
      payrollPeriods,
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
        const parsedUser = JSON.parse(storedUser);
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

  const latestLedgerDate = useMemo(() => {
    const dates = [
      ...data.cashMovements.map((row) => getDateValue(row)),
      ...data.otaStatementLines.map((row) => getOtaDateValue(row)),
      ...data.directSalesImportLines.map((row) => getDirectImportDateValue(row)),
      ...data.restaurantSales.map((row) => getText(row, ["sale_date", "created_at"]).slice(0, 10)),
      ...data.apartmentPayments.map((row) => getDateValue(row)),
      ...data.apartmentBills.map((row) => getDateValue(row)),
      ...data.financeBills.map((row) => getDateValue(row)),
    ]
      .filter(Boolean)
      .sort();

    return dates[dates.length - 1] || todayKey;
  }, [data, todayKey]);

  const isWithinRange = (dateString: string) => {
    if (!dateString) return false;

    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;

    if (useCustomRange && customFromDate && customToDate) {
      const from = new Date(`${customFromDate}T00:00:00`);
      const to = new Date(`${customToDate}T23:59:59`);
      return date >= from && date <= to;
    }

    const anchorDate = new Date(`${latestLedgerDate}T00:00:00`);

    if (rangeType === "daily") return dateString === latestLedgerDate;

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

  const getActiveRangeLabel = () => {
    if (useCustomRange && customFromDate && customToDate) {
      return customFromDate === customToDate
        ? `Viewing ${customFromDate}`
        : `Viewing ${customFromDate} to ${customToDate}`;
    }

    if (rangeType === "daily") return `Latest day: ${latestLedgerDate}`;
    if (rangeType === "weekly") return `Latest 7 days ending ${latestLedgerDate}`;
    if (rangeType === "monthly") return `Month of ${latestLedgerDate.slice(0, 7)}`;
    return `Year ${latestLedgerDate.slice(0, 4)}`;
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

  const resetRange = () => {
    setUseCustomRange(false);
    setCustomFromDate("");
    setCustomToDate("");
    setRangeType("weekly");
  };

  const activeOpenDrawer = useMemo(() => {
    return (
      data.cashDrawers.find((drawer) => normalize(drawer.status) === "open") ||
      data.cashDrawers.find((drawer) => normalize(drawer.status) === "active") ||
      null
    );
  }, [data.cashDrawers]);

  const activeOpenDrawerId = getText(activeOpenDrawer || undefined, ["id"], "");

  const currentDrawerMovements = useMemo(() => {
    if (!activeOpenDrawerId) return [];

    return data.cashMovements
      .filter((row) => !isVoidedRow(row))
      .filter((row) => String(getText(row, ["cash_cash_drawer_id", "cash_drawer_id"])) === String(activeOpenDrawerId));
  }, [data.cashMovements, activeOpenDrawerId]);

  const historicalMovements = useMemo(
    () =>
      data.cashMovements
        .filter((row) => !isVoidedRow(row))
        .filter((row) => isWithinRange(getDateValue(row))),
    [data.cashMovements, rangeType, customFromDate, customToDate, useCustomRange, latestLedgerDate],
  );

  const historicalOtaLines = useMemo(
    () =>
      data.otaStatementLines
        .filter((row) => !isVoidedRow(row))
        .filter((row) => isWithinRange(getOtaDateValue(row))),
    [data.otaStatementLines, rangeType, customFromDate, customToDate, useCustomRange, latestLedgerDate],
  );

  const historicalDirectImports = useMemo(
    () =>
      data.directSalesImportLines
        .filter((row) => !isVoidedRow(row))
        .filter((row) => isWithinRange(getDirectImportDateValue(row))),
    [data.directSalesImportLines, rangeType, customFromDate, customToDate, useCustomRange, latestLedgerDate],
  );

  const historicalRestaurantSalesRows = useMemo(
    () =>
      data.restaurantSales
        .filter((row) => !isVoidedRow(row))
        .filter((row) => isWithinRange(getText(row, ["sale_date", "created_at"]).slice(0, 10))),
    [data.restaurantSales, rangeType, customFromDate, customToDate, useCustomRange, latestLedgerDate],
  );

  const movementAmount = (row: Row) => Math.abs(getNumber(row, ["amount"]));

  const currentDrawerPaymentTotal = (paymentType: string) => {
    const rows = currentDrawerMovements.filter(
      (row) => normalize(getText(row, ["payment_type"], "Cash")) === normalize(paymentType),
    );

    const opening = rows
      .filter((row) => isMovementType(row, "Opening Float"))
      .reduce((sum, row) => sum + movementAmount(row), 0);

    const cashIn = rows
      .filter((row) => isMovementType(row, "Cash In"))
      .reduce((sum, row) => sum + movementAmount(row), 0);

    const cashOut = rows
      .filter((row) => isMovementType(row, "Cash Out"))
      .reduce((sum, row) => sum + movementAmount(row), 0);

    const remittance = rows
      .filter((row) => isMovementType(row, "Remittance"))
      .reduce((sum, row) => sum + movementAmount(row), 0);

    const turnover = rows
      .filter((row) => isMovementType(row, "Turnover"))
      .reduce((sum, row) => sum + movementAmount(row), 0);

    return opening + cashIn - cashOut - remittance - turnover;
  };

  const realtimeCash = currentDrawerPaymentTotal("Cash");
  const realtimeGCash = currentDrawerPaymentTotal("GCash");
  const realtimeBank = currentDrawerPaymentTotal("Bank");
  const realtimeTerminal = currentDrawerPaymentTotal("Terminal");
  const realtimeAvailableMoney =
    realtimeCash + realtimeGCash + realtimeBank + realtimeTerminal;

  const isSalesSource = (row: Row) => {
    const source = getText(row, ["source"]);
    return SALES_SOURCES.some((item) => normalize(item) === normalize(source));
  };

  const historicalCollections = historicalMovements
    .filter((row) => isMovementType(row, "Cash In"))
    .filter(isSalesSource);

  const historicalCollectionsTotal = historicalCollections.reduce(
    (sum, row) => sum + movementAmount(row),
    0,
  );

  const historicalCashOut = historicalMovements
    .filter((row) => isMovementType(row, "Cash Out"))
    .reduce((sum, row) => sum + movementAmount(row), 0);

  const pendingLiquidations = currentDrawerMovements.filter((row) => {
    if (!isMovementType(row, "Cash Out")) return false;
    const source = normalize(getText(row, ["source"]));
    const liquidationStatus = normalize(getText(row, ["liquidation_status"], "FOR_LIQUIDATION"));

    return (
      ["expense release", "cash advance"].includes(source) &&
      !["liquidated", "not_required", "not required"].includes(liquidationStatus)
    );
  });

  const pendingLiquidationTotal = pendingLiquidations.reduce(
    (sum, row) => sum + movementAmount(row),
    0,
  );

  const sourceTotal = (source: string) =>
    historicalCollections
      .filter((row) => normalize(getText(row, ["source"])) === normalize(source))
      .reduce((sum, row) => sum + movementAmount(row), 0);

  const importedAmount = (row: Row) =>
    Math.abs(
      getNumber(row, [
        "collected_amount",
        "gross_amount",
        "amount",
        "payment_amount",
      ]),
    );

  const directImportCollected = historicalDirectImports
    .filter((row) => normalize(getText(row, ["source"])) !== "restaurant sales")
    .reduce((sum, row) => sum + importedAmount(row), 0);

  const restaurantImportCollected = historicalDirectImports
    .filter((row) => normalize(getText(row, ["source"])) === "restaurant sales")
    .reduce((sum, row) => sum + importedAmount(row), 0);

  const restaurantImportedFromPoster = historicalRestaurantSalesRows.reduce(
    (sum, row) => sum + Math.abs(getNumber(row, ["revenue", "total_revenue", "amount"])),
    0,
  );

  const walkinDirectSales = sourceTotal("Room Sales") + directImportCollected;
  const restaurantSales =
    sourceTotal("Restaurant Sales") + restaurantImportCollected + restaurantImportedFromPoster;

  const otaPayoutAmount = (row: Row) => {
    const channel = normalize(getText(row, ["channel"]));
    const lineType = normalize(getText(row, ["line_type", "type"]));

    if (channel === "airbnb") {
      if (lineType.includes("payout")) {
        return Math.abs(getNumber(row, ["paid_out", "net_payout", "payout_amount", "amount"]));
      }

      return 0;
    }

    if (channel === "booking_com" || channel === "booking.com") {
      return Math.abs(getNumber(row, ["net_payout", "paid_out", "payout_amount", "amount"]));
    }

    return Math.abs(getNumber(row, ["net_payout", "paid_out", "payout_amount"]));
  };

  const otaNetPayout = historicalOtaLines.reduce((sum, row) => sum + otaPayoutAmount(row), 0);

  const bookingComPayout = historicalOtaLines
    .filter((row) => {
      const channel = normalize(getText(row, ["channel"]));
      return channel === "booking_com" || channel === "booking.com";
    })
    .reduce((sum, row) => sum + otaPayoutAmount(row), 0);

  const airbnbPayout = historicalOtaLines
    .filter((row) => normalize(getText(row, ["channel"])) === "airbnb")
    .reduce((sum, row) => sum + otaPayoutAmount(row), 0);

  const totalCashBasedIncome = historicalCollectionsTotal + directImportCollected + otaNetPayout;

  const revenueSources = [
    { label: "Walk-in / Direct", value: walkinDirectSales },
    { label: "Restaurant Sales", value: restaurantSales },
    { label: "Booking.com Payouts", value: bookingComPayout },
    { label: "Airbnb Payouts", value: airbnbPayout },
    { label: "Apartment Collection", value: sourceTotal("Apartment Collection") },
    { label: "Laundry Sales", value: sourceTotal("Laundry Sales") },
    { label: "Other Sales", value: sourceTotal("Other Sales") + sourceTotal("Billiards") },
  ];

  const totalApartmentBill = (bill: Row) =>
    getNumber(bill, ["total_amount", "bill_amount", "amount"]) ||
    getNumber(bill, ["rent_amount"]) +
      getNumber(bill, ["electric_amount"]) +
      getNumber(bill, ["water_amount"]) +
      getNumber(bill, ["internet_amount"]) +
      getNumber(bill, ["other_amount"]);

  const apartmentPaymentTotalByBill = useMemo(() => {
    const map: Record<string, number> = {};

    data.apartmentPayments
      .filter((payment) => !isVoidedRow(payment))
      .forEach((payment) => {
        const billId = getText(payment, ["bill_id", "apartment_bill_id"]);
        if (!billId) return;

        map[billId] = (map[billId] || 0) + getNumber(payment, ["amount", "payment_amount"]);
      });

    return map;
  }, [data.apartmentPayments]);

  const apartmentReceivable = data.apartmentBills
    .filter((bill) => !isVoidedRow(bill))
    .reduce((sum, bill) => {
      const billId = getText(bill, ["id"]);
      const paid =
        getNumber(bill, ["paid_amount", "amount_paid"]) ||
        apartmentPaymentTotalByBill[billId] ||
        0;

      return sum + Math.max(totalApartmentBill(bill) - paid, 0);
    }, 0);


  const unpaidBills = data.financeBills.filter((bill) => {
    const status = normalize(getText(bill, ["status"]));
    return !status.includes("paid") && !status.includes("cancel");
  });

  const overdueBills = unpaidBills.filter((bill) => {
    const due = getDateValue(bill);
    return due && due < todayKey;
  });

  const upcomingBills = unpaidBills.filter((bill) => {
    const dueDate = getDateValue(bill);
    if (!dueDate) return false;

    const due = new Date(`${dueDate}T00:00:00`);
    const now = new Date(`${todayKey}T00:00:00`);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysLeft >= 0 && daysLeft <= 14;
  });

  const unpaidBillsTotal = unpaidBills.reduce(
    (sum, bill) => sum + getNumber(bill, ["amount", "total_amount", "bill_amount"]),
    0,
  );

  const upcomingBillsTotal = upcomingBills.reduce(
    (sum, bill) => sum + getNumber(bill, ["amount", "total_amount", "bill_amount"]),
    0,
  );

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

  const payrollRecordDue = data.payrollRecords
    .filter((record) => {
      const status = normalize(getText(record, ["status", "release_status", "payroll_status"], "active"));

      if (
        status.includes("void") ||
        status.includes("cancel") ||
        status.includes("returned") ||
        status.includes("draft")
      ) {
        return false;
      }

      if (
        status.includes("partial") ||
        status.includes("partially") ||
        status.includes("locked") ||
        status.includes("approved") ||
        status.includes("registered") ||
        status.includes("for release") ||
        status.includes("manager_review")
      ) {
        return true;
      }

      if (status.includes("released") && !status.includes("partial")) return false;

      return true;
    })
    .reduce((sum, record) => {
      const savedRemaining = getNumber(record, [
        "remaining_balance",
        "remaining_amount",
        "remaining_pay",
        "remaining_net_pay",
        "net_remaining",
        "amount_remaining",
        "balance",
        "remaining",
      ]);

      if (savedRemaining > 0) return sum + savedRemaining;

      const netPay = getNumber(record, [
        "net_pay",
        "net_amount",
        "net_salary",
        "total_net_pay",
        "payable_amount",
      ]);

      const released = getNumber(record, [
        "released_amount",
        "amount_released",
        "paid_amount",
        "released",
      ]);

      return sum + Math.max(netPay - released, 0);
    }, 0);

  const payrollPeriodDue = data.payrollPeriods
    .filter((period) => {
      const status = normalize(getText(period, ["status"]));

      if (
        status.includes("void") ||
        status.includes("cancel") ||
        status.includes("returned") ||
        status.includes("draft")
      ) {
        return false;
      }

      if (
        status.includes("partial") ||
        status.includes("partially") ||
        status.includes("registered") ||
        status.includes("locked") ||
        status.includes("approved") ||
        status.includes("for release") ||
        status.includes("manager_review")
      ) {
        return true;
      }

      if (status.includes("released") && !status.includes("partial")) return false;

      return false;
    })
    .reduce((sum, period) => {
      const savedRemaining = getNumber(period, [
        "remaining_balance",
        "remaining_amount",
        "remaining_net_pay",
        "remaining_payroll",
        "balance",
      ]);

      if (savedRemaining > 0) return sum + savedRemaining;

      const total = getNumber(period, ["total_net_pay", "payroll_total", "total_amount"]);
      const released = getNumber(period, ["released_amount", "amount_released", "paid_amount"]);

      return sum + Math.max(total - released, 0);
    }, 0);

  const payrollDue = payrollRecordDue > 0 ? payrollRecordDue : payrollPeriodDue;

  const readyForPayments =
    realtimeAvailableMoney - upcomingBillsTotal - payrollDue;

  const readyForPaymentsIsShort = readyForPayments < 0;
  const readyForPaymentsIsLow = readyForPayments >= 0 && readyForPayments < 50000;
  const readyForPaymentsLabel = readyForPaymentsIsShort
    ? `SHORT ${formatPeso(Math.abs(readyForPayments))}`
    : formatPeso(readyForPayments);
  const readyForPaymentsMood = readyForPaymentsIsShort
    ? "danger"
    : readyForPaymentsIsLow
      ? "warning"
      : "safe";

  const drawerVarianceRows = data.cashDrawers
    .map((drawer) => {
      const savedVariance = drawer.variance ?? drawer.cash_variance ?? null;
      const actual = getNumber(drawer, ["actual_cash", "actual_amount"]);
      const expected = getNumber(drawer, ["expected_cash", "expected_amount"]);
      const variance =
        savedVariance !== null && savedVariance !== undefined
          ? Number(savedVariance || 0)
          : actual - expected;

      return {
        id: getText(drawer, ["id"]),
        holder: getText(drawer, ["holder_name", "cashier_name", "employee_name"], "Cash Holder"),
        variance,
      };
    })
    .filter((drawer) => Math.abs(drawer.variance) > 0.009);

  const attentionItems = [
    ...(readyForPayments < 0
      ? [
          {
            tone: "danger",
            title: "Payment shortfall risk",
            message: `Realtime available money is short by ${formatPeso(Math.abs(readyForPayments))} after upcoming bills, payroll, and pending liquidation.`,
          },
        ]
      : []),
    ...(overdueBills.length > 0
      ? [
          {
            tone: "danger",
            title: `${overdueBills.length} overdue bill(s)`,
            message: `Review Finance Bills before new non-essential expenses.`,
          },
        ]
      : []),
    ...(pendingLiquidations.length > 0
      ? [
          {
            tone: "warning",
            title: `${pendingLiquidations.length} pending liquidation(s)`,
            message: `${formatPeso(pendingLiquidationTotal)} released cash still needs liquidation or returned change.`,
          },
        ]
      : []),
    ...(drawerVarianceRows.length > 0
      ? [
          {
            tone: "warning",
            title: `${drawerVarianceRows.length} drawer variance record(s)`,
            message: `Total drawer variance needs review before final financial reporting.`,
          },
        ]
      : []),
    ...(apartmentReceivable > 0
      ? [
          {
            tone: "info",
            title: "Apartment receivable",
            message: `${formatPeso(apartmentReceivable)} still collectible from apartment accounts.`,
          },
        ]
      : []),
  ];

  const topAttention = attentionItems.slice(0, 5);

  const executiveGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const currentDrawerHolder =
    getText(activeOpenDrawer || undefined, ["holder_name", "cashier_name", "employee_name", "opened_by"]) ||
    "No open drawer";

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="EXECUTIVE / DASHBOARD" />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
        <style jsx global>{`
          @keyframes opscore-danger-heartbeat {
            0% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5);
              background: #fef2f2;
            }
            16% {
              transform: scale(1.018);
              box-shadow: 0 0 0 12px rgba(220, 38, 38, 0.16);
              background: #fee2e2;
            }
            30% {
              transform: scale(1);
              box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25);
              background: #fef2f2;
            }
            46% {
              transform: scale(1.014);
              box-shadow: 0 0 0 18px rgba(220, 38, 38, 0.08);
              background: #fee2e2;
            }
            72% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
              background: #fef2f2;
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
              background: #fef2f2;
            }
          }

          @keyframes opscore-warning-breathe {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.22);
              background: #fffbeb;
            }
            50% {
              box-shadow: 0 0 0 12px rgba(217, 119, 6, 0.08);
              background: #fef3c7;
            }
          }

          @keyframes opscore-blink-dot {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.3;
              transform: scale(0.7);
            }
          }

          .opscore-ready-danger {
            animation: opscore-danger-heartbeat 1.45s ease-in-out infinite;
          }

          .opscore-ready-warning {
            animation: opscore-warning-breathe 3s ease-in-out infinite;
          }

          .opscore-blink-dot {
            animation: opscore-blink-dot 0.9s ease-in-out infinite;
          }
        `}</style>
        <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              EXECUTIVE
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Executive Dashboard
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              {executiveGreeting}, {loggedInUser}. Walk-in/direct comes from Cash Management and approved historical import. OTA comes from Booking.com/Airbnb payout imports.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="min-w-[145px]">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Historical Range
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
              onClick={resetRange}
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

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Realtime Money â€¢ Current Open Drawer
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Available Money
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
                Based only on the current open Cash Management drawer: {currentDrawerHolder}.
                This section is not affected by the historical date range.
              </p>
            </div>

            <ReadyForPaymentsPanel
              mood={readyForPaymentsMood}
              label={readyForPaymentsLabel}
              availableMoney={formatPeso(realtimeAvailableMoney)}
              upcomingBills={formatPeso(upcomingBillsTotal)}
              payrollDue={formatPeso(payrollDue)}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <HeroMoneyCard
              title="Available Money"
              value={formatPeso(realtimeAvailableMoney)}
              helper="Realtime cash + GCash + bank + terminal"
              icon={<Wallet size={22} />}
              highlight
            />
            <SmallMoneyCard title="Cash On Hand" value={formatPeso(realtimeCash)} icon={<Banknote size={20} />} />
            <SmallMoneyCard title="GCash" value={formatPeso(realtimeGCash)} icon={<CreditCard size={20} />} />
            <SmallMoneyCard title="Bank" value={formatPeso(realtimeBank)} icon={<Landmark size={20} />} />
            <SmallMoneyCard title="Terminal" value={formatPeso(realtimeTerminal)} icon={<CreditCard size={20} />} />
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Historical Performance â€¢ {getActiveRangeLabel()}
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Cash-Based Income and Outflows
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Walk-in/direct comes from Cash Management plus approved historical import. Restaurant uses Cash Management plus Restaurant Sales import while POS is not live. OTA is from actual Booking.com/Airbnb payout imports. Cloudbeds balances are not used here.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DecisionCard
              title="Cash-Based Income"
              value={formatPeso(totalCashBasedIncome)}
              helper="Cash Management + sales imports + OTA net payouts"
              icon={<TrendingUp size={22} />}
              tone="success"
            />
            <DecisionCard
              title="Cash Out"
              value={formatPeso(historicalCashOut)}
              helper="Expense releases and cash advances in range"
              icon={<Banknote size={22} />}
              tone="warning"
            />
            <DecisionCard
              title="OTA Net Payout"
              value={formatPeso(otaNetPayout)}
              helper="Booking.com + Airbnb actual payout imports"
              icon={<CalendarClock size={22} />}
              tone="info"
            />
            <DecisionCard
              title="Apartment Receivable"
              value={formatPeso(apartmentReceivable)}
              helper="Open balances from apartment bills"
              icon={<Building2 size={22} />}
              tone="info"
            />
          </div>
        </section>

        <section className="mb-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Revenue Sources
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Where money came from
                </h2>
              </div>
              <span className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">
                Range based
              </span>
            </div>

            <div className="space-y-3">
              {revenueSources.map((item) => (
                <SourceLine key={item.label} label={item.label} value={formatPeso(item.value)} />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Obligations
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  What to prepare for
                </h2>
              </div>
              <ShieldCheck className="text-slate-500" size={22} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ObligationBox title="Unpaid Bills" value={formatPeso(unpaidBillsTotal)} helper={`${unpaidBills.length} bill(s)`} />
              <ObligationBox title="Due in 14 Days" value={formatPeso(upcomingBillsTotal)} helper={`${upcomingBills.length} upcoming`} />
              <ObligationBox title="Payroll Due" value={formatPeso(payrollDue)} helper="Registered / locked payroll" />
              <ObligationBox title="Employee Receivables" value={formatPeso(employeeBalanceTotal)} helper={`Cash advance ${formatPeso(cashAdvanceTotal)} owed back`} />
              <ObligationBox title="Pending Liquidation" value={formatPeso(pendingLiquidationTotal)} helper={`${pendingLiquidations.length} current drawer item(s)`} />
              <ObligationBox title="Open Drawer" value={activeOpenDrawerId ? "1" : "0"} helper={currentDrawerHolder} />
            </div>
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <AlertTriangle size={22} className="text-amber-600" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Attention Required
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  What needs action
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {topAttention.length > 0 ? (
                topAttention.map((item, index) => (
                  <AttentionItem key={`${item.title}-${index}`} item={item} />
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-700">
                  No urgent action required.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                Executive Brief
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                30-second owner view
              </h2>
            </div>

            <div className="space-y-3 text-sm font-semibold leading-6 text-slate-600">
              <BriefLine text={`Realtime available money is ${formatPeso(realtimeAvailableMoney)} from the current open drawer.`} />
              <BriefLine text={`Ready for payments status is ${readyForPaymentsMood.toUpperCase()} at ${readyForPaymentsLabel}.`} />
              <BriefLine text={`Walk-in/direct sales for this range total ${formatPeso(walkinDirectSales)} from Cash Management plus approved historical import.`} />
              <BriefLine text={`OTA payouts imported for this range total ${formatPeso(otaNetPayout)}: Booking.com ${formatPeso(bookingComPayout)}, Airbnb ${formatPeso(airbnbPayout)}.`} />
              <BriefLine text={`Payroll due is ${formatPeso(payrollDue)} based on remaining payroll records or payroll periods.`} />
              <BriefLine text={`Bills due soon total ${formatPeso(upcomingBillsTotal)}. Pending liquidation is monitored separately under obligations.`} />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
              Last updated: {loading ? "Loading..." : lastUpdated || "-"}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function ReadyForPaymentsPanel({
  mood,
  label,
  availableMoney,
  upcomingBills,
  payrollDue,
  
}: {
  mood: "safe" | "warning" | "danger";
  label: string;
  availableMoney: string;
  upcomingBills: string;
  payrollDue: string;
}) {
  const isDanger = mood === "danger";
  const isWarning = mood === "warning";

  const shellClass = isDanger
    ? "opscore-ready-danger border-red-300 bg-red-50 text-red-800"
    : isWarning
      ? "opscore-ready-warning border-amber-300 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  const dotClass = isDanger
    ? "bg-red-600 opscore-blink-dot"
    : isWarning
      ? "bg-amber-500"
      : "bg-emerald-500";

  const statusLabel = isDanger ? "CRITICAL" : isWarning ? "LOW BUFFER" : "SAFE";

  return (
    <div className={`rounded-3xl border px-6 py-5 text-right shadow-sm transition-all duration-300 ${shellClass}`}>
      <div className="flex items-center justify-end gap-2">
        <span className={`h-3 w-3 rounded-full ${dotClass}`} />
        <p className="text-[11px] font-black uppercase tracking-[0.24em]">
          Ready For Payments â€¢ {statusLabel}
        </p>
      </div>

      <p className="mt-2 text-4xl font-black tracking-tight xl:text-5xl">
        {label}
      </p>

      <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] opacity-80">
Available money less upcoming bills and payroll
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-left text-[11px] font-bold">
        <div className="rounded-2xl border border-white/70 bg-white/60 px-3 py-2">
          <p className="uppercase tracking-[0.14em] opacity-70">Available</p>
          <p className="mt-1 text-sm font-black">{availableMoney}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/60 px-3 py-2">
          <p className="uppercase tracking-[0.14em] opacity-70">Bills</p>
          <p className="mt-1 text-sm font-black">-{upcomingBills}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/60 px-3 py-2">
          <p className="uppercase tracking-[0.14em] opacity-70">Payroll</p>
          <p className="mt-1 text-sm font-black">-{payrollDue}</p>
        </div>
      </div>
    </div>
  );
}

function HeroMoneyCard({
  title,
  value,
  helper,
  icon,
  highlight,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        highlight
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 md:col-span-2 xl:col-span-1"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/70">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] opacity-80">
        {title}
      </p>
      <p className="mt-2 break-words text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{helper}</p>
    </div>
  );
}

function SmallMoneyCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
        {icon}
      </div>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 break-words text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function DecisionCard({
  title,
  value,
  helper,
  icon,
  tone,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone: "success" | "warning" | "info";
}) {
  const iconClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${iconClass}`}>
        {icon}
      </div>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 break-words text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function SourceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ObligationBox({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 break-words text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

function AttentionItem({ item }: { item: any }) {
  const className =
    item.tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : item.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${className}`}>
      <p className="text-sm font-black">{item.title}</p>
      <p className="mt-1 text-xs font-bold leading-5">{item.message}</p>
    </div>
  );
}

function BriefLine({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      {text}
    </div>
  );
}





