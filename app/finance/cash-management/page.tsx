// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import TopNavbar from "@/components/TopNavbar";

export default function CashManagementPage() {
  /// STATES - DATABASE DATA
  const [movements, setMovements] = useState<any[]>([]);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [expenseSubcategories, setExpenseSubcategories] = useState<any[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [cashSources, setCashSources] = useState<any[]>([]);

  /// STATES - DRAWER
  const getToday = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().split("T")[0];
  };

  const today = getToday();

  const [drawerHolder, setDrawerHolder] = useState("");
  const [openingFloat, setOpeningFloat] = useState("");
  const [drawerRemarks, setDrawerRemarks] = useState("");
  const [actualClosingCash, setActualClosingCash] = useState("");
  const [closeRemarks, setCloseRemarks] = useState("");
  const [closingRemittanceAmount, setClosingRemittanceAmount] = useState("");
  const [closingRemittanceReceivedBy, setClosingRemittanceReceivedBy] =
    useState("");
  const [closingRemittanceRemarks, setClosingRemittanceRemarks] = useState("");

  /// STATES - CASH MOVEMENT FORM
  const [businessDate, setBusinessDate] = useState(today);
  const [movementType, setMovementType] = useState("Cash In");
  const [source, setSource] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [fromPerson, setFromPerson] = useState("");
  const [toPerson, setToPerson] = useState("");
  const [encodedBy, setEncodedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [receiptStatus, setReceiptStatus] = useState("WITH_RECEIPT");
  const [noReceiptReason, setNoReceiptReason] = useState("");
  const [noReceiptExplanation, setNoReceiptExplanation] = useState("");

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
  const savingRef = useRef(false);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showCloseDrawer, setShowCloseDrawer] = useState(false);
  const [showDrawerHolderSettings, setShowDrawerHolderSettings] =
    useState(false);
  const [drawerHolderSearch, setDrawerHolderSearch] = useState("");
  const [authorizedDrawerHolders, setAuthorizedDrawerHolders] = useState<
    string[]
  >([]);
  const [drawerHolderSettingsLoaded, setDrawerHolderSettingsLoaded] =
    useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState("");
  const [currentSystemUserId, setCurrentSystemUserId] = useState("");
  const [currentEmployeeName, setCurrentEmployeeName] = useState("");
  const [currentRoleName, setCurrentRoleName] = useState("");
  const [currentCompanyId, setCurrentCompanyId] = useState("");
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState<any>(null);

  /// DATA - OPTIONS
  const movementTypes = ["Cash In", "Cash Out"];

  const sourceOptions = useMemo(() => {
    return cashSources
      .filter((item) => item?.is_active !== false)
      .map((item) => String(item?.name || item?.source_name || "").trim())
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);
  }, [cashSources]);

  const availableSourceOptions = useMemo(() => {
    if (movementType === "Cash Out") {
      return ["Expense Release", "Cash Advance"];
    }

    if (movementType === "Cash In") {
      return ["Restaurant Sales", "Room Sales"];
    }

    return [];
  }, [movementType]);

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
    Housekeeping: [
      "Laundry",
      "Linen",
      "Amenities",
      "Cleaning Supplies",
      "Other",
    ],
    Maintenance: [
      "Aircon",
      "Electrical",
      "Plumbing",
      "Room Repair",
      "Tools",
      "Other",
    ],
    Laundry: ["Guest Linen", "Staff Uniform", "Towels", "Other"],
    Frontdesk: ["Office Supplies", "Printing", "Guest Supplies", "Other"],
    "Pool Maintenance": ["Chemicals", "Cleaning", "Equipment", "Other"],
    "Gas Vehicle/RFID": [
      "Gasoline",
      "RFID",
      "Parking",
      "Vehicle Repair",
      "Other",
    ],
    Sanitary: ["Garbage", "Pest Control", "Disinfection", "Other"],
    "Employee Salary": ["Salary Release", "Allowance", "Other"],
    Supplies: [
      "Office Supplies",
      "Hotel Supplies",
      "Kitchen Supplies",
      "Other",
    ],
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

  const noReceiptReasons = [
    "Vendor Has No Receipt",
    "Receipt To Follow",
    "Emergency Purchase",
    "Transportation",
    "Lost Receipt",
    "Other",
  ];

  /// CALCULATIONS - ACTIVE DRAWER
  const activeDrawer = drawers.find((drawer) => drawer.status === "OPEN");

  /// CALCULATIONS - VOID SAFETY
  const getMovementStatus = (movement: any) =>
    String(
      movement?.status || movement?.movement_status || "ACTIVE",
    ).toUpperCase();

  const isVoidedMovement = (movement: any) =>
    getMovementStatus(movement) === "VOIDED" ||
    Boolean(movement?.voided_at) ||
    Boolean(movement?.void_reason);

  const effectiveHolderFilter =
    holderFilter === "AUTO" ? activeDrawer?.holder_name || "ALL" : holderFilter;

  const isUuid = (value: any) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim(),
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

  const getCurrentCompanyId = async () => {
    const storedCompanyId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_company_id") || ""
        : "";

    const cachedCompanyId = String(
      currentCompanyId ||
        currentEmployeeRecord?.company_id ||
        storedCompanyId ||
        "",
    ).trim();

    if (cachedCompanyId) {
      if (!currentCompanyId) setCurrentCompanyId(cachedCompanyId);
      if (typeof window !== "undefined") {
        localStorage.setItem("opscore_current_company_id", cachedCompanyId);
      }
      return cachedCompanyId;
    }

    const systemUserId = String(currentSystemUserId || "").trim();

    if (systemUserId) {
      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", systemUserId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (companyUserError) {
        console.log("GET COMPANY USER COMPANY ID ERROR:", companyUserError.message);
      }

      const companyId = String(companyUser?.company_id || "").trim();

      if (companyId) {
        setCurrentCompanyId(companyId);
        if (typeof window !== "undefined") {
          localStorage.setItem("opscore_current_company_id", companyId);
        }
        return companyId;
      }
    }

    const employeeId = String(currentEmployeeId || "").trim();

    if (!employeeId) return "";

    const { data, error } = await supabase
      .from("employees")
      .select("company_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (error) {
      console.log("GET CURRENT COMPANY ID ERROR:", error.message);
      return "";
    }

    const companyId = String(data?.company_id || "").trim();

    if (companyId) {
      setCurrentCompanyId(companyId);
      if (typeof window !== "undefined") {
        localStorage.setItem("opscore_current_company_id", companyId);
      }
    }

    return companyId;
  };

  const hasCompleteEmployeeIdentity = (employee: any) => {
    const payrollEmployeeId = getEmployeePayrollId(employee);
    const firstName = String(employee?.first_name || "").trim();
    const lastName = String(employee?.last_name || "").trim();
    const employeeNo = String(employee?.employee_no || "").trim();

    return Boolean(payrollEmployeeId && firstName && lastName && employeeNo);
  };

  const validEmployeeOptions = useMemo(() => {
    return employees
      .filter((employee) => hasCompleteEmployeeIdentity(employee))
      .sort((a, b) =>
        getEmployeeFullName(a).localeCompare(getEmployeeFullName(b)),
      );
  }, [employees]);

  const cashAdvanceEmployeeOptions = validEmployeeOptions;

  const allEmployeeNames = validEmployeeOptions
    .map((employee) => getEmployeeFullName(employee))
    .filter(Boolean);

  const drawerHolderOptions = validEmployeeOptions.filter((employee) =>
    authorizedDrawerHolders.includes(getEmployeeFullName(employee)),
  );

  const currentEmployeeRecord = validEmployeeOptions.find((employee) => {
    const employeeId = getEmployeePayrollId(employee);
    const fullName = getEmployeeFullName(employee);

    return (
      String(employeeId || "") === String(currentEmployeeId || "") ||
      String(fullName || "").toLowerCase() ===
        String(currentEmployeeName || "").toLowerCase()
    );
  });

  const currentDrawerHolderName = currentEmployeeRecord
    ? getEmployeeFullName(currentEmployeeRecord)
    : currentEmployeeName;

  const canManageDrawerForOthers = (() => {
    const roleText = String(currentRoleName || "").toLowerCase();
    const positionText = String(
      currentEmployeeRecord?.position || "",
    ).toLowerCase();
    const nameText = String(currentDrawerHolderName || "").toLowerCase();

    return (
      roleText.includes("admin") ||
      roleText.includes("finance") ||
      roleText.includes("manager") ||
      positionText.includes("manager") ||
      positionText.includes("finance") ||
      positionText.includes("owner") ||
      nameText.includes("princess") ||
      nameText.includes("jherome")
    );
  })();

  const allowedOpenDrawerHolderOptions = canManageDrawerForOthers
    ? drawerHolderOptions
    : drawerHolderOptions.filter(
        (employee) => getEmployeeFullName(employee) === currentDrawerHolderName,
      );

  const filteredDrawerHolderSettingEmployees = validEmployeeOptions.filter(
    (employee) => {
      const fullName = getEmployeeFullName(employee);
      const search = drawerHolderSearch.toLowerCase();

      return (
        fullName.toLowerCase().includes(search) ||
        String(employee.department || "")
          .toLowerCase()
          .includes(search) ||
        String(employee.position || "")
          .toLowerCase()
          .includes(search) ||
        String(employee.employee_no || "")
          .toLowerCase()
          .includes(search)
      );
    },
  );

  const toggleAuthorizedDrawerHolder = (name: string) => {
    if (!name) return;

    setAuthorizedDrawerHolders((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name].sort((a, b) => a.localeCompare(b)),
    );
  };

  const isCashAdvanceCashOut =
    movementType === "Cash Out" && source === "Cash Advance";

  const isExpenseRelease =
    movementType === "Cash Out" && source === "Expense Release";

  const isCashExpenseCashOut = isExpenseRelease && paymentType === "Cash";

  const shouldCreateExpenseFromCashOut =
    isExpenseRelease || isCashAdvanceCashOut;

  // CASH DRAWER APPROVAL GATE V1
  // Money IN records immediately. Money OUT goes to Manager Approval Center first.
  const isCashDrawerMoneyOut =
    isCashAdvanceCashOut ||
    isExpenseRelease ||
    (paymentType === "Cash" &&
      (movementType === "Cash Out" ||
        source === "Owner Withdrawal" ||
        source === "Bank Deposit"));

  const getCashApprovalRequestType = () => {
    if (isCashAdvanceCashOut) return "CASH_ADVANCE_RELEASE";
    if (isExpenseRelease) return "CASH_EXPENSE_RELEASE";
    if (source === "Owner Withdrawal") return "OWNER_WITHDRAWAL";
    if (source === "Bank Deposit") return "BANK_DEPOSIT";
    return "CASH_DRAWER_OUT";
  };

  const selectedCashAdvanceEmployee = validEmployeeOptions.find(
    (employee) =>
      String(getEmployeePayrollId(employee)) === String(cashAdvanceEmployeeId),
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
          String(period.end_date || "") >= dateValue,
      ) || null
    );
  };

  const activePayrollPeriod = getPayrollPeriodCoveringDate(businessDate);

  const activePayrollLabel = activePayrollPeriod
    ? `${activePayrollPeriod.period_name || "Payroll Period"} (${activePayrollPeriod.start_date} to ${activePayrollPeriod.end_date})`
    : `No usable payroll period covers ${businessDate || "selected date"}`;

  const cashApprovalRequests = useMemo(() => {
    return approvalRequests
      .filter((request) => {
        const requestType = String(request.request_type || "");
        const moduleName = String(request.module || "");

        return (
          moduleName === "Cash Management" ||
          requestType.includes("CASH") ||
          requestType.includes("OWNER_WITHDRAWAL") ||
          requestType.includes("BANK_DEPOSIT") ||
          requestType.includes("ADJUSTMENT")
        );
      })
      .sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || "")),
      );
  }, [approvalRequests]);

  const getApprovalStatusStyle = (status: string) => {
    const normalized = String(status || "").toUpperCase();

    if (normalized === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    if (normalized === "REJECTED") return "bg-red-50 text-red-700 ring-1 ring-red-200";
    if (normalized === "PENDING") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    if (normalized === "CANCELLED") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  };

  const expenseCategoryOptions =
    expenseCategories.length > 0
      ? expenseCategories
          .map(
            (category) =>
              category.name || category.category_name || category.label,
          )
          .filter(Boolean)
      : fallbackExpenseCategories;

  const selectedExpenseCategoryRecord = expenseCategories.find(
    (item) =>
      String(item.name || item.category_name || item.label || "") ===
      String(expenseCategory || ""),
  );

  const databaseSubcategoryOptions = expenseSubcategories
    .filter((item) => {
      if (!expenseCategory) return false;

      if (item.category_id && selectedExpenseCategoryRecord?.id) {
        return (
          String(item.category_id) === String(selectedExpenseCategoryRecord.id)
        );
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
      return movements.filter(
        (item) => item.cash_drawer_id === activeDrawer.id,
      );
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
      (item) =>
        String(item.cash_drawer_id || "") === String(activeDrawer.id || "") &&
        !isVoidedMovement(item),
    );
  }, [movements, activeDrawer]);

  const operationalMovements = activeDrawer ? activeDrawerMovements : [];

  const receiptTrackedRows = operationalMovements.filter(
    (item) =>
      !isVoidedMovement(item) &&
      item.movement_type === "Cash Out" &&
      ["Expense Release", "Cash Advance"].includes(String(item.source || "")),
  );

  const withReceiptCount = receiptTrackedRows.filter(
    (item) => getMovementReceiptInfo(item).status === "WITH_RECEIPT",
  ).length;

  const withoutReceiptCount = receiptTrackedRows.filter(
    (item) => getMovementReceiptInfo(item).status === "WITHOUT_RECEIPT",
  ).length;

  const receiptComplianceRate =
    receiptTrackedRows.length === 0
      ? 100
      : Math.round((withReceiptCount / receiptTrackedRows.length) * 100);

  const receiptComplianceTone =
    receiptComplianceRate >= 95
      ? "default"
      : receiptComplianceRate >= 80
        ? "warning"
        : "danger";

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
        String(item.source || "")
          .toLowerCase()
          .includes(search) ||
        String(item.from_person || "")
          .toLowerCase()
          .includes(search) ||
        String(item.to_person || "")
          .toLowerCase()
          .includes(search) ||
        String(item.encoded_by || "")
          .toLowerCase()
          .includes(search) ||
        String(item.remarks || "")
          .toLowerCase()
          .includes(search);

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
    (item) => (item.payment_type || "Cash") === "Cash",
  );

  const cashInTotal = cashOnlyMovements
    .filter(
      (item) =>
        item.movement_type === "Opening Float" ||
        item.movement_type === "Cash In" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) > 0),
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const cashOutTotal = cashOnlyMovements
    .filter(
      (item) =>
        item.movement_type === "Cash Out" ||
        item.source === "Bank Deposit" ||
        item.source === "Owner Withdrawal" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0),
    )
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  const remittanceTotal = cashOnlyMovements
    .filter((item) => item.movement_type === "Remittance")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const activeDrawerCash = cashInTotal - cashOutTotal - remittanceTotal;
  const cashOnHand = cashInTotal - cashOutTotal - remittanceTotal;

  /// CALCULATIONS - DIGITAL / NON-CASH FUNDS
  const getNonCashSignedAmount = (item: any) => {
    const value = Math.abs(Number(item.amount || 0));

    if (
      item.movement_type === "Cash Out" ||
      item.movement_type === "Remittance" ||
      item.source === "Expense Release" ||
      item.source === "Cash Advance" ||
      item.source === "Owner Withdrawal" ||
      item.source === "Bank Deposit" ||
      (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0)
    ) {
      return -value;
    }

    return value;
  };

  const gcashTotal = operationalMovements
    .filter((item) => (item.payment_type || "Cash") === "GCash")
    .reduce((sum, item) => sum + getNonCashSignedAmount(item), 0);

  const bankTotal = operationalMovements
    .filter(
      (item) =>
        (item.payment_type || "Cash") === "Bank" ||
        item.source === "Bank Deposit",
    )
    .reduce((sum, item) => sum + getNonCashSignedAmount(item), 0);

  const terminalTotal = operationalMovements
    .filter((item) => (item.payment_type || "Cash") === "Terminal")
    .reduce((sum, item) => sum + getNonCashSignedAmount(item), 0);

  /// CALCULATIONS - PAYMENT BALANCE GUARD
  // Guard is per payment type. Cash Out using GCash should use GCash balance,
  // not Cash on Hand. This prevents impossible negative balances while still
  // allowing online banking releases when physical cash is zero.
  const getAvailableBalanceByPaymentType = (type: string) => {
    if (type === "Cash") return cashOnHand;
    if (type === "GCash") return gcashTotal;
    if (type === "Bank") return bankTotal;
    if (type === "Terminal") return terminalTotal;
    return 0;
  };

  const isBalanceGuardedMoneyOut = (selectedMovementType = movementType) => {
    return (
      selectedMovementType === "Cash Out" ||
      source === "Expense Release" ||
      source === "Cash Advance" ||
      source === "Owner Withdrawal" ||
      source === "Bank Deposit"
    );
  };

  const getPaymentTypeLabel = (type: string) => {
    const available = getAvailableBalanceByPaymentType(type);
    const unavailable = isBalanceGuardedMoneyOut() && available <= 0;

    return `${type} (${formatMoney(available)})${unavailable ? " - Unavailable" : ""}`;
  };

  const isPaymentTypeDisabled = (type: string) => {
    if (!isBalanceGuardedMoneyOut()) return false;
    return getAvailableBalanceByPaymentType(type) <= 0;
  };

  useEffect(() => {
    if (!isBalanceGuardedMoneyOut()) return;

    if (!isPaymentTypeDisabled(paymentType)) return;

    const nextAvailablePaymentType = paymentTypes.find(
      (item) => !isPaymentTypeDisabled(item),
    );

    if (nextAvailablePaymentType) {
      setPaymentType(nextAvailablePaymentType);
    }
  }, [movementType, source, cashOnHand, gcashTotal, bankTotal, terminalTotal]);

  const drawerDisplayName =
    activeDrawer?.holder_name || currentDrawerHolderName || "Cashier";

  const drawerFirstName =
    String(drawerDisplayName || "Cashier")
      .trim()
      .split(" ")[0] || "Cashier";

  const onlineBankingTotal = gcashTotal + bankTotal + terminalTotal;

  /// CALCULATIONS - DRAWER HISTORY CASH-ONLY LOGIC
  const getDrawerCashSummary = (drawer: any) => {
    const drawerMovements = movements.filter(
      (item) =>
        String(item.cash_drawer_id || "") === String(drawer.id || "") &&
        !isVoidedMovement(item),
    );

    const cashMovements = drawerMovements.filter(
      (item) => (item.payment_type || "Cash") === "Cash",
    );

    const cashIn = cashMovements
      .filter(
        (item) =>
          item.movement_type === "Opening Float" ||
          item.movement_type === "Cash In" ||
          (item.movement_type === "Adjustment" && Number(item.amount || 0) > 0),
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const cashOut = cashMovements
      .filter(
        (item) =>
          item.movement_type === "Cash Out" ||
          item.source === "Owner Withdrawal" ||
          (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0),
      )
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const closingRemittance = cashMovements
      .filter(
        (item) =>
          item.movement_type === "Remittance" &&
          (item.source === "Drawer Closing Remittance" ||
            item.reference_type === "drawer_closing_remittance"),
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const manualRemittance = cashMovements
      .filter(
        (item) =>
          item.movement_type === "Remittance" &&
          item.source !== "Drawer Closing Remittance" &&
          item.reference_type !== "drawer_closing_remittance",
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
      const drawerDate = String(
        drawer.opened_at || drawer.created_at || "",
      ).slice(0, 10);
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
  }, [
    drawers,
    historyDateScope,
    historyDateFilter,
    historyHolderFilter,
    historyStatusFilter,
    today,
  ]);

  const totalLiquidFunds = cashOnHand + onlineBankingTotal;

  const pendingCashApprovalCount = cashApprovalRequests.filter(
    (request) => String(request.status || "").toUpperCase() === "PENDING",
  ).length;

  const todaysMovementCount = movements.filter(
    (item) => item.business_date === today && !isVoidedMovement(item),
  ).length;

  const closedDrawerVarianceRows = filteredDrawers
    .map((drawer) => {
      const summary = getDrawerCashSummary(drawer);
      return {
        drawer,
        holder: drawer.holder_name || "Cash Holder",
        variance: Number(summary.variance || 0),
        status: String(drawer.status || "").toUpperCase(),
      };
    })
    .filter((item) => item.status === "CLOSED" && Math.abs(item.variance) > 0)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  const cashHealthScore = Math.max(
    0,
    100 -
      (!activeDrawer ? 10 : 0) -
      (cashOnHand <= 0 ? 18 : 0) -
      (pendingCashApprovalCount > 0 ? 12 : 0) -
      (closedDrawerVarianceRows.length > 0 ? 18 : 0) -
      (totalLiquidFunds <= 0 ? 25 : 0),
  );

  const cashWatchStatus =
    cashHealthScore >= 85
      ? "Healthy"
      : cashHealthScore >= 70
        ? "Watch"
        : "Needs Attention";

  const cashWatchTone =
    cashHealthScore >= 85
      ? "text-emerald-300"
      : cashHealthScore >= 70
        ? "text-orange-300"
        : "text-red-300";

  const cashWatchAlerts = [
    ...(!activeDrawer ? ["No active cash drawer is open."] : []),
    ...(activeDrawer ? [`${drawerDisplayName} has an open drawer.`] : []),
    ...(cashOnHand <= 0 ? ["Physical cash balance is zero or negative."] : []),
    ...(pendingCashApprovalCount > 0
      ? [`${pendingCashApprovalCount} cash approval request(s) pending.`]
      : []),
    ...(closedDrawerVarianceRows.length > 0
      ? [
          `${closedDrawerVarianceRows.length} closed drawer(s) have variance in current history filter.`,
        ]
      : []),
    ...(onlineBankingTotal > cashOnHand && onlineBankingTotal > 0
      ? ["Most available funds are in GCash/Bank/Terminal channels."]
      : []),
  ];

  const cashWatchRecommendations = [
    ...(cashOnHand > 20000
      ? [
          "Deposit excess physical cash or remit to management before end of shift.",
        ]
      : []),
    ...(pendingCashApprovalCount > 0
      ? [
          "Review pending money-out approvals before releasing additional funds.",
        ]
      : []),
    ...(activeDrawer
      ? ["Close and print the drawer report once cash count is verified."]
      : []),
    ...(!activeDrawer
      ? ["Open the correct drawer before accepting or releasing physical cash."]
      : []),
    ...(closedDrawerVarianceRows.length > 0
      ? ["Review drawer variance reports and confirm remittance amounts."]
      : []),
    ...(onlineBankingTotal > 0
      ? [
          "Reconcile GCash, Bank, and Terminal balances against proof of payment.",
        ]
      : []),
  ].slice(0, 5);

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

  const parseAmountValue = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const receiptLabel =
    receiptStatus === "WITH_RECEIPT" ? "With Receipt" : "Without Receipt";

  const buildReceiptAuditText = () => {
    if (movementType !== "Cash Out") return "";

    if (receiptStatus === "WITH_RECEIPT") {
      return "[Receipt: WITH_RECEIPT]";
    }

    return [
      "[Receipt: WITHOUT_RECEIPT]",
      `[No Receipt Reason: ${noReceiptReason}]`,
      noReceiptExplanation.trim()
        ? `[No Receipt Explanation: ${noReceiptExplanation.trim()}]`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  const getMovementReceiptInfo = (movement: any) => {
    const remarksText = String(movement?.remarks || "");

    if (remarksText.includes("[Receipt: WITHOUT_RECEIPT]")) {
      const reasonMatch = remarksText.match(/\[No Receipt Reason: ([^\]]+)\]/);
      const explanationMatch = remarksText.match(/\[No Receipt Explanation: ([^\]]+)\]/);

      return {
        status: "WITHOUT_RECEIPT",
        label: "Without Receipt",
        reason: reasonMatch?.[1] || "No reason captured",
        explanation: explanationMatch?.[1] || "",
      };
    }

    if (remarksText.includes("[Receipt: WITH_RECEIPT]")) {
      return {
        status: "WITH_RECEIPT",
        label: "With Receipt",
        reason: "",
        explanation: "",
      };
    }

    return {
      status: "UNTRACKED",
      label: "Not Tagged",
      reason: "",
      explanation: "",
    };
  };

  const getApprovalPayload = (request: any) => {
    return request?.request_payload || request?.payload || request?.details || {};
  };

  const getApprovalAmount = (request: any) => {
    const payload = getApprovalPayload(request);
    return Number(
      request?.amount ||
        request?.request_amount ||
        payload?.amount ||
        payload?.amount_value ||
        payload?.total_amount ||
        0,
    );
  };

  const getApprovalRejectionReason = (request: any) => {
    const payload = getApprovalPayload(request);

    return String(
      request?.rejection_reason ||
        request?.reject_reason ||
        request?.decline_reason ||
        request?.decision_reason ||
        request?.approval_remarks ||
        request?.review_remarks ||
        request?.manager_remarks ||
        request?.remarks ||
        payload?.rejection_reason ||
        payload?.reject_reason ||
        payload?.decline_reason ||
        payload?.decision_reason ||
        payload?.approval_remarks ||
        payload?.review_remarks ||
        payload?.manager_remarks ||
        "",
    ).trim();
  };

  const getMovementStyle = (type: string) => {
    if (type === "Opening Float") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (type === "Cash In") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    if (type === "Cash Out") return "bg-red-50 text-red-700 ring-1 ring-red-200";
    if (type === "Remittance") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    if (type === "Adjustment") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  };

  const getPaymentStyle = (payment: string) => {
    if (payment === "Cash") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    if (payment === "GCash") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (payment === "Bank") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (payment === "Terminal") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
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
      .select(
        "id, company_id, employee_no, first_name, last_name, department, position, employment_status, payroll_active",
      )
      .eq("payroll_active", true)
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
      return;
    }

    const cleanEmployees = (data || []).filter((employee: any) => {
      const payrollEmployeeId = getEmployeePayrollId(employee);
      const firstName = String(employee?.first_name || "").trim();
      const lastName = String(employee?.last_name || "").trim();
      const employeeNo = String(employee?.employee_no || "").trim();

      return Boolean(payrollEmployeeId && firstName && lastName && employeeNo);
    });

    setEmployees(cleanEmployees);
  };

  const payrollPeriodUsableStatuses = [
    "Draft",
    "Reopened",
    "Partially Approved",
    "Partially Released",
    "Released",
  ];

  const getPayrollPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .in("status", payrollPeriodUsableStatuses)
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
      .in("status", payrollPeriodUsableStatuses)
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

  const getCashSources = async () => {
    const { data, error } = await supabase
      .from("finance_cash_sources")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.log("GET CASH SOURCES ERROR:", error.message);
      setCashSources([]);
      return;
    }

    setCashSources(data || []);
  };

  const getApprovalRequests = async () => {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .or(
        "module.eq.Cash Management,request_type.eq.CASH_ADVANCE_RELEASE,request_type.eq.CASH_EXPENSE_RELEASE,request_type.eq.CASH_DRAWER_OUT,request_type.eq.OWNER_WITHDRAWAL,request_type.eq.BANK_DEPOSIT,request_type.eq.ADJUSTMENT_OUT",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET CASH APPROVAL REQUESTS ERROR:", error.message);
      setApprovalRequests([]);
      return;
    }

    setApprovalRequests(data || []);
  };

  const refreshCashManagement = async () => {
    await Promise.all([
      getCashMovements(),
      getDrawers(),
      getApprovalRequests(),
      getPayrollPeriods(),
    ]);
  };

  /// FUNCTIONS - RESET
  const resetForm = () => {
    setBusinessDate(getToday());
    setMovementType("Cash In");
    setSource("Restaurant Sales");
    setPaymentType("Cash");
    setAmount("");
    setFromPerson("");
    setToPerson("");
    setEncodedBy("");
    setRemarks("");
    setReceiptStatus("WITH_RECEIPT");
    setNoReceiptReason("");
    setNoReceiptExplanation("");
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
      (item) =>
        String(item.cash_drawer_id || "") === String(drawer.id || "") &&
        !isVoidedMovement(item),
    );

    const hasClosingRemittance = reportMovements.some(
      (item) =>
        item.movement_type === "Remittance" &&
        (item.source === "Drawer Closing Remittance" ||
          item.reference_type === "drawer_closing_remittance"),
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

    const allReportMovements = [
      ...reportMovements,
      ...syntheticClosingRemittance,
    ];

    const sum = (rows: any[]) =>
      rows.reduce((total, item) => total + Number(item.amount || 0), 0);

    const absSum = (rows: any[]) =>
      rows.reduce(
        (total, item) => total + Math.abs(Number(item.amount || 0)),
        0,
      );

    const byPayment = (payment: string) =>
      allReportMovements.filter(
        (item) => (item.payment_type || "Cash") === payment,
      );

    const cashRows = byPayment("Cash");
    const gcashRows = byPayment("GCash");
    const bankRows = byPayment("Bank");
    const terminalRows = byPayment("Terminal");

    const cashInRows = cashRows.filter(
      (item) =>
        item.movement_type === "Opening Float" ||
        item.movement_type === "Cash In",
    );

    const openingFloatRows = cashRows.filter(
      (item) => item.movement_type === "Opening Float",
    );

    const cashSalesRows = cashRows.filter(
      (item) => item.movement_type === "Cash In",
    );

    const cashOutRows = cashRows.filter(
      (item) =>
        item.movement_type === "Cash Out" ||
        item.source === "Owner Withdrawal" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0),
    );

    const closingRemittanceRows = cashRows.filter(
      (item) =>
        item.movement_type === "Remittance" &&
        (item.source === "Drawer Closing Remittance" ||
          item.reference_type === "drawer_closing_remittance"),
    );

    const manualRemittanceRows = cashRows.filter(
      (item) =>
        item.movement_type === "Remittance" &&
        item.source !== "Drawer Closing Remittance" &&
        item.reference_type !== "drawer_closing_remittance",
    );

    const openingFloat =
      openingFloatRows.length > 0
        ? sum(openingFloatRows)
        : Number(drawer.opening_float || 0);
    const cashSales = sum(cashSalesRows);
    const cashExpenses = absSum(cashOutRows);
    const manualRemittance = sum(manualRemittanceRows);
    const closingRemittance = sum(closingRemittanceRows);
    const expectedCash = Number(
      customSummary?.expected_cash ??
        openingFloat + cashSales - cashExpenses - manualRemittance,
    );
    const actualCash = Number(
      customSummary?.actual_cash ?? drawer.actual_cash ?? 0,
    );
    const remainingCash = Number(
      customSummary?.remaining_cash_after_remittance ??
        actualCash - closingRemittance,
    );
    // Full-remittance policy for owner report:
    // Expected Cash must be fully remitted. Any amount left unremitted becomes variance.
    // Never trust saved drawer.variance here because older/legacy drawers may still store
    // the old actual-count-based variance. Always recalculate from the remitted amount.
    const variance = Number(closingRemittance - expectedCash);
    const varianceStatus =
      Math.abs(variance) < 0.01 ? "BALANCED" : variance < 0 ? "SHORT" : "OVER";

    const cashCollections = cashSales;
    const gcashCollections = sum(
      gcashRows.filter((item) => item.movement_type === "Cash In"),
    );
    const bankCollections = sum(
      bankRows.filter((item) => item.movement_type === "Cash In"),
    );
    const terminalCollections = sum(
      terminalRows.filter((item) => item.movement_type === "Cash In"),
    );
    const totalCollections =
      cashCollections +
      gcashCollections +
      bankCollections +
      terminalCollections;

    const salesRows = allReportMovements.filter(
      (item) => item.movement_type === "Cash In",
    );
    const roomSales = sum(
      salesRows.filter((item) => item.source === "Room Sales"),
    );
    const restaurantSales = sum(
      salesRows.filter((item) => item.source === "Restaurant Sales"),
    );
    const apartmentCollections = sum(
      salesRows.filter((item) => item.source === "Apartment Collection"),
    );
    const otherSales = Math.max(
      sum(salesRows) - roomSales - restaurantSales - apartmentCollections,
      0,
    );
    const totalSales =
      roomSales + restaurantSales + apartmentCollections + otherSales;

    const manualCashExpenses = absSum(
      cashOutRows.filter(
        (item) =>
          item.source !== "Expense Release" &&
          item.source !== "Cash Advance" &&
          item.source !== "Owner Withdrawal" &&
          item.source !== "Bank Deposit",
      ),
    );
    const expenseReleases = absSum(
      cashOutRows.filter((item) => item.source === "Expense Release"),
    );
    const cashAdvances = absSum(
      cashOutRows.filter((item) => item.source === "Cash Advance"),
    );
    const ownerWithdrawals = absSum(
      cashOutRows.filter((item) => item.source === "Owner Withdrawal"),
    );
    const bankDeposits = absSum(
      cashOutRows.filter((item) => item.source === "Bank Deposit"),
    );
    const otherExpenses = Math.max(
      cashExpenses -
        manualCashExpenses -
        expenseReleases -
        cashAdvances -
        ownerWithdrawals -
        bankDeposits,
      0,
    );
    const totalExpenses =
      manualCashExpenses +
      expenseReleases +
      cashAdvances +
      ownerWithdrawals +
      bankDeposits +
      otherExpenses;

    const businessDate =
      customSummary?.business_date ||
      String(drawer.opened_at || drawer.created_at || today).slice(0, 10);
    const generatedAt = formatDateTime(new Date().toISOString());
    const receivedBy =
      customSummary?.received_by || closingRemittanceRows[0]?.to_person || "-";
    const preparedBy = drawer.holder_name || "-";
    const managementRemarks =
      customSummary?.remarks ||
      drawer.remarks ||
      closeRemarks ||
      drawer.drawerRemarks ||
      "-";

    const formatPlainMoney = (value: any) =>
      formatMoney(value).replace("₱-", "(₱") +
      (Number(value || 0) < 0 ? ")" : "");

    const line = (
      label: string,
      value: any,
      bold = false,
      negative = false,
    ) => `
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
        `,
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Daily Cash Control Report</title>
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

    if (!drawerHolder || openingFloat === "") {
      alert("Please select drawer holder and opening float.");
      return;
    }

    const openingFloatValue = parseAmountValue(openingFloat);

    if (!Number.isFinite(openingFloatValue) || openingFloatValue <= 0) {
      alert("Opening float must be greater than zero. Negative, zero, and invalid amounts are not allowed.");
      return;
    }

    if (!authorizedDrawerHolders.includes(drawerHolder)) {
      alert("This employee is not authorized in Drawer Holder Settings.");
      return;
    }

    if (!canManageDrawerForOthers && drawerHolder !== currentDrawerHolderName) {
      alert(
        "You can only open your own cash drawer. Ask Admin/Finance to open a drawer for another holder.",
      );
      return;
    }

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Unable to open drawer. No company_id found for current user.");
      return;
    }

    setIsSaving(true);

    const { data: drawerData, error: drawerError } = await supabase
      .from("finance_cash_drawers")
      .insert({
        holder_name: drawerHolder,
        opening_float: openingFloatValue,
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
          openingFloat: openingFloatValue,
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
        company_id: companyId,
        business_date: today,
        movement_type: "Opening Float",
        source: "Petty Cash",
        payment_type: "Cash",
        amount: openingFloatValue,
        from_person: "",
        to_person: drawerHolder,
        encoded_by: currentEmployeeName || drawerHolder,
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
      description: `${drawerHolder} opened cash drawer with float ${formatMoney(openingFloatValue)}`,
      severity: "warning",
      recordId: drawerData.id,
      newValue: {
        drawerId: drawerData.id,
        holder: drawerHolder,
        openingFloat: openingFloatValue,
        remarks: drawerRemarks.trim(),
      },
    });

    resetDrawerForm();
    setShowOpenDrawer(false);
    setHolderFilter("AUTO");
    await refreshCashManagement();
  };

  /// FUNCTIONS - CLOSE DRAWER
  const closeDrawer = async () => {
    if (isSaving) return;

    if (!activeDrawer) {
      alert("No active drawer to close.");
      return;
    }

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Unable to close drawer. No company_id found for current user.");
      return;
    }

    if (actualClosingCash === "") {
      alert("Please enter actual closing cash.");
      return;
    }

    const actualCashValue = parseAmountValue(actualClosingCash);
    const remittanceValue =
      closingRemittanceAmount === ""
        ? 0
        : parseAmountValue(closingRemittanceAmount);
    const receiverName = closingRemittanceReceivedBy.trim();

    if (!Number.isFinite(actualCashValue) || actualCashValue < 0) {
      alert("Actual closing cash cannot be negative or invalid.");
      return;
    }

    if (!Number.isFinite(remittanceValue) || remittanceValue < 0) {
      alert("Remittance amount cannot be negative or invalid.");
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
          company_id: companyId,
          business_date: today,
          movement_type: "Remittance",
          source: "Drawer Closing Remittance",
          payment_type: "Cash",
          amount: remittanceValue,
          from_person: activeDrawer.holder_name,
          to_person: receiverName,
          encoded_by: currentEmployeeName || activeDrawer.holder_name,
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

      alert(
        "Remittance was saved, but drawer close failed. Check drawer status and audit log.",
      );
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Cash Management",
      action:
        remittanceValue > 0 ? "Close Drawer With Remittance" : "Close Drawer",
      description:
        remittanceValue > 0
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
    await refreshCashManagement();
  };

  /// FUNCTIONS - DUPLICATE SAFETY
  const hasDuplicateCashMovement = async ({
    businessDate,
    movementType,
    source,
    paymentType,
    amountValue,
    autoFrom,
    autoTo,
    movementRemarks,
  }: {
    businessDate: string;
    movementType: string;
    source: string;
    paymentType: string;
    amountValue: number;
    autoFrom: string;
    autoTo: string;
    movementRemarks: string;
  }) => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { data, error } = await supabase
      .from("finance_cash_movements")
      .select("id, created_at")
      .eq("business_date", businessDate)
      .eq("movement_type", movementType)
      .eq("source", source)
      .eq("payment_type", paymentType)
      .eq("amount", amountValue)
      .eq("from_person", autoFrom)
      .eq("to_person", autoTo)
      .eq("remarks", movementRemarks)
      .gte("created_at", oneMinuteAgo)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("DUPLICATE CASH MOVEMENT CHECK ERROR:", error.message);
      throw error;
    }

    return Boolean(data);
  };

  const hasDuplicateCashApprovalRequest = async ({
    requestType,
    title,
    requestedBy,
  }: {
    requestType: string;
    title: string;
    requestedBy: string;
  }) => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { data, error } = await supabase
      .from("approval_requests")
      .select("id, created_at")
      .eq("request_type", requestType)
      .eq("module", "Cash Management")
      .eq("title", title)
      .eq("requested_by", requestedBy)
      .eq("status", "PENDING")
      .gte("created_at", oneMinuteAgo)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("DUPLICATE CASH APPROVAL CHECK ERROR:", error.message);
      throw error;
    }

    return Boolean(data);
  };

  /// FUNCTIONS - SAVE CASH MOVEMENT
  const saveMovement = async () => {
    if (savingRef.current || isSaving) return;
    savingRef.current = true;

    if (!businessDate || !movementType || !source || !paymentType || !amount) {
      alert("Please complete date, type, source, payment type, and amount.");
      savingRef.current = false;
      return;
    }

    const amountValue = parseAmountValue(amount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      alert("Amount must be greater than zero. Negative, zero, and invalid amounts are not allowed.");
      savingRef.current = false;
      return;
    }

    if (isBalanceGuardedMoneyOut()) {
      const availableBalance = getAvailableBalanceByPaymentType(paymentType);

      if (availableBalance <= 0) {
        alert(`No available ${paymentType} balance.`);
        savingRef.current = false;
        return;
      }

      if (amountValue > availableBalance) {
        alert(
          `Insufficient ${paymentType} balance. Available: ${formatMoney(
            availableBalance,
          )}`,
        );
        savingRef.current = false;
        return;
      }
    }

    if (isCashExpenseCashOut && !activeDrawer) {
      alert("Please open a drawer first before releasing a cash expense.");
      savingRef.current = false;
      return;
    }

    if (isCashAdvanceCashOut && paymentType === "Cash" && !activeDrawer) {
      alert(
        "Please open a drawer first before releasing a cash advance in cash.",
      );
      savingRef.current = false;
      return;
    }

    if (isCashAdvanceCashOut && !cashAdvanceEmployeeId) {
      alert("Please select employee for cash advance.");
      savingRef.current = false;
      return;
    }

    if (isCashAdvanceCashOut && !selectedCashAdvanceEmployee) {
      alert("Selected employee is invalid. Please re-select employee.");
      savingRef.current = false;
      return;
    }

    const targetPayrollPeriod = isCashAdvanceCashOut
      ? await fetchPayrollPeriodForDate(businessDate)
      : null;

    if (isCashAdvanceCashOut && !targetPayrollPeriod) {
      alert(
        `No usable payroll period covers ${businessDate}. Create, reopen, partially release, or release the correct cutoff first.`,
      );
      savingRef.current = false;
      return;
    }

    if (isExpenseRelease && !expenseCategory) {
      alert("Please select expense category.");
      savingRef.current = false;
      return;
    }

    if (
      isExpenseRelease &&
      expenseSubcategoryOptions.length > 0 &&
      !expenseSubcategory
    ) {
      alert("Please select expense subcategory.");
      savingRef.current = false;
      return;
    }

    if (isExpenseRelease && !expenseDepartment) {
      alert("Please select expense department / area.");
      savingRef.current = false;
      return;
    }

    if (isExpenseRelease && !expenseDescription.trim()) {
      alert("Please enter expense description.");
      savingRef.current = false;
      return;
    }

    // ENTERPRISE AUDIT RULE:
    // Cash / expense releases must always identify the receiver.
    // This prevents approved finance records with Employee / Receiver shown as "-".
    if (isExpenseRelease && !expenseReleasedTo.trim()) {
      alert("Please enter Released To / Receiver for this expense release.");
      savingRef.current = false;
      return;
    }

    if (movementType === "Cash Out" && receiptStatus === "WITHOUT_RECEIPT") {
      if (!noReceiptReason) {
        alert("Reason is required for transactions without a receipt.");
        savingRef.current = false;
        return;
      }

      if (noReceiptReason === "Other" && !noReceiptExplanation.trim()) {
        alert("Explanation is required when no receipt reason is Other.");
        savingRef.current = false;
        return;
      }
    }

    const autoFrom =
      paymentType === "Cash"
        ? activeDrawer?.holder_name || currentDrawerHolderName || ""
        : paymentType;

    const autoTo = isCashAdvanceCashOut
      ? cashAdvanceEmployeeName
      : isExpenseRelease
        ? expenseReleasedTo.trim()
        : paymentType === "Cash" && !toPerson.trim()
          ? activeDrawer?.holder_name || ""
          : toPerson.trim();

    // Audit identity rule:
    // - encoded_by / requested_by must be the logged-in user who created the transaction.
    // - drawer holder remains separate through from_person / to_person / cash_drawer_id.
    // This prevents admin-created transactions from being incorrectly attributed to the drawer holder.
    const autoEncoded =
      currentEmployeeName ||
      currentDrawerHolderName ||
      activeDrawer?.holder_name ||
      "System";

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert(
        "Unable to save cash movement. No company_id found for current user.",
      );
      savingRef.current = false;
      return;
    }

    if (
      paymentType === "Cash" &&
      (movementType === "Cash In" || movementType === "Opening Float") &&
      !autoTo
    ) {
      alert("Please open a drawer or enter who received/holds the cash.");
      savingRef.current = false;
      return;
    }

    if (paymentType === "Cash" && movementType === "Cash Out" && !autoFrom) {
      alert("Please open a drawer or enter who released the cash.");
      savingRef.current = false;
      return;
    }

    setIsSaving(true);

    const receiptAuditText = buildReceiptAuditText();

    const baseMovementRemarks = isCashAdvanceCashOut
      ? `Cash Advance - ${cashAdvanceEmployeeName}${
          cashAdvancePurpose.trim() ? ` - ${cashAdvancePurpose.trim()}` : ""
        }${remarks.trim() ? ` - ${remarks.trim()}` : ""}`
      : isExpenseRelease
        ? `${expenseDescription.trim()}${remarks.trim() ? ` - ${remarks.trim()}` : ""}`
        : remarks.trim();

    const movementRemarks = [baseMovementRemarks, receiptAuditText]
      .filter(Boolean)
      .join(" ");

    if (isCashDrawerMoneyOut) {
      const requestType = getCashApprovalRequestType();

      const approvalPayload = {
        company_id: companyId,
        requested_by_employee_id: currentEmployeeId || null,
        requested_by_system_user_id: currentSystemUserId || null,
        requested_by_name: autoEncoded,
        drawer_holder_name: activeDrawer?.holder_name || null,
        business_date: businessDate,
        movement_type: movementType,
        source,
        payment_type: paymentType,
        amount: amountValue,
        from_person: autoFrom,
        to_person: autoTo,
        encoded_by: autoEncoded,
        remarks: movementRemarks,
        receipt_status: movementType === "Cash Out" ? receiptStatus : null,
        receipt_label: movementType === "Cash Out" ? receiptLabel : null,
        no_receipt_reason:
          movementType === "Cash Out" && receiptStatus === "WITHOUT_RECEIPT"
            ? noReceiptReason
            : null,
        no_receipt_explanation:
          movementType === "Cash Out" && receiptStatus === "WITHOUT_RECEIPT"
            ? noReceiptExplanation.trim()
            : null,
        reference_type: shouldCreateExpenseFromCashOut ? "expense" : null,
        cash_drawer_id: activeDrawer?.id || null,
        should_create_expense: shouldCreateExpenseFromCashOut,
        is_cash_expense_cash_out: isCashExpenseCashOut,
        is_cash_advance_cash_out: isCashAdvanceCashOut,
        expense_category: isCashAdvanceCashOut
          ? "Cash Advance"
          : expenseCategory,
        expense_subcategory: isCashAdvanceCashOut
          ? "Cash Advance Release"
          : expenseSubcategory || null,
        expense_department: isCashAdvanceCashOut
          ? "Payroll"
          : expenseDepartment,
        expense_description: isCashAdvanceCashOut
          ? `Cash Advance - ${cashAdvanceEmployeeName}`
          : expenseDescription.trim(),
        expense_released_to: expenseReleasedTo.trim(),
        cash_advance_employee_id: isCashAdvanceCashOut
          ? cashAdvanceEmployeeId
          : null,
        cash_advance_employee_name: isCashAdvanceCashOut
          ? cashAdvanceEmployeeName
          : null,
        cash_advance_purpose: cashAdvancePurpose.trim(),
        payroll_period_id: isCashAdvanceCashOut
          ? targetPayrollPeriod?.id || null
          : null,
        payroll_period_label: isCashAdvanceCashOut
          ? targetPayrollPeriod
            ? `${targetPayrollPeriod.period_name || "Payroll Period"} (${targetPayrollPeriod.start_date} to ${targetPayrollPeriod.end_date})`
            : activePayrollLabel
          : null,
      };

      const approvalTitle = `${source} - ${formatMoney(amountValue)}`;

      try {
        const duplicateApprovalExists = await hasDuplicateCashApprovalRequest({
          requestType,
          title: approvalTitle,
          requestedBy: autoEncoded,
        });

        if (duplicateApprovalExists) {
          setIsSaving(false);
          savingRef.current = false;
          alert(
            "Possible duplicate approval request detected. This request was not submitted again.",
          );
          return;
        }
      } catch {
        setIsSaving(false);
        savingRef.current = false;
        alert("Duplicate safety check failed. Request was not submitted.");
        return;
      }

      const { error: approvalError } = await supabase
        .from("approval_requests")
        .insert({
          company_id: companyId,
          request_type: requestType,
          module: "Cash Management",
          reference_id: activeDrawer?.id || null,
          title: approvalTitle,
          description: `${movementType} request by ${autoEncoded}. From: ${autoFrom || "-"}. To: ${autoTo || "-"}. ${movementRemarks || ""}`,
          requested_by: autoEncoded,
          status: "PENDING",
          request_payload: approvalPayload,
        });

      setIsSaving(false);
      savingRef.current = false;

      if (approvalError) {
        console.log(
          "CREATE CASH DRAWER APPROVAL ERROR:",
          approvalError.message,
        );
        alert(
          `Failed to send cash movement to Approval Center. ${approvalError.message}`,
        );
        savingRef.current = false;
        return;
      }

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Cash Management",
        action: "Submit Cash Control Approval Request",
        description: `${requestType} submitted for approval - ${formatMoney(amountValue)}`,
        severity: "warning",
        newValue: approvalPayload,
      });

      resetForm();
      await refreshCashManagement();
      alert(
        "Cash movement sent to Manager Approval Center. No drawer deduction was made yet.",
      );
      savingRef.current = false;
      return;
    }

    try {
      const duplicateMovementExists = await hasDuplicateCashMovement({
        businessDate,
        movementType,
        source,
        paymentType,
        amountValue,
        autoFrom,
        autoTo,
        movementRemarks,
      });

      if (duplicateMovementExists) {
        setIsSaving(false);
        savingRef.current = false;
        alert(
          "Possible duplicate cash movement detected. This transaction was not saved again.",
        );
        return;
      }
    } catch {
      setIsSaving(false);
      savingRef.current = false;
      alert("Duplicate safety check failed. Transaction was not saved.");
      return;
    }

    const { data: movementData, error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        company_id: companyId,
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
      savingRef.current = false;
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
      savingRef.current = false;
      return;
    }

    let createdExpenseData: any = null;
    let createdBalanceData: any = null;
    let balanceCreationFailed = false;

    if (shouldCreateExpenseFromCashOut) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          company_id: companyId,
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
          payment_method: paymentType,
          employee_id: isCashAdvanceCashOut ? cashAdvanceEmployeeId : null,
          employee_name: isCashAdvanceCashOut ? cashAdvanceEmployeeName : null,
          deduct_to_payroll: isCashAdvanceCashOut,
          payroll_period_id: isCashAdvanceCashOut
            ? targetPayrollPeriod?.id || null
            : null,
          remarks: isCashAdvanceCashOut
            ? `Source: ${paymentType === "Cash" ? "Cash Control" : paymentType}. Auto linked by selected date to: ${
                targetPayrollPeriod
                  ? `${targetPayrollPeriod.period_name || "Payroll Period"} (${targetPayrollPeriod.start_date} to ${targetPayrollPeriod.end_date})`
                  : activePayrollLabel
              }. ${cashAdvancePurpose.trim()}${remarks.trim() ? ` - ${remarks.trim()}` : ""}`.trim()
            : `${remarks.trim()}${
                expenseReleasedTo.trim()
                  ? ` Released to: ${expenseReleasedTo.trim()}`
                  : ""
              }`.trim(),
          source: isCashAdvanceCashOut
            ? paymentType === "Cash"
              ? "Cash Control - Cash Advance"
              : `${paymentType} - Cash Advance`
            : "Cash Control",
          posted_to_cash_movements: true,
          cash_movement_id: movementData.id,
          cash_posted_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (expenseError) {
        setIsSaving(false);
        savingRef.current = false;
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

        alert(
          "Cash movement was saved, but expense entry failed. Check expenses table columns.",
        );
        await getCashMovements();
        savingRef.current = false;
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
          `Source: ${paymentType === "Cash" ? "Cash Control" : paymentType}`,
          `Cutoff: ${cutoffLabel}`,
          `Expense ID: ${expenseData.id}`,
          `Cash Movement ID: ${movementData.id}`,
          cashAdvancePurpose.trim()
            ? `Purpose: ${cashAdvancePurpose.trim()}`
            : "",
          remarks.trim() ? `Remarks: ${remarks.trim()}` : "",
        ]
          .filter(Boolean)
          .join(". ");

        const { data: balanceData, error: balanceError } = await supabase
          .from("employee_balances")
          .insert({
            company_id: companyId,
            employee_id: cashAdvanceEmployeeId,
            employee_name: cashAdvanceEmployeeName,
            balance_type: "Cash Advance",
            original_amount: amountValue,
            remaining_balance: amountValue,
            status: "Active",
            source_module: "Cash Control",
            source_id: isUuid(movementData.id) ? movementData.id : null,
            period_id: targetPayrollPeriod.id,
            remarks: cashDrawerReference,
          })
          .select()
          .single();

        if (balanceError) {
          balanceCreationFailed = true;
          console.log(
            "AUTO CREATE CASH ADVANCE BALANCE ERROR:",
            balanceError.message,
          );

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

          alert(
            "Cash advance saved to cash movement and expenses, but employee balance failed.",
          );
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
        : isExpenseRelease
          ? "Expense Released"
          : "Cash Movement Created",
      description: isCashAdvanceCashOut
        ? `${cashAdvanceEmployeeName} cash advance released from drawer - ${formatMoney(amountValue)}`
        : isExpenseRelease
          ? `Expense released via ${paymentType}: ${expenseDescription.trim()} - ${formatMoney(amountValue)}`
          : `${movementType} ${source} recorded - ${formatMoney(amountValue)}`,
      severity:
        isCashAdvanceCashOut ||
        isExpenseRelease ||
        movementType === "Cash Out" ||
        movementType === "Adjustment"
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
    savingRef.current = false;
    resetForm();
    await getCashMovements();
    await getDrawers();

    if (isCashAdvanceCashOut) {
      alert(
        `Cash advance saved via ${paymentType} to Cash Movements, Expenses, and Payroll Balances.`,
      );
      savingRef.current = false;
      return;
    }

    if (isExpenseRelease) {
      alert("Cash expense saved to Cash Control and Expenses.");
      savingRef.current = false;
      return;
    }

    alert("Cash movement saved.");
    savingRef.current = false;
  };

  /// FUNCTIONS - VOID MOVEMENT
  const voidMovement = async (id: string) => {
    const { data: movement, error: movementFetchError } = await supabase
      .from("finance_cash_movements")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (movementFetchError) {
      console.log(
        "FETCH CASH MOVEMENT BEFORE VOID ERROR:",
        movementFetchError.message,
      );

      await createAuditLog({
        userName: currentEmployeeName || "OPSCORE USER",
        module: "Cash Management",
        action: "Void Cash Movement Failed",
        description: `Failed to fetch cash movement before void. Error: ${movementFetchError.message}`,
        severity: "critical",
        recordId: id,
        newValue: {
          error: movementFetchError.message,
        },
      });

      alert("Failed to check cash movement before void.");
      return;
    }

    if (!movement) {
      alert("Cash movement not found.");
      await getCashMovements();
      return;
    }

    if (isVoidedMovement(movement)) {
      alert("This cash movement is already voided.");
      await getCashMovements();
      return;
    }

    if (
      movement.reference_type === "drawer_closing_remittance" ||
      movement.source === "Drawer Closing Remittance"
    ) {
      alert(
        "Drawer closing remittance is locked. Reopen or correct the drawer instead of voiding this record.",
      );
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

    const reason = prompt(
      linkedExpense
        ? `Void this cash movement and mark its linked expense as voided?\n\nPlease enter the void reason:`
        : "Void this cash movement?\n\nPlease enter the void reason:",
    );

    const voidReason = String(reason || "").trim();

    if (!voidReason) {
      alert("Void reason is required. No changes were made.");
      return;
    }

    const confirmVoid = confirm(
      linkedExpense
        ? `Confirm void?\n\nThis will keep the records for audit trail and exclude the cash movement from cash totals.\n\nLinked expense will also be marked VOIDED.`
        : `Confirm void?\n\nThis will keep the record for audit trail and exclude it from cash totals.`,
    );

    if (!confirmVoid) return;

    setIsSaving(true);

    const voidedAt = new Date().toISOString();
    const voidedBy =
      currentEmployeeName || currentDrawerHolderName || "OPSCORE USER";
    const originalRemarks = String(movement.remarks || "").trim();
    const movementRemarks = [
      originalRemarks,
      `[VOIDED by ${voidedBy} at ${formatDateTime(voidedAt)}] Reason: ${voidReason}`,
    ]
      .filter(Boolean)
      .join(" ");

    const { error: movementVoidError } = await supabase
      .from("finance_cash_movements")
      .update({
        status: "VOIDED",
        void_reason: voidReason,
        voided_by: voidedBy,
        voided_at: voidedAt,
        remarks: movementRemarks,
      })
      .eq("id", id);

    if (movementVoidError) {
      setIsSaving(false);
      console.log("VOID CASH MOVEMENT ERROR:", movementVoidError.message);

      await createAuditLog({
        userName: voidedBy,
        module: "Cash Management",
        action: "Void Cash Movement Failed",
        description: `Failed to void cash movement ${formatMoney(movement.amount)}. Error: ${movementVoidError.message}`,
        severity: "critical",
        recordId: movement.id,
        oldValue: movement,
        newValue: {
          voidReason,
          error: movementVoidError.message,
        },
      });

      alert(
        "Failed to void cash movement. Check if void columns exist in finance_cash_movements.",
      );
      return;
    }

    let linkedExpenseVoided = false;
    let linkedBalanceVoided = false;
    let fallbackBalancesVoided = false;
    const linkedPeriodId =
      linkedExpense?.payroll_period_id || linkedExpense?.period_id || null;

    if (linkedExpense) {
      const expenseRemarks = [
        String(linkedExpense.remarks || "").trim(),
        `[VOIDED from Cash Management by ${voidedBy} at ${formatDateTime(voidedAt)}] Reason: ${voidReason}`,
      ]
        .filter(Boolean)
        .join(" ");

      const { error: expenseVoidError } = await supabase
        .from("expenses")
        .update({
          status: "VOIDED",
          void_reason: voidReason,
          voided_by: voidedBy,
          voided_at: voidedAt,
          remarks: expenseRemarks,
        })
        .eq("id", linkedExpense.id);

      if (expenseVoidError) {
        console.log("VOID LINKED EXPENSE ERROR:", expenseVoidError.message);

        await createAuditLog({
          userName: voidedBy,
          module: "Cash Management",
          action: "Void Linked Expense Failed",
          description: `Cash movement was voided, but linked expense failed to void. Error: ${expenseVoidError.message}`,
          severity: "critical",
          recordId: movement.id,
          oldValue: {
            movement,
            linkedExpense,
          },
          newValue: {
            voidReason,
            error: expenseVoidError.message,
          },
        });

        alert(
          "Cash movement was voided, but linked expense failed to void. Check expense columns.",
        );
      } else {
        linkedExpenseVoided = true;
      }

      if (linkedExpense.employee_balance_id) {
        const { error: balanceVoidError } = await supabase
          .from("employee_balances")
          .update({
            status: "VOIDED",
            void_reason: voidReason,
            voided_by: voidedBy,
            voided_at: voidedAt,
          })
          .eq("id", linkedExpense.employee_balance_id);

        if (balanceVoidError) {
          console.log(
            "VOID LINKED EMPLOYEE BALANCE ERROR:",
            balanceVoidError.message,
          );

          await createAuditLog({
            userName: voidedBy,
            module: "Cash Management",
            action: "Void Linked Employee Balance Failed",
            description: `Cash movement was voided, but linked employee balance failed to void. Error: ${balanceVoidError.message}`,
            severity: "critical",
            recordId: movement.id,
            oldValue: {
              movement,
              linkedExpense,
            },
            newValue: {
              voidReason,
              error: balanceVoidError.message,
            },
          });
        } else {
          linkedBalanceVoided = true;
        }
      }

      // Safety fallback for older rows where employee_balance_id was not saved on expenses.
      const { error: fallbackBalanceError } = await supabase
        .from("employee_balances")
        .update({
          status: "VOIDED",
          void_reason: voidReason,
          voided_by: voidedBy,
          voided_at: voidedAt,
        })
        .eq("source_module", "Cash Control")
        .eq("source_id", id);

      if (!fallbackBalanceError) {
        fallbackBalancesVoided = true;
      }
    }

    if (linkedPeriodId) {
      await supabase
        .from("payroll_periods")
        .update({ needs_regeneration: true })
        .eq("id", linkedPeriodId);
    }

    await createAuditLog({
      userName: voidedBy,
      module: "Cash Management",
      action: "Void Cash Movement",
      description: linkedExpense
        ? `Voided cash movement and linked expense: ${movement.source} - ${formatMoney(movement.amount)}. Reason: ${voidReason}`
        : `Voided cash movement: ${movement.source} - ${formatMoney(movement.amount)}. Reason: ${voidReason}`,
      severity: "critical",
      recordId: movement.id,
      oldValue: {
        movement,
        linkedExpense,
      },
      newValue: {
        status: "VOIDED",
        voidReason,
        voidedBy,
        voidedAt,
        linkedExpenseVoided,
        linkedBalanceVoided,
        fallbackBalancesVoided,
      },
    });

    setIsSaving(false);
    await getCashMovements();
    await getDrawers();
    await getPayrollPeriods();

    alert(
      linkedExpense
        ? "Cash movement was voided. Linked expense/balance were marked voided when available."
        : "Cash movement was voided.",
    );
  };

  /// EFFECTS
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCurrentSession = async () => {
      const storedCurrentUser = localStorage.getItem("opscore_current_user");
      const parsedCurrentUser = storedCurrentUser
        ? JSON.parse(storedCurrentUser)
        : null;

      const systemUserId =
        localStorage.getItem("opscore_current_system_user_id") ||
        parsedCurrentUser?.system_user_id ||
        parsedCurrentUser?.id ||
        "";

      const employeeId =
        localStorage.getItem("opscore_current_employee_id") ||
        parsedCurrentUser?.employee_id ||
        "";

      const companyId =
        localStorage.getItem("opscore_current_company_id") ||
        parsedCurrentUser?.company_id ||
        "";

      const fallbackName =
        localStorage.getItem("opscore_current_employee_name") ||
        parsedCurrentUser?.name ||
        parsedCurrentUser?.username ||
        "OPSCORE USER";

      setCurrentSystemUserId(systemUserId);
      setCurrentEmployeeId(employeeId);
      setCurrentEmployeeName(fallbackName);
      setCurrentCompanyId(companyId);

      if (!systemUserId) return;

      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_users")
        .select("id, company_id, role_id, is_active")
        .eq("user_id", systemUserId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (companyUserError) {
        console.log("CASH MANAGEMENT SESSION COMPANY USER ERROR:", companyUserError.message);
      }

      const activeCompanyId = String(companyUser?.company_id || companyId || "").trim();
      const activeRoleId = String(companyUser?.role_id || localStorage.getItem("opscore_current_role_id") || "").trim();

      if (activeCompanyId) {
        setCurrentCompanyId(activeCompanyId);
        localStorage.setItem("opscore_current_company_id", activeCompanyId);
      }

      if (activeRoleId) {
        localStorage.setItem("opscore_current_role_id", activeRoleId);

        const { data: roleData, error: roleError } = await supabase
          .from("system_roles")
          .select("role_name")
          .eq("id", activeRoleId)
          .maybeSingle();

        if (roleError) {
          console.log("CASH MANAGEMENT SESSION ROLE ERROR:", roleError.message);
        }

        const roleName = String(roleData?.role_name || "").trim();

        if (roleName) {
          setCurrentRoleName(roleName);
          localStorage.setItem("opscore_current_role_name", roleName);
        }
      }
    };

    loadCurrentSession();
  }, []);

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
      JSON.stringify(authorizedDrawerHolders),
    );
  }, [authorizedDrawerHolders, drawerHolderSettingsLoaded]);

  useEffect(() => {
    if (drawerHolder && !authorizedDrawerHolders.includes(drawerHolder)) {
      setDrawerHolder("");
    }
  }, [authorizedDrawerHolders, drawerHolder]);

  useEffect(() => {
    if (!showOpenDrawer) return;
    if (canManageDrawerForOthers) return;
    if (!currentDrawerHolderName) return;
    if (!authorizedDrawerHolders.includes(currentDrawerHolderName)) return;

    setDrawerHolder(currentDrawerHolderName);
  }, [
    showOpenDrawer,
    canManageDrawerForOthers,
    currentDrawerHolderName,
    authorizedDrawerHolders,
  ]);

  useEffect(() => {
    if (canManageDrawerForOthers) return;
    if (!drawerHolder || !currentDrawerHolderName) return;

    if (drawerHolder !== currentDrawerHolderName) {
      setDrawerHolder(currentDrawerHolderName);
    }
  }, [canManageDrawerForOthers, drawerHolder, currentDrawerHolderName]);

  useEffect(() => {
    const currentDate = getToday();

    setBusinessDate(currentDate);
    setDateFilter(currentDate);
    setHistoryDateFilter(currentDate);

    getCashMovements();
    getDrawers();
    getEmployees();
    getPayrollPeriods();
    getExpenseCategories();
    getCashSources();
    getApprovalRequests();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("cash-management-live-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_cash_movements" },
        () => refreshCashManagement(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_cash_drawers" },
        () => refreshCashManagement(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approval_requests" },
        () => refreshCashManagement(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshCashManagement();
    }, 3000);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        refreshCashManagement();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, []);

  useEffect(() => {
    if (availableSourceOptions.length === 0) {
      if (source) setSource("");
      return;
    }

    if (!availableSourceOptions.includes(source)) {
      setSource(availableSourceOptions[0]);
    }
  }, [availableSourceOptions, source]);

  /// UI
  const inputClass =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
  const selectClass = inputClass;
  const labelClass =
    "text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500";

  const opscoreAlertCount = cashWatchAlerts.length;
  const opscoreHasCritical = cashHealthScore < 70;
  const opscoreHasWarning = cashHealthScore < 85 || opscoreAlertCount > 0;

  const signedAmount = (item: any) => {
    const value = Math.abs(Number(item.amount || 0));

    if (
      item.movement_type === "Cash Out" ||
      item.movement_type === "Remittance" ||
      item.source === "Expense Release" ||
      item.source === "Cash Advance" ||
      item.source === "Owner Withdrawal" ||
      item.source === "Bank Deposit" ||
      (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0)
    ) {
      return -value;
    }

    return value;
  };

  return (
    <PageGuard moduleKey="cash_management">
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-slate-50">
          <TopNavbar breadcrumb="FINANCE / CASH MANAGEMENT" />

          <datalist id="employee-name-list">
            {allEmployeeNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            {/* PAGE HEADER */}
            <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Finance
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Cash Management
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
                  Manage cash drawers, remittances, cash releases, and fund balances.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                <div
                  className={`mr-1 rounded-2xl border px-4 py-2 ${
                    activeDrawer
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]">
                    {activeDrawer ? "Drawer Open" : "Drawer Closed"}
                  </p>
                  <p className="mt-0.5 text-sm font-black text-slate-950">
                    {activeDrawer?.holder_name || "No active holder"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOpenDrawer(true)}
                  disabled={Boolean(activeDrawer)}
                  className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Open Drawer
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloseDrawer(true)}
                  disabled={!activeDrawer}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close Drawer
                </button>
                <button
                  type="button"
                  onClick={() => setShowDrawerHolderSettings(true)}
                  aria-label="Drawer settings"
                  title="Drawer settings"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.4-1.1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.1-.4 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .4 1.1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.3.2.6.4 1 .6.3.1.7.1 1.1.1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.1.4c-.2.2-.4.5-.6.9Z" />
                  </svg>
                </button>
              </div>
            </section>

            {/* KPI CARDS */}
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <EnterpriseMetric
                label="Cash On Hand"
                value={formatMoney(cashOnHand)}
                caption={activeDrawer ? "Active physical cash balance" : "No active drawer"}
              />
              <EnterpriseMetric
                label="Online Banking"
                value={formatMoney(onlineBankingTotal)}
                caption={`GCash ${formatMoney(gcashTotal)} · Bank ${formatMoney(bankTotal)} · Terminal ${formatMoney(terminalTotal)}`}
              />
              <EnterpriseMetric
                label="Pending Approvals"
                value={pendingCashApprovalCount}
                caption="Money-out requests"
                tone={pendingCashApprovalCount > 0 ? "warning" : "default"}
              />
              <EnterpriseMetric
                label="Receipt Compliance"
                value={`${receiptComplianceRate}%`}
                caption={`${withReceiptCount} with · ${withoutReceiptCount} without`}
                tone={receiptComplianceTone}
              />
              <EnterpriseMetric
                label="Today's Movements"
                value={todaysMovementCount}
                caption="Active cash ledger records"
              />
            </section>

            {/* FORM + DRAWER SUMMARY */}
            <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                <div className="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Entry Form
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Record Cash Movement
                    </h2>
                  </div>
                  <p className="max-w-xl text-sm font-medium text-slate-500">
                    Money-in records immediately. Money-out requests are routed to the Approval Center when required.
                  </p>
                </div>

                <div className="space-y-6">
                  <section>
                    <p className={labelClass}>Primary Information</p>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <label className="space-y-2">
                        <span className={labelClass}>Business Date</span>
                        <input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} className={inputClass} />
                      </label>
                      <label className="space-y-2">
                        <span className={labelClass}>Movement Type</span>
                        <select value={movementType} onChange={(e) => setMovementType(e.target.value)} className={selectClass}>
                          {movementTypes.map((type) => <option key={type}>{type}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className={labelClass}>Source</span>
                        <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
                          {availableSourceOptions.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section>
                    <p className={labelClass}>Financial Information</p>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className={labelClass}>Payment Type</span>
                        <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className={selectClass}>
                          {paymentTypes.map((type) => (
                            <option key={type} value={type} disabled={isPaymentTypeDisabled(type)}>
                              {getPaymentTypeLabel(type)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className={labelClass}>Amount</span>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
                      </label>
                    </div>
                  </section>

                  {movementType === "Cash Out" && (
                    <section className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-1">
                        <p className={labelClass}>Receipt Compliance</p>
                        <p className="text-xs font-semibold text-slate-500">
                          Track whether the released cash has supporting receipt documentation.
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptStatus("WITH_RECEIPT");
                            setNoReceiptReason("");
                            setNoReceiptExplanation("");
                          }}
                          className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                            receiptStatus === "WITH_RECEIPT"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-100"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"
                          }`}
                        >
                          <span className="block text-sm font-black">With Receipt</span>
                          <span className="mt-1 block text-xs font-semibold">Receipt/proof is available.</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReceiptStatus("WITHOUT_RECEIPT")}
                          className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                            receiptStatus === "WITHOUT_RECEIPT"
                              ? "border-red-300 bg-red-50 text-red-800 ring-4 ring-red-100"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200 hover:bg-red-50"
                          }`}
                        >
                          <span className="block text-sm font-black">Without Receipt</span>
                          <span className="mt-1 block text-xs font-semibold">Reason is required.</span>
                        </button>
                      </div>

                      {receiptStatus === "WITHOUT_RECEIPT" && (
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="space-y-2">
                            <span className={labelClass}>No Receipt Reason *</span>
                            <select
                              value={noReceiptReason}
                              onChange={(e) => setNoReceiptReason(e.target.value)}
                              className={selectClass}
                            >
                              <option value="">Select reason</option>
                              {noReceiptReasons.map((item) => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                            </select>
                          </label>

                          {noReceiptReason === "Other" && (
                            <label className="space-y-2">
                              <span className={labelClass}>Explanation *</span>
                              <input
                                value={noReceiptExplanation}
                                onChange={(e) => setNoReceiptExplanation(e.target.value)}
                                placeholder="Explain why no receipt was provided"
                                className={inputClass}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  {isCashAdvanceCashOut && (
                    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className={labelClass}>Cash Advance Details</p>
                      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className={labelClass}>Employee</span>
                          <select value={cashAdvanceEmployeeId} onChange={(e) => setCashAdvanceEmployeeId(e.target.value)} className={selectClass}>
                            <option value="">Select employee</option>
                            {cashAdvanceEmployeeOptions.map((employee) => (
                              <option key={getEmployeePayrollId(employee)} value={getEmployeePayrollId(employee)}>
                                {getEmployeeFullName(employee)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className={labelClass}>Purpose</span>
                          <input value={cashAdvancePurpose} onChange={(e) => setCashAdvancePurpose(e.target.value)} placeholder="Cash advance purpose" className={inputClass} />
                        </label>
                      </div>
                    </section>
                  )}

                  {isExpenseRelease && (
                    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className={labelClass}>Expense Release Details</p>
                      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className={labelClass}>Category</span>
                          <select value={expenseCategory} onChange={(e) => { setExpenseCategory(e.target.value); setExpenseSubcategory(""); }} className={selectClass}>
                            <option value="">Select category</option>
                            {expenseCategoryOptions.map((item) => <option key={item}>{item}</option>)}
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className={labelClass}>Subcategory</span>
                          <select value={expenseSubcategory} onChange={(e) => setExpenseSubcategory(e.target.value)} className={selectClass}>
                            <option value="">Select subcategory</option>
                            {expenseSubcategoryOptions.map((item) => <option key={item}>{item}</option>)}
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className={labelClass}>Department / Area</span>
                          <select value={expenseDepartment} onChange={(e) => setExpenseDepartment(e.target.value)} className={selectClass}>
                            <option value="">Select department</option>
                            {expenseDepartments.map((item) => <option key={item}>{item}</option>)}
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className={labelClass}>Released To / Receiver</span>
                          <input value={expenseReleasedTo} onChange={(e) => setExpenseReleasedTo(e.target.value)} list="employee-name-list" placeholder="Receiver name" className={inputClass} />
                        </label>
                      </div>
                      <label className="mt-4 block space-y-2">
                        <span className={labelClass}>Expense Description</span>
                        <textarea value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} rows={3} placeholder="Description / reason" className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
                      </label>
                    </section>
                  )}

                  <section>
                    <p className={labelClass}>Remarks</p>
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                      <span className="font-black text-slate-900">Auto audit:</span>{" "}
                      From is set to {paymentType === "Cash" ? activeDrawer?.holder_name || currentDrawerHolderName || "active drawer holder" : paymentType}.
                      Encoded by is set to {currentEmployeeName || currentDrawerHolderName || "logged-in user"}.
                      {movementType === "Cash Out" ? ` Receipt status is ${receiptLabel}.` : ""}
                    </div>

                    <label className="mt-4 block space-y-2">
                      <span className={labelClass}>Notes / Reference</span>
                      <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Reference, notes, or supporting details" className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
                    </label>
                  </section>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={resetForm} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                      Reset
                    </button>
                    <button type="button" onClick={saveMovement} disabled={isSaving} className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50">
                      {isSaving ? "Saving..." : isCashDrawerMoneyOut ? "Send for Approval" : "Save Movement"}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                <div className="border-b border-slate-200 pb-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Drawer Summary
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {activeDrawer ? activeDrawer.holder_name : "No Active Drawer"}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Cash-only drawer monitoring. Digital channels remain in Online Banking.
                  </p>
                </div>

                <div className="mt-5 divide-y divide-slate-200">
                  <InfoRow label="Cash On Hand" value={formatMoney(activeDrawerCash)} strong />
                  <InfoRow label="Opening Float" value={formatMoney(activeDrawer?.opening_float || 0)} />
                  <InfoRow label="Cash In" value={formatMoney(cashInTotal)} />
                  <InfoRow label="Cash Out" value={formatMoney(cashOutTotal)} />
                  <InfoRow label="Remittance" value={formatMoney(remittanceTotal)} />
                  <InfoRow label="Holder" value={activeDrawer?.holder_name || "-"} />
                </div>
              </aside>
            </section>

            {/* FILTERS */}
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Ledger Filters
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Cash Movement Log
                  </h2>
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {filteredMovements.length} record(s) shown
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <label className="space-y-2">
                  <span className={labelClass}>Date Scope</span>
                  <select value={ledgerDateScope} onChange={(e) => setLedgerDateScope(e.target.value)} className={selectClass}>
                    <option value="TODAY">Today</option>
                    <option value="DATE">Selected Date</option>
                    <option value="ALL">All Dates</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className={labelClass}>Date</span>
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} disabled={ledgerDateScope !== "DATE"} className={inputClass} />
                </label>
                <label className="space-y-2">
                  <span className={labelClass}>Type</span>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
                    <option value="ALL">All Types</option>
                    {movementTypes.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className={labelClass}>Payment</span>
                  <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className={selectClass}>
                    <option value="ALL">All Payments</option>
                    {paymentTypes.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className={labelClass}>Search</span>
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search ledger" className={inputClass} />
                </label>
              </div>
            </section>

            {/* CASH MOVEMENT TABLE */}
            <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
              <div className="border-b border-slate-200 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Table / Log
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Cash Movements
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Date", "Transaction", "Amount", "Holder", "Status", "Action"].map((head) => (
                        <th key={head} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredMovements.map((item) => {
                      const voided = isVoidedMovement(item);
                      const holderName = item.from_person || item.to_person || item.encoded_by || "-";

                      return (
                        <tr key={item.id} className={`transition-all duration-200 hover:bg-slate-50 ${voided ? "bg-slate-50 opacity-70" : ""}`}>
                          <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-700">
                            {item.business_date || "-"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${getMovementStyle(item.movement_type)}`}>
                                {item.movement_type || "-"}
                              </span>
                              <p className="text-sm font-black text-slate-950">
                                {item.source || "-"}
                              </p>
                              <p className="text-xs font-semibold text-slate-500">
                                {item.payment_type || "Cash"}
                                {item.remarks ? ` · ${item.remarks}` : ""}
                              </p>
                            </div>
                          </td>
                          <td className={`whitespace-nowrap px-4 py-4 text-sm font-black ${signedAmount(item) < 0 ? "text-red-700" : "text-slate-950"}`}>
                            {formatMoney(signedAmount(item))}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                            {holderName}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${voided ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>
                              {voided ? "VOIDED" : "ACTIVE"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button type="button" onClick={() => voidMovement(item.id)} disabled={voided || isSaving} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
                              Void
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMovements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <p className="text-sm font-black text-slate-950">No records found</p>
                          <p className="mt-1 text-sm font-medium text-slate-500">Adjust filters or record a new cash movement.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* DRAWER HISTORY + APPROVAL HISTORY */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                <div className="border-b border-slate-200 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Drawer History</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Cash Drawer Sessions</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <select value={historyDateScope} onChange={(e) => setHistoryDateScope(e.target.value)} className={selectClass}>
                      <option value="ALL">All Dates</option>
                      <option value="TODAY">Today</option>
                      <option value="DATE">Selected Date</option>
                    </select>
                    <input type="date" value={historyDateFilter} onChange={(e) => setHistoryDateFilter(e.target.value)} disabled={historyDateScope !== "DATE"} className={inputClass} />
                    <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)} className={selectClass}>
                      <option value="ALL">All Status</option>
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Holder','Opened','Expected','Actual','Variance','Status','Report'].map((head) => (
                          <th key={head} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDrawers.map((drawer) => {
                        const summary = getDrawerCashSummary(drawer);
                        return (
                          <tr key={drawer.id} className="transition-all duration-200 hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">{drawer.holder_name || "-"}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">{formatDateTime(drawer.opened_at || drawer.created_at)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-black text-slate-950">{formatMoney(summary.expectedBeforeClosingRemittance)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-black text-slate-950">{formatMoney(summary.actualCash)}</td>
                            <td className={`whitespace-nowrap px-4 py-3 text-sm font-black ${Number(summary.variance || 0) < 0 ? "text-red-700" : "text-slate-950"}`}>{formatMoney(summary.variance)}</td>
                            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${String(drawer.status || "").toUpperCase() === "OPEN" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>{drawer.status || "-"}</span></td>
                            <td className="px-4 py-3"><button type="button" onClick={() => printDrawerReport(drawer)} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">Print</button></td>
                          </tr>
                        );
                      })}
                      {filteredDrawers.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center"><p className="text-sm font-black text-slate-950">No records found</p><p className="mt-1 text-sm font-medium text-slate-500">No drawer sessions match the current filters.</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                <div className="border-b border-slate-200 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Approval History</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Cash Approval Requests</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Request','Requested By','Amount','Date','Status','Actions'].map((head) => (
                          <th key={head} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cashApprovalRequests.slice(0, 12).map((request) => {
                        const requestStatus = String(request.status || "PENDING").toUpperCase();
                        return (
                          <tr key={request.id} className="transition-all duration-200 hover:bg-slate-50">
                            <td className="max-w-[260px] truncate px-4 py-3 text-sm font-semibold text-slate-800">{request.title || request.request_type || "Cash Request"}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{request.requested_by || "-"}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-black text-slate-950">{formatMoney(getApprovalAmount(request))}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">{formatDateTime(request.created_at)}</td>
                            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${getApprovalStatusStyle(request.status)}`}>{requestStatus}</span></td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setSelectedApprovalRequest(request)}
                                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {cashApprovalRequests.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-10 text-center"><p className="text-sm font-black text-slate-950">No records found</p><p className="mt-1 text-sm font-medium text-slate-500">No cash approval requests yet.</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* MODALS */}
            {selectedApprovalRequest && (() => {
              const payload = getApprovalPayload(selectedApprovalRequest);
              const rejectionReason = getApprovalRejectionReason(selectedApprovalRequest);
              const requestStatus = String(selectedApprovalRequest.status || "PENDING").toUpperCase();

              return (
                <Modal title="Cash Approval Request Details" onClose={() => setSelectedApprovalRequest(null)}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Request</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{selectedApprovalRequest.title || selectedApprovalRequest.request_type || "Cash Request"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Status</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${getApprovalStatusStyle(selectedApprovalRequest.status)}`}>
                        {requestStatus}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Requested By</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{selectedApprovalRequest.requested_by || payload.encoded_by || "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Amount</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{formatMoney(getApprovalAmount(selectedApprovalRequest))}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Date</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{formatDateTime(selectedApprovalRequest.created_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Payment Type</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{payload.payment_type || "-"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Description / Remarks</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-700">
                      {selectedApprovalRequest.description || payload.remarks || payload.expense_description || "-"}
                    </p>
                  </div>

                  {requestStatus === "REJECTED" && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">Rejected Reason</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-black text-red-800">
                        {rejectionReason || "No rejection reason was encoded."}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedApprovalRequest(null)}
                    className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                  >
                    Close
                  </button>
                </Modal>
              );
            })()}

            {showDrawerHolderSettings && (
              <Modal title="Drawer Holder Settings" onClose={() => setShowDrawerHolderSettings(false)}>
                <p className="text-sm font-medium text-slate-500">
                  Authorize employees who can open and hold cash drawers.
                </p>
                <input value={drawerHolderSearch} onChange={(e) => setDrawerHolderSearch(e.target.value)} placeholder="Search employee" className={inputClass} />
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredDrawerHolderSettingEmployees.map((employee) => {
                    const name = getEmployeeFullName(employee);
                    const checked = authorizedDrawerHolders.includes(name);
                    return (
                      <button key={getEmployeePayrollId(employee)} type="button" onClick={() => toggleAuthorizedDrawerHolder(name)} className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:border-slate-300 hover:shadow-md active:scale-[0.98] ${checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-950">{name}</p>
                            <p className="mt-1 text-xs font-medium text-slate-500">{employee.employee_no || "-"} · {employee.department || "-"} · {employee.position || "-"}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${checked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{checked ? "Allowed" : "Not Allowed"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Modal>
            )}

            {showOpenDrawer && (
              <Modal title="Open Drawer" onClose={() => setShowOpenDrawer(false)}>
                <label className="space-y-2 block">
                  <span className={labelClass}>Drawer Holder</span>
                  <select value={drawerHolder} onChange={(e) => setDrawerHolder(e.target.value)} className={selectClass}>
                    <option value="">Select authorized holder</option>
                    {allowedOpenDrawerHolderOptions.map((employee) => {
                      const name = getEmployeeFullName(employee);
                      return <option key={getEmployeePayrollId(employee)} value={name}>{name}</option>;
                    })}
                  </select>
                </label>
                {allowedOpenDrawerHolderOptions.length === 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700">
                    No authorized drawer holder available. Update Drawer Settings first.
                  </div>
                )}
                <label className="space-y-2 block">
                  <span className={labelClass}>Opening Float</span>
                  <input type="number" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="0.00" className={inputClass} />
                </label>
                <label className="space-y-2 block">
                  <span className={labelClass}>Remarks</span>
                  <textarea value={drawerRemarks} onChange={(e) => setDrawerRemarks(e.target.value)} rows={3} placeholder="Opening remarks" className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
                </label>
                <button onClick={openDrawer} disabled={isSaving || allowedOpenDrawerHolderOptions.length === 0 || !drawerHolder || (!canManageDrawerForOthers && drawerHolder !== currentDrawerHolderName)} className="h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300">
                  {isSaving ? "Opening..." : "Open Drawer"}
                </button>
              </Modal>
            )}

            {showCloseDrawer && activeDrawer && (
              <Modal title="Close Drawer" onClose={() => setShowCloseDrawer(false)}>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className={labelClass}>Expected Drawer Cash</p>
                  <h3 className="mt-2 text-3xl font-black text-slate-950">{formatMoney(activeDrawerCash)}</h3>
                </div>
                <label className="space-y-2 block">
                  <span className={labelClass}>Actual Cash Counted</span>
                  <input type="number" value={actualClosingCash} onChange={(e) => setActualClosingCash(e.target.value)} placeholder="0.00" className={inputClass} />
                </label>
                <label className="space-y-2 block">
                  <span className={labelClass}>Remittance Amount</span>
                  <input type="number" value={closingRemittanceAmount} onChange={(e) => setClosingRemittanceAmount(e.target.value)} placeholder="0.00" className={inputClass} />
                </label>
                <label className="space-y-2 block">
                  <span className={labelClass}>Received By</span>
                  <input value={closingRemittanceReceivedBy} onChange={(e) => setClosingRemittanceReceivedBy(e.target.value)} list="employee-name-list" placeholder="Receiver name" className={inputClass} />
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <p className={labelClass}>Remaining Cash</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(Number(actualClosingCash || 0) - Number(closingRemittanceAmount || 0))}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <p className={labelClass}>Variance</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(Number(closingRemittanceAmount || 0) - activeDrawerCash)}</p>
                  </div>
                </div>
                <label className="space-y-2 block">
                  <span className={labelClass}>Remittance Remarks</span>
                  <textarea value={closingRemittanceRemarks} onChange={(e) => setClosingRemittanceRemarks(e.target.value)} rows={2} placeholder="Reference / notes" className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
                </label>
                <label className="space-y-2 block">
                  <span className={labelClass}>Closing Remarks</span>
                  <textarea value={closeRemarks} onChange={(e) => setCloseRemarks(e.target.value)} rows={3} placeholder="Closing remarks / variance explanation" className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
                </label>
                <button onClick={closeDrawer} disabled={isSaving} className="h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50">
                  {isSaving ? "Closing..." : "Save Remittance & Close Drawer"}
                </button>
              </Modal>
            )}
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function EnterpriseMetric({ label, value, caption, tone = "default" }: any) {
  const toneMap: Record<string, string> = {
    default: "border-slate-200 bg-white text-slate-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    danger: "border-red-200 bg-red-50 text-red-950",
    muted: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div
      className={`rounded-3xl border px-4 py-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md ${toneMap[tone] || toneMap.default}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <h2 className="mt-2 truncate text-3xl font-black tracking-tight">
        {value}
      </h2>
      {caption && (
        <p className="mt-1 truncate text-xs font-medium text-slate-500">
          {caption}
        </p>
      )}
    </div>
  );
}

function InfoRow({ label, value, strong = false }: any) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 py-3 text-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p
        className={`truncate text-right ${
          strong ? "text-lg font-black text-slate-950" : "font-semibold text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-black text-slate-950">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 text-slate-900">{children}</div>
      </div>
    </div>
  );
}
