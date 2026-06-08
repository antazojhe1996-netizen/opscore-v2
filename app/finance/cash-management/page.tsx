"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";

export default function CashManagementPage() {
  /// STATES - DATABASE DATA
  const [movements, setMovements] = useState<any[]>([]);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [expenseSubcategories, setExpenseSubcategories] = useState<any[]>([]);

  /// STATES - DRAWER
  const today = new Date().toISOString().split("T")[0];

  const [drawerHolder, setDrawerHolder] = useState("");
  const [openingFloat, setOpeningFloat] = useState("");
  const [drawerRemarks, setDrawerRemarks] = useState("");
  const [actualClosingCash, setActualClosingCash] = useState("");
  const [closeRemarks, setCloseRemarks] = useState("");
  const [closingRemittanceAmount, setClosingRemittanceAmount] = useState("");
  const [closingRemittanceReceivedBy, setClosingRemittanceReceivedBy] = useState("");
  const [closingRemittanceRemarks, setClosingRemittanceRemarks] = useState("");

  /// STATES - CASH MOVEMENT FORM
  const [businessDate, setBusinessDate] = useState(today);
  const [movementType, setMovementType] = useState("Cash In");
  const [source, setSource] = useState("Room Sales");
  const [paymentType, setPaymentType] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [fromPerson, setFromPerson] = useState("");
  const [toPerson, setToPerson] = useState("");
  const [encodedBy, setEncodedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  /// STATES - CASH EXPENSE DIRECT POSTING
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [expenseDepartment, setExpenseDepartment] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseReleasedTo, setExpenseReleasedTo] = useState("");

  /// STATES - CASH ADVANCE DIRECT POSTING
  const [cashAdvanceEmployeeId, setCashAdvanceEmployeeId] = useState("");
  const [cashAdvancePurpose, setCashAdvancePurpose] = useState("");

  /// STATES - FILTERS
  const [dateFilter, setDateFilter] = useState(today);
  const [ledgerDateScope, setLedgerDateScope] = useState("TODAY");
  const [historyDateScope, setHistoryDateScope] = useState("ALL");
  const [historyDateFilter, setHistoryDateFilter] = useState(today);
  const [historyHolderFilter, setHistoryHolderFilter] = useState("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [holderFilter, setHolderFilter] = useState("AUTO");
  const [searchTerm, setSearchTerm] = useState("");

  /// STATES - SYSTEM
  const [isSaving, setIsSaving] = useState(false);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showCloseDrawer, setShowCloseDrawer] = useState(false);
  const [showDrawerHolderSettings, setShowDrawerHolderSettings] = useState(false);
  const [drawerHolderSearch, setDrawerHolderSearch] = useState("");
  const [authorizedDrawerHolders, setAuthorizedDrawerHolders] = useState<string[]>([]);
  const [drawerHolderSettingsLoaded, setDrawerHolderSettingsLoaded] = useState(false);

  /// DATA - OPTIONS
  const movementTypes = [
    "Opening Float",
    "Cash In",
    "Cash Out",
    "Remittance",
    "Adjustment",
  ];

  const sourceOptions = [
    "Room Sales",
    "Restaurant Sales",
    "Apartment Collection",
    "Expense Release",
    "Cash Advance",
    "Owner Withdrawal",
    "Bank Deposit",
    "Petty Cash",
    "Other",
  ];

  const paymentTypes = ["Cash", "GCash", "Bank", "Terminal"];

  const fallbackExpenseCategories = [
    "Food",
    "Beverages",
    "Housekeeping",
    "Maintenance",
    "Laundry",
    "Frontdesk",
    "Pool Maintenance",
    "Gas Vehicle/RFID",
    "Sanitary",
    "Employee Salary",
    "Cash Advance",
    "Supplies",
    "Other",
  ];

  const fallbackSubcategories: Record<string, string[]> = {
    Food: ["Market", "Grocery", "Kitchen Ingredients", "Staff Meal", "Other"],
    Beverages: ["Soft Drinks", "Beer", "Liquor", "Coffee", "Other"],
    Housekeeping: ["Laundry", "Linen", "Amenities", "Cleaning Supplies", "Other"],
    Maintenance: ["Aircon", "Electrical", "Plumbing", "Room Repair", "Tools", "Other"],
    Laundry: ["Guest Linen", "Staff Uniform", "Towels", "Other"],
    Frontdesk: ["Office Supplies", "Printing", "Guest Supplies", "Other"],
    "Pool Maintenance": ["Chemicals", "Cleaning", "Equipment", "Other"],
    "Gas Vehicle/RFID": ["Gasoline", "RFID", "Parking", "Vehicle Repair", "Other"],
    Sanitary: ["Garbage", "Pest Control", "Disinfection", "Other"],
    "Employee Salary": ["Salary Release", "Allowance", "Other"],
    Supplies: ["Office Supplies", "Hotel Supplies", "Kitchen Supplies", "Other"],
    Other: ["Other"],
  };

  const expenseDepartments = [
    "Front Office",
    "Housekeeping",
    "Maintenance",
    "Kitchen",
    "Restaurant",
    "Sports Bar",
    "Admin",
    "Payroll",
    "Operations",
    "Other",
  ];

  /// CALCULATIONS - ACTIVE DRAWER
  const activeDrawer = drawers.find((drawer) => drawer.status === "OPEN");

  const effectiveHolderFilter =
    holderFilter === "AUTO" ? activeDrawer?.holder_name || "ALL" : holderFilter;

  const isUuid = (value: any) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim()
    );

  const getEmployeePayrollId = (employee: any) => {
    const possibleIds = [
      employee?.id,
      employee?.employee_id,
      employee?.employee_uuid,
      employee?.profile_id,
      employee?.user_id,
    ];

    return String(possibleIds.find((value) => isUuid(value)) || "");
  };

  const getEmployeeFullName = (employee: any) =>
    `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();

  const allEmployeeNames = employees
    .map((employee) => getEmployeeFullName(employee))
    .filter(Boolean);

  const drawerHolderOptions = employees.filter((employee) =>
    authorizedDrawerHolders.includes(getEmployeeFullName(employee))
  );

  const filteredDrawerHolderSettingEmployees = employees.filter((employee) => {
    const fullName = getEmployeeFullName(employee);
    const search = drawerHolderSearch.toLowerCase();

    return (
      fullName.toLowerCase().includes(search) ||
      String(employee.department || "").toLowerCase().includes(search) ||
      String(employee.position || "").toLowerCase().includes(search)
    );
  });

  const toggleAuthorizedDrawerHolder = (name: string) => {
    if (!name) return;

    setAuthorizedDrawerHolders((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name].sort((a, b) => a.localeCompare(b))
    );
  };

  const isCashAdvanceCashOut =
    movementType === "Cash Out" && paymentType === "Cash" && source === "Cash Advance";

  const isCashExpenseCashOut =
    movementType === "Cash Out" &&
    paymentType === "Cash" &&
    source === "Expense Release";

  const shouldCreateExpenseFromCashOut = isCashExpenseCashOut || isCashAdvanceCashOut;

  // CASH DRAWER APPROVAL GATE V1
  // Money IN records immediately. Money OUT goes to Manager Approval Center first.
  const isCashDrawerMoneyOut =
    paymentType === "Cash" &&
    (movementType === "Cash Out" ||
      source === "Owner Withdrawal" ||
      source === "Bank Deposit" ||
      movementType === "Adjustment");

  const getCashApprovalRequestType = () => {
    if (isCashAdvanceCashOut) return "CASH_ADVANCE_RELEASE";
    if (isCashExpenseCashOut) return "CASH_EXPENSE_RELEASE";
    if (source === "Owner Withdrawal") return "OWNER_WITHDRAWAL";
    if (source === "Bank Deposit") return "BANK_DEPOSIT";
    if (movementType === "Adjustment") return "ADJUSTMENT_OUT";
    return "CASH_DRAWER_OUT";
  };

  const selectedCashAdvanceEmployee = employees.find(
    (employee) => String(getEmployeePayrollId(employee)) === String(cashAdvanceEmployeeId)
  );

  const cashAdvanceEmployeeName = selectedCashAdvanceEmployee
    ? getEmployeeFullName(selectedCashAdvanceEmployee)
    : "";

  const getPayrollPeriodCoveringDate = (dateValue: string) => {
    if (!dateValue) return null;

    return (
      payrollPeriods.find(
        (period) =>
          String(period.start_date || "") <= dateValue &&
          String(period.end_date || "") >= dateValue
      ) || null
    );
  };

  const activePayrollPeriod = getPayrollPeriodCoveringDate(businessDate);

  const activePayrollLabel = activePayrollPeriod
    ? `${activePayrollPeriod.period_name || "Payroll Period"} (${activePayrollPeriod.start_date} to ${activePayrollPeriod.end_date})`
    : `No Draft/Reopened payroll period covers ${businessDate || "selected date"}`;

  const expenseCategoryOptions =
    expenseCategories.length > 0
      ? expenseCategories
          .map((category) => category.name || category.category_name || category.label)
          .filter(Boolean)
      : fallbackExpenseCategories;

  const selectedExpenseCategoryRecord = expenseCategories.find(
    (item) =>
      String(item.name || item.category_name || item.label || "") ===
      String(expenseCategory || "")
  );

  const databaseSubcategoryOptions = expenseSubcategories
    .filter((item) => {
      if (!expenseCategory) return false;

      if (item.category_id && selectedExpenseCategoryRecord?.id) {
        return String(item.category_id) === String(selectedExpenseCategoryRecord.id);
      }

      return String(item.category || "") === String(expenseCategory || "");
    })
    .map((item) => item.name || item.subcategory_name || item.label)
    .filter(Boolean);

  const expenseSubcategoryOptions =
    databaseSubcategoryOptions.length > 0
      ? databaseSubcategoryOptions
      : fallbackSubcategories[expenseCategory] || [];

  /// CALCULATIONS - BASE MOVEMENTS
  const drawerScopedMovements = useMemo(() => {
    if (activeDrawer) {
      return movements.filter((item) => item.cash_drawer_id === activeDrawer.id);
    }

    if (ledgerDateScope === "ALL") {
      return movements;
    }

    if (ledgerDateScope === "TODAY") {
      return movements.filter((item) => item.business_date === today);
    }

    return movements.filter((item) => item.business_date === dateFilter);
  }, [movements, activeDrawer, ledgerDateScope, dateFilter, today]);

  const activeDrawerMovements = useMemo(() => {
    if (!activeDrawer) return [];

    return movements.filter(
      (item) => String(item.cash_drawer_id || "") === String(activeDrawer.id || "")
    );
  }, [movements, activeDrawer]);

  const operationalMovements = activeDrawer ? activeDrawerMovements : [];

  /// CALCULATIONS - LEDGER FILTERED MOVEMENTS
  const filteredMovements = useMemo(() => {
    return drawerScopedMovements.filter((item) => {
      const matchesType =
        typeFilter === "ALL" ? true : item.movement_type === typeFilter;

      const matchesPayment =
        paymentFilter === "ALL"
          ? true
          : (item.payment_type || "Cash") === paymentFilter;

      const matchesHolder =
        effectiveHolderFilter === "ALL"
          ? true
          : item.from_person === effectiveHolderFilter ||
            item.to_person === effectiveHolderFilter ||
            item.encoded_by === effectiveHolderFilter;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(item.source || "").toLowerCase().includes(search) ||
        String(item.from_person || "").toLowerCase().includes(search) ||
        String(item.to_person || "").toLowerCase().includes(search) ||
        String(item.encoded_by || "").toLowerCase().includes(search) ||
        String(item.remarks || "").toLowerCase().includes(search);

      return matchesType && matchesPayment && matchesHolder && matchesSearch;
    });
  }, [
    drawerScopedMovements,
    typeFilter,
    paymentFilter,
    effectiveHolderFilter,
    searchTerm,
  ]);

  /// CALCULATIONS - CASH ONLY MOVEMENTS
  const cashOnlyMovements = operationalMovements.filter(
    (item) => (item.payment_type || "Cash") === "Cash"
  );

  const cashInTotal = cashOnlyMovements
    .filter(
      (item) =>
        item.movement_type === "Opening Float" ||
        item.movement_type === "Cash In" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) > 0)
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const cashOutTotal = cashOnlyMovements
    .filter(
      (item) =>
        item.movement_type === "Cash Out" ||
        item.source === "Bank Deposit" ||
        item.source === "Owner Withdrawal" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0)
    )
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  const remittanceTotal = cashOnlyMovements
    .filter((item) => item.movement_type === "Remittance")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const activeDrawerCash = cashInTotal - cashOutTotal - remittanceTotal;
  const cashOnHand = cashInTotal - cashOutTotal - remittanceTotal;

  /// CALCULATIONS - DIGITAL / NON-CASH FUNDS
  const gcashTotal = operationalMovements
    .filter((item) => (item.payment_type || "Cash") === "GCash")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const bankTotal = operationalMovements
    .filter(
      (item) =>
        (item.payment_type || "Cash") === "Bank" ||
        item.source === "Bank Deposit"
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const terminalTotal = operationalMovements
    .filter((item) => (item.payment_type || "Cash") === "Terminal")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  /// CALCULATIONS - DRAWER HISTORY CASH-ONLY LOGIC
  const getDrawerCashSummary = (drawer: any) => {
    const drawerMovements = movements.filter(
      (item) => String(item.cash_drawer_id || "") === String(drawer.id || "")
    );

    const cashMovements = drawerMovements.filter(
      (item) => (item.payment_type || "Cash") === "Cash"
    );

    const cashIn = cashMovements
      .filter(
        (item) =>
          item.movement_type === "Opening Float" ||
          item.movement_type === "Cash In" ||
          (item.movement_type === "Adjustment" && Number(item.amount || 0) > 0)
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const cashOut = cashMovements
      .filter(
        (item) =>
          item.movement_type === "Cash Out" ||
          item.source === "Owner Withdrawal" ||
          (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0)
      )
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const closingRemittance = cashMovements
      .filter(
        (item) =>
          item.movement_type === "Remittance" &&
          (item.source === "Drawer Closing Remittance" ||
            item.reference_type === "drawer_closing_remittance")
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const manualRemittance = cashMovements
      .filter(
        (item) =>
          item.movement_type === "Remittance" &&
          item.source !== "Drawer Closing Remittance" &&
          item.reference_type !== "drawer_closing_remittance"
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Full-remittance policy:
    // Variance is based on how much cash was actually turned over to the receiver.
    // Remaining cash is shown for transparency, but it does not make the drawer balanced.
    // Bank, GCash, and Terminal payments are intentionally excluded from drawer cash.
    const expectedBeforeClosingRemittance = cashIn - cashOut - manualRemittance;
    const actualCash = Number(drawer.actual_cash || 0);
    const variance =
      String(drawer.status || "").toUpperCase() === "CLOSED"
        ? closingRemittance - expectedBeforeClosingRemittance
        : 0;
    const remainingCashAfterRemittance = actualCash - closingRemittance;

    return {
      cashIn,
      cashOut,
      manualRemittance,
      closingRemittance,
      totalRemittance: manualRemittance + closingRemittance,
      expectedBeforeClosingRemittance,
      actualCash,
      variance,
      remainingCashAfterRemittance,
    };
  };

  const filteredDrawers = useMemo(() => {
    return drawers.filter((drawer) => {
      const drawerDate = String(drawer.opened_at || drawer.created_at || "").slice(0, 10);
      const matchesDate =
        historyDateScope === "ALL"
          ? true
          : historyDateScope === "TODAY"
          ? drawerDate === today
          : drawerDate === historyDateFilter;

      const matchesHolder =
        historyHolderFilter === "ALL"
          ? true
          : String(drawer.holder_name || "") === historyHolderFilter;

      const matchesStatus =
        historyStatusFilter === "ALL"
          ? true
          : String(drawer.status || "").toUpperCase() === historyStatusFilter;

      return matchesDate && matchesHolder && matchesStatus;
    });
  }, [drawers, historyDateScope, historyDateFilter, historyHolderFilter, historyStatusFilter, today]);

  /// FUNCTIONS - FORMATTERS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateTime = (value: any) => {
    if (!value) return "-";
    return String(value).slice(0, 16).replace("T", " ");
  };

  const getMovementStyle = (type: string) => {
    if (type === "Opening Float") return "bg-blue-500/10 text-blue-400";
    if (type === "Cash In") return "bg-emerald-500/10 text-emerald-400";
    if (type === "Cash Out") return "bg-red-500/10 text-red-400";
    if (type === "Remittance") return "bg-amber-500/10 text-amber-400";
    if (type === "Adjustment") return "bg-purple-500/10 text-purple-400";
    return "bg-slate-700 text-slate-300";
  };

  const getPaymentStyle = (payment: string) => {
    if (payment === "Cash") return "bg-emerald-500/10 text-emerald-400";
    if (payment === "GCash") return "bg-purple-500/10 text-purple-400";
    if (payment === "Bank") return "bg-blue-500/10 text-blue-400";
    if (payment === "Terminal") return "bg-sky-500/10 text-sky-400";
    return "bg-slate-700 text-slate-300";
  };

  /// FUNCTIONS - GET DATA
  const getCashMovements = async () => {
    const { data, error } = await supabase
      .from("finance_cash_movements")
      .select("*")
      .order("business_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET CASH MOVEMENTS ERROR:", error.message);
      return;
    }

    setMovements(data || []);
  };

  const getDrawers = async () => {
    const { data, error } = await supabase
      .from("finance_cash_drawers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET DRAWERS ERROR:", error.message);
      return;
    }

    setDrawers(data || []);
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("payroll_active", true)
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
      return;
    }

    setEmployees(data || []);
  };

  const getPayrollPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .in("status", ["Draft", "Reopened"])
      .order("start_date", { ascending: true });

    if (error) {
      console.log("GET PAYROLL PERIODS ERROR:", error.message);
      setPayrollPeriods([]);
      return;
    }

    setPayrollPeriods(data || []);
  };

  const fetchPayrollPeriodForDate = async (dateValue: string) => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .lte("start_date", dateValue)
      .gte("end_date", dateValue)
      .in("status", ["Draft", "Reopened"])
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("FETCH PAYROLL PERIOD FOR DATE ERROR:", error.message);
      return null;
    }

    return data;
  };

  const getExpenseCategories = async () => {
    const { data: categoriesData, error: categoryError } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true });

    if (!categoryError) {
      setExpenseCategories(categoriesData || []);
    } else {
      console.log("GET EXPENSE CATEGORIES ERROR:", categoryError.message);
      setExpenseCategories([]);
    }

    const { data: subcategoryData, error: subcategoryError } = await supabase
      .from("expense_subcategories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!subcategoryError) {
      setExpenseSubcategories(subcategoryData || []);
    } else {
      console.log("GET EXPENSE SUBCATEGORIES ERROR:", subcategoryError.message);
      setExpenseSubcategories([]);
    }
  };

  /// FUNCTIONS - RESET
  const resetForm = () => {
    setBusinessDate(today);
    setMovementType("Cash In");
    setSource("Room Sales");
    setPaymentType("Cash");
    setAmount("");
    setFromPerson("");
    setToPerson("");
    setEncodedBy("");
    setRemarks("");
    setExpenseCategory("");
    setExpenseSubcategory("");
    setExpenseDepartment("");
    setExpenseDescription("");
    setExpenseReleasedTo("");
    setCashAdvanceEmployeeId("");
    setCashAdvancePurpose("");
  };

  const resetDrawerForm = () => {
    setDrawerHolder("");
    setOpeningFloat("");
    setDrawerRemarks("");
    setActualClosingCash("");
    setCloseRemarks("");
    setClosingRemittanceAmount("");
    setClosingRemittanceReceivedBy("");
    setClosingRemittanceRemarks("");
  };

  /// FUNCTIONS - PRINT REPORT
  const printDrawerReport = (drawer: any, customSummary?: any) => {
    const escapeHtml = (value: any) =>
      String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const reportMovements = movements.filter(
      (item) => String(item.cash_drawer_id || "") === String(drawer.id || "")
    );

    const hasClosingRemittance = reportMovements.some(
      (item) =>
        item.movement_type === "Remittance" &&
        (item.source === "Drawer Closing Remittance" ||
          item.reference_type === "drawer_closing_remittance")
    );

    const syntheticClosingRemittance =
      Number(customSummary?.remittance_amount || 0) > 0 && !hasClosingRemittance
        ? [
            {
              id: "closing-remittance-preview",
              business_date: today,
              movement_type: "Remittance",
              source: "Drawer Closing Remittance",
              payment_type: "Cash",
              amount: Number(customSummary?.remittance_amount || 0),
              from_person: drawer.holder_name,
              to_person: customSummary?.received_by || "-",
              encoded_by: drawer.holder_name,
              remarks: closingRemittanceRemarks.trim() || "Closing remittance",
              reference_type: "drawer_closing_remittance",
            },
          ]
        : [];

    const allReportMovements = [...reportMovements, ...syntheticClosingRemittance];

    const sum = (rows: any[]) =>
      rows.reduce((total, item) => total + Number(item.amount || 0), 0);

    const absSum = (rows: any[]) =>
      rows.reduce((total, item) => total + Math.abs(Number(item.amount || 0)), 0);

    const byPayment = (payment: string) =>
      allReportMovements.filter((item) => (item.payment_type || "Cash") === payment);

    const cashRows = byPayment("Cash");
    const gcashRows = byPayment("GCash");
    const bankRows = byPayment("Bank");
    const terminalRows = byPayment("Terminal");

    const cashInRows = cashRows.filter(
      (item) => item.movement_type === "Opening Float" || item.movement_type === "Cash In"
    );

    const openingFloatRows = cashRows.filter(
      (item) => item.movement_type === "Opening Float"
    );

    const cashSalesRows = cashRows.filter((item) => item.movement_type === "Cash In");

    const cashOutRows = cashRows.filter(
      (item) =>
        item.movement_type === "Cash Out" ||
        item.source === "Owner Withdrawal" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0)
    );

    const closingRemittanceRows = cashRows.filter(
      (item) =>
        item.movement_type === "Remittance" &&
        (item.source === "Drawer Closing Remittance" ||
          item.reference_type === "drawer_closing_remittance")
    );

    const manualRemittanceRows = cashRows.filter(
      (item) =>
        item.movement_type === "Remittance" &&
        item.source !== "Drawer Closing Remittance" &&
        item.reference_type !== "drawer_closing_remittance"
    );

    const openingFloat =
      openingFloatRows.length > 0 ? sum(openingFloatRows) : Number(drawer.opening_float || 0);
    const cashSales = sum(cashSalesRows);
    const cashExpenses = absSum(cashOutRows);
    const manualRemittance = sum(manualRemittanceRows);
    const closingRemittance = sum(closingRemittanceRows);
    const expectedCash = Number(
      customSummary?.expected_cash ?? openingFloat + cashSales - cashExpenses - manualRemittance
    );
    const actualCash = Number(customSummary?.actual_cash ?? drawer.actual_cash ?? 0);
    const remainingCash = Number(
      customSummary?.remaining_cash_after_remittance ?? actualCash - closingRemittance
    );
    // Full-remittance policy for owner report:
    // Expected Cash must be fully remitted. Any amount left unremitted becomes variance.
    // Never trust saved drawer.variance here because older/legacy drawers may still store
    // the old actual-count-based variance. Always recalculate from the remitted amount.
    const variance = Number(closingRemittance - expectedCash);
    const varianceStatus =
      Math.abs(variance) < 0.01 ? "BALANCED" : variance < 0 ? "SHORT" : "OVER";

    const cashCollections = cashSales;
    const gcashCollections = sum(gcashRows.filter((item) => item.movement_type === "Cash In"));
    const bankCollections = sum(bankRows.filter((item) => item.movement_type === "Cash In"));
    const terminalCollections = sum(
      terminalRows.filter((item) => item.movement_type === "Cash In")
    );
    const totalCollections = cashCollections + gcashCollections + bankCollections + terminalCollections;

    const salesRows = allReportMovements.filter((item) => item.movement_type === "Cash In");
    const roomSales = sum(salesRows.filter((item) => item.source === "Room Sales"));
    const restaurantSales = sum(salesRows.filter((item) => item.source === "Restaurant Sales"));
    const apartmentCollections = sum(
      salesRows.filter((item) => item.source === "Apartment Collection")
    );
    const otherSales = Math.max(
      sum(salesRows) - roomSales - restaurantSales - apartmentCollections,
      0
    );
    const totalSales = roomSales + restaurantSales + apartmentCollections + otherSales;

    const manualCashExpenses = absSum(
      cashOutRows.filter(
        (item) =>
          item.source !== "Expense Release" &&
          item.source !== "Cash Advance" &&
          item.source !== "Owner Withdrawal" &&
          item.source !== "Bank Deposit"
      )
    );
    const expenseReleases = absSum(cashOutRows.filter((item) => item.source === "Expense Release"));
    const cashAdvances = absSum(cashOutRows.filter((item) => item.source === "Cash Advance"));
    const ownerWithdrawals = absSum(cashOutRows.filter((item) => item.source === "Owner Withdrawal"));
    const bankDeposits = absSum(cashOutRows.filter((item) => item.source === "Bank Deposit"));
    const otherExpenses = Math.max(
      cashExpenses - manualCashExpenses - expenseReleases - cashAdvances - ownerWithdrawals - bankDeposits,
      0
    );
    const totalExpenses =
      manualCashExpenses + expenseReleases + cashAdvances + ownerWithdrawals + bankDeposits + otherExpenses;

    const businessDate =
      customSummary?.business_date || String(drawer.opened_at || drawer.created_at || today).slice(0, 10);
    const generatedAt = formatDateTime(new Date().toISOString());
    const receivedBy =
      customSummary?.received_by || closingRemittanceRows[0]?.to_person || "-";
    const preparedBy = drawer.holder_name || "-";
    const managementRemarks =
      customSummary?.remarks || drawer.remarks || closeRemarks || drawer.drawerRemarks || "-";

    const formatPlainMoney = (value: any) => formatMoney(value).replace("₱-", "(₱") + (Number(value || 0) < 0 ? ")" : "");

    const line = (label: string, value: any, bold = false, negative = false) => `
      <div class="line ${bold ? "bold" : ""}">
        <span>${escapeHtml(label)}</span>
        <strong class="${negative ? "negative" : ""}">${formatPlainMoney(value)}</strong>
      </div>
    `;

    const transactionRows = allReportMovements
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.business_date || "-")}</td>
            <td>${escapeHtml(item.movement_type || "-")}</td>
            <td>${escapeHtml(item.source || "-")}</td>
            <td>${escapeHtml(item.payment_type || "Cash")}</td>
            <td>${escapeHtml(item.from_person || "-")}</td>
            <td>${escapeHtml(item.to_person || "-")}</td>
            <td>${escapeHtml(item.encoded_by || "-")}</td>
            <td class="amount">${formatMoney(item.amount)}</td>
            <td>${escapeHtml(item.remarks || "-")}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Daily Cash Drawer Report</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #f3f4f6;
              font-size: 11px;
            }
            .print-btn {
              position: fixed;
              top: 10px;
              right: 10px;
              z-index: 10;
              background: #111827;
              color: white;
              border: 0;
              border-radius: 8px;
              padding: 10px 14px;
              font-weight: 800;
              cursor: pointer;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
              padding: 12mm;
              page-break-after: always;
            }
            .page:last-child { page-break-after: auto; }
            .header {
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 12px;
              align-items: start;
              border-bottom: 3px solid #111827;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .brand { font-size: 25px; font-weight: 900; letter-spacing: -0.04em; }
            .sub { margin-top: 4px; font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
            .muted { color: #4b5563; font-size: 10px; margin-top: 4px; }
            .report-title { text-align: right; font-size: 22px; font-weight: 900; letter-spacing: .02em; }
            .status { margin-top: 6px; font-size: 11px; font-weight: 900; }
            .status.balanced { color: #047857; }
            .status.short { color: #b91c1c; }
            .status.over { color: #b45309; }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 10px;
            }
            .info {
              border-left: 4px solid #d4af37;
              background: #f9fafb;
              padding: 8px 9px;
              min-height: 46px;
            }
            .label { font-size: 8px; font-weight: 900; color: #374151; letter-spacing: .12em; text-transform: uppercase; }
            .value { margin-top: 5px; font-size: 13px; font-weight: 900; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .box {
              border: 1px solid #d1d5db;
              padding: 9px 10px;
              margin-bottom: 10px;
              break-inside: avoid;
            }
            .box h3 {
              margin: 0 0 7px;
              font-size: 11px;
              letter-spacing: .22em;
              text-transform: uppercase;
              border-bottom: 2px solid #111827;
              padding-bottom: 5px;
            }
            .line {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              padding: 4px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .line.bold { font-weight: 900; border-top: 2px solid #111827; margin-top: 4px; padding-top: 6px; }
            .line strong { white-space: nowrap; }
            .negative { color: #b91c1c; }
            .remarks {
              min-height: 40px;
              border: 1px solid #d1d5db;
              padding: 8px 10px;
              margin: 8px 0 16px;
            }
            .remarks-title { font-size: 9px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; color: #374151; margin-bottom: 5px; }
            .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 24px; }
            .sig { text-align: center; border-top: 1px solid #111827; padding-top: 6px; font-size: 10px; }
            .sig strong { display: block; font-size: 11px; }
            .footer { position: relative; margin-top: 36px; display:flex; justify-content:space-between; color:#4b5563; font-size:9px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th { background: #111827; color: white; text-align: left; padding: 6px 5px; text-transform: uppercase; font-size: 7.5px; letter-spacing: .06em; }
            td { border-bottom: 1px solid #e5e7eb; padding: 6px 5px; vertical-align: top; }
            .amount { text-align: right; font-weight: 900; white-space: nowrap; }
            .note {
              border: 1px solid #bfdbfe;
              background: #eff6ff;
              color: #1e3a8a;
              padding: 8px 10px;
              margin-bottom: 10px;
              font-size: 9.5px;
              line-height: 1.45;
            }
            @media print {
              body { background: white; }
              .print-btn { display: none; }
              .page { margin: 0; width: auto; min-height: auto; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>

          <section class="page">
            <div class="header">
              <div>
                <div class="brand">Vincent Resort Hotel</div>
                <div class="sub">Operations Finance Control</div>
                <div class="muted">Generated: ${escapeHtml(generatedAt)}</div>
              </div>
              <div>
                <div class="report-title">DAILY CASH DRAWER REPORT</div>
                <div class="muted">Business Date: ${escapeHtml(businessDate)}</div>
                <div class="muted">Report Status: ${escapeHtml(customSummary?.status || drawer.status || "OPEN")}</div>
                <div class="status ${varianceStatus.toLowerCase()}">${escapeHtml(varianceStatus)}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info"><div class="label">Drawer Holder</div><div class="value">${escapeHtml(drawer.holder_name || "-")}</div></div>
              <div class="info"><div class="label">Opened</div><div class="value">${escapeHtml(formatDateTime(drawer.opened_at))}</div></div>
              <div class="info"><div class="label">Closed</div><div class="value">${escapeHtml(formatDateTime(customSummary?.closed_at || drawer.closed_at))}</div></div>
              <div class="info"><div class="label">Received By</div><div class="value">${escapeHtml(receivedBy)}</div></div>
            </div>

            <div class="grid-2">
              <div class="box">
                <h3>Cash Reconciliation</h3>
                ${line("Opening Float", openingFloat)}
                ${line("Add: Cash Sales", cashSales)}
                ${line("Less: Cash Expenses / Releases", -cashExpenses, false, true)}
                ${manualRemittance > 0 ? line("Less: Manual Remittance", -manualRemittance, false, true) : ""}
                ${line("Expected Cash", expectedCash, true)}
                ${line("Actual Cash Counted", actualCash)}
                ${line("Remitted", closingRemittance)}
                ${line("Remaining Cash", remainingCash)}
                ${line(varianceStatus, variance, true, variance < 0)}
              </div>

              <div>
                <div class="box">
                  <h3>Collection Summary</h3>
                  ${line("Cash Sales", cashCollections)}
                  ${line("GCash Sales", gcashCollections)}
                  ${line("Bank Transfer", bankCollections)}
                  ${line("Terminal / Card", terminalCollections)}
                  ${line("Total Collections", totalCollections, true)}
                </div>
                <div class="box">
                  <h3>Remittance Summary</h3>
                  ${line("Remitted Amount", closingRemittance)}
                  ${line("Received By", 0).replace(/<strong[^>]*>.*<\/strong>/, `<strong>${escapeHtml(receivedBy)}</strong>`)}
                  ${line("Remaining Cash", remainingCash, true)}
                </div>
              </div>
            </div>

            <div class="grid-2">
              <div class="box">
                <h3>Sales Summary</h3>
                ${line("Room Sales", roomSales)}
                ${line("Restaurant Sales", restaurantSales)}
                ${line("Apartment Collection", apartmentCollections)}
                ${line("Other Sales", otherSales)}
                ${line("Total Sales", totalSales, true)}
              </div>

              <div class="box">
                <h3>Expense Summary</h3>
                ${line("Manual Cash Expenses", manualCashExpenses)}
                ${line("Expense Releases", expenseReleases)}
                ${line("Cash Advances", cashAdvances)}
                ${line("Owner Withdrawal", ownerWithdrawals)}
                ${line("Bank Deposit", bankDeposits)}
                ${line("Other Expenses", otherExpenses)}
                ${line("Total Expenses", totalExpenses, true)}
              </div>
            </div>

            <div class="note">
              Cash drawer rule: only physical cash movements are included in Expected Cash. Full remittance is required. Variance is based on Expected Cash minus actual cash remitted. Bank, GCash, and Terminal collections are shown for reference only.
            </div>

            <div class="remarks">
              <div class="remarks-title">Management Remarks</div>
              ${escapeHtml(managementRemarks)}
            </div>

            <div class="signatures">
              <div class="sig"><strong>${escapeHtml(preparedBy)}</strong>Prepared By / Cashier</div>
              <div class="sig"><strong>${escapeHtml(receivedBy)}</strong>Received By</div>
              <div class="sig"><strong>Management</strong>Checked / Approved By</div>
            </div>

            <div class="footer">
              <span>OpsCore Executive Finance Report</span>
              <span>Page 1 - Executive Summary</span>
            </div>
          </section>

          <section class="page">
            <div class="header">
              <div>
                <div class="brand">Vincent Resort Hotel</div>
                <div class="sub">Cashier Shift Transaction Details</div>
              </div>
              <div>
                <div class="report-title">TRANSACTION REPORT</div>
                <div class="muted">Business Date: ${escapeHtml(businessDate)}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Date</th><th>Type</th><th>Source</th><th>Payment</th><th>From</th><th>Received By</th><th>Encoded By</th><th>Amount</th><th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${transactionRows || `<tr><td colspan="10" style="text-align:center; padding: 24px;">No linked drawer movements found. This may be a legacy drawer record.</td></tr>`}
              </tbody>
            </table>
            <div class="footer">
              <span>OpsCore Executive Finance Report</span>
              <span>Page 2 - Transaction Details</span>
            </div>
          </section>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=1100");

    if (!printWindow) {
      alert("Popup blocked. Please allow popups for this site.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  };

  /// FUNCTIONS - OPEN DRAWER
  const openDrawer = async () => {
    if (isSaving) return;

    if (activeDrawer) {
      alert("There is already an open drawer.");
      return;
    }

    if (!drawerHolder || !openingFloat) {
      alert("Please select drawer holder and opening float.");
      return;
    }

    if (!authorizedDrawerHolders.includes(drawerHolder)) {
      alert("This employee is not authorized in Drawer Holder Settings.");
      return;
    }

    setIsSaving(true);

    const { data: drawerData, error: drawerError } = await supabase
      .from("finance_cash_drawers")
      .insert({
        holder_name: drawerHolder,
        opening_float: Number(openingFloat || 0),
        status: "OPEN",
        remarks: drawerRemarks.trim(),
      })
      .select()
      .single();

    if (drawerError) {
      setIsSaving(false);
      console.log("OPEN DRAWER ERROR:", drawerError.message);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Cash Management",
        action: "Open Drawer Failed",
        description: `Failed to open drawer for ${drawerHolder}. Error: ${drawerError.message}`,
        severity: "critical",
        newValue: {
          holder: drawerHolder,
          openingFloat: Number(openingFloat || 0),
          remarks: drawerRemarks.trim(),
          error: drawerError.message,
        },
      });

      alert("Failed to open drawer.");
      return;
    }

    const { error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        business_date: today,
        movement_type: "Opening Float",
        source: "Petty Cash",
        payment_type: "Cash",
        amount: Number(openingFloat || 0),
        from_person: "",
        to_person: drawerHolder,
        encoded_by: drawerHolder,
        remarks: drawerRemarks.trim() || "Opening drawer float",
        cash_drawer_id: drawerData.id,
      });

    setIsSaving(false);

    if (movementError) {
      console.log("OPEN DRAWER MOVEMENT ERROR:", movementError.message);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Cash Management",
        action: "Open Drawer Movement Failed",
        description: `Drawer opened for ${drawerHolder}, but opening float movement failed. Error: ${movementError.message}`,
        severity: "critical",
        recordId: drawerData.id,
        newValue: {
          drawer: drawerData,
          movementError: movementError.message,
        },
      });

      alert("Drawer opened, but opening float movement failed.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Cash Management",
      action: "Open Drawer",
      description: `${drawerHolder} opened cash drawer with float ${formatMoney(openingFloat)}`,
      severity: "warning",
      recordId: drawerData.id,
      newValue: {
        drawerId: drawerData.id,
        holder: drawerHolder,
        openingFloat: Number(openingFloat || 0),
        remarks: drawerRemarks.trim(),
      },
    });

    resetDrawerForm();
    setShowOpenDrawer(false);
    setHolderFilter("AUTO");
    await getDrawers();
    await getCashMovements();
  };

  /// FUNCTIONS - CLOSE DRAWER
  const closeDrawer = async () => {
    if (isSaving) return;

    if (!activeDrawer) {
      alert("No active drawer to close.");
      return;
    }

    if (!actualClosingCash) {
      alert("Please enter actual closing cash.");
      return;
    }

    const actualCashValue = Number(actualClosingCash || 0);
    const remittanceValue = Number(closingRemittanceAmount || 0);
    const receiverName = closingRemittanceReceivedBy.trim();

    if (actualCashValue < 0) {
      alert("Actual closing cash cannot be negative.");
      return;
    }

    if (remittanceValue < 0) {
      alert("Remittance amount cannot be negative.");
      return;
    }

    if (remittanceValue > 0 && !receiverName) {
      alert("Please enter who received the remittance.");
      return;
    }

    if (remittanceValue > actualCashValue) {
      alert("Remittance cannot be greater than actual cash counted.");
      return;
    }

    const drawerExpectedCash = activeDrawerCash;
    // Full-remittance policy:
    // The drawer is balanced only when the amount remitted equals the expected physical cash.
    // Actual count is still recorded for audit, and any unremitted cash is shown as remaining.
    const drawerVariance = remittanceValue - drawerExpectedCash;
    const remainingCashAfterRemittance = actualCashValue - remittanceValue;
    const closedAt = new Date().toISOString();

    setIsSaving(true);

    let remittanceMovementData: any = null;

    if (remittanceValue > 0) {
      const { data: remittanceData, error: remittanceError } = await supabase
        .from("finance_cash_movements")
        .insert({
          business_date: today,
          movement_type: "Remittance",
          source: "Drawer Closing Remittance",
          payment_type: "Cash",
          amount: remittanceValue,
          from_person: activeDrawer.holder_name,
          to_person: receiverName,
          encoded_by: activeDrawer.holder_name,
          remarks:
            closingRemittanceRemarks.trim() ||
            `Auto remittance during drawer closing. Remaining cash after remittance: ${formatMoney(remainingCashAfterRemittance)}`,
          reference_type: "drawer_closing_remittance",
          reference_id: activeDrawer.id,
          cash_drawer_id: activeDrawer.id,
        })
        .select()
        .single();

      if (remittanceError) {
        setIsSaving(false);
        console.log("CLOSING REMITTANCE ERROR:", remittanceError.message);

        await createAuditLog({
          userName: "OPSCORE USER",
          module: "Cash Management",
          action: "Closing Remittance Failed",
          description: `Failed to save closing remittance for ${activeDrawer.holder_name}. Error: ${remittanceError.message}`,
          severity: "critical",
          recordId: activeDrawer.id,
          oldValue: activeDrawer,
          newValue: {
            remittanceAmount: remittanceValue,
            receivedBy: receiverName,
            error: remittanceError.message,
          },
        });

        alert("Failed to save drawer remittance. Drawer was not closed.");
        return;
      }

      remittanceMovementData = remittanceData;
    }

    const closingRemarksText = [
      closeRemarks.trim() || activeDrawer.remarks || "",
      remittanceValue > 0
        ? `Remitted ${formatMoney(remittanceValue)} to ${receiverName}. Remaining cash after remittance: ${formatMoney(remainingCashAfterRemittance)}.`
        : "No remittance recorded during drawer closing.",
      closingRemittanceRemarks.trim()
        ? `Remittance remarks: ${closingRemittanceRemarks.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const { error } = await supabase
      .from("finance_cash_drawers")
      .update({
        status: "CLOSED",
        closed_at: closedAt,
        expected_cash: drawerExpectedCash,
        actual_cash: actualCashValue,
        variance: drawerVariance,
        remarks: closingRemarksText,
      })
      .eq("id", activeDrawer.id);

    setIsSaving(false);

    if (error) {
      console.log("CLOSE DRAWER ERROR:", error.message);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Cash Management",
        action: "Close Drawer Failed",
        description: `Failed to close drawer for ${activeDrawer.holder_name}. Error: ${error.message}`,
        severity: "critical",
        recordId: activeDrawer.id,
        oldValue: activeDrawer,
        newValue: {
          expectedCash: drawerExpectedCash,
          actualCash: actualCashValue,
          variance: drawerVariance,
          remittanceAmount: remittanceValue,
          receivedBy: receiverName,
          remainingCashAfterRemittance,
          remittanceMovement: remittanceMovementData,
          error: error.message,
        },
      });

      alert("Remittance was saved, but drawer close failed. Check drawer status and audit log.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Cash Management",
      action: remittanceValue > 0 ? "Close Drawer With Remittance" : "Close Drawer",
      description: remittanceValue > 0
        ? `${activeDrawer.holder_name} closed drawer and remitted ${formatMoney(remittanceValue)} to ${receiverName}. Expected ${formatMoney(drawerExpectedCash)}, actual ${formatMoney(actualCashValue)}, variance ${formatMoney(drawerVariance)}`
        : `${activeDrawer.holder_name} closed drawer. Expected ${formatMoney(drawerExpectedCash)}, actual ${formatMoney(actualCashValue)}, variance ${formatMoney(drawerVariance)}`,
      severity: Math.abs(drawerVariance) >= 500 ? "critical" : "warning",
      recordId: activeDrawer.id,
      oldValue: activeDrawer,
      newValue: {
        status: "CLOSED",
        closedAt,
        expectedCash: drawerExpectedCash,
        actualCash: actualCashValue,
        variance: drawerVariance,
        remittanceAmount: remittanceValue,
        receivedBy: receiverName || null,
        remainingCashAfterRemittance,
        remittanceMovement: remittanceMovementData,
        remarks: closingRemarksText,
      },
    });

    printDrawerReport(activeDrawer, {
      ...activeDrawer,
      closed_at: closedAt,
      status: "CLOSED",
      expected_cash: drawerExpectedCash,
      actual_cash: actualCashValue,
      variance: drawerVariance,
      remittance_amount: remittanceValue,
      received_by: receiverName,
      remaining_cash_after_remittance: remainingCashAfterRemittance,
    });

    resetDrawerForm();
    setShowCloseDrawer(false);
    await getCashMovements();
    await getDrawers();
  };

  /// FUNCTIONS - SAVE CASH MOVEMENT
  const saveMovement = async () => {
    if (isSaving) return;

    if (!businessDate || !movementType || !source || !paymentType || !amount) {
      alert("Please complete date, type, source, payment type, and amount.");
      return;
    }

    const amountValue = Number(amount);

    if (amountValue <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    if (shouldCreateExpenseFromCashOut && !activeDrawer) {
      alert("Please open a drawer first before releasing a cash expense.");
      return;
    }

    if (isCashAdvanceCashOut && !cashAdvanceEmployeeId) {
      alert("Please select employee for cash advance.");
      return;
    }

    if (isCashAdvanceCashOut && !selectedCashAdvanceEmployee) {
      alert("Selected employee is invalid. Please re-select employee.");
      return;
    }

    const targetPayrollPeriod = isCashAdvanceCashOut
      ? await fetchPayrollPeriodForDate(businessDate)
      : null;

    if (isCashAdvanceCashOut && !targetPayrollPeriod) {
      alert(`No Draft/Reopened payroll period covers ${businessDate}. Create or reopen the correct cutoff first.`);
      return;
    }

    if (isCashExpenseCashOut && !expenseCategory) {
      alert("Please select expense category.");
      return;
    }

    if (isCashExpenseCashOut && expenseSubcategoryOptions.length > 0 && !expenseSubcategory) {
      alert("Please select expense subcategory.");
      return;
    }

    if (isCashExpenseCashOut && !expenseDepartment) {
      alert("Please select expense department / area.");
      return;
    }

    if (isCashExpenseCashOut && !expenseDescription.trim()) {
      alert("Please enter expense description.");
      return;
    }

    const autoFrom =
      paymentType === "Cash" && !fromPerson.trim()
        ? activeDrawer?.holder_name || ""
        : fromPerson.trim();

    const autoTo = isCashAdvanceCashOut
      ? cashAdvanceEmployeeName
      : isCashExpenseCashOut
      ? expenseReleasedTo.trim()
      : paymentType === "Cash" && !toPerson.trim()
      ? activeDrawer?.holder_name || ""
      : toPerson.trim();

    const autoEncoded = encodedBy.trim() || activeDrawer?.holder_name || "System";

    if (
      paymentType === "Cash" &&
      (movementType === "Cash In" || movementType === "Opening Float") &&
      !autoTo
    ) {
      alert("Please open a drawer or enter who received/holds the cash.");
      return;
    }

    if (paymentType === "Cash" && movementType === "Cash Out" && !autoFrom) {
      alert("Please open a drawer or enter who released the cash.");
      return;
    }

    if (
      paymentType === "Cash" &&
      movementType === "Remittance" &&
      (!autoFrom || !toPerson.trim())
    ) {
      alert("Please enter remitted by and received by.");
      return;
    }

    setIsSaving(true);

    const movementRemarks = isCashAdvanceCashOut
      ? `Cash Advance - ${cashAdvanceEmployeeName}${
          cashAdvancePurpose.trim() ? ` - ${cashAdvancePurpose.trim()}` : ""
        }${remarks.trim() ? ` - ${remarks.trim()}` : ""}`
      : isCashExpenseCashOut
      ? `${expenseDescription.trim()}${remarks.trim() ? ` - ${remarks.trim()}` : ""}`
      : remarks.trim();

    if (isCashDrawerMoneyOut) {
      const requestType = getCashApprovalRequestType();

      const approvalPayload = {
        business_date: businessDate,
        movement_type: movementType,
        source,
        payment_type: paymentType,
        amount: amountValue,
        from_person: autoFrom,
        to_person: autoTo,
        encoded_by: autoEncoded,
        remarks: movementRemarks,
        reference_type: shouldCreateExpenseFromCashOut ? "expense" : null,
        cash_drawer_id: activeDrawer?.id || null,
        should_create_expense: shouldCreateExpenseFromCashOut,
        is_cash_expense_cash_out: isCashExpenseCashOut,
        is_cash_advance_cash_out: isCashAdvanceCashOut,
        expense_category: isCashAdvanceCashOut ? "Cash Advance" : expenseCategory,
        expense_subcategory: isCashAdvanceCashOut
          ? "Cash Advance Release"
          : expenseSubcategory || null,
        expense_department: isCashAdvanceCashOut ? "Payroll" : expenseDepartment,
        expense_description: isCashAdvanceCashOut
          ? `Cash Advance - ${cashAdvanceEmployeeName}`
          : expenseDescription.trim(),
        expense_released_to: expenseReleasedTo.trim(),
        cash_advance_employee_id: isCashAdvanceCashOut ? cashAdvanceEmployeeId : null,
        cash_advance_employee_name: isCashAdvanceCashOut ? cashAdvanceEmployeeName : null,
        cash_advance_purpose: cashAdvancePurpose.trim(),
        payroll_period_id: isCashAdvanceCashOut ? targetPayrollPeriod?.id || null : null,
        payroll_period_label: isCashAdvanceCashOut
          ? targetPayrollPeriod
            ? `${targetPayrollPeriod.period_name || "Payroll Period"} (${targetPayrollPeriod.start_date} to ${targetPayrollPeriod.end_date})`
            : activePayrollLabel
          : null,
      };

      const { error: approvalError } = await supabase
        .from("approval_requests")
        .insert({
          request_type: requestType,
          module: "Cash Management",
          reference_id: activeDrawer?.id || null,
          title: `${source} - ${formatMoney(amountValue)}`,
          description: `${movementType} request by ${autoEncoded}. From: ${autoFrom || "-"}. To: ${autoTo || "-"}. ${movementRemarks || ""}`,
          requested_by: autoEncoded,
          status: "PENDING",
          request_payload: approvalPayload,
        });

      setIsSaving(false);

      if (approvalError) {
        console.log("CREATE CASH DRAWER APPROVAL ERROR:", approvalError.message);
        alert("Failed to send cash movement to Approval Center. Check approval_requests.request_payload column.");
        return;
      }

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Cash Management",
        action: "Submit Cash Drawer Approval Request",
        description: `${requestType} submitted for approval - ${formatMoney(amountValue)}`,
        severity: "warning",
        newValue: approvalPayload,
      });

      resetForm();
      await getCashMovements();
      await getDrawers();
      alert("Cash movement sent to Manager Approval Center. No drawer deduction was made yet.");
      return;
    }

    const { data: movementData, error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        business_date: businessDate,
        movement_type: movementType,
        source,
        payment_type: paymentType,
        amount: amountValue,
        from_person: autoFrom,
        to_person: autoTo,
        encoded_by: autoEncoded,
        remarks: movementRemarks,
        reference_type: shouldCreateExpenseFromCashOut ? "expense" : null,
        reference_id: null,
        cash_drawer_id: activeDrawer?.id || null,
      })
      .select()
      .single();

    if (movementError) {
      setIsSaving(false);
      console.log("SAVE CASH MOVEMENT ERROR:", movementError.message);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Cash Management",
        action: "Cash Movement Failed",
        description: `Failed to save ${movementType} ${source} - ${formatMoney(amountValue)}. Error: ${movementError.message}`,
        severity: "critical",
        newValue: {
          businessDate,
          movementType,
          source,
          paymentType,
          amount: amountValue,
          fromPerson: autoFrom,
          toPerson: autoTo,
          encodedBy: autoEncoded,
          remarks: movementRemarks,
          error: movementError.message,
        },
      });

      alert("Failed to save cash movement.");
      return;
    }

    let createdExpenseData: any = null;
    let createdBalanceData: any = null;
    let balanceCreationFailed = false;

    if (shouldCreateExpenseFromCashOut) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          expense_date: businessDate,
          category: isCashAdvanceCashOut ? "Cash Advance" : expenseCategory,
          subcategory: isCashAdvanceCashOut
            ? "Cash Advance Release"
            : expenseSubcategory || null,
          department: isCashAdvanceCashOut ? "Payroll" : expenseDepartment,
          description: isCashAdvanceCashOut
            ? `Cash Advance - ${cashAdvanceEmployeeName}`
            : expenseDescription.trim(),
          amount: amountValue,
          payment_method: "Cash",
          employee_id: isCashAdvanceCashOut ? cashAdvanceEmployeeId : null,
          employee_name: isCashAdvanceCashOut ? cashAdvanceEmployeeName : null,
          deduct_to_payroll: isCashAdvanceCashOut,
          payroll_period_id: isCashAdvanceCashOut ? targetPayrollPeriod?.id || null : null,
          remarks: isCashAdvanceCashOut
            ? `Source: Cash Drawer. Auto linked by selected date to: ${
                targetPayrollPeriod
                  ? `${targetPayrollPeriod.period_name || "Payroll Period"} (${targetPayrollPeriod.start_date} to ${targetPayrollPeriod.end_date})`
                  : activePayrollLabel
              }. ${cashAdvancePurpose.trim()}${remarks.trim() ? ` - ${remarks.trim()}` : ""}`.trim()
            : `${remarks.trim()}${
                expenseReleasedTo.trim() ? ` Released to: ${expenseReleasedTo.trim()}` : ""
              }`.trim(),
          source: isCashAdvanceCashOut ? "Cash Drawer - Cash Advance" : "Cash Drawer",
          posted_to_cash_movements: true,
          cash_movement_id: movementData.id,
          cash_posted_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (expenseError) {
        setIsSaving(false);
        console.log("AUTO CREATE EXPENSE ERROR:", expenseError.message);

        await createAuditLog({
          userName: "OPSCORE USER",
          module: "Cash Management",
          action: "Cash Movement Expense Link Failed",
          description: `Cash movement saved but expense entry failed for ${source} - ${formatMoney(amountValue)}. Error: ${expenseError.message}`,
          severity: "critical",
          recordId: movementData.id,
          newValue: {
            movement: movementData,
            error: expenseError.message,
          },
        });

        alert("Cash movement was saved, but expense entry failed. Check expenses table columns.");
        await getCashMovements();
        return;
      }

      createdExpenseData = expenseData;

      await supabase
        .from("finance_cash_movements")
        .update({ reference_id: expenseData.id })
        .eq("id", movementData.id);

      if (isCashAdvanceCashOut) {
        const cutoffLabel = targetPayrollPeriod
          ? `${targetPayrollPeriod.period_name || "Payroll Period"} (${targetPayrollPeriod.start_date} to ${targetPayrollPeriod.end_date})`
          : activePayrollLabel;

        const cashDrawerReference = [
          `Source: Cash Drawer`,
          `Cutoff: ${cutoffLabel}`,
          `Expense ID: ${expenseData.id}`,
          `Cash Movement ID: ${movementData.id}`,
          cashAdvancePurpose.trim() ? `Purpose: ${cashAdvancePurpose.trim()}` : "",
          remarks.trim() ? `Remarks: ${remarks.trim()}` : "",
        ]
          .filter(Boolean)
          .join(". ");

        const { data: balanceData, error: balanceError } = await supabase
          .from("employee_balances")
          .insert({
            employee_id: cashAdvanceEmployeeId,
            employee_name: cashAdvanceEmployeeName,
            balance_type: "Cash Advance",
            original_amount: amountValue,
            remaining_balance: amountValue,
            status: "Active",
            source_module: "Cash Drawer",
            source_id: isUuid(movementData.id) ? movementData.id : null,
            period_id: targetPayrollPeriod.id,
            remarks: cashDrawerReference,
          })
          .select()
          .single();

        if (balanceError) {
          balanceCreationFailed = true;
          console.log("AUTO CREATE CASH ADVANCE BALANCE ERROR:", balanceError.message);

          await createAuditLog({
            userName: "OPSCORE USER",
            module: "Cash Management",
            action: "Cash Advance Balance Failed",
            description: `Cash advance saved to cash movement and expenses, but employee balance failed for ${cashAdvanceEmployeeName} - ${formatMoney(amountValue)}. Error: ${balanceError.message}`,
            severity: "critical",
            recordId: movementData.id,
            newValue: {
              movement: movementData,
              expense: expenseData,
              employee: cashAdvanceEmployeeName,
              amount: amountValue,
              payrollPeriod: targetPayrollPeriod,
              error: balanceError.message,
            },
          });

          alert("Cash advance saved to cash movement and expenses, but employee balance failed.");
        } else {
          createdBalanceData = balanceData;

          await supabase
            .from("expenses")
            .update({ employee_balance_id: balanceData.id })
            .eq("id", expenseData.id);

          await supabase
            .from("payroll_periods")
            .update({ needs_regeneration: true })
            .eq("id", targetPayrollPeriod.id);
        }
      }
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Cash Management",
      action: isCashAdvanceCashOut
        ? "Cash Advance Released"
        : isCashExpenseCashOut
        ? "Cash Expense Released"
        : "Cash Movement Created",
      description: isCashAdvanceCashOut
        ? `${cashAdvanceEmployeeName} cash advance released from drawer - ${formatMoney(amountValue)}`
        : isCashExpenseCashOut
        ? `Cash expense released: ${expenseDescription.trim()} - ${formatMoney(amountValue)}`
        : `${movementType} ${source} recorded - ${formatMoney(amountValue)}`,
      severity:
        isCashAdvanceCashOut || isCashExpenseCashOut || movementType === "Cash Out" || movementType === "Adjustment"
          ? "warning"
          : "info",
      recordId: movementData.id,
      newValue: {
        movement: movementData,
        expense: createdExpenseData,
        employeeBalance: createdBalanceData,
        balanceCreationFailed,
        businessDate,
        movementType,
        source,
        paymentType,
        amount: amountValue,
        fromPerson: autoFrom,
        toPerson: autoTo,
        encodedBy: autoEncoded,
        remarks: movementRemarks,
        payrollPeriod: targetPayrollPeriod,
      },
    });

    setIsSaving(false);
    resetForm();
    await getCashMovements();
    await getDrawers();

    if (isCashAdvanceCashOut) {
      alert("Cash advance saved to Cash Drawer, Expenses, and Payroll Balances.");
      return;
    }

    if (isCashExpenseCashOut) {
      alert("Cash expense saved to Cash Drawer and Expenses.");
      return;
    }

    alert("Cash movement saved.");
  };

  /// FUNCTIONS - DELETE MOVEMENT
  const deleteMovement = async (id: string) => {
    const { data: movement, error: movementFetchError } = await supabase
      .from("finance_cash_movements")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (movementFetchError) {
      console.log("FETCH CASH MOVEMENT BEFORE DELETE ERROR:", movementFetchError.message);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Cash Management",
        action: "Delete Cash Movement Failed",
        description: `Failed to fetch cash movement before delete. Error: ${movementFetchError.message}`,
        severity: "critical",
        recordId: id,
        newValue: {
          error: movementFetchError.message,
        },
      });

      alert("Failed to check cash movement before delete.");
      return;
    }

    if (!movement) {
      alert("Cash movement not found.");
      await getCashMovements();
      return;
    }

    if (
      movement.reference_type === "drawer_closing_remittance" ||
      movement.source === "Drawer Closing Remittance"
    ) {
      alert("Drawer closing remittance is locked. Reopen or correct the drawer instead of deleting this record.");
      return;
    }

    const { data: linkedExpenseByReference } = movement.reference_id
      ? await supabase
          .from("expenses")
          .select("*")
          .eq("id", movement.reference_id)
          .maybeSingle()
      : { data: null };

    const { data: linkedExpenseByMovement } = !linkedExpenseByReference
      ? await supabase
          .from("expenses")
          .select("*")
          .eq("cash_movement_id", id)
          .maybeSingle()
      : { data: null };

    const linkedExpense = linkedExpenseByReference || linkedExpenseByMovement;

    const confirmMessage = linkedExpense
      ? `Delete this cash movement and its linked expense?

This will remove:
• Cash Movement
• Expenses Ledger entry
${
  linkedExpense.employee_balance_id || movement.source === "Cash Advance"
    ? "• Employee Balance / Payroll deduction link"
    : ""
}

Continue?`
      : "Delete this cash movement?";

    const confirmDelete = confirm(confirmMessage);
    if (!confirmDelete) return;

    setIsSaving(true);

    let linkedBalanceDeleted = false;
    let fallbackBalancesDeleted = false;

    if (linkedExpense) {
      if (linkedExpense.employee_balance_id) {
        const { error: balanceDeleteError } = await supabase
          .from("employee_balances")
          .delete()
          .eq("id", linkedExpense.employee_balance_id);

        if (balanceDeleteError) {
          setIsSaving(false);
          console.log("DELETE LINKED EMPLOYEE BALANCE ERROR:", balanceDeleteError.message);

          await createAuditLog({
            userName: "OPSCORE USER",
            module: "Cash Management",
            action: "Delete Linked Employee Balance Failed",
            description: `Failed deleting employee balance linked to cash movement ${formatMoney(movement.amount)}. Error: ${balanceDeleteError.message}`,
            severity: "critical",
            recordId: movement.id,
            oldValue: {
              movement,
              linkedExpense,
            },
            newValue: {
              error: balanceDeleteError.message,
            },
          });

          alert("Failed to delete linked employee balance.");
          return;
        }

        linkedBalanceDeleted = true;
      }

      // Safety fallback for older rows where employee_balance_id was not saved on expenses.
      const { error: fallbackBalanceError } = await supabase
        .from("employee_balances")
        .delete()
        .eq("source_module", "Cash Drawer")
        .eq("source_id", id);

      if (!fallbackBalanceError) {
        fallbackBalancesDeleted = true;
      }

      const linkedPeriodId = linkedExpense.payroll_period_id || linkedExpense.period_id;

      const { error: expenseDeleteError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", linkedExpense.id);

      if (expenseDeleteError) {
        setIsSaving(false);
        console.log("DELETE LINKED EXPENSE ERROR:", expenseDeleteError.message);

        await createAuditLog({
          userName: "OPSCORE USER",
          module: "Cash Management",
          action: "Delete Linked Expense Failed",
          description: `Failed deleting expense linked to cash movement ${formatMoney(movement.amount)}. Error: ${expenseDeleteError.message}`,
          severity: "critical",
          recordId: movement.id,
          oldValue: {
            movement,
            linkedExpense,
          },
          newValue: {
            error: expenseDeleteError.message,
          },
        });

        alert("Failed to delete linked expense entry.");
        return;
      }

      if (linkedPeriodId) {
        await supabase
          .from("payroll_periods")
          .update({ needs_regeneration: true })
          .eq("id", linkedPeriodId);
      }
    }

    const { error } = await supabase
      .from("finance_cash_movements")
      .delete()
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      console.log("DELETE CASH MOVEMENT ERROR:", error.message);

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Cash Management",
        action: "Delete Cash Movement Failed",
        description: `Linked records were checked, but failed to delete cash movement ${formatMoney(movement.amount)}. Error: ${error.message}`,
        severity: "critical",
        recordId: movement.id,
        oldValue: {
          movement,
          linkedExpense,
        },
        newValue: {
          error: error.message,
        },
      });

      alert("Linked records were checked, but failed to delete cash movement.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Cash Management",
      action: "Delete Cash Movement",
      description: linkedExpense
        ? `Deleted cash movement and linked expense: ${movement.source} - ${formatMoney(movement.amount)}`
        : `Deleted cash movement: ${movement.source} - ${formatMoney(movement.amount)}`,
      severity: "critical",
      recordId: movement.id,
      oldValue: {
        movement,
        linkedExpense,
      },
      newValue: {
        deleted: true,
        linkedExpenseDeleted: Boolean(linkedExpense),
        linkedBalanceDeleted,
        fallbackBalancesDeleted,
      },
    });

    await getCashMovements();
    await getDrawers();
    await getPayrollPeriods();

    alert(
      linkedExpense
        ? "Cash movement, linked expense, and payroll balance link were deleted."
        : "Cash movement deleted."
    );
  };

  /// EFFECTS
  useEffect(() => {
    try {
      const stored = localStorage.getItem("opscore_authorized_drawer_holders");
      const parsed = stored ? JSON.parse(stored) : [];

      setAuthorizedDrawerHolders(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.log("DRAWER HOLDER SETTINGS LOAD ERROR:", error);
      setAuthorizedDrawerHolders([]);
    } finally {
      setDrawerHolderSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!drawerHolderSettingsLoaded) return;

    localStorage.setItem(
      "opscore_authorized_drawer_holders",
      JSON.stringify(authorizedDrawerHolders)
    );
  }, [authorizedDrawerHolders, drawerHolderSettingsLoaded]);

  useEffect(() => {
    if (drawerHolder && !authorizedDrawerHolders.includes(drawerHolder)) {
      setDrawerHolder("");
    }
  }, [authorizedDrawerHolders, drawerHolder]);

  useEffect(() => {
    getCashMovements();
    getDrawers();
    getEmployees();
    getPayrollPeriods();
    getExpenseCategories();
  }, []);

  /// UI
  return (
    <PageGuard moduleKey="cash_management">
      <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Finance Control
            </p>
            <h1 className="mt-2 text-3xl font-bold">Cash Management</h1>
            <p className="mt-2 text-sm text-slate-400">
              Open drawer, track cash movement, release cash expenses, post cash advances, and require drawer remittance during closing.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDrawerHolderSettings(true)}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:border-sky-400 hover:text-sky-300"
            >
              Drawer Holder Settings
            </button>

            {activeDrawer && (
              <button
                onClick={() => printDrawerReport(activeDrawer)}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-600"
              >
                Print Report
              </button>
            )}

            {!activeDrawer && (
              <button
                onClick={() => setShowOpenDrawer(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500"
              >
                Open Drawer
              </button>
            )}

            {activeDrawer && (
              <button
                onClick={() => setShowCloseDrawer(true)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500"
              >
                Close Drawer
              </button>
            )}
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          {activeDrawer ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="Active Drawer Holder" value={activeDrawer.holder_name} color="text-amber-400" />
              <SummaryCard title="Opening Float" value={formatMoney(activeDrawer.opening_float)} color="text-blue-400" />
              <SummaryCard title="Drawer Cash" value={formatMoney(activeDrawerCash)} color="text-emerald-400" />
              <SummaryCard title="Status" value="OPEN" color="text-emerald-400" />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <h2 className="text-xl font-bold text-amber-400">No Active Drawer</h2>
              <p className="mt-1 text-sm text-slate-300">
                Open a drawer first before releasing cash expenses or cash advances.
              </p>
            </div>
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Cash On Hand After Remittance" value={formatMoney(cashOnHand)} color="text-emerald-400" />
          <SummaryCard title="GCash / Digital" value={formatMoney(gcashTotal)} color="text-purple-400" />
          <SummaryCard title="Bank" value={formatMoney(bankTotal)} color="text-blue-400" />
          <SummaryCard title="Terminal" value={formatMoney(terminalTotal)} color="text-sky-400" />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <SummaryCard title="Cash In" value={formatMoney(cashInTotal)} color="text-blue-400" />
          <SummaryCard title="Cash Out" value={formatMoney(cashOutTotal)} color="text-red-400" />
          <SummaryCard title="Cash Remitted" value={formatMoney(remittanceTotal)} color="text-amber-400" />
        </section>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Add Cash Movement</h2>

            <div className="mt-5 space-y-4">
              <input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} style={{ colorScheme: "dark" }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <select
                value={movementType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setMovementType(nextType);

                  if (nextType === "Remittance") {
                    setSource("Remittance");
                    setPaymentType("Cash");
                    return;
                  }

                  if (nextType === "Opening Float") {
                    setSource("Petty Cash");
                    setPaymentType("Cash");
                    return;
                  }

                  if (nextType === "Adjustment") {
                    setSource("Other");
                    return;
                  }

                  if (nextType === "Cash In") {
                    setSource("Room Sales");
                    return;
                  }

                  if (nextType === "Cash Out") {
                    setSource("Expense Release");
                  }
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {movementTypes.filter((type) => type !== "Remittance").map((type) => <option key={type}>{type}</option>)}
              </select>

              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {sourceOptions.map((item) => <option key={item}>{item}</option>)}
              </select>

              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                {paymentTypes.map((item) => <option key={item}>{item}</option>)}
              </select>

              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              {movementType === "Remittance" && (
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                  <p className="text-sm font-bold text-sky-300">Remittance Process</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Remittance is a custody transfer only. It reduces drawer cash but does not count as an expense or profit deduction. Enter the remitted by person in From and the receiver in To.
                  </p>
                </div>
              )}

              {shouldCreateExpenseFromCashOut && (
                <div className={`rounded-2xl border p-4 ${
                  isCashAdvanceCashOut
                    ? "border-amber-500/20 bg-amber-500/10"
                    : "border-red-500/20 bg-red-500/10"
                }`}>
                  <p className={`mb-3 text-sm font-bold ${
                    isCashAdvanceCashOut ? "text-amber-300" : "text-red-300"
                  }`}>
                    {isCashAdvanceCashOut ? "Cash Advance Details" : "Cash Expense Details"}
                  </p>

                  {isCashAdvanceCashOut ? (
                    <div className="space-y-3">
                      <select
                        value={cashAdvanceEmployeeId}
                        onChange={(e) => setCashAdvanceEmployeeId(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Select employee</option>
                        {employees.map((employee) => {
                          const payrollEmployeeId = getEmployeePayrollId(employee);

                          return (
                            <option
                              key={payrollEmployeeId || employee.id || employee.employee_no}
                              value={payrollEmployeeId}
                              disabled={!payrollEmployeeId}
                            >
                              {getEmployeeFullName(employee)}
                              {employee.employee_no ? ` - ${employee.employee_no}` : ""}
                              {!payrollEmployeeId ? " (No payroll UUID)" : ""}
                            </option>
                          );
                        })}
                      </select>

                      <div className={`rounded-xl border p-3 ${
                        activePayrollPeriod
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-red-500/30 bg-red-500/10"
                      }`}>
                        <p className={`text-xs font-black ${
                          activePayrollPeriod ? "text-emerald-300" : "text-red-300"
                        }`}>
                          {activePayrollPeriod
                            ? "✓ Auto Linked by Selected Date"
                            : "⚠ No Payroll Period for Selected Date"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">
                          {activePayrollPeriod
                            ? activePayrollLabel
                            : "Create or reopen the cutoff that covers the selected date. No manual cutoff selection needed here."}
                        </p>
                      </div>

                      <input
                        value={cashAdvancePurpose}
                        onChange={(e) => setCashAdvancePurpose(e.target.value)}
                        placeholder="Purpose / reason (optional)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      />

                      <p className="text-xs leading-5 text-amber-200">
                        No cutoff selection needed. This posts to Cash Drawer, Expenses, and Employee Balances for Payroll Register deduction.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={expenseCategory}
                        onChange={(e) => {
                          setExpenseCategory(e.target.value);
                          setExpenseSubcategory("");
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Select expense category</option>
                        {expenseCategoryOptions.map((item) => <option key={item}>{item}</option>)}
                      </select>

                      {expenseSubcategoryOptions.length > 0 && (
                        <select
                          value={expenseSubcategory}
                          onChange={(e) => setExpenseSubcategory(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                        >
                          <option value="">Select expense subcategory</option>
                          {expenseSubcategoryOptions.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      )}

                      <select value={expenseDepartment} onChange={(e) => setExpenseDepartment(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                        <option value="">Select department / area</option>
                        {expenseDepartments.map((item) => <option key={item}>{item}</option>)}
                      </select>

                      <input value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} placeholder="Expense description / purpose" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

                      <input value={expenseReleasedTo} onChange={(e) => setExpenseReleasedTo(e.target.value)} placeholder="Released to / received by" list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

                      <p className="text-xs leading-5 text-red-200">
                        This creates both Cash Movement and Expenses entry. No approval workflow.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!shouldCreateExpenseFromCashOut && (movementType === "Cash Out" || movementType === "Remittance" || movementType === "Adjustment") && (
                <input value={fromPerson} onChange={(e) => setFromPerson(e.target.value)} placeholder={activeDrawer ? `From: ${activeDrawer.holder_name}` : "From / Released by"} list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
              )}

              {!shouldCreateExpenseFromCashOut && (movementType === "Opening Float" || movementType === "Cash In" || movementType === "Remittance" || movementType === "Adjustment") && (
                <input value={toPerson} onChange={(e) => setToPerson(e.target.value)} placeholder={activeDrawer ? `To: ${activeDrawer.holder_name}` : "To / Received by / Holder"} list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
              )}

              <input value={encodedBy} onChange={(e) => setEncodedBy(e.target.value)} placeholder={activeDrawer ? `Encoded by: ${activeDrawer.holder_name}` : "Encoded by"} list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <datalist id="employee-list">
                {employees.map((employee) => (
                  <option key={employee.id} value={`${employee.first_name} ${employee.last_name}`} />
                ))}
              </datalist>

              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Remarks / reference / purpose" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <button onClick={saveMovement} disabled={isSaving} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                {isSaving ? "Saving..." : isCashAdvanceCashOut ? "Save Cash Advance" : isCashExpenseCashOut ? "Save Cash Expense" : "Save Cash Movement"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Cash Movement Ledger</h2>

            <div className="my-5 grid grid-cols-1 gap-3 md:grid-cols-5">
              <select value={ledgerDateScope} onChange={(e) => setLedgerDateScope(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="TODAY">Today</option>
                <option value="ALL">All Dates</option>
                <option value="CUSTOM">Custom Date</option>
              </select>

              {ledgerDateScope === "CUSTOM" && (
                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ colorScheme: "dark" }} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
              )}

              <select value={holderFilter} onChange={(e) => setHolderFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="AUTO">Auto Holder</option>
                <option value="ALL">All Holders</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={`${employee.first_name} ${employee.last_name}`}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
              </select>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="ALL">All Types</option>
                {movementTypes.map((type) => <option key={type}>{type}</option>)}
              </select>

              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="ALL">All Payments</option>
                {paymentTypes.map((type) => <option key={type}>{type}</option>)}
              </select>

              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
            </div>

            <div className="max-h-[700px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To / Holder</th>
                    <th className="px-4 py-3">Encoded By</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map((item) => (
                    <tr key={item.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/40">
                      <td className="px-4 py-3">{item.business_date}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getMovementStyle(item.movement_type)}`}>{item.movement_type}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStyle(item.payment_type || "Cash")}`}>{item.payment_type || "Cash"}</span></td>
                      <td className="px-4 py-3">{item.source}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.amount)}</td>
                      <td className="px-4 py-3">{item.from_person || "-"}</td>
                      <td className="px-4 py-3">{item.to_person || "-"}</td>
                      <td className="px-4 py-3">{item.encoded_by || "-"}</td>
                      <td className="px-4 py-3">{item.remarks || "-"}</td>
                      <td className="px-4 py-3">
                        {item.reference_type === "drawer_closing_remittance" || item.source === "Drawer Closing Remittance" ? (
                          <span className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                            Locked
                          </span>
                        ) : (
                          <button onClick={() => deleteMovement(item.id)} className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-semibold hover:bg-slate-500">
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-500">No cash movements found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-bold">Drawer History</h2>
              <p className="mt-1 text-xs text-slate-400">
                Uses cash-only drawer logic. Bank, GCash, and Terminal payments are excluded from expected cash.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <select value={historyDateScope} onChange={(e) => setHistoryDateScope(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="TODAY">Today</option>
                <option value="ALL">All History</option>
                <option value="CUSTOM">Custom Date</option>
              </select>

              {historyDateScope === "CUSTOM" ? (
                <input type="date" value={historyDateFilter} onChange={(e) => setHistoryDateFilter(e.target.value)} style={{ colorScheme: "dark" }} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-500">
                  {historyDateScope === "ALL" ? "All dates" : today}
                </div>
              )}

              <select value={historyHolderFilter} onChange={(e) => setHistoryHolderFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="ALL">All Holders</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={`${employee.first_name} ${employee.last_name}`}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
              </select>

              <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1250px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Holder</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Closed</th>
                  <th className="px-4 py-3 text-right">Opening</th>
                  <th className="px-4 py-3 text-right">Expected Cash</th>
                  <th className="px-4 py-3 text-right">Actual Count</th>
                  <th className="px-4 py-3 text-right">Remitted</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">PDF</th>
                </tr>
              </thead>

              <tbody>
                {filteredDrawers.map((drawer) => {
                  const summary = getDrawerCashSummary(drawer);
                  const displayActual =
                    String(drawer.status || "").toUpperCase() === "CLOSED"
                      ? summary.actualCash
                      : 0;
                  const displayRemaining =
                    String(drawer.status || "").toUpperCase() === "CLOSED"
                      ? summary.remainingCashAfterRemittance
                      : summary.expectedBeforeClosingRemittance;

                  return (
                    <tr key={drawer.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-4 py-3">{drawer.holder_name}</td>
                      <td className="px-4 py-3">{formatDateTime(drawer.opened_at)}</td>
                      <td className="px-4 py-3">{formatDateTime(drawer.closed_at)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(drawer.opening_float)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(summary.expectedBeforeClosingRemittance)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(displayActual)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(summary.closingRemittance)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(displayRemaining)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${summary.variance < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatMoney(summary.variance)}</td>
                      <td className="px-4 py-3">{drawer.status}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            printDrawerReport(drawer, {
                              ...drawer,
                              expected_cash: summary.expectedBeforeClosingRemittance,
                              actual_cash: summary.actualCash,
                              remittance_amount: summary.closingRemittance,
                              remaining_cash_after_remittance: summary.remainingCashAfterRemittance,
                              // Full-remittance policy: remitted amount minus expected cash.
                              variance: summary.closingRemittance - summary.expectedBeforeClosingRemittance,
                              received_by:
                                movements.find(
                                  (item) =>
                                    String(item.cash_drawer_id || "") === String(drawer.id || "") &&
                                    item.movement_type === "Remittance" &&
                                    (item.source === "Drawer Closing Remittance" ||
                                      item.reference_type === "drawer_closing_remittance")
                                )?.to_person || "-",
                            })
                          }
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold hover:bg-blue-500"
                        >
                          Print PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredDrawers.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-slate-500">No drawer history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showDrawerHolderSettings && (
          <Modal title="Drawer Holder Settings" onClose={() => setShowDrawerHolderSettings(false)}>
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
                <p className="text-sm font-bold text-sky-300">Authorized Cash Drawer Holders</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Only selected names will appear when opening a drawer. This keeps cash handling controlled while still allowing any approved employee from any department.
                </p>
              </div>

              <input
                value={drawerHolderSearch}
                onChange={(e) => setDrawerHolderSearch(e.target.value)}
                placeholder="Search employee, department, or position..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAuthorizedDrawerHolders(allEmployeeNames.sort((a, b) => a.localeCompare(b)))}
                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-600"
                >
                  Select All
                </button>
                <button
                  onClick={() => setAuthorizedDrawerHolders([])}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-500"
                >
                  Clear All
                </button>
                <span className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">
                  Selected: {authorizedDrawerHolders.length}
                </span>
              </div>

              <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-800">
                {filteredDrawerHolderSettingEmployees.map((employee) => {
                  const fullName = getEmployeeFullName(employee);
                  const checked = authorizedDrawerHolders.includes(fullName);

                  return (
                    <label
                      key={employee.id}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 hover:bg-slate-800/50"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{fullName}</p>
                        <p className="text-xs text-slate-400">
                          {employee.department || "No department"}
                          {employee.position ? ` • ${employee.position}` : ""}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAuthorizedDrawerHolder(fullName)}
                        className="h-4 w-4 accent-sky-500"
                      />
                    </label>
                  );
                })}

                {filteredDrawerHolderSettingEmployees.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No employees matched your search.
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDrawerHolderSettings(false)}
                className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold hover:bg-sky-500"
              >
                Save Settings
              </button>
            </div>
          </Modal>
        )}

        {showOpenDrawer && (
          <Modal title="Open Drawer" onClose={() => setShowOpenDrawer(false)}>
            <select value={drawerHolder} onChange={(e) => setDrawerHolder(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
              <option value="">Select authorized drawer holder</option>
              {drawerHolderOptions.map((employee) => (
                <option key={employee.id} value={getEmployeeFullName(employee)}>
                  {getEmployeeFullName(employee)}
                  {employee.department ? ` - ${employee.department}` : ""}
                </option>
              ))}
            </select>

            {drawerHolderOptions.length === 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
                No authorized drawer holders yet. Open Drawer Holder Settings and choose who is allowed to handle cash drawers.
              </div>
            )}

            <input type="number" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="Opening float" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

            <textarea value={drawerRemarks} onChange={(e) => setDrawerRemarks(e.target.value)} rows={3} placeholder="Opening remarks" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

            <button onClick={openDrawer} disabled={isSaving || drawerHolderOptions.length === 0} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? "Opening..." : "Open Drawer"}
            </button>
          </Modal>
        )}

        {showCloseDrawer && activeDrawer && (
          <Modal title="Close Drawer" onClose={() => setShowCloseDrawer(false)}>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-slate-300">Expected Drawer Cash</p>
              <h3 className="mt-2 text-2xl font-bold text-amber-400">
                {formatMoney(activeDrawerCash)}
              </h3>
            </div>

            <input type="number" value={actualClosingCash} onChange={(e) => setActualClosingCash(e.target.value)} placeholder="Actual cash counted before remittance" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
              <p className="text-sm font-bold text-sky-300">Drawer Remittance</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Record the cash turned over when closing the drawer. This creates an automatic Remittance movement and does not count as an expense.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  type="number"
                  value={closingRemittanceAmount}
                  onChange={(e) => setClosingRemittanceAmount(e.target.value)}
                  placeholder="Remittance amount"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />

                <input
                  value={closingRemittanceReceivedBy}
                  onChange={(e) => setClosingRemittanceReceivedBy(e.target.value)}
                  placeholder="Received by"
                  list="employee-list"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />

                <textarea
                  value={closingRemittanceRemarks}
                  onChange={(e) => setClosingRemittanceRemarks(e.target.value)}
                  rows={2}
                  placeholder="Remittance remarks / reference"
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />

                <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                    <p className="text-slate-500">Remaining after remittance</p>
                    <p className="mt-1 font-black text-emerald-300">
                      {formatMoney(Number(actualClosingCash || 0) - Number(closingRemittanceAmount || 0))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                    <p className="text-slate-500">Variance before remittance</p>
                    <p className={`mt-1 font-black ${Number(actualClosingCash || 0) - activeDrawerCash < 0 ? "text-red-300" : "text-emerald-300"}`}>
                      {formatMoney(Number(actualClosingCash || 0) - activeDrawerCash)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <textarea value={closeRemarks} onChange={(e) => setCloseRemarks(e.target.value)} rows={3} placeholder="Closing remarks / variance explanation" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

            <button onClick={closeDrawer} disabled={isSaving} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold hover:bg-red-500 disabled:opacity-50">
              {isSaving ? "Closing..." : "Save Remittance & Close Drawer"}
            </button>
          </Modal>
        )}
      </main>
      </div>
    </PageGuard>
  );
}

function SummaryCard({ title, value, color }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 break-words text-2xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600">
            Close
          </button>
        </div>

        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
