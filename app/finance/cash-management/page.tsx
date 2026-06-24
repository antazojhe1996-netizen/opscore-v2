
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Plus,
  Save,
  Settings,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { calculateDrawerLedgerSummary } from "@/app/lib/finance/cash-ledger";
import {
  buildMovementOriginId,
  createCashMovement,
  updateCashMovement,
  voidCashMovement,
} from "@/app/lib/finance/cash-actions";

type Tone = "critical" | "warning" | "info" | "success" | "neutral";

type AssistantReminder = {
  tone?: Tone;
  text: string;
};

const statusClass = (tone: Tone = "neutral") => {
  if (tone === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-700";
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
};

function OpscoreAssistant({ reminders = [] }: { reminders: AssistantReminder[] }) {
  const prioritized = [...reminders]
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2, success: 3, neutral: 4 };
      return (order[a.tone || "neutral"] ?? 4) - (order[b.tone || "neutral"] ?? 4);
    })
    .slice(0, 5);

  const hasCritical = prioritized.some((item) => item.tone === "critical");
  const hasReminder = prioritized.length > 0;

  return (
    <div className="group fixed bottom-6 right-6 z-40">
      <div className="absolute bottom-14 right-0 hidden w-[340px] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl group-hover:block">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
          OPSCORE
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">
          Assistant Reminders
        </h3>
        <div className="mt-4 space-y-2">
          {prioritized.length === 0 ? (
            <div className={`rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${statusClass("success")}`}>
              Cash control is stable. No action required.
            </div>
          ) : (
            prioritized.map((item, index) => (
              <div
                key={`${item.text}-${index}`}
                className={`rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${statusClass(item.tone)}`}
              >
                {item.text}
              </div>
            ))
          )}
        </div>
      </div>
      <button
        type="button"
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
        title="OPSCORE Assistant"
      >
        {hasReminder && (
          <span
            className={`absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-600 ${
              hasCritical ? "animate-ping" : "animate-pulse"
            }`}
          />
        )}
        <Bot size={22} />
      </button>
    </div>
  );
}

export default function CashManagementPage() {
  const getToday = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().split("T")[0];
  };

  const today = getToday();
  const savingRef = useRef(false);

  const [movements, setMovements] = useState<any[]>([]);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [expenseSubcategories, setExpenseSubcategories] = useState<any[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [cashSources, setCashSources] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const [businessDate, setBusinessDate] = useState(today);
  const [movementType, setMovementType] = useState("Cash In");
  const [source, setSource] = useState("Restaurant Sales");
  const [paymentType, setPaymentType] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [receiptStatus, setReceiptStatus] = useState("WITH_RECEIPT");
  const [noReceiptReason, setNoReceiptReason] = useState("");
  const [noReceiptExplanation, setNoReceiptExplanation] = useState("");

  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [expenseDepartment, setExpenseDepartment] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseReleasedTo, setExpenseReleasedTo] = useState("");
  const [cashAdvanceEmployeeId, setCashAdvanceEmployeeId] = useState("");
  const [cashAdvancePurpose, setCashAdvancePurpose] = useState("");

  const [dateFilter, setDateFilter] = useState(today);
  const [ledgerDateScope, setLedgerDateScope] = useState("CURRENT_DRAWER");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showCloseDrawer, setShowCloseDrawer] = useState(false);
  const [showSourceSettings, setShowSourceSettings] = useState(false);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [selectedLiquidationMovement, setSelectedLiquidationMovement] = useState<any>(null);
  const [liquidationActualSpent, setLiquidationActualSpent] = useState("");
  const [liquidationCashReturned, setLiquidationCashReturned] = useState("");
  const [liquidationReceiptStatus, setLiquidationReceiptStatus] = useState("WITH_RECEIPT");
  const [liquidationReceiptCount, setLiquidationReceiptCount] = useState("1");
  const [liquidationNoReceiptReason, setLiquidationNoReceiptReason] = useState("");
  const [liquidationNoReceiptExplanation, setLiquidationNoReceiptExplanation] = useState("");
  const [liquidationRemarks, setLiquidationRemarks] = useState("");
  const [liquidationReturnDestination, setLiquidationReturnDestination] = useState("OWNER");

  const [drawerHolder, setDrawerHolder] = useState("");
  const [openingFloat, setOpeningFloat] = useState("");
  const [drawerRemarks, setDrawerRemarks] = useState("");
  const [actualClosingCash, setActualClosingCash] = useState("");
  const [closingRemittanceAmount, setClosingRemittanceAmount] = useState("");
  const [closingGcashRemittanceAmount, setClosingGcashRemittanceAmount] = useState("");
  const [closingRemittanceReceivedBy, setClosingRemittanceReceivedBy] = useState("");
  const [closingCashTurnoverAmount, setClosingCashTurnoverAmount] = useState("");
  const [closingGcashTurnoverAmount, setClosingGcashTurnoverAmount] = useState("");
  const [closingTurnoverTo, setClosingTurnoverTo] = useState("");
  const [closingRemittanceRemarks, setClosingRemittanceRemarks] = useState("");
  const [actualClosingGcash, setActualClosingGcash] = useState("");
  const [drawerOverrideReason, setDrawerOverrideReason] = useState("");

  const [sourceName, setSourceName] = useState("");
  const [sourceMovementType, setSourceMovementType] = useState("Cash In");
  const [sourceCategory, setSourceCategory] = useState("Revenue");

  const [isSaving, setIsSaving] = useState(false);
  const [currentEmployeeName, setCurrentEmployeeName] = useState("");
  const [currentEmployeeId, setCurrentEmployeeId] = useState("");
  const [currentCompanyId, setCurrentCompanyId] = useState("");
  const [currentRoleName, setCurrentRoleName] = useState("");
  const [currentLoginIdentifier, setCurrentLoginIdentifier] = useState("");

  const movementTypes = ["Cash In", "Cash Out"];

  const fallbackPaymentMethods = [
    {
      name: "Cash",
      is_active: true,
      deduct_from_cash_flow: true,
      requires_approval: true,
      requires_liquidation: true,
      requires_drawer: true,
      return_destination_enabled: true,
      default_return_destination: "CASH_DRAWER",
    },
    {
      name: "GCash",
      is_active: true,
      deduct_from_cash_flow: false,
      requires_approval: false,
      requires_liquidation: false,
      requires_drawer: false,
      return_destination_enabled: false,
    },
    {
      name: "Bank",
      is_active: true,
      deduct_from_cash_flow: false,
      requires_approval: false,
      requires_liquidation: false,
      requires_drawer: false,
      return_destination_enabled: false,
    },
    {
      name: "Terminal",
      is_active: true,
      deduct_from_cash_flow: false,
      requires_approval: false,
      requires_liquidation: false,
      requires_drawer: false,
      return_destination_enabled: false,
    },
    {
      name: "Owner Abono",
      is_active: true,
      deduct_from_cash_flow: false,
      requires_approval: false,
      requires_liquidation: true,
      requires_drawer: false,
      return_destination_enabled: true,
      default_return_destination: "OWNER",
    },
  ];

  const fallbackCashSources = [
    { name: "Restaurant Sales", movement_type: "Cash In", category: "Revenue", is_active: true },
    { name: "Room Sales", movement_type: "Cash In", category: "Revenue", is_active: true },
    { name: "Laundry Sales", movement_type: "Cash In", category: "Revenue", is_active: true },
    { name: "Apartment Collection", movement_type: "Cash In", category: "Collection", is_active: true },
    { name: "Other Sales", movement_type: "Cash In", category: "Revenue", is_active: true },
    { name: "Expense Return", movement_type: "Cash In", category: "Return", is_active: true },
    { name: "Expense Release", movement_type: "Cash Out", category: "Expense", is_active: true },
    { name: "Cash Advance", movement_type: "Cash Out", category: "Advance", is_active: true },
  ];

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

  const noReceiptReasons = [
    "Vendor Has No Receipt",
    "Receipt To Follow",
    "Emergency Purchase",
    "Transportation",
    "Lost Receipt",
    "Other",
  ];

  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const parseAmountValue = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const getMovementStatus = (movement: any) =>
    String(movement?.status || movement?.movement_status || "ACTIVE").toUpperCase();

  const isVoidedMovement = (movement: any) =>
    getMovementStatus(movement) === "VOIDED" ||
    Boolean(movement?.voided_at) ||
    Boolean(movement?.void_reason);

  const activeDrawer = drawers.find((drawer) => String(drawer.status || "").toUpperCase() === "OPEN");

  const drawerLedgerSummary = useMemo(
    () => calculateDrawerLedgerSummary(activeDrawer?.id, movements),
    [activeDrawer?.id, movements],
  );

  const isCurrentDrawerMovement = (item: any) =>
    Boolean(activeDrawer?.id) &&
    String(item.cash_drawer_id || "") === String(activeDrawer.id || "");

  const normalizeName = (value: any) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const activeDrawerHolderName = String(activeDrawer?.holder_name || "").trim();
  const currentActorName = String(currentEmployeeName || "").trim();
  const currentRoleText = String(currentRoleName || "").trim();

  const normalizedCurrentRole = normalizeName(currentRoleText).replace(/[_-]+/g, " ");
  const compactCurrentRole = normalizedCurrentRole.replace(/\s+/g, "");
  const currentIdentityText = normalizeName(
    [
      currentActorName,
      currentRoleText,
      currentLoginIdentifier,
    ].join(" "),
  );

  const canOverrideDrawerLock =
    compactCurrentRole.includes("superadmin") ||
    normalizedCurrentRole.includes("super admin") ||
    normalizedCurrentRole === "admin" ||
    normalizedCurrentRole.includes("operations manager") ||
    normalizedCurrentRole.includes("operation manager") ||
    normalizedCurrentRole.includes("owner") ||
    currentIdentityText.includes("superadmin") ||
    currentIdentityText.includes("@opscore.com");

  const hasActiveDrawer = Boolean(activeDrawer?.id);
  const isCurrentUserDrawerHolder =
    !hasActiveDrawer ||
    (normalizeName(activeDrawerHolderName) !== "" &&
      normalizeName(activeDrawerHolderName) === normalizeName(currentActorName));
  const drawerMismatchLocked = hasActiveDrawer && !isCurrentUserDrawerHolder;
  const canCloseActiveDrawer = !drawerMismatchLocked || canOverrideDrawerLock;
  const cashManagementLocked = drawerMismatchLocked || isSaving;

  const cashApprovalRequestTypes = [
    "EXPENSE_RELEASE",
    "CASH_ADVANCE_RELEASE",
    "OWNER_WITHDRAWAL",
    "BANK_DEPOSIT",
    "REFUND_OUT",
    "ADJUSTMENT_OUT",
  ];

  const cashApprovalRows = approvalRequests
    .filter((request) =>
      cashApprovalRequestTypes.includes(String(request?.request_type || "").trim().toUpperCase()),
    )
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, 8);

  const getApprovalRequestPayload = (request: any) => {
    if (!request?.request_payload) return {};
    if (typeof request.request_payload === "string") {
      try {
        return JSON.parse(request.request_payload);
      } catch (error) {
        return {};
      }
    }
    return request.request_payload || {};
  };

  const getApprovalDisplayAmount = (request: any) => {
    const payload = getApprovalRequestPayload(request);
    return Number(payload.amount || payload.total_amount || request.amount || 0);
  };

  const getApprovalReviewerNote = (request: any) =>
    String(
      request.rejection_reason ||
        request.approver_remarks ||
        request.approval_remarks ||
        request.manager_remarks ||
        request.remarks ||
        "",
    ).trim();

  const getApprovalStatusStyle = (status: any) => {
    const normalized = String(status || "").trim().toUpperCase();
    if (normalized === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (normalized === "REJECTED") return "border-red-200 bg-red-50 text-red-700";
    if (normalized === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-50 text-slate-600";
  };

  const getEmployeeFullName = (employee: any) =>
    `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();

  const validEmployees = useMemo(
    () =>
      employees
        .filter((item) => item?.id && getEmployeeFullName(item))
        .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b))),
    [employees],
  );

  const selectedCashAdvanceEmployee = validEmployees.find(
    (employee) => String(employee.id) === String(cashAdvanceEmployeeId),
  );

  const cashAdvanceEmployeeName = selectedCashAdvanceEmployee
    ? getEmployeeFullName(selectedCashAdvanceEmployee)
    : "";

  const activeSourceRows = useMemo(() => {
    const base = cashSources.length > 0 ? cashSources : fallbackCashSources;
    return base.filter((item) => item?.is_active !== false);
  }, [cashSources]);

  const activePaymentMethods = useMemo(() => {
    const base = paymentMethods.length > 0 ? paymentMethods : fallbackPaymentMethods;

    return base
      .filter((item) => item?.is_active !== false)
      .map((item) => ({
        ...item,
        name: String(item.name || item.payment_method || item.label || "").trim(),
      }))
      .filter((item) => item.name)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [paymentMethods]);

  const paymentTypes = activePaymentMethods.map((item) => item.name);

  const selectedPaymentMethod = activePaymentMethods.find(
    (item) => normalizeName(item.name) === normalizeName(paymentType),
  );

  const paymentDeductsFromCashFlow = Boolean(
    selectedPaymentMethod?.deduct_from_cash_flow ??
      (normalizeName(paymentType) === "cash"),
  );

  const paymentRequiresApproval = Boolean(
    selectedPaymentMethod?.requires_approval ??
      (normalizeName(paymentType) === "cash"),
  );

  const paymentRequiresLiquidation = Boolean(
    selectedPaymentMethod?.requires_liquidation ??
      (normalizeName(paymentType) === "cash"),
  );

  const paymentRequiresDrawer = Boolean(
    selectedPaymentMethod?.requires_drawer ??
      (normalizeName(paymentType) === "cash"),
  );

  const paymentReturnDestinationEnabled = Boolean(
    selectedPaymentMethod?.return_destination_enabled ??
      (normalizeName(paymentType) === "cash" || normalizeName(paymentType).includes("owner")),
  );

  const isCashInMovement = movementType === "Cash In";
  const isCashOutMovement = movementType === "Cash Out";

  const cashOutPaymentDeductsFromCashFlow = isCashOutMovement && paymentDeductsFromCashFlow;
  const cashOutPaymentRequiresApproval = isCashOutMovement && paymentRequiresApproval;
  const cashOutPaymentRequiresLiquidation = isCashOutMovement && paymentRequiresLiquidation;
  const cashOutPaymentRequiresDrawer = isCashOutMovement && paymentRequiresDrawer;

  const availableSourceOptions = useMemo(() => {
    const list = activeSourceRows
      .filter((item) => String(item.movement_type || item.direction || "Cash In") === movementType)
      .map((item) => String(item.name || item.source_name || "").trim())
      .filter(Boolean);

    return list.filter((item, index) => list.indexOf(item) === index);
  }, [activeSourceRows, movementType]);

  useEffect(() => {
    if (!availableSourceOptions.includes(source)) {
      setSource(availableSourceOptions[0] || "");
    }
  }, [movementType, availableSourceOptions]);

  useEffect(() => {
    if (paymentTypes.length > 0 && !paymentTypes.includes(paymentType)) {
      setPaymentType(paymentTypes[0]);
    }
  }, [paymentTypes.join("|"), paymentType]);

  const isCashAdvanceCashOut = movementType === "Cash Out" && source === "Cash Advance";
  const isExpenseRelease = movementType === "Cash Out" && source === "Expense Release";
  const shouldCreateExpenseFromCashOut = isExpenseRelease || isCashAdvanceCashOut;
  // MOVEMENT POSTING STANDARD:
  // A payment method can be report-only / non-cash-flow (example: Owner Abono, Pool Bar Expenses from sales)
  // and still require a ledger movement for approval audit, drawer report, PDF, and expense ledger linkage.
  // Cash On Hand impact is controlled by payment_type / deduct_from_cash_flow inside the ledger math,
  // not by skipping finance_cash_movements.
  const shouldCreateCashMovementRecord = true;
  const shouldSendCashReleaseToApproval =
    shouldCreateExpenseFromCashOut && cashOutPaymentRequiresApproval;
  // Salary Cash Advance is already released to the employee and should not require liquidation.
  // Only Expense Release should create a FOR_LIQUIDATION queue item.
  const shouldRequireLiquidationForRelease =
    isExpenseRelease && cashOutPaymentRequiresLiquidation;
  const shouldRequireDrawerForSave =
    isCashOutMovement
      ? cashOutPaymentRequiresDrawer || cashOutPaymentDeductsFromCashFlow
      : paymentDeductsFromCashFlow;

  const cashOnlyMovements = drawerLedgerSummary.movements.filter(
    (item) => normalizeName(item.payment_type || "Cash") === "cash",
  );

  const currentDrawerNonCashMovements = drawerLedgerSummary.movements.filter((item) =>
    ["gcash", "bank", "terminal"].includes(normalizeName(item.payment_type || "")),
  );

  const openingFloatTotal = drawerLedgerSummary.openingFloat;
  const cashInMovementTotal = drawerLedgerSummary.cashIn;

  const cashInTotal =
    drawerLedgerSummary.openingFloat +
    drawerLedgerSummary.cashIn +
    drawerLedgerSummary.turnoverIn;

  const cashOutTotal = drawerLedgerSummary.cashOut;
  const remittanceTotal = drawerLedgerSummary.remittance;
  const turnoverTotal = drawerLedgerSummary.turnoverOut;
  const cashOnHand = drawerLedgerSummary.expectedCash;

  const gcashTotal = drawerLedgerSummary.gcash;
  const bankTotal = drawerLedgerSummary.bank;
  const terminalTotal = drawerLedgerSummary.terminal;
  const onlineBankingTotal = drawerLedgerSummary.onlineBanking;

  const actualClosingCashValue = actualClosingCash === "" ? NaN : parseAmountValue(actualClosingCash);
  const closingCashVariance = Number.isFinite(actualClosingCashValue)
    ? actualClosingCashValue - cashOnHand
    : 0;
  const hasClosingCashVariance = Number.isFinite(actualClosingCashValue)
    ? Math.abs(closingCashVariance) > 0.009
    : false;
  const closeDrawerRequiresOverrideReason =
    drawerMismatchLocked || hasClosingCashVariance || gcashTotal < 0;
  const actualCashEntered = Number.isFinite(actualClosingCashValue);
  const cashShortageOrOverage = actualCashEntered ? actualClosingCashValue - cashOnHand : 0;
  const cashVarianceLabel =
    !actualCashEntered
      ? "Enter actual cash counted"
      : Math.abs(cashShortageOrOverage) < 0.009
        ? "Balanced"
        : cashShortageOrOverage < 0
          ? `${formatMoney(Math.abs(cashShortageOrOverage))} shortage`
          : `${formatMoney(cashShortageOrOverage)} overage`;

  const suggestedActualCashTurnover = actualCashEntered ? Math.max(actualClosingCashValue, 0) : cashOnHand;
  const suggestedFullExpectedTurnover = Math.max(cashOnHand, 0);

  const pendingCashApprovalCount = approvalRequests.filter(
    (request) =>
      cashApprovalRequestTypes.includes(String(request?.request_type || "").trim().toUpperCase()) &&
      String(request.status || "").toUpperCase() === "PENDING",
  ).length;

  const currentDrawerMovements = useMemo(() => {
    if (!activeDrawer) return [];
    return movements.filter(
      (item) => isCurrentDrawerMovement(item) && !isVoidedMovement(item),
    );
  }, [movements, activeDrawer?.id]);

  const todaysMovementCount = currentDrawerMovements.filter(
    (item) => item.business_date === today,
  ).length;

  // CASH KPI STANDARD:
  // These top-card totals must follow the same basis as Cash on Hand:
  // current active drawer + ACTIVE rows only + payment_type = Cash.
  // GCash / Bank / Terminal are shown separately in Online Banking.
  const cashInTodayTotal = cashOnlyMovements
    .filter((item) => item.business_date === today && item.movement_type === "Cash In")
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  const cashOutTodayTotal = cashOnlyMovements
    .filter((item) => item.business_date === today && item.movement_type === "Cash Out")
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  const isLiquidationEligible = (movement: any) => {
    if (isVoidedMovement(movement)) return false;
    if (movement.movement_type !== "Cash Out") return false;
    if (String(movement.source || "") !== "Expense Release") return false;

    const liquidationStatus = String(
      movement.liquidation_status || "NOT_REQUIRED",
    ).toUpperCase();

    return liquidationStatus === "FOR_LIQUIDATION";
  };

  const pendingLiquidations = movements.filter(
    (item) => isLiquidationEligible(item) && (!activeDrawer || isCurrentDrawerMovement(item)),
  );
  const pendingLiquidationAmount = pendingLiquidations.reduce(
    (sum, item) => sum + Math.abs(Number(item.amount || 0)),
    0,
  );

  const receiptTrackedRows = movements.filter(
    (item) =>
      (!activeDrawer || isCurrentDrawerMovement(item)) &&
      !isVoidedMovement(item) &&
      item.movement_type === "Cash Out" &&
      String(item.source || "") === "Expense Release",
  );

  const receiptComplianceRate =
    receiptTrackedRows.length === 0
      ? 100
      : Math.round(
          (receiptTrackedRows.filter((item) => String(item.remarks || "").includes("[Receipt: WITH_RECEIPT]")).length /
            receiptTrackedRows.length) *
            100,
        );

  const filteredMovements = useMemo(() => {
    return movements.filter((item) => {
      const matchesDrawerScope =
        ledgerDateScope === "ALL"
          ? true
          : ledgerDateScope === "CURRENT_DRAWER"
            ? activeDrawer
              ? String(item.cash_drawer_id || "") === String(activeDrawer.id || "")
              : item.business_date === today
            : ledgerDateScope === "TODAY"
              ? item.business_date === today
              : item.business_date === dateFilter;
      const matchesType = typeFilter === "ALL" ? true : item.movement_type === typeFilter;
      const matchesPayment = paymentFilter === "ALL" ? true : (item.payment_type || "Cash") === paymentFilter;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        String(item.source || "").toLowerCase().includes(search) ||
        String(item.from_person || "").toLowerCase().includes(search) ||
        String(item.to_person || "").toLowerCase().includes(search) ||
        String(item.encoded_by || "").toLowerCase().includes(search) ||
        String(item.remarks || "").toLowerCase().includes(search);

      return matchesDrawerScope && matchesType && matchesPayment && matchesSearch;
    });
  }, [movements, ledgerDateScope, dateFilter, typeFilter, paymentFilter, searchTerm, today, activeDrawer?.id]);

  const drawerHolderOptions = validEmployees.map((employee) => getEmployeeFullName(employee));
  const openDrawerHolderOptions = currentActorName ? [currentActorName] : [];

  useEffect(() => {
    if (showOpenDrawer && currentActorName) {
      setDrawerHolder(currentActorName);
    }
  }, [showOpenDrawer, currentActorName]);

const assistantReminders = useMemo<AssistantReminder[]>(() => {
      return [
      ...(pendingLiquidations.length > 0
        ? [
            {
              tone: "warning" as Tone,
              text: `${pendingLiquidations.length} released cash item(s) need liquidation / returned change.`,
            },
          ]
        : []),
      ...(cashOnHand <= 0
        ? [{ tone: "critical" as Tone, text: "Physical cash on hand is zero or negative." }]
        : []),
      ...(pendingCashApprovalCount > 0
        ? [{ tone: "warning" as Tone, text: `${pendingCashApprovalCount} cash approval request(s) pending.` }]
        : []),
      ...(receiptComplianceRate < 80
        ? [{ tone: "warning" as Tone, text: `Receipt compliance is low at ${receiptComplianceRate}%.` }]
        : []),
      ...(activeDrawer
        ? [{ tone: "info" as Tone, text: `${activeDrawer.holder_name} has an open drawer.` }]
        : [{ tone: "warning" as Tone, text: "No active cash drawer is open." }]),
    ];
  }, [
  pendingLiquidations.length,
  cashOnHand,
  pendingCashApprovalCount,
  receiptComplianceRate,
  activeDrawer?.id,
  activeDrawer?.holder_name,
  activeDrawer?.status,
  drawerMismatchLocked,
  activeDrawerHolderName,
  currentActorName,
  currentRoleName,
  currentLoginIdentifier,
]);

  const getCurrentCompanyId = async () => {
    const storedCompanyId = typeof window !== "undefined" ? localStorage.getItem("opscore_current_company_id") || "" : "";
    const companyId = String(currentCompanyId || storedCompanyId || "").trim();
    if (companyId) return companyId;

    const { data } = await supabase.from("companies").select("id").limit(1).maybeSingle();
    return String(data?.id || "");
  };

  const loadIdentity = async () => {
    if (typeof window === "undefined") return;

    const storedCurrentUser = localStorage.getItem("opscore_current_user");
    let parsedCurrentUser: any = null;

    if (storedCurrentUser) {
      try {
        parsedCurrentUser = JSON.parse(storedCurrentUser);
      } catch (error) {
        parsedCurrentUser = null;
      }
    }

    const localRoleName =
      localStorage.getItem("opscore_current_role_name") ||
      localStorage.getItem("opscore_current_role") ||
      localStorage.getItem("opscore_current_role_key") ||
      "";

    const userRecordId =
      parsedCurrentUser?.system_user_id ||
      parsedCurrentUser?.id ||
      localStorage.getItem("opscore_current_system_user_id") ||
      "";

    const sessionUsername =
      localStorage.getItem("opscore_current_username") ||
      parsedCurrentUser?.username ||
      parsedCurrentUser?.email ||
      parsedCurrentUser?.user_email ||
      parsedCurrentUser?.name ||
      "";

    let dbUsername = "";
    let dbEmployeeId = "";

    if (userRecordId) {
      const { data: systemUserData, error: systemUserError } = await supabase
        .from("system_users")
        .select("id, username, employee_id, company_id")
        .eq("id", userRecordId)
        .maybeSingle();

      if (!systemUserError && systemUserData) {
        dbUsername = String(systemUserData.username || "").trim();
        dbEmployeeId = String(systemUserData.employee_id || "").trim();

        if (!localStorage.getItem("opscore_current_company_id") && systemUserData.company_id) {
          localStorage.setItem("opscore_current_company_id", String(systemUserData.company_id));
        }
      }
    }

    const employeeName =
      localStorage.getItem("opscore_current_employee_name") ||
      parsedCurrentUser?.employee_name ||
      parsedCurrentUser?.full_name ||
      parsedCurrentUser?.name ||
      sessionUsername ||
      dbUsername ||
      "OPSCORE USER";

    const finalRoleName =
      localRoleName ||
      parsedCurrentUser?.role_name ||
      parsedCurrentUser?.role ||
      parsedCurrentUser?.role_key ||
      "";

    const employeeId =
      localStorage.getItem("opscore_current_employee_id") ||
      parsedCurrentUser?.employee_id ||
      dbEmployeeId ||
      "";

    const companyId =
      localStorage.getItem("opscore_current_company_id") ||
      parsedCurrentUser?.company_id ||
      "";

    const loginIdentifier = [
      sessionUsername,
      dbUsername,
      parsedCurrentUser?.system_user_id,
      parsedCurrentUser?.id,
      userRecordId,
    ]
      .filter(Boolean)
      .join(" ");

    setCurrentEmployeeName(employeeName);
    setCurrentEmployeeId(employeeId);
    setCurrentCompanyId(companyId);
    setCurrentRoleName(finalRoleName);
    setCurrentLoginIdentifier(loginIdentifier);
  };

  const fetchTable = async (table: string, setter: (rows: any[]) => void, order = "created_at") => {
    let query = supabase.from(table).select("*");

    // Cashier-facing Cash Management must only load ACTIVE ledger rows.
    // VOIDED / CANCELLED rows stay in the database for audit/admin only.
    if (table === "finance_cash_movements") {
      query = query.eq("status", "ACTIVE");
    }

    if (order) query = query.order(order, { ascending: false });
    const { data, error } = await query;
    if (error) {
      console.log(`GET ${table} ERROR:`, error.message);
      setter([]);
      return;
    }
    setter(data || []);
  };

  const getCashSources = async () => {
    const { data, error } = await supabase.from("finance_cash_sources").select("*").order("movement_type").order("name");
    if (error) {
      console.log("GET CASH SOURCES ERROR:", error.message);
      setCashSources([]);
      return;
    }
    setCashSources(data || []);
  };

  const getPaymentMethods = async () => {
    const { data, error } = await supabase
      .from("finance_payment_methods")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.log("GET PAYMENT METHODS ERROR:", error.message);
      setPaymentMethods([]);
      return;
    }

    setPaymentMethods(data || []);
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, company_id, employee_no, first_name, last_name, department, position, payroll_active")
      .order("first_name", { ascending: true });
    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
      setEmployees([]);
      return;
    }
    setEmployees(data || []);
  };

  const refreshCashManagement = async () => {
    await Promise.all([
      fetchTable("finance_cash_movements", setMovements, "created_at"),
      fetchTable("finance_cash_drawers", setDrawers, "created_at"),
      fetchTable("approval_requests", setApprovalRequests, "created_at"),
      getCashSources(),
      getPaymentMethods(),
      getEmployees(),
      fetchTable("expense_categories", setExpenseCategories, "name"),
      fetchTable("expense_subcategories", setExpenseSubcategories, "name"),
    ]);
  };

  useEffect(() => {
    void loadIdentity();
    void refreshCashManagement();

    const channel = supabase.channel("cash-management-realtime");
    ["finance_cash_movements", "finance_cash_drawers", "approval_requests", "finance_cash_sources", "finance_payment_methods", "expenses"].forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        void refreshCashManagement();
      });
    });
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setBusinessDate(getToday());
    setMovementType("Cash In");
    setSource("Restaurant Sales");
    setPaymentType("Cash");
    setAmount("");
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

  const buildReceiptAuditText = () => {
    if (movementType !== "Cash Out") return "";
    if (receiptStatus === "WITH_RECEIPT") return "[Receipt: WITH_RECEIPT]";
    return [
      "[Receipt: WITHOUT_RECEIPT]",
      `[No Receipt Reason: ${noReceiptReason || "Not Provided"}]`,
      noReceiptExplanation.trim() ? `[No Receipt Explanation: ${noReceiptExplanation.trim()}]` : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  const getActor = () => ({
    userId: currentEmployeeId || null,
    userName: currentEmployeeName || "OPSCORE USER",
  });
  const normalizeDuplicateKeyText = (value: any) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const getPayloadObject = (value: any) => {
    if (!value) return {};
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (error) {
        return {};
      }
    }
    return value || {};
  };

  const cashReleaseApprovalMatchesPayload = (existingRequest: any, nextPayload: any) => {
    const existingPayload = getPayloadObject(existingRequest?.request_payload);

    const existingAmount = Number(existingPayload.amount || 0);
    const nextAmount = Number(nextPayload.amount || 0);

    return (
      String(existingPayload.business_date || "") === String(nextPayload.business_date || "") &&
      String(existingPayload.cash_drawer_id || "") === String(nextPayload.cash_drawer_id || "") &&
      String(existingPayload.movement_type || "") === String(nextPayload.movement_type || "") &&
      String(existingPayload.source || "") === String(nextPayload.source || "") &&
      String(existingPayload.payment_type || "Cash") === String(nextPayload.payment_type || "Cash") &&
      Math.abs(existingAmount - nextAmount) < 0.009 &&
      normalizeDuplicateKeyText(existingPayload.from_person) === normalizeDuplicateKeyText(nextPayload.from_person) &&
      normalizeDuplicateKeyText(existingPayload.to_person) === normalizeDuplicateKeyText(nextPayload.to_person) &&
      normalizeDuplicateKeyText(existingPayload.expense_description) === normalizeDuplicateKeyText(nextPayload.expense_description) &&
      normalizeDuplicateKeyText(existingPayload.expense_released_to) === normalizeDuplicateKeyText(nextPayload.expense_released_to) &&
      normalizeDuplicateKeyText(existingPayload.cash_advance_employee_id) === normalizeDuplicateKeyText(nextPayload.cash_advance_employee_id) &&
      normalizeDuplicateKeyText(existingPayload.cash_advance_purpose) === normalizeDuplicateKeyText(nextPayload.cash_advance_purpose)
    );
  };

  const findExistingCashReleaseApproval = async ({
    companyId,
    requestType,
    requestPayload,
  }: {
    companyId: string;
    requestType: string;
    requestPayload: any;
  }) => {
    let query = supabase
      .from("approval_requests")
      .select("id, status, title, created_at, requested_by, request_payload, source_document_type, source_document_id")
      .eq("request_type", requestType)
      .in("status", ["PENDING", "APPROVED"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (companyId) query = query.eq("company_id", companyId);

    if (requestPayload.cash_drawer_id) {
      query = query.eq("source_document_type", requestType);
    }

    const { data, error } = await query;

    if (error) {
      console.log("CASH RELEASE APPROVAL DUPLICATE CHECK ERROR:", error.message);
      throw new Error(error.message);
    }

    const rows = data || [];

    return (
      rows.find((item: any) => cashReleaseApprovalMatchesPayload(item, requestPayload)) || null
    );
  };

  const saveMovement = async () => {
    if (savingRef.current) return;

    if (drawerMismatchLocked) {
      alert(`This drawer belongs to ${activeDrawerHolderName}. Please login using the drawer holder account before recording transactions.`);
      return;
    }

    if (!activeDrawer && shouldRequireDrawerForSave) {
      alert("Open a cash drawer before recording this payment source.");
      return;
    }

    if (!businessDate || !movementType || !source || !paymentType || amount === "") {
      alert("Complete business date, movement type, source, payment type, and amount.");
      return;
    }

    const amountValue = parseAmountValue(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    if (isCashOutMovement && cashOutPaymentDeductsFromCashFlow && amountValue > cashOnHand) {
      alert("Cash out cannot be greater than current cash on hand.");
      return;
    }

    if (isExpenseRelease && !expenseDescription.trim()) {
      alert("Please enter expense description.");
      return;
    }

    if (isCashAdvanceCashOut && !cashAdvanceEmployeeId) {
      alert("Please select employee for cash advance.");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    const companyId = await getCurrentCompanyId();
    const actor = getActor();
    const autoEncoded = actor.userName;
    const autoFrom = movementType === "Cash Out" ? activeDrawer?.holder_name || autoEncoded : source;
    const autoTo = movementType === "Cash In" ? activeDrawer?.holder_name || autoEncoded : expenseReleasedTo || cashAdvanceEmployeeName || "Requestor";
    const manualOriginId = buildMovementOriginId();
    const movementRemarks = [
      remarks.trim(),
      buildReceiptAuditText(),
      isExpenseRelease ? `[Released To: ${expenseReleasedTo || "Not Specified"}]` : "",
      isCashAdvanceCashOut ? `[Employee: ${cashAdvanceEmployeeName}] [Purpose: ${cashAdvancePurpose || "Cash Advance"}]` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const movementPayload = {
      company_id: companyId || null,
      business_date: businessDate,
      movement_type: movementType,
      source,
      payment_type: paymentType,
      amount: amountValue,
      from_person: autoFrom,
      to_person: autoTo,
      encoded_by: autoEncoded,
      remarks: movementRemarks,
      status: "ACTIVE",
      reference_type: shouldCreateExpenseFromCashOut ? "expense" : "manual_cash_movement",
      reference_id: null,
      approval_request_id: null,
      origin_type: shouldCreateExpenseFromCashOut
        ? shouldCreateCashMovementRecord
          ? isCashAdvanceCashOut
            ? "manual_cash_advance_release"
            : "manual_expense_release"
          : isCashAdvanceCashOut
            ? "non_cash_cash_advance_expense"
            : "non_cash_expense_release"
        : "manual_cash_movement",
      origin_id: manualOriginId,
      created_by_module: "Cash Management",
      source_action: shouldCreateExpenseFromCashOut
        ? shouldCreateCashMovementRecord
          ? isCashAdvanceCashOut
            ? "MANUAL_CASH_ADVANCE_RELEASE"
            : "MANUAL_EXPENSE_RELEASE"
          : isCashAdvanceCashOut
            ? "CREATE_NON_CASH_ADVANCE_EXPENSE_ONLY"
            : "CREATE_NON_CASH_EXPENSE_ONLY"
        : `MANUAL_${movementType.toUpperCase().replaceAll(" ", "_")}`,
      created_by_user_id: actor.userId,
      created_by_user_name: actor.userName,
      // REPORT LINK STANDARD:
      // Cash-flow rules decide whether this affects Cash on Hand.
      // Drawer linkage decides whether it appears in this drawer's report/PDF.
      // Non-cash approved releases such as "Pool Bar Expenses from sales" must still
      // stay linked to the active drawer for audit/reporting, while the ledger math
      // excludes them from cash reconciliation because payment_type is not Cash.
      cash_drawer_id:
        shouldCreateExpenseFromCashOut && activeDrawer?.id
          ? activeDrawer.id
          : shouldRequireDrawerForSave
            ? activeDrawer?.id || null
            : null,
      liquidation_status: shouldRequireLiquidationForRelease ? "FOR_LIQUIDATION" : "NOT_REQUIRED",
      net_expense_amount: shouldCreateExpenseFromCashOut ? amountValue : 0,
    };

    const getCashReleaseWorkflowKey = () => {
      if (isCashAdvanceCashOut) return "CASH_ADVANCE_RELEASE";
      if (isExpenseRelease) return "EXPENSE_RELEASE";
      return "";
    };

    const workflowApprovalIsActive = async () => {
      if (!shouldCreateExpenseFromCashOut) return false;

      const workflowKey = getCashReleaseWorkflowKey();

      if (!workflowKey) return true;

      // HARD GATE STANDARD:
      // Only EXPENSE_RELEASE and CASH_ADVANCE_RELEASE are valid cash-release workflow keys.
      // If workflow lookup fails or is missing, default to approval-required so live money cannot bypass approval.
      const runLookup = async (withCompany: boolean) => {
        let query = supabase
          .from("approval_workflows")
          .select("id, workflow_key, is_active, company_id")
          .eq("workflow_key", workflowKey)
          .limit(5);

        if (withCompany && companyId) {
          query = query.eq("company_id", companyId);
        }

        return await query;
      };

      const primary = await runLookup(Boolean(companyId));

      if (primary.error) {
        console.log("CASH RELEASE APPROVAL CONTROL CHECK ERROR:", primary.error.message);
        return true;
      }

      let rows = primary.data || [];

      if (rows.length === 0 && companyId) {
        const fallback = await runLookup(false);

        if (fallback.error) {
          console.log("CASH RELEASE APPROVAL CONTROL FALLBACK ERROR:", fallback.error.message);
          return true;
        }

        rows = fallback.data || [];
      }

      if (rows.length === 0) return true;

      return rows.some((row: any) => row.is_active !== false);
    };

    const cashReleaseNeedsApproval = shouldSendCashReleaseToApproval && (await workflowApprovalIsActive());

    if (cashReleaseNeedsApproval) {
      const requestType = getCashReleaseWorkflowKey();

      const requestTitle = isCashAdvanceCashOut
        ? `Cash Advance Release - ${cashAdvanceEmployeeName || "Employee"}`
        : `Expense Release - ${expenseDescription.trim() || source}`;

      const sourceDocumentType = requestType;
      const sourceDocumentId = manualOriginId;

      const requestPayload = {
        ...movementPayload,
        status: "PENDING_APPROVAL",
        source_document_type: sourceDocumentType,
        source_document_id: sourceDocumentId,
        should_create_expense: true,
        is_cash_advance_cash_out: isCashAdvanceCashOut,
        cash_advance_employee_id: isCashAdvanceCashOut ? cashAdvanceEmployeeId : null,
        cash_advance_employee_name: isCashAdvanceCashOut ? cashAdvanceEmployeeName : null,
        cash_advance_purpose: isCashAdvanceCashOut ? cashAdvancePurpose || "Cash Advance" : null,
        expense_category: isCashAdvanceCashOut ? "Cash Advance" : expenseCategory || "Other",
        expense_subcategory: isCashAdvanceCashOut ? "Cash Advance Release" : expenseSubcategory || null,
        expense_department: isCashAdvanceCashOut ? "Payroll" : expenseDepartment || "Operations",
        expense_description: isCashAdvanceCashOut
          ? `Cash Advance - ${cashAdvanceEmployeeName}`
          : expenseDescription.trim(),
        expense_released_to: isCashAdvanceCashOut ? cashAdvanceEmployeeName : expenseReleasedTo || null,
        workflow_key: getCashReleaseWorkflowKey(),
        requested_by_user_id: actor.userId,
        requested_by_name: actor.userName,
        requested_at: new Date().toISOString(),
      };

      let existingApproval: any = null;

      try {
        existingApproval = await findExistingCashReleaseApproval({
          companyId,
          requestType,
          requestPayload,
        });
      } catch (duplicateCheckError: any) {
        alert(`Approval duplicate safety check failed. No request was created. ${duplicateCheckError?.message || duplicateCheckError}`);
        setIsSaving(false);
        savingRef.current = false;
        return;
      }

      if (existingApproval) {
        alert(`Duplicate blocked. This cash release already has an ${existingApproval.status} approval request: ${existingApproval.title || existingApproval.id}`);
        setIsSaving(false);
        savingRef.current = false;
        await refreshCashManagement();
        return;
      }

      const { data: approvalData, error: approvalError } = await supabase
        .from("approval_requests")
        .insert({
          company_id: companyId || null,
          request_type: requestType,
          module: "Cash Management",
          title: requestTitle,
          description: `${source} request for ${formatMoney(amountValue)}. ${movementRemarks}`.trim(),
          requested_by: autoEncoded,
          status: "PENDING",
          reference_id: null,
          source_document_type: sourceDocumentType,
          source_document_id: sourceDocumentId,
          request_payload: requestPayload,
        })
        .select()
        .single();

      if (approvalError) {
        console.log("CREATE CASH RELEASE APPROVAL ERROR:", approvalError.message);
        alert(`Failed to create approval request. No cash movement was posted. ${approvalError.message}`);
        setIsSaving(false);
        savingRef.current = false;
        return;
      }

      await createAuditLog({
        userName: autoEncoded,
        module: "Cash Management",
        action: "Cash Release Sent for Approval",
        description: `${source} ${getCashReleaseWorkflowKey()} approval request created - ${formatMoney(amountValue)}`,
        severity: "warning",
        recordId: approvalData.id,
        newValue: { approvalRequest: approvalData, payload: requestPayload },
      });

      setIsSaving(false);
      savingRef.current = false;
      resetForm();
      await refreshCashManagement();
      alert(`${requestType} sent to Approval Center. No cash movement was posted yet.`);
      return;
    }

    if (shouldCreateExpenseFromCashOut && !shouldCreateCashMovementRecord && !shouldRequireLiquidationForRelease) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          company_id: companyId || null,
          expense_date: businessDate,
          category: isCashAdvanceCashOut ? "Cash Advance" : expenseCategory || "Other",
          subcategory: isCashAdvanceCashOut ? "Cash Advance Release" : expenseSubcategory || null,
          department: isCashAdvanceCashOut ? "Payroll" : expenseDepartment || "Operations",
          description: isCashAdvanceCashOut ? `Cash Advance - ${cashAdvanceEmployeeName}` : expenseDescription.trim(),
          amount: amountValue,
          released_amount: amountValue,
          actual_spent_amount: amountValue,
          returned_cash_amount: 0,
          net_expense_amount: amountValue,
          liquidation_status: "NOT_REQUIRED",
          return_destination: paymentReturnDestinationEnabled
            ? selectedPaymentMethod?.default_return_destination || "OWNER"
            : null,
          payment_method: paymentType,
          employee_id: isCashAdvanceCashOut ? cashAdvanceEmployeeId : null,
          employee_name: isCashAdvanceCashOut ? cashAdvanceEmployeeName : expenseReleasedTo || null,
          remarks: [
            movementRemarks,
            `[Payment Source: ${paymentType}]`,
            "[Cash Flow: NOT_DEDUCTED]",
          ]
            .filter(Boolean)
            .join(" "),
          source: isCashAdvanceCashOut
            ? "Cash Management - Non Cash Advance"
            : "Cash Management - Non Cash Expense",
          posted_to_cash_movements: false,
          cash_movement_id: null,
          approval_request_id: null,
          cash_posted_date: null,
        })
        .select()
        .single();

      if (expenseError) {
        console.log("SAVE NON CASH EXPENSE ERROR:", expenseError.message);
        alert(`Failed to save expense-only record. ${expenseError.message}`);
        setIsSaving(false);
        savingRef.current = false;
        return;
      }

      await createAuditLog({
        userName: autoEncoded,
        module: "Cash Management",
        action: "Expense Only Created",
        description: `${paymentType} ${source} recorded as expense only - ${formatMoney(amountValue)}. No cash drawer movement created.`,
        severity: "info",
        recordId: expenseData.id,
        newValue: { expense: expenseData, paymentMethod: selectedPaymentMethod },
      });

      setIsSaving(false);
      savingRef.current = false;
      resetForm();
      await refreshCashManagement();
      alert(`${paymentType} expense saved. No cash drawer movement was posted.`);
      return;
    }

    let movementData: any = null;

    try {
      movementData = await createCashMovement(movementPayload);
    } catch (movementError: any) {
      console.log("SAVE CASH MOVEMENT ERROR:", movementError?.message || movementError);
      alert(`Failed to save cash movement. ${movementError?.message || movementError}`);
      setIsSaving(false);
      savingRef.current = false;
      return;
    }

    let linkedExpense = null;

    if (shouldCreateExpenseFromCashOut) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          company_id: companyId || null,
          expense_date: businessDate,
          category: isCashAdvanceCashOut ? "Cash Advance" : expenseCategory || "Other",
          subcategory: isCashAdvanceCashOut ? "Cash Advance Release" : expenseSubcategory || null,
          department: isCashAdvanceCashOut ? "Payroll" : expenseDepartment || "Operations",
          description: isCashAdvanceCashOut ? `Cash Advance - ${cashAdvanceEmployeeName}` : expenseDescription.trim(),
          amount: amountValue,
          released_amount: amountValue,
          actual_spent_amount: 0,
          returned_cash_amount: 0,
          net_expense_amount: amountValue,
          liquidation_status: isExpenseRelease && shouldRequireLiquidationForRelease ? "FOR_LIQUIDATION" : "NOT_REQUIRED",
          return_destination: paymentReturnDestinationEnabled
            ? selectedPaymentMethod?.default_return_destination || (cashOutPaymentDeductsFromCashFlow ? "CASH_DRAWER" : "OWNER")
            : null,
          payment_method: paymentType,
          employee_id: isCashAdvanceCashOut ? cashAdvanceEmployeeId : null,
          employee_name: isCashAdvanceCashOut ? cashAdvanceEmployeeName : expenseReleasedTo || null,
          remarks: movementRemarks,
          source: isCashAdvanceCashOut ? "Cash Control - Cash Advance" : "Cash Control",
          posted_to_cash_movements: true,
          cash_movement_id: movementData.id,
          approval_request_id: null,
          cash_posted_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (expenseError) {
        console.log("AUTO CREATE EXPENSE ERROR:", expenseError.message);
        alert("Cash movement saved, but linked expense failed. Check expenses columns.");
      } else {
        linkedExpense = expenseData;
        await updateCashMovement(movementData.id, {
          reference_id: expenseData.id,
          origin_id: expenseData.id,
          origin_type: isCashAdvanceCashOut ? "cash_advance_expense" : "expense_release",
          source_action: isCashAdvanceCashOut ? "CREATE_CASH_ADVANCE_EXPENSE_AND_MOVEMENT" : "CREATE_EXPENSE_AND_MOVEMENT",
        });
      }
    }

    await createAuditLog({
      userName: autoEncoded,
      module: "Cash Management",
      action: shouldCreateExpenseFromCashOut ? "Cash Release Created" : "Cash Movement Created",
      description: `${movementType} ${source} recorded - ${formatMoney(amountValue)}`,
      severity: movementType === "Cash Out" ? "warning" : "info",
      recordId: movementData.id,
      newValue: { movement: movementData, expense: linkedExpense },
    });

    setIsSaving(false);
    savingRef.current = false;
    resetForm();
    await refreshCashManagement();
    alert(shouldCreateExpenseFromCashOut ? (shouldRequireLiquidationForRelease ? "Cash release saved. Liquidation warning is now active." : "Cash release saved.") : "Cash movement saved.");
  };

  const openDrawer = async () => {
    if (!currentActorName) {
      alert("Current employee identity was not detected. Please logout and login again before opening a drawer.");
      return;
    }

    if (
      !canOverrideDrawerLock &&
      drawerHolder &&
      normalizeName(drawerHolder) !== normalizeName(currentActorName)
    ) {
      alert("You can only open a cash drawer under your own account.");
      return;
    }

    if (!canOverrideDrawerLock) {
      setDrawerHolder(currentActorName);
    }

    if (activeDrawer) {
      alert("There is already an open drawer.");
      return;
    }
    if (!drawerHolder || openingFloat === "") {
      alert("Select drawer holder and opening float.");
      return;
    }
    const openingFloatValue = parseAmountValue(openingFloat);
    if (!Number.isFinite(openingFloatValue) || openingFloatValue < 0) {
      alert("Opening float cannot be negative.");
      return;
    }

    setIsSaving(true);
    const companyId = await getCurrentCompanyId();
    const actor = getActor();
    const finalDrawerHolder = canOverrideDrawerLock
      ? drawerHolder || currentActorName
      : currentActorName;

    const { data: drawerData, error: drawerError } = await supabase
      .from("finance_cash_drawers")
      .insert({
        company_id: companyId || null,
        holder_name: finalDrawerHolder,
        opening_float: openingFloatValue,
        status: "OPEN",
        remarks: drawerRemarks.trim(),
      })
      .select()
      .single();

    if (drawerError) {
      setIsSaving(false);
      alert(`Failed to open drawer. ${drawerError.message}`);
      return;
    }

    const openingPayload = {
      company_id: companyId || null,
      business_date: today,
      movement_type: "Opening Float",
      source: "Petty Cash",
      payment_type: "Cash",
      amount: openingFloatValue,
      from_person: "Petty Cash",
      to_person: finalDrawerHolder,
      encoded_by: actor.userName || finalDrawerHolder,
      remarks: drawerRemarks.trim() || "Opening drawer float",
      status: "ACTIVE",
      reference_type: "cash_drawer_opening",
      reference_id: drawerData.id,
      origin_type: "cash_drawer",
      origin_id: drawerData.id,
      created_by_module: "Cash Management",
      source_action: "OPEN_DRAWER",
      created_by_user_id: actor.userId,
      created_by_user_name: actor.userName,
      cash_drawer_id: drawerData.id,
      liquidation_status: "NOT_REQUIRED",
    };

    if (openingFloatValue > 0) {
      try {
        await createCashMovement(openingPayload);
      } catch (openingMovementError: any) {
        setIsSaving(false);
        alert(`Drawer opened, but opening float movement failed. ${openingMovementError?.message || openingMovementError}`);
        return;
      }
    }

    await createAuditLog({
      userName: actor.userName,
      module: "Cash Management",
      action: "Open Drawer",
      description: `${finalDrawerHolder} drawer opened with ${formatMoney(openingFloatValue)} float.`,
      severity: "info",
      recordId: drawerData.id,
      newValue: { drawer: drawerData, openingFloat: openingPayload },
    });

    setIsSaving(false);
    setShowOpenDrawer(false);
    setDrawerHolder("");
    setOpeningFloat("");
    setDrawerRemarks("");
    await refreshCashManagement();
  };

  const openCloseDrawerModal = async () => {
    await refreshCashManagement();

    setActualClosingCash("");
    setActualClosingGcash("");
    setClosingRemittanceAmount("");
    setClosingGcashRemittanceAmount("");
    setClosingRemittanceReceivedBy("");
    setClosingCashTurnoverAmount("");
    setClosingGcashTurnoverAmount("");
    setClosingTurnoverTo("");
    setClosingRemittanceRemarks("");
    setDrawerOverrideReason("");
    setShowCloseDrawer(true);
  };

  const closeDrawer = async () => {
    if (!activeDrawer) {
      alert("No active drawer to close.");
      return;
    }

    if (drawerMismatchLocked && !canOverrideDrawerLock) {
      alert(`This drawer belongs to ${activeDrawerHolderName}. Only the drawer holder or an authorized override role can close this drawer.`);
      return;
    }

    const actualCashValue = parseAmountValue(actualClosingCash);
    const actualGcashValue = actualClosingGcash === "" ? gcashTotal : parseAmountValue(actualClosingGcash);
    const cashRemittanceValue = closingRemittanceAmount === "" ? 0 : parseAmountValue(closingRemittanceAmount);
    const gcashRemittanceValue = closingGcashRemittanceAmount === "" ? 0 : parseAmountValue(closingGcashRemittanceAmount);
    const cashTurnoverValue = closingCashTurnoverAmount === "" ? 0 : parseAmountValue(closingCashTurnoverAmount);
    const gcashTurnoverValue = closingGcashTurnoverAmount === "" ? 0 : parseAmountValue(closingGcashTurnoverAmount);
    const cashVarianceValue = actualCashValue - cashOnHand;
    const gcashVarianceValue = actualGcashValue - gcashTotal;
    const isOverrideClose = drawerMismatchLocked && canOverrideDrawerLock;
    const reasonRequired =
      isOverrideClose ||
      Math.abs(cashVarianceValue) > 0.009 ||
      Math.abs(gcashVarianceValue) > 0.009 ||
      gcashTotal < 0;
    const finalOverrideReason = drawerOverrideReason.trim() || closingRemittanceRemarks.trim();

    const hasRemittance = cashRemittanceValue > 0 || gcashRemittanceValue > 0;
    const hasTurnover = cashTurnoverValue > 0 || gcashTurnoverValue > 0;

    if (
      !Number.isFinite(actualCashValue) ||
      actualCashValue < 0 ||
      !Number.isFinite(actualGcashValue) ||
      !Number.isFinite(cashRemittanceValue) ||
      cashRemittanceValue < 0 ||
      !Number.isFinite(gcashRemittanceValue) ||
      gcashRemittanceValue < 0 ||
      !Number.isFinite(cashTurnoverValue) ||
      cashTurnoverValue < 0 ||
      !Number.isFinite(gcashTurnoverValue) ||
      gcashTurnoverValue < 0
    ) {
      alert("Invalid closing, GCash count, remittance, or turnover amount.");
      return;
    }

    if (reasonRequired && !finalOverrideReason) {
      alert("Override / variance reason is required before closing this drawer.");
      return;
    }

    if (hasRemittance && !closingRemittanceReceivedBy.trim()) {
      alert("Enter who received the remittance.");
      return;
    }

    if (hasTurnover && !closingTurnoverTo.trim()) {
      alert("Enter who received the turnover.");
      return;
    }

    if (cashRemittanceValue + cashTurnoverValue > actualCashValue) {
      alert("Cash remittance plus cash turnover cannot be greater than actual cash counted.");
      return;
    }

    const gcashOutflowValue = gcashRemittanceValue + gcashTurnoverValue;
    if (gcashOutflowValue > 0 && gcashOutflowValue > gcashTotal) {
      alert("GCash remittance plus GCash turnover cannot be greater than current drawer GCash balance.");
      return;
    }

    setIsSaving(true);
    const companyId = await getCurrentCompanyId();
    const actor = getActor();
    const nowIso = new Date().toISOString();
    const turnoverOriginId = hasTurnover ? buildMovementOriginId() : "";
    const remittanceOriginId = hasRemittance ? buildMovementOriginId() : "";
    const postedMovements: any[] = [];

    const insertMovement = async (payload: any) => {
      try {
        const data = await createCashMovement(payload);
        postedMovements.push(data || payload);
        return data;
      } catch (error: any) {
        throw new Error(`Failed to post ${payload.payment_type} ${payload.source}. ${error?.message || error}`);
      }
    };

    const buildBasePayload = ({
      paymentType,
      value,
      fromPerson,
      toPerson,
      sourceName,
      referenceType,
      originId,
      sourceAction,
      drawerId,
      remarksText,
    }: {
      paymentType: "Cash" | "GCash";
      value: number;
      fromPerson: string;
      toPerson: string;
      sourceName: string;
      referenceType: string;
      originId: string;
      sourceAction: string;
      drawerId: string;
      remarksText: string;
    }) => ({
      company_id: companyId || null,
      business_date: today,
      movement_type:
        sourceName === "Drawer Turnover Received"
          ? "Cash In"
          : sourceName === "Drawer Turnover"
            ? "Turnover"
            : "Remittance",
      source: sourceName === "Drawer Turnover Received" ? "Drawer Turnover" : sourceName,
      payment_type: paymentType,
      amount: value,
      from_person: fromPerson,
      to_person: toPerson,
      encoded_by: actor.userName || activeDrawer.holder_name,
      remarks: remarksText,
      status: "ACTIVE",
      reference_type: referenceType,
      reference_id: originId,
      origin_type: referenceType,
      origin_id: originId,
      created_by_module: "Cash Management",
      source_action: sourceAction,
      created_by_user_id: actor.userId,
      created_by_user_name: actor.userName,
      cash_drawer_id: drawerId,
      liquidation_status: "NOT_REQUIRED",
    });

    try {
      if (cashRemittanceValue > 0) {
        await insertMovement(
          buildBasePayload({
            paymentType: "Cash",
            value: cashRemittanceValue,
            fromPerson: activeDrawer.holder_name,
            toPerson: closingRemittanceReceivedBy.trim(),
            sourceName: "Drawer Closing Remittance",
            referenceType: "drawer_remittance",
            originId: remittanceOriginId,
            sourceAction: "CLOSE_DRAWER_CASH_REMITTANCE",
            drawerId: activeDrawer.id,
            remarksText: closingRemittanceRemarks.trim() || `Cash remittance from ${activeDrawer.holder_name} to ${closingRemittanceReceivedBy.trim()}.`,
          }),
        );
      }

      if (gcashRemittanceValue > 0) {
        await insertMovement(
          buildBasePayload({
            paymentType: "GCash",
            value: gcashRemittanceValue,
            fromPerson: activeDrawer.holder_name,
            toPerson: closingRemittanceReceivedBy.trim(),
            sourceName: "Drawer Closing Remittance",
            referenceType: "drawer_remittance",
            originId: remittanceOriginId,
            sourceAction: "CLOSE_DRAWER_GCASH_REMITTANCE",
            drawerId: activeDrawer.id,
            remarksText: closingRemittanceRemarks.trim() || `GCash remittance from ${activeDrawer.holder_name} to ${closingRemittanceReceivedBy.trim()}.`,
          }),
        );
      }

      let turnoverDrawer: any = null;
      if (hasTurnover) {
        const { data: existingTurnoverDrawer, error: existingDrawerError } = await supabase
          .from("finance_cash_drawers")
          .select("*")
          .eq("status", "OPEN")
          .eq("holder_name", closingTurnoverTo.trim())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingDrawerError) {
          throw new Error(`Failed to check turnover receiver drawer. ${existingDrawerError.message}`);
        }

        if (existingTurnoverDrawer?.id) {
          turnoverDrawer = existingTurnoverDrawer;
        } else {
          const { data: newTurnoverDrawer, error: newDrawerError } = await supabase
            .from("finance_cash_drawers")
            .insert({
              company_id: companyId || null,
              holder_name: closingTurnoverTo.trim(),
              opening_float: 0,
              status: "OPEN",
              remarks: `Auto-opened from turnover by ${activeDrawer.holder_name}.`,
            })
            .select()
            .single();

          if (newDrawerError) {
            throw new Error(`Failed to open turnover receiver drawer. ${newDrawerError.message}`);
          }

          turnoverDrawer = newTurnoverDrawer;
        }

        if (cashTurnoverValue > 0) {
          await insertMovement(
            buildBasePayload({
              paymentType: "Cash",
              value: cashTurnoverValue,
              fromPerson: activeDrawer.holder_name,
              toPerson: closingTurnoverTo.trim(),
              sourceName: "Drawer Turnover",
              referenceType: "drawer_turnover",
              originId: turnoverOriginId,
              sourceAction: "CLOSE_DRAWER_CASH_TURNOVER_OUT",
              drawerId: activeDrawer.id,
              remarksText: closingRemittanceRemarks.trim() || `Cash turnover from ${activeDrawer.holder_name} to ${closingTurnoverTo.trim()}.`,
            }),
          );

          await insertMovement(
            buildBasePayload({
              paymentType: "Cash",
              value: cashTurnoverValue,
              fromPerson: activeDrawer.holder_name,
              toPerson: closingTurnoverTo.trim(),
              sourceName: "Drawer Turnover Received",
              referenceType: "drawer_turnover",
              originId: turnoverOriginId,
              sourceAction: "RECEIVE_CASH_TURNOVER",
              drawerId: turnoverDrawer.id,
              remarksText: closingRemittanceRemarks.trim() || `Cash turnover received from ${activeDrawer.holder_name}.`,
            }),
          );
        }

        if (gcashTurnoverValue > 0) {
          await insertMovement(
            buildBasePayload({
              paymentType: "GCash",
              value: gcashTurnoverValue,
              fromPerson: activeDrawer.holder_name,
              toPerson: closingTurnoverTo.trim(),
              sourceName: "Drawer Turnover",
              referenceType: "drawer_turnover",
              originId: turnoverOriginId,
              sourceAction: "CLOSE_DRAWER_GCASH_TURNOVER_OUT",
              drawerId: activeDrawer.id,
              remarksText: closingRemittanceRemarks.trim() || `GCash turnover from ${activeDrawer.holder_name} to ${closingTurnoverTo.trim()}.`,
            }),
          );

          await insertMovement(
            buildBasePayload({
              paymentType: "GCash",
              value: gcashTurnoverValue,
              fromPerson: activeDrawer.holder_name,
              toPerson: closingTurnoverTo.trim(),
              sourceName: "Drawer Turnover Received",
              referenceType: "drawer_turnover",
              originId: turnoverOriginId,
              sourceAction: "RECEIVE_GCASH_TURNOVER",
              drawerId: turnoverDrawer.id,
              remarksText: closingRemittanceRemarks.trim() || `GCash turnover received from ${activeDrawer.holder_name}.`,
            }),
          );
        }
      }

      const closeAuditRemarks = [
        closingRemittanceRemarks.trim(),
        isOverrideClose ? `[Closed By Override: ${actor.userName || "OPSCORE USER"}]` : `[Closed By: ${actor.userName || "OPSCORE USER"}]`,
        `[Closed By Role: ${currentRoleText || "Not Provided"}]`,
        `[Drawer Holder: ${activeDrawer.holder_name || activeDrawerHolderName || "Not Provided"}]`,
        `[Expected Cash: ${formatMoney(cashOnHand)}]`,
        `[Actual Cash: ${formatMoney(actualCashValue)}]`,
        `[Cash Variance: ${formatMoney(cashVarianceValue)}]`,
        `[GCash Expected: ${formatMoney(gcashTotal)}]`,
        `[GCash Actual/Confirmed: ${formatMoney(actualGcashValue)}]`,
        `[GCash Variance: ${formatMoney(gcashVarianceValue)}]`,
        finalOverrideReason ? `[Override / Variance Reason: ${finalOverrideReason}]` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const { error: drawerCloseError } = await supabase
        .from("finance_cash_drawers")
        .update({
          status: "CLOSED",
          expected_cash: cashOnHand,
          actual_cash: actualCashValue,
          closed_at: nowIso,
          closing_remittance_amount: cashRemittanceValue,
          closing_gcash_remittance_amount: gcashRemittanceValue,
          closing_remittance_received_by: closingRemittanceReceivedBy.trim(),
          closing_remittance_remarks: closeAuditRemarks,
          variance: cashVarianceValue,
          remarks: closeAuditRemarks,
        })
        .eq("id", activeDrawer.id);

      if (drawerCloseError) {
        throw new Error(`Failed to close drawer. ${drawerCloseError.message}`);
      }

      await createAuditLog({
        userName: actor.userName,
        module: "Cash Management",
        action: isOverrideClose ? "Close Drawer Override" : "Close Drawer",
        description: `${activeDrawer.holder_name} drawer closed${isOverrideClose ? " by authorized override" : ""}. Cash variance ${formatMoney(cashVarianceValue)}, GCash expected ${formatMoney(gcashTotal)}. Reason: ${finalOverrideReason || "N/A"}`,
        severity: reasonRequired ? "warning" : "info",
        recordId: activeDrawer.id,
        oldValue: activeDrawer,
        newValue: {
          actualCashValue,
          actualGcashValue,
          cashVarianceValue,
          gcashVarianceValue,
          isOverrideClose,
          overrideReason: finalOverrideReason,
          closeAuditRemarks,
          cashRemittanceValue,
          gcashRemittanceValue,
          cashTurnoverValue,
          gcashTurnoverValue,
          remittedTo: closingRemittanceReceivedBy.trim(),
          turnoverTo: closingTurnoverTo.trim(),
          postedMovements,
        },
      });

      setIsSaving(false);
      setShowCloseDrawer(false);
      setActualClosingCash("");
      setClosingRemittanceAmount("");
      setClosingGcashRemittanceAmount("");
      setClosingRemittanceReceivedBy("");
      setClosingCashTurnoverAmount("");
      setClosingGcashTurnoverAmount("");
      setClosingTurnoverTo("");
      setClosingRemittanceRemarks("");
      setActualClosingGcash("");
      setDrawerOverrideReason("");
      await refreshCashManagement();
    } catch (error: any) {
      setIsSaving(false);
      alert(error?.message || "Failed to close drawer.");
    }
  };

  const voidMovement = async (movement: any) => {
    if (drawerMismatchLocked) {
      alert(`This drawer belongs to ${activeDrawerHolderName}. Only the drawer holder can void cash movements from this drawer.`);
      return;
    }

    const reason = prompt("Void this movement? Enter reason:");
    const voidReason = String(reason || "").trim();
    if (!voidReason) return;

    const actor = getActor();

    try {
      await voidCashMovement({
        movementId: movement.id,
        reason: voidReason,
        voidedBy: actor.userName,
      });
    } catch (voidError: any) {
      alert(`Failed to void cash movement. ${voidError?.message || voidError}`);
      return;
    }

    await createAuditLog({
      userName: actor.userName,
      module: "Cash Management",
      action: "Void Cash Movement",
      description: `${movement.source} voided. Reason: ${voidReason}`,
      severity: "critical",
      recordId: movement.id,
      oldValue: movement,
      newValue: { status: "VOIDED", voidReason, voidedBy: actor.userName },
    });

    await refreshCashManagement();
  };

  const openLiquidation = (movement: any) => {
    setSelectedLiquidationMovement(movement);
    const releasedAmount = Math.abs(Number(movement.amount || 0));
    setLiquidationActualSpent(String(releasedAmount));
    setLiquidationCashReturned("0");
    setLiquidationReceiptStatus("WITH_RECEIPT");
    setLiquidationReceiptCount("1");
    setLiquidationNoReceiptReason("");
    setLiquidationNoReceiptExplanation("");
    const defaultDestination =
      String(movement.return_destination || "").trim().toUpperCase() ||
      (String(movement.payment_type || "").toLowerCase().includes("owner")
        ? "OWNER"
        : movement.cash_drawer_id
          ? "CASH_DRAWER"
          : "OWNER");
    setLiquidationReturnDestination(defaultDestination === "CASH_DRAWER" ? "CASH_DRAWER" : "OWNER");
    setLiquidationRemarks("");
    setShowLiquidationModal(true);
  };

  const handleLiquidationCashReturnedChange = (value: string) => {
    setLiquidationCashReturned(value);

    if (!selectedLiquidationMovement) return;

    const releasedAmount = Math.abs(Number(selectedLiquidationMovement.amount || 0));
    const returnedAmount = Number(value || 0);

    if (Number.isFinite(returnedAmount)) {
      setLiquidationActualSpent(String(Math.max(releasedAmount - returnedAmount, 0)));
    }
  };

  const buildLiquidationAuditText = () => {
    const receiptText =
      liquidationReceiptStatus === "WITH_RECEIPT"
        ? `[Liquidation Receipt: WITH_RECEIPT] [Receipt Count: ${liquidationReceiptCount || "0"}]`
        : [
            "[Liquidation Receipt: WITHOUT_RECEIPT]",
            `[Receipt Count: ${liquidationReceiptCount || "0"}]`,
            `[No Receipt Reason: ${liquidationNoReceiptReason || "Not Provided"}]`,
            liquidationNoReceiptExplanation.trim()
              ? `[No Receipt Explanation: ${liquidationNoReceiptExplanation.trim()}]`
              : "",
          ]
            .filter(Boolean)
            .join(" ");

    return [
      liquidationRemarks.trim(),
      `[Returned To: ${liquidationReturnDestination === "CASH_DRAWER" ? "Cash Drawer" : "Owner"}]`,
      receiptText,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const submitLiquidation = async () => {
    if (drawerMismatchLocked) {
      alert(`This drawer belongs to ${activeDrawerHolderName}. Only the drawer holder can submit liquidation for this drawer.`);
      return;
    }

    if (!selectedLiquidationMovement) return;

    const releasedAmount = Math.abs(Number(selectedLiquidationMovement.amount || 0));
    const actualSpent = parseAmountValue(liquidationActualSpent);
    const cashReturned = parseAmountValue(liquidationCashReturned || 0);
    const receiptCount = Number(liquidationReceiptCount || 0);
    const finalLiquidationRemarks = buildLiquidationAuditText();

    if (!Number.isFinite(actualSpent) || actualSpent < 0 || !Number.isFinite(cashReturned) || cashReturned < 0) {
      alert("Actual spent and cash returned must be valid non-negative amounts.");
      return;
    }

    if (!Number.isFinite(receiptCount) || receiptCount < 0) {
      alert("Receipt count must be zero or greater.");
      return;
    }

    if (liquidationReceiptStatus === "WITHOUT_RECEIPT" && !liquidationNoReceiptReason.trim()) {
      alert("Please select no-receipt reason or switch receipt status to With Receipt.");
      return;
    }

    if (Math.abs(actualSpent + cashReturned - releasedAmount) > 0.009) {
      alert("Liquidation must balance: Actual Spent + Cash Returned must equal Released Amount.");
      return;
    }

    setIsSaving(true);
    const companyId = await getCurrentCompanyId();
    const actor = getActor();
    const liquidatedAt = new Date().toISOString();
    const liquidatedBy = actor.userName;

    try {
      await updateCashMovement(selectedLiquidationMovement.id, {
        liquidation_status: "LIQUIDATED",
        actual_spent_amount: actualSpent,
        returned_cash_amount: cashReturned,
        net_expense_amount: actualSpent,
        liquidated_at: liquidatedAt,
        liquidated_by: liquidatedBy,
        liquidation_remarks: finalLiquidationRemarks,
        receipt_count: receiptCount,
        return_destination: liquidationReturnDestination,
      });
    } catch (movementUpdateError: any) {
      setIsSaving(false);
      alert(`Failed to liquidate movement. ${movementUpdateError?.message || movementUpdateError}`);
      return;
    }

    const linkedExpenseId = selectedLiquidationMovement.reference_id;
    if (linkedExpenseId) {
      await supabase
        .from("expenses")
        .update({
          amount: actualSpent,
          actual_spent_amount: actualSpent,
          returned_cash_amount: cashReturned,
          net_expense_amount: actualSpent,
          liquidation_status: "LIQUIDATED",
          liquidated_at: liquidatedAt,
          liquidated_by: liquidatedBy,
          liquidation_remarks: finalLiquidationRemarks,
          receipt_count: receiptCount,
          return_destination: liquidationReturnDestination,
        })
        .eq("id", linkedExpenseId);
    } else {
      await supabase
        .from("expenses")
        .update({
          amount: actualSpent,
          actual_spent_amount: actualSpent,
          returned_cash_amount: cashReturned,
          net_expense_amount: actualSpent,
          liquidation_status: "LIQUIDATED",
          liquidated_at: liquidatedAt,
          liquidated_by: liquidatedBy,
          liquidation_remarks: finalLiquidationRemarks,
          receipt_count: receiptCount,
          return_destination: liquidationReturnDestination,
        })
        .eq("cash_movement_id", selectedLiquidationMovement.id);
    }

    if (cashReturned > 0 && liquidationReturnDestination === "CASH_DRAWER") {
      const returnPayload = {
        company_id: companyId || null,
        business_date: today,
        movement_type: "Cash In",
        source: selectedLiquidationMovement.payment_type === "Owner Abono" ? "Owner Abono Return" : "Expense Return",
        payment_type: "Cash",
        amount: cashReturned,
        from_person: selectedLiquidationMovement.to_person || "Requestor",
        to_person: activeDrawer?.holder_name || selectedLiquidationMovement.from_person || liquidatedBy,
        encoded_by: liquidatedBy,
        remarks: `Auto cash return to drawer from liquidation of ${selectedLiquidationMovement.source}. ${finalLiquidationRemarks}`.trim(),
        status: "ACTIVE",
        reference_type: "expense_liquidation_return",
        reference_id: selectedLiquidationMovement.id,
        origin_type: "expense_liquidation_return",
        origin_id: selectedLiquidationMovement.id,
        created_by_module: "Cash Management",
        source_action: "SAVE_LIQUIDATION_RETURN",
        created_by_user_id: actor.userId,
        created_by_user_name: actor.userName,
        cash_drawer_id: activeDrawer?.id || selectedLiquidationMovement.cash_drawer_id || null,
        liquidation_status: "NOT_REQUIRED",
      };

      const existingReturnMovement = movements.find(
        (item) =>
          !isVoidedMovement(item) &&
          item.reference_type === "expense_liquidation_return" &&
          String(item.reference_id || "") === String(selectedLiquidationMovement.id || ""),
      );

      if (existingReturnMovement?.id) {
        try {
          await updateCashMovement(existingReturnMovement.id, {
            business_date: returnPayload.business_date,
            movement_type: "Cash In",
            source: returnPayload.source,
            payment_type: "Cash",
            amount: returnPayload.amount,
            from_person: returnPayload.from_person,
            to_person: returnPayload.to_person,
            encoded_by: returnPayload.encoded_by,
            remarks: returnPayload.remarks,
            status: "ACTIVE",
            cash_drawer_id: returnPayload.cash_drawer_id,
            liquidation_status: "NOT_REQUIRED",
          });
        } catch (returnUpdateError: any) {
          setIsSaving(false);
          alert(`Liquidation saved, but returned cash update failed. ${returnUpdateError?.message || returnUpdateError}`);
          return;
        }
      } else {
        try {
          await createCashMovement(returnPayload);
        } catch (returnInsertError: any) {
          setIsSaving(false);
          alert(`Liquidation saved, but returned cash posting failed. ${returnInsertError?.message || returnInsertError}`);
          return;
        }
      }
    }

    await createAuditLog({
      userName: liquidatedBy,
      module: "Cash Management",
      action: "Cash Release Liquidated",
      description: `${selectedLiquidationMovement.source} liquidated. Released ${formatMoney(releasedAmount)}, spent ${formatMoney(actualSpent)}, returned ${formatMoney(cashReturned)}.`,
      severity: cashReturned > 0 ? "warning" : "info",
      recordId: selectedLiquidationMovement.id,
      oldValue: selectedLiquidationMovement,
      newValue: {
        actualSpent,
        cashReturned,
        receiptStatus: liquidationReceiptStatus,
        receiptCount,
        liquidationRemarks: finalLiquidationRemarks,
        liquidatedBy,
      },
    });

    setIsSaving(false);
    setShowLiquidationModal(false);
    setSelectedLiquidationMovement(null);
    await refreshCashManagement();
    alert(
      liquidationReturnDestination === "CASH_DRAWER"
        ? "Liquidation saved. Returned cash was posted to Cash In if applicable."
        : "Liquidation saved. Returned cash is marked as returned to Owner and was not posted to drawer cash."
    );
  };

  const saveCashSource = async () => {
    const cleanName = sourceName.trim();

    if (!cleanName) {
      alert("Enter source name.");
      return;
    }

    const payload = {
      name: cleanName,
      movement_type: sourceMovementType,
      category: sourceCategory.trim() || "Revenue",
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const existingSource = cashSources.find(
      (item) =>
        String(item.name || item.source_name || "")
          .trim()
          .toLowerCase() === cleanName.toLowerCase(),
    );

    const { error } = existingSource?.id
      ? await supabase
          .from("finance_cash_sources")
          .update(payload)
          .eq("id", existingSource.id)
      : await supabase.from("finance_cash_sources").insert(payload);

    if (error) {
      alert(`Failed to save source. ${error.message}`);
      return;
    }

    setSourceName("");
    setSourceMovementType("Cash In");
    setSourceCategory("Revenue");
    await getCashSources();
  };

  const toggleSourceActive = async (item: any) => {
    await supabase.from("finance_cash_sources").update({ is_active: item.is_active === false }).eq("id", item.id);
    await getCashSources();
  };

  const expenseCategoryOptions =
    expenseCategories.length > 0
      ? expenseCategories.map((item) => item.name || item.category_name || item.label).filter(Boolean)
      : fallbackExpenseCategories;

  const selectedExpenseCategoryRecord = expenseCategories.find(
    (item) => String(item.name || item.category_name || item.label || "") === String(expenseCategory || ""),
  );

  const expenseSubcategoryOptions =
    expenseSubcategories
      .filter((item) => {
        if (!expenseCategory) return false;
        if (item.category_id && selectedExpenseCategoryRecord?.id) return String(item.category_id) === String(selectedExpenseCategoryRecord.id);
        return String(item.category || "") === String(expenseCategory || "");
      })
      .map((item) => item.name || item.subcategory_name || item.label)
      .filter(Boolean).length > 0
      ? expenseSubcategories
          .filter((item) => {
            if (!expenseCategory) return false;
            if (item.category_id && selectedExpenseCategoryRecord?.id) return String(item.category_id) === String(selectedExpenseCategoryRecord.id);
            return String(item.category || "") === String(expenseCategory || "");
          })
          .map((item) => item.name || item.subcategory_name || item.label)
          .filter(Boolean)
      : fallbackSubcategories[expenseCategory] || [];



  const getDrawerMovements = (drawer: any) => {
    return movements
      .filter(
        (item) =>
          String(item.cash_drawer_id || "") === String(drawer?.id || "") &&
          !isVoidedMovement(item),
      )
      .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
  };

  const getDrawerCashSummary = (drawer: any) => {
    const rows = getDrawerMovements(drawer);

    const paymentKey = (value: any) => normalizeName(value || "Cash");
    const sourceKey = (value: any) => normalizeName(value);
    const typeKey = (value: any) => String(value || "").trim();

    // CASH RECONCILIATION STANDARD:
    // Only physical Cash affects expected cash / cash variance.
    // Custom payment types such as "Pool Bar Expenses from sales" remain in reports,
    // but never reduce the drawer's physical cash-on-hand.
    const cashRows = rows.filter((item) => paymentKey(item.payment_type) === "cash");

    const openingFloatTotal = cashRows
      .filter((item) => typeKey(item.movement_type) === "Opening Float")
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const cashTurnoverReceivedTotal = cashRows
      .filter((item) => {
        const sourceText = sourceKey(item.source);
        const actionText = String(item.source_action || "").toUpperCase();
        const isDrawerTurnover = sourceText.includes("drawer turnover");

        return (
          typeKey(item.movement_type) === "Cash In" &&
          isDrawerTurnover &&
          (actionText.startsWith("RECEIVE_") || actionText === "")
        );
      })
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const cashSalesTotal = cashRows
      .filter(
        (item) =>
          typeKey(item.movement_type) === "Cash In" &&
          sourceKey(item.source) !== "expense return" &&
          !sourceKey(item.source).includes("drawer turnover"),
      )
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const cashReturnTotal = cashRows
      .filter((item) => typeKey(item.movement_type) === "Cash In" && sourceKey(item.source) === "expense return")
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const cashExpenseTotal = cashRows
      .filter((item) => typeKey(item.movement_type) === "Cash Out")
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const remittanceTotalValue = cashRows
      .filter((item) => typeKey(item.movement_type) === "Remittance")
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const turnoverTotalValue = cashRows
      .filter((item) => {
        const sourceText = sourceKey(item.source);
        const actionText = String(item.source_action || "").toUpperCase();

        return (
          typeKey(item.movement_type) === "Turnover" &&
          sourceText.includes("drawer turnover") &&
          (actionText.includes("TURNOVER_OUT") || actionText === "")
        );
      })
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const actualCash = Number(drawer?.actual_cash || 0);

    // CLOSED DRAWER REPORT STANDARD:
    // The PDF must follow the same source of truth used at drawer close.
    // For closed drawers, use saved finance_cash_drawers.expected_cash / variance.
    // Recomputing from historical movements can double-count manual recon rows
    // such as Room Sales + Drawer Turnover Received for the same physical cash.
    const storedExpectedCash = Number(drawer?.expected_cash);
    const hasStoredExpectedCash =
      String(drawer?.status || "").toUpperCase() === "CLOSED" &&
      Number.isFinite(storedExpectedCash);

    const computedExpectedCashBeforeClose =
      openingFloatTotal + cashSalesTotal + cashReturnTotal + cashTurnoverReceivedTotal - cashExpenseTotal;

    const expectedCashBeforeClose = hasStoredExpectedCash
      ? storedExpectedCash
      : computedExpectedCashBeforeClose;

    // If a closed drawer has a saved expected cash value, back-solve the displayed
    // turnover received line so the printed reconciliation ties to the actual close.
    // This prevents old/manual turnover-recon rows from inflating Expected Cash.
    const reportCashTurnoverReceivedTotal = hasStoredExpectedCash
      ? Math.max(
          0,
          expectedCashBeforeClose + cashExpenseTotal - openingFloatTotal - cashSalesTotal - cashReturnTotal,
        )
      : cashTurnoverReceivedTotal;

    const totalCashOutflowAtClose = remittanceTotalValue + turnoverTotalValue;
    const remainingCash = Math.max(actualCash - totalCashOutflowAtClose, 0);

    const storedVariance = Number(drawer?.variance);
    const variance =
      String(drawer?.status || "").toUpperCase() === "CLOSED" && Number.isFinite(storedVariance)
        ? storedVariance
        : actualCash - expectedCashBeforeClose;

    const salesBySource = (sourceName: string) =>
      rows
        .filter(
          (item) =>
            typeKey(item.movement_type) === "Cash In" &&
            sourceKey(item.source).includes(sourceName.toLowerCase()),
        )
        .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const collectionsByPayment = (paymentNames: string | string[]) => {
      const names = (Array.isArray(paymentNames) ? paymentNames : [paymentNames]).map((item) => normalizeName(item));

      return rows
        .filter(
          (item) =>
            typeKey(item.movement_type) === "Cash In" &&
            sourceKey(item.source) !== "expense return" &&
            !sourceKey(item.source).includes("drawer turnover") &&
            names.includes(paymentKey(item.payment_type)),
        )
        .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
    };

    const expenseBySource = (sourceName: string) =>
      rows
        .filter(
          (item) =>
            typeKey(item.movement_type) === "Cash Out" &&
            sourceKey(item.source).includes(sourceName.toLowerCase()),
        )
        .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const roomSales = salesBySource("Room");
    const restaurantSales = salesBySource("Restaurant");
    const apartmentCollection = salesBySource("Apartment");
    const otherSales = rows
      .filter(
        (item) =>
          typeKey(item.movement_type) === "Cash In" &&
          sourceKey(item.source) !== "expense return" &&
          !sourceKey(item.source).includes("drawer turnover") &&
          !sourceKey(item.source).includes("room") &&
          !sourceKey(item.source).includes("restaurant") &&
          !sourceKey(item.source).includes("apartment"),
      )
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    // REPORTING STANDARD:
    // Expense summary includes all approved/released expense movements linked to the drawer,
    // regardless of payment type. This is where "Pool Bar Expenses from sales" appears.
    // Cash reconciliation above remains cash-only.
    const expenseRelease = expenseBySource("Expense Release");
    const cashAdvance = expenseBySource("Cash Advance");
    const ownerWithdrawal = expenseBySource("Owner Withdrawal");
    const bankDeposit = expenseBySource("Bank Deposit");
    const otherExpenses = rows
      .filter(
        (item) =>
          typeKey(item.movement_type) === "Cash Out" &&
          !sourceKey(item.source).includes("expense release") &&
          !sourceKey(item.source).includes("cash advance") &&
          !sourceKey(item.source).includes("owner withdrawal") &&
          !sourceKey(item.source).includes("bank deposit"),
      )
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const manualCashExpenses = rows
      .filter(
        (item) =>
          typeKey(item.movement_type) === "Cash Out" &&
          paymentKey(item.payment_type) === "cash" &&
          !sourceKey(item.source).includes("expense release") &&
          !sourceKey(item.source).includes("cash advance") &&
          !sourceKey(item.source).includes("owner withdrawal") &&
          !sourceKey(item.source).includes("bank deposit"),
      )
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    const reportOnlyExpenses = rows
      .filter(
        (item) =>
          typeKey(item.movement_type) === "Cash Out" &&
          paymentKey(item.payment_type) !== "cash",
      )
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

    return {
      rows,
      openingFloatTotal,
      cashSalesTotal,
      cashTurnoverReceivedTotal: reportCashTurnoverReceivedTotal,
      cashReturnTotal,
      cashExpenseTotal,
      expectedCashBeforeRemittance: expectedCashBeforeClose,
      turnoverTotalValue,
      totalCashOutflowAtClose,
      actualCash,
      remittanceTotalValue,
      remainingCash,
      variance,
      cashCollections: collectionsByPayment("Cash"),
      gcashCollections: collectionsByPayment("GCash"),
      bankCollections: collectionsByPayment(["Bank", "Bank Transfer"]),
      terminalCollections: collectionsByPayment(["Terminal", "Terminal / Card", "Credit Card", "Card"]),
      roomSales,
      restaurantSales,
      apartmentCollection,
      otherSales,
      expenseRelease,
      cashAdvance,
      ownerWithdrawal,
      bankDeposit,
      otherExpenses,
      manualCashExpenses,
      reportOnlyExpenses,
    };
  };

  const printDrawerReport = (drawer: any) => {
    const summary = getDrawerCashSummary(drawer);
    const reportStatus = String(drawer?.status || "").toUpperCase() || "OPEN";
    const isBalanced = Math.abs(Number(summary.variance || 0)) < 0.01;
    const generatedAt = new Date().toLocaleString("en-PH", { hour12: false });
    const openedAt = drawer?.opened_at ? new Date(drawer.opened_at).toLocaleString("en-PH", { hour12: false }) : "-";
    const closedAt = drawer?.closed_at ? new Date(drawer.closed_at).toLocaleString("en-PH", { hour12: false }) : "-";
    const businessDateValue = drawer?.business_date || drawer?.created_at?.slice?.(0, 10) || today;
    const remittanceReceiver = String(drawer?.closing_remittance_received_by || "").trim();
    const turnoverReceiver =
      summary.rows.find((item) => {
        const sourceText = String(item.source || "").toLowerCase();
        const actionText = String(item.source_action || "").toUpperCase();

        return (
          String(item.movement_type || "") === "Turnover" &&
          sourceText.includes("drawer turnover") &&
          (actionText.includes("TURNOVER_OUT") || actionText === "") &&
          String(item.to_person || "").trim()
        );
      })?.to_person || "";
    const receivedBy = remittanceReceiver || String(turnoverReceiver || drawer?.received_by || "").trim() || "-";
    const managementRemarks = drawer?.remarks || drawer?.closing_remarks || "-";
    const totalCollections = summary.cashCollections + summary.gcashCollections + summary.bankCollections + summary.terminalCollections;
    const totalSales = summary.roomSales + summary.restaurantSales + summary.apartmentCollection + summary.otherSales;
    const totalExpenses = summary.expenseRelease + summary.cashAdvance + summary.ownerWithdrawal + summary.bankDeposit + summary.otherExpenses;

    const rowsHtml = summary.rows
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.business_date || "-"}</td>
            <td>${item.movement_type || "-"}</td>
            <td>${item.source || "-"}</td>
            <td>${item.payment_type || "Cash"}</td>
            <td>${item.from_person || "-"}</td>
            <td>${item.to_person || "-"}</td>
            <td>${item.encoded_by || "-"}</td>
            <td class="money">${formatMoney(item.amount)}</td>
            <td>${item.remarks || "-"}</td>
          </tr>`,
      )
      .join("");

    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Daily Cash Control Report</title>
          <style>
            @page { size: A4; margin: 9mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #ffffff; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              font-size: 10px;
              line-height: 1.2;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .page {
              width: 100%;
              min-height: 270mm;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .page:last-child { page-break-after: auto; break-after: auto; }
            .top {
              display: grid;
              grid-template-columns: 1fr 1.35fr;
              gap: 22px;
              align-items: start;
              border-bottom: 4px solid #111827;
              padding-bottom: 9px;
            }
            .brand { font-size: 27px; line-height: 0.95; font-weight: 900; letter-spacing: -0.8px; }
            .sub { margin-top: 7px; font-size: 8.5px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; }
            .generated { margin-top: 6px; font-size: 9px; color: #475569; }
            h1 { margin: 0; font-size: 26px; line-height: 0.94; font-weight: 900; letter-spacing: 0.7px; text-transform: uppercase; }
            .meta { margin-top: 6px; font-size: 10px; color: #475569; font-weight: 700; line-height: 1.35; }
            .balanced { margin-top: 3px; font-size: 11px; color: ${isBalanced ? "#047857" : "#b91c1c"}; font-weight: 900; }
            .info-grid { margin-top: 13px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .info { border-left: 5px solid #d4af37; background: #f8fafc; padding: 8px 10px; min-height: 48px; overflow: hidden; }
            .label { font-size: 7.5px; font-weight: 900; letter-spacing: 2.4px; color: #64748b; text-transform: uppercase; white-space: nowrap; }
            .value { margin-top: 5px; font-size: 11.5px; line-height: 1.15; font-weight: 900; color: #0f172a; word-break: break-word; }
            .grid { margin-top: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 11px; align-items: start; }
            .box { border: 1px solid #cbd5e1; padding: 9px 10px; min-height: 108px; overflow: hidden; }
            .box h2 { margin: 0 0 6px; padding-bottom: 5px; border-bottom: 3px solid #111827; font-size: 11px; line-height: 1; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; white-space: nowrap; }
            .line { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #cbd5e1; padding: 3.8px 0; font-size: 10.2px; line-height: 1.15; }
            .line span { min-width: 0; }
            .line strong { font-weight: 900; white-space: nowrap; }
            .negative { color: #b91c1c; }
            .total { border-top: 2px solid #111827; font-weight: 900; }
            .note { margin-top: 10px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1e3a8a; padding: 7px 9px; font-size: 8.8px; line-height: 1.35; }
            .remarks { margin-top: 9px; border: 1px solid #e2e8f0; background: #f8fafc; padding: 8px 10px; min-height: 38px; font-size: 9.5px; line-height: 1.25; }
            .remarks h3 { margin: 0 0 6px; font-size: 8.5px; line-height: 1; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; }
            .signatures { margin-top: 18px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; text-align: center; }
            .sig { border-top: 2px solid #111827; padding-top: 5px; font-size: 9px; line-height: 1.1; }
            .sig strong { display: block; font-size: 10px; line-height: 1.1; font-weight: 900; }
            .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 8.5px; color: #64748b; }
            .page2 .top { grid-template-columns: 1fr 1.15fr; }
            .page2 .brand { font-size: 25px; line-height: 1; white-space: nowrap; }
            .page2 h1 { font-size: 29px; line-height: 0.92; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 13px; font-size: 7.2px; line-height: 1.12; }
            th { text-align: left; color: #94a3b8; font-size: 6.5px; line-height: 1; letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 3px; border-bottom: 1px solid #e2e8f0; vertical-align: bottom; }
            td { vertical-align: top; padding: 5px 3px; border-bottom: 1px solid #e2e8f0; font-weight: 700; word-break: break-word; overflow-wrap: anywhere; }
            td.money { text-align: right; font-weight: 900; white-space: nowrap; word-break: normal; }
            .w-num { width: 3.5%; } .w-date { width: 8%; } .w-type { width: 8%; } .w-source { width: 11%; } .w-payment { width: 8%; } .w-person { width: 10%; } .w-amount { width: 9%; } .w-remarks { width: 23.5%; }
            @media print { .no-print { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <section class="page">
            <div class="top">
              <div>
                <div class="brand">Vincent Resort<br/>Hotel</div>
                <div class="sub">OPERATIONS FINANCE CONTROL</div>
                <div class="generated">Generated: ${generatedAt}</div>
              </div>
              <div>
                <h1>DAILY CASH DRAWER REPORT</h1>
                <div class="meta">Business Date: ${businessDateValue}<br/>Report Status: ${reportStatus}</div>
                <div class="balanced">${isBalanced ? "BALANCED" : "VARIANCE"}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info"><div class="label">Drawer Holder</div><div class="value">${drawer?.holder_name || "-"}</div></div>
              <div class="info"><div class="label">Opened</div><div class="value">${openedAt}</div></div>
              <div class="info"><div class="label">Closed</div><div class="value">${closedAt}</div></div>
              <div class="info"><div class="label">Received By</div><div class="value">${receivedBy}</div></div>
            </div>

            <div class="grid">
              <div class="box">
                <h2>CASH RECONCILIATION</h2>
                <div class="line"><span>Opening Float</span><strong>${formatMoney(summary.openingFloatTotal)}</strong></div>
                <div class="line"><span>Add: Cash Sales</span><strong>${formatMoney(summary.cashSalesTotal)}</strong></div>
                <div class="line"><span>Add: Cash Turnover Received</span><strong>${formatMoney(summary.cashTurnoverReceivedTotal)}</strong></div>
                <div class="line"><span>Add: Expense Returns</span><strong>${formatMoney(summary.cashReturnTotal)}</strong></div>
                <div class="line"><span>Less: Cash Expenses / Releases</span><strong class="negative">(${formatMoney(summary.cashExpenseTotal)})</strong></div>
                <div class="line total"><span>Expected Cash Before Close</span><strong>${formatMoney(summary.expectedCashBeforeRemittance)}</strong></div>
                <div class="line"><span>Actual Cash Counted</span><strong>${formatMoney(summary.actualCash)}</strong></div>
                <div class="line"><span>Cash Turnover Out</span><strong>${formatMoney(summary.turnoverTotalValue)}</strong></div>
                <div class="line"><span>Cash Remitted</span><strong>${formatMoney(summary.remittanceTotalValue)}</strong></div>
                <div class="line"><span>Remaining Cash After Close</span><strong>${formatMoney(summary.remainingCash)}</strong></div>
                <div class="line total"><span>${isBalanced ? "BALANCED" : "VARIANCE"}</span><strong>${formatMoney(summary.variance)}</strong></div>
              </div>

              <div>
                <div class="box">
                  <h2>COLLECTION SUMMARY</h2>
                  <div class="line"><span>Cash Sales</span><strong>${formatMoney(summary.cashCollections)}</strong></div>
                  <div class="line"><span>GCash Sales</span><strong>${formatMoney(summary.gcashCollections)}</strong></div>
                  <div class="line"><span>Bank Transfer</span><strong>${formatMoney(summary.bankCollections)}</strong></div>
                  <div class="line"><span>Terminal / Card</span><strong>${formatMoney(summary.terminalCollections)}</strong></div>
                  <div class="line total"><span>Total Collections</span><strong>${formatMoney(totalCollections)}</strong></div>
                </div>
                <div class="box" style="margin-top:14px; min-height:105px;">
                  <h2>REMITTANCE / TURNOVER SUMMARY</h2>
                  <div class="line"><span>Cash Remitted</span><strong>${formatMoney(summary.remittanceTotalValue)}</strong></div>
                  <div class="line"><span>Cash Turnover Out</span><strong>${formatMoney(summary.turnoverTotalValue)}</strong></div>
                  <div class="line"><span>Received By</span><strong>${receivedBy}</strong></div>
                  <div class="line total"><span>Remaining Cash After Close</span><strong>${formatMoney(summary.remainingCash)}</strong></div>
                </div>
              </div>

              <div class="box">
                <h2>SALES SUMMARY</h2>
                <div class="line"><span>Room Sales</span><strong>${formatMoney(summary.roomSales)}</strong></div>
                <div class="line"><span>Restaurant Sales</span><strong>${formatMoney(summary.restaurantSales)}</strong></div>
                <div class="line"><span>Apartment Collection</span><strong>${formatMoney(summary.apartmentCollection)}</strong></div>
                <div class="line"><span>Other Sales</span><strong>${formatMoney(summary.otherSales)}</strong></div>
                <div class="line total"><span>Total Sales</span><strong>${formatMoney(totalSales)}</strong></div>
              </div>

              <div class="box">
                <h2>EXPENSE SUMMARY</h2>
                <div class="line"><span>Manual Cash Expenses</span><strong>${formatMoney(summary.manualCashExpenses)}</strong></div>
                <div class="line"><span>Expense Releases</span><strong>${formatMoney(summary.expenseRelease)}</strong></div>
                <div class="line"><span>Cash Advances</span><strong>${formatMoney(summary.cashAdvance)}</strong></div>
                <div class="line"><span>Owner Withdrawal</span><strong>${formatMoney(summary.ownerWithdrawal)}</strong></div>
                <div class="line"><span>Bank Deposit</span><strong>${formatMoney(summary.bankDeposit)}</strong></div>
                <div class="line"><span>Other Expenses</span><strong>${formatMoney(summary.otherExpenses)}</strong></div>
                <div class="line"><span>Report-Only / Non-Cash Expenses</span><strong>${formatMoney(summary.reportOnlyExpenses)}</strong></div>
                <div class="line total"><span>Total Expenses</span><strong>${formatMoney(totalExpenses)}</strong></div>
              </div>
            </div>

            <div class="note">Cash drawer rule: Expected Cash includes opening float, cash sales, cash turnover received, and expense returns less cash expenses. Remaining Cash After Close deducts cash turnover and cash remittance from actual cash counted. Bank, GCash, Terminal, and custom report-only payment types are shown for reference only. Non-cash expense payments appear in Expense Summary but do not reduce physical cash.</div>
            <div class="remarks"><h3>MANAGEMENT REMARKS</h3><div>${managementRemarks}</div></div>
            <div class="signatures">
              <div class="sig"><strong>${drawer?.holder_name || "Cashier"}</strong>Prepared By / Cashier</div>
              <div class="sig"><strong>${receivedBy}</strong>Received By</div>
              <div class="sig"><strong>Management</strong>Checked / Approved By</div>
            </div>
            <div class="footer"><span>OpsCore Executive Finance Report</span><span>Page 1 - Executive Summary</span></div>
          </section>

          <section class="page page2">
            <div class="top">
              <div>
                <div class="brand" style="font-size:28px;">Vincent Resort Hotel</div>
                <div class="sub">CASHIER SHIFT TRANSACTION DETAILS</div>
              </div>
              <div>
                <h1>TRANSACTION REPORT</h1>
                <div class="meta">Business Date: ${businessDateValue}</div>
              </div>
            </div>
            <table>
              <colgroup>
                <col class="w-num" />
                <col class="w-date" />
                <col class="w-type" />
                <col class="w-source" />
                <col class="w-payment" />
                <col class="w-person" />
                <col class="w-person" />
                <col class="w-person" />
                <col class="w-amount" />
                <col class="w-remarks" />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th><th>Date</th><th>Type</th><th>Source</th><th>Payment</th><th>From</th><th>Received By</th><th>Encoded By</th><th>Amount</th><th>Remarks</th>
                </tr>
              </thead>
              <tbody>${rowsHtml || `<tr><td colspan="10">No transactions found.</td></tr>`}</tbody>
            </table>
            <div class="footer"><span>OpsCore Executive Finance Report</span><span>Page 2 - Transaction Details</span></div>
          </section>
          <script>window.onload = function(){ window.print(); };</script>
        </body>
      </html>`;

    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) {
      alert("Allow pop-ups to reprint drawer report.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  return (
    <PageGuard moduleKey="cash_management">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />
        <TopNavbar breadcrumb="FINANCE / CASH MANAGEMENT" />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">FINANCE</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Cash Management</h1>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Manage drawers, cash movements, expense releases, liquidation returns, and dynamic cash sources.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeDrawer && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]">Drawer Open</p>
                  <p className="text-sm font-black">{activeDrawer.holder_name}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowOpenDrawer(true)}
                disabled={Boolean(activeDrawer)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Open Drawer
              </button>
              <button
                type="button"
                onClick={openCloseDrawerModal}
                disabled={!activeDrawer || !canCloseActiveDrawer}
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close Drawer
              </button>
              <button
                type="button"
                onClick={() => setShowSourceSettings(true)}
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                title="Cash Source Settings"
              >
                <Settings className="mx-auto" size={18} />
              </button>
            </div>
          </section>

          {drawerMismatchLocked && (
            <section className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5" size={22} />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em]">Drawer Ownership Lock</p>
                    <p className="mt-1 text-sm font-bold leading-6">
                      This active drawer belongs to <span className="font-black">{activeDrawerHolderName || "Unknown Holder"}</span>.
                      Current login is <span className="font-black">{currentActorName || "Unknown User"}</span>.
                      Cash In, Cash Out, liquidation, void, remittance, and closing are disabled for this account.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-red-700">
                  View Only Mode
                </div>
              </div>
            </section>
          )}

          <section className="mb-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <CompactStat label="Cash on Hand" value={formatMoney(cashOnHand)} caption="Current drawer cash" />
              <CompactStat label="Cash In Today" value={formatMoney(cashInTodayTotal)} caption="Cash received today" tone="success" />
              <CompactStat label="Cash Out Today" value={formatMoney(cashOutTodayTotal)} caption="Cash released today" tone={cashOutTodayTotal > 0 ? "warning" : "neutral"} />
              <CompactStat label="Online Banking" value={formatMoney(onlineBankingTotal)} caption={`GCash ${formatMoney(gcashTotal)} · Bank ${formatMoney(bankTotal)} · Terminal ${formatMoney(terminalTotal)}`} tone="info" />
              <CompactStat label="Pending Approvals" value={pendingCashApprovalCount} caption="Cash-related only" tone={pendingCashApprovalCount > 0 ? "warning" : "neutral"} />
            </div>
          </section>

          {(pendingLiquidations.length > 0 || drawerMismatchLocked) && (
            <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 shadow-sm">
              <div className="flex flex-col gap-2 text-xs font-bold md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  {pendingLiquidations.length > 0 && (
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle size={15} />
                      {pendingLiquidations.length} item(s) need liquidation · {formatMoney(pendingLiquidationAmount)}
                    </span>
                  )}
                  {drawerMismatchLocked && (
                    <span className="inline-flex items-center gap-2 text-red-700">
                      <AlertTriangle size={15} />
                      View only: drawer belongs to {activeDrawerHolderName || "another user"}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
                  Cash Control Alert
                </span>
              </div>
            </section>
          )}

          <section className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Entry Form</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Record Cash Movement</h2>
                  </div>
                  <p className="max-w-xl text-xs font-bold leading-5 text-slate-500">
                    Money-in records immediately. Money-out creates a liquidation warning until actual spend and returned cash are encoded.
                  </p>
                </div>
              </div>

              <div className="p-6">
                {drawerMismatchLocked && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
                    Transactions are disabled because this drawer is owned by {activeDrawerHolderName}. Login as the drawer holder to continue.
                  </div>
                )}
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Primary Information</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Business Date">
                    <input type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" />
                  </Field>
                  <Field label="Movement Type">
                    <select value={movementType} onChange={(event) => setMovementType(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                      {movementTypes.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Source">
                    <select value={source} onChange={(event) => setSource(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                      {availableSourceOptions.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">Manage sources from the gear settings.</p>
                  </Field>
                </div>

                <p className="mb-4 mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Financial Information</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Payment Type">
                    <select value={paymentType} onChange={(event) => setPaymentType(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                      {paymentTypes.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Amount">
                    <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-black text-slate-950" />
                  </Field>
                </div>

                {isExpenseRelease && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Expense Release Details</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field label="Category">
                        <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                          <option value="">Select category</option>
                          {expenseCategoryOptions.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </Field>
                      <Field label="Subcategory">
                        <select value={expenseSubcategory} onChange={(event) => setExpenseSubcategory(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                          <option value="">Select subcategory</option>
                          {expenseSubcategoryOptions.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </Field>
                      <Field label="Department">
                        <select value={expenseDepartment} onChange={(event) => setExpenseDepartment(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                          <option value="">Select department</option>
                          {expenseDepartments.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </Field>
                      <Field label="Released To">
                        <input value={expenseReleasedTo} onChange={(event) => setExpenseReleasedTo(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" placeholder="Requestor name" />
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="Description">
                          <input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" placeholder="Purpose of release" />
                        </Field>
                      </div>
                    </div>
                  </div>
                )}

                {isCashAdvanceCashOut && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Cash Advance Details</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Employee">
                        <select value={cashAdvanceEmployeeId} onChange={(event) => setCashAdvanceEmployeeId(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                          <option value="">Select employee</option>
                          {validEmployees.map((employee) => <option key={employee.id} value={employee.id}>{getEmployeeFullName(employee)}</option>)}
                        </select>
                      </Field>
                      <Field label="Purpose">
                        <input value={cashAdvancePurpose} onChange={(event) => setCashAdvancePurpose(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" />
                      </Field>
                    </div>
                  </div>
                )}

                {movementType === "Cash Out" && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Receipt Tag</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field label="Receipt Status">
                        <select value={receiptStatus} onChange={(event) => setReceiptStatus(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                          <option value="WITH_RECEIPT">With Receipt</option>
                          <option value="WITHOUT_RECEIPT">Without Receipt</option>
                        </select>
                      </Field>
                      {receiptStatus === "WITHOUT_RECEIPT" && (
                        <>
                          <Field label="Reason">
                            <select value={noReceiptReason} onChange={(event) => setNoReceiptReason(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                              <option value="">Select reason</option>
                              {noReceiptReasons.map((item) => <option key={item}>{item}</option>)}
                            </select>
                          </Field>
                          <Field label="Explanation">
                            <input value={noReceiptExplanation} onChange={(event) => setNoReceiptExplanation(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" />
                          </Field>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Field label="Notes / Reference">
                    <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800" placeholder="Reference, notes, or supporting details" />
                  </Field>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button type="button" onClick={resetForm} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">Reset</button>
                  <button type="button" onClick={saveMovement} disabled={cashManagementLocked} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                    <Save size={16} /> Save Movement
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Drawer Summary</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">{activeDrawer?.holder_name || "No Open Drawer"}</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">Cash-only drawer monitoring. Digital channels are computed per current drawer in this workbench.</p>
              <div className="mt-5 divide-y divide-slate-100">
                <SummaryLine label="Cash on Hand" value={formatMoney(cashOnHand)} />
                <SummaryLine label="Opening Float" value={formatMoney(openingFloatTotal)} />
                <SummaryLine label="Cash In" value={formatMoney(cashInMovementTotal)} />
                <SummaryLine label="Cash Out" value={formatMoney(cashOutTotal)} />
                <SummaryLine label="Remittance" value={formatMoney(remittanceTotal)} />
                <SummaryLine label="Turnover" value={formatMoney(turnoverTotal)} />
                <SummaryLine label="For Liquidation" value={formatMoney(pendingLiquidationAmount)} warning={pendingLiquidations.length > 0} />
              </div>
            </div>
          </section>


          <section className="mb-5 rounded-3xl border border-amber-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-amber-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">Action Required</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Liquidation Queue</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Cash releases that still need actual spent, returned cash, receipt count, and liquidation remarks.</p>
              </div>
              <span className={`rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${
                pendingLiquidations.length > 0
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}>
                {pendingLiquidations.length} Pending · {formatMoney(pendingLiquidationAmount)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-amber-50/60 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3 text-right">Released</th>
                    <th className="px-5 py-3">Released To</th>
                    <th className="px-5 py-3">Encoded By</th>
                    <th className="px-5 py-3">Remarks</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingLiquidations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-6 text-center text-sm font-bold text-slate-500">
                        No liquidation needed. All cash releases are cleared.
                      </td>
                    </tr>
                  ) : (
                    pendingLiquidations.slice(0, 6).map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-5 py-3 font-bold text-slate-700">{item.business_date || "-"}</td>
                        <td className="px-5 py-3">
                          <p className="font-black text-slate-950">{item.source || "Cash Release"}</p>
                          <p className="mt-1 text-[11px] font-bold uppercase text-amber-600">{item.liquidation_status || "FOR_LIQUIDATION"}</p>
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-700">{item.payment_type || "Cash"}</td>
                        <td className="px-5 py-3 text-right font-black text-slate-950">{formatMoney(item.amount)}</td>
                        <td className="px-5 py-3 font-bold text-slate-700">{item.to_person || "-"}</td>
                        <td className="px-5 py-3 font-bold text-slate-700">{item.encoded_by || "-"}</td>
                        <td className="max-w-[320px] px-5 py-3 text-xs font-semibold leading-5 text-slate-600">
                          <div className="line-clamp-2">{item.remarks || "No remarks encoded."}</div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openLiquidation(item)}
                            disabled={drawerMismatchLocked}
                            className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Liquidate
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pendingLiquidations.length > 6 && (
              <div className="border-t border-slate-100 px-5 py-3 text-xs font-bold text-slate-500">
                Showing first 6 pending liquidation items. Use the Cash Movement Log below for full history and search.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Ledger Filters</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Cash Movement Log</h2>
                </div>
                <p className="text-sm font-bold text-slate-500">{filteredMovements.length} record(s) shown · {ledgerDateScope === "CURRENT_DRAWER" ? activeDrawer?.holder_name || "No open drawer" : ledgerDateScope === "ALL" ? "All drawers" : ledgerDateScope === "TODAY" ? "Today" : dateFilter}</p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                <Field label="View Scope"><select value={ledgerDateScope} onChange={(e) => setLedgerDateScope(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"><option value="CURRENT_DRAWER">Current Drawer</option><option value="TODAY">Today</option><option value="CUSTOM">Custom Date</option><option value="ALL">All</option></select></Field>
                <Field label="Date"><input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" /></Field>
                <Field label="Type"><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"><option value="ALL">All Types</option><option>Opening Float</option><option>Cash In</option><option>Cash Out</option><option>Remittance</option><option>Turnover</option></select></Field>
                <Field label="Payment"><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"><option value="ALL">All Payments</option>{paymentTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Search"><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" placeholder="Search ledger" /></Field>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-[1180px] w-full">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">From / To</th>
                    <th className="px-6 py-4">Liquidation</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredMovements.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-14 text-center text-slate-500">No records found.</td></tr>
                  ) : (
                    filteredMovements.map((item) => {
                      const liquidated = String(item.liquidation_status || "").toUpperCase() === "LIQUIDATED";
                      const eligible = isLiquidationEligible(item);
                      return (
                        <tr key={item.id} className="transition-all duration-200 hover:bg-slate-50">
                          <td className="px-6 py-4">{item.business_date || "-"}</td>
                          <td className="px-6 py-4"><Badge tone={item.movement_type === "Cash In" ? "success" : item.movement_type === "Cash Out" ? "critical" : "info"}>{item.movement_type}</Badge></td>
                          <td className="px-6 py-4"><p className="font-black text-slate-950">{item.source}</p><p className="mt-1 text-xs text-slate-500">{item.remarks || "-"}</p></td>
                          <td className="px-6 py-4">{item.payment_type || "Cash"}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-950">{formatMoney(item.amount)}</td>
                          <td className="px-6 py-4"><p>{item.from_person || "-"}</p><p className="text-xs text-slate-500">to {item.to_person || "-"}</p></td>
                          <td className="px-6 py-4">
                            {liquidated ? (
                              <Badge tone="success">Liquidated</Badge>
                            ) : eligible ? (
                              <Badge tone="warning">For Liquidation</Badge>
                            ) : (
                              <Badge tone="neutral">Not Required</Badge>
                            )}
                            {liquidated && (
                              <p className="mt-1 text-xs text-slate-500">Spent {formatMoney(item.actual_spent_amount)} · Returned {formatMoney(item.returned_cash_amount)}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {eligible && (
                                <button type="button" onClick={() => openLiquidation(item)} disabled={drawerMismatchLocked} className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                                  Liquidate
                                </button>
                              )}
                              {!isVoidedMovement(item) && (
                                <button type="button" onClick={() => voidMovement(item)} disabled={drawerMismatchLocked} className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                                  Void
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-5 mb-5 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Cash Approval Watch</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Pending / Recent Cash Approvals</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Compact view for approval status and manager remarks before drawer close/remittance.</p>
              </div>
              <span className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                {cashApprovalRows.filter((request) => String(request.status || "").toUpperCase() === "PENDING").length} Pending
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Request</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Requested By</th>
                    <th className="px-5 py-3">Submitted</th>
                    <th className="px-5 py-3">Request Remarks</th>
                    <th className="px-5 py-3">Approver Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashApprovalRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-sm font-bold text-slate-500">
                        No cash approval requests found. New money-out approvals will appear here with reviewer remarks.
                      </td>
                    </tr>
                  ) : (
                    cashApprovalRows.map((request) => {
                      const payload = getApprovalRequestPayload(request);
                      const status = String(request.status || "PENDING").trim().toUpperCase();
                      const reviewerNote = getApprovalReviewerNote(request);
                      return (
                        <tr key={request.id} className="align-top">
                          <td className="px-5 py-3">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getApprovalStatusStyle(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td className="max-w-[220px] px-5 py-3">
                            <p className="truncate font-black text-slate-950">{request.title || request.request_type}</p>
                            <p className="mt-1 text-[11px] font-bold uppercase text-slate-400">{request.request_type}</p>
                          </td>
                          <td className="px-5 py-3 font-black text-slate-950">{formatMoney(getApprovalDisplayAmount(request))}</td>
                          <td className="px-5 py-3 font-bold text-slate-700">{request.requested_by || payload.encoded_by || "Requestor"}</td>
                          <td className="px-5 py-3 text-xs font-semibold text-slate-500">{request.created_at ? new Date(request.created_at).toLocaleString("en-PH", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                          <td className="max-w-[280px] px-5 py-3 text-xs font-semibold leading-5 text-slate-600">
                            <div className="line-clamp-2">{request.description || payload.remarks || payload.reason || "No request remarks."}</div>
                          </td>
                          <td className="max-w-[260px] px-5 py-3 text-xs font-bold leading-5 text-slate-600">
                            <div className="line-clamp-2">{reviewerNote || (status === "PENDING" ? "Waiting for manager review." : "No approver remarks encoded.")}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Drawer Audit Trail</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Drawer Session History</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Reprint closed drawer reports using the same Daily Cash Drawer Report format.</p>
                </div>
                <p className="text-sm font-bold text-slate-500">{drawers.length} drawer session(s)</p>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-[1180px] w-full">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Holder</th>
                    <th className="px-6 py-4">Opened</th>
                    <th className="px-6 py-4">Closed</th>
                    <th className="px-6 py-4 text-right">Opening Float</th>
                    <th className="px-6 py-4 text-right">Cash In</th>
                    <th className="px-6 py-4 text-right">Cash Out</th>
                    <th className="px-6 py-4 text-right">Remittance</th>
                    <th className="px-6 py-4 text-right">Actual Cash</th>
                    <th className="px-6 py-4 text-right">Variance</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {drawers.length === 0 ? (
                    <tr><td colSpan={11} className="px-6 py-14 text-center text-slate-500">No drawer sessions found.</td></tr>
                  ) : (
                    drawers.map((drawer) => {
                      const drawerSummary = getDrawerCashSummary(drawer);
                      const status = String(drawer.status || "OPEN").toUpperCase();
                      const isOpenSession = status === "OPEN";
                      const balanced = Math.abs(Number(drawerSummary.variance || 0)) < 0.01;
                      return (
                        <tr key={drawer.id} className="transition-all duration-200 hover:bg-slate-50">
                          <td className="px-6 py-4"><p className="font-black text-slate-950">{drawer.holder_name || "-"}</p><p className="mt-1 text-xs text-slate-500">{drawer.remarks || "-"}</p></td>
                          <td className="px-6 py-4">{drawer.opened_at ? new Date(drawer.opened_at).toLocaleString("en-PH", { hour12: false }) : "-"}</td>
                          <td className="px-6 py-4">{drawer.closed_at ? new Date(drawer.closed_at).toLocaleString("en-PH", { hour12: false }) : "-"}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-950">{formatMoney(drawerSummary.openingFloatTotal || drawer.opening_float)}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-950">{formatMoney(drawerSummary.cashSalesTotal + drawerSummary.cashReturnTotal)}</td>
                          <td className="px-6 py-4 text-right font-black text-red-700">{formatMoney(drawerSummary.cashExpenseTotal)}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-950">{formatMoney(drawerSummary.remittanceTotalValue)}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-950">{isOpenSession ? "Pending Close" : formatMoney(drawerSummary.actualCash)}</td>
                          <td className={`px-6 py-4 text-right font-black ${isOpenSession ? "text-slate-500" : balanced ? "text-emerald-700" : "text-red-700"}`}>{isOpenSession ? "Pending Close" : formatMoney(drawerSummary.variance)}</td>
                          <td className="px-6 py-4"><Badge tone={isOpenSession ? "success" : balanced ? "info" : "warning"}>{status || "OPEN"}</Badge></td>
                          <td className="px-6 py-4 text-right">
                            <button type="button" onClick={() => printDrawerReport(drawer)} disabled={isOpenSession} className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
                              {isOpenSession ? "Close First" : "Reprint"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </main>

        <OpscoreAssistant reminders={assistantReminders} />

        {showLiquidationModal && selectedLiquidationMovement && (
          <Modal title="Liquidate Cash Release" onClose={() => setShowLiquidationModal(false)}>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
              Released amount must equal Actual Spent + Cash Returned. Choose whether the sukli returns to Owner or posts back to Cash Drawer.
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <SummaryBox label="Released Amount" value={formatMoney(selectedLiquidationMovement.amount)} />
              <SummaryBox label="Source" value={selectedLiquidationMovement.source} />
              <Field label="Cash Returned / Sukli">
                <input
                  value={liquidationCashReturned}
                  onChange={(e) => handleLiquidationCashReturnedChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-black text-slate-950"
                />
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  Encode only the actual sukli returned. Actual spent will auto-compute.
                </p>
              </Field>
              <Field label="Actual Spent">
                <input
                  value={liquidationActualSpent}
                  readOnly
                  className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 text-lg font-black text-slate-950"
                />
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  Auto-computed: Released Amount minus Cash Returned.
                </p>
              </Field>
              <Field label="Return Destination">
                <select
                  value={liquidationReturnDestination}
                  onChange={(e) => setLiquidationReturnDestination(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
                >
                  <option value="OWNER">Return to Owner</option>
                  <option value="CASH_DRAWER">Return to Cash Drawer</option>
                </select>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  Owner return will not affect cash on hand. Cash Drawer return will post as Cash In.
                </p>
              </Field>
              <Field label="Receipt Status">
                <select
                  value={liquidationReceiptStatus}
                  onChange={(e) => setLiquidationReceiptStatus(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
                >
                  <option value="WITH_RECEIPT">With Receipt</option>
                  <option value="WITHOUT_RECEIPT">Without Receipt</option>
                </select>
              </Field>
              <Field label="Receipt Count">
                <input
                  value={liquidationReceiptCount}
                  onChange={(e) => setLiquidationReceiptCount(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
                />
              </Field>
              {liquidationReceiptStatus === "WITHOUT_RECEIPT" && (
                <>
                  <Field label="No Receipt Reason">
                    <select
                      value={liquidationNoReceiptReason}
                      onChange={(e) => setLiquidationNoReceiptReason(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
                    >
                      <option value="">Select reason</option>
                      {noReceiptReasons.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="No Receipt Explanation">
                    <input
                      value={liquidationNoReceiptExplanation}
                      onChange={(e) => setLiquidationNoReceiptExplanation(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
                    />
                  </Field>
                </>
              )}
              <div className="md:col-span-2">
                <Field label="Liquidation Remarks">
                  <textarea
                    value={liquidationRemarks}
                    onChange={(e) => setLiquidationRemarks(e.target.value)}
                    className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800"
                    placeholder="What was purchased, who returned the cash, and other notes"
                  />
                </Field>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button onClick={() => setShowLiquidationModal(false)} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={submitLiquidation} disabled={isSaving} className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">Save Liquidation</button>
            </div>
          </Modal>
        )}

        {showSourceSettings && (
          <Modal title="Cash Source Settings" onClose={() => setShowSourceSettings(false)} wide>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Source Name"><input value={sourceName} onChange={(e) => setSourceName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" placeholder="Laundry Sales" /></Field>
              <Field label="Movement Type"><select value={sourceMovementType} onChange={(e) => setSourceMovementType(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"><option>Cash In</option><option>Cash Out</option></select></Field>
              <Field label="Category"><input value={sourceCategory} onChange={(e) => setSourceCategory(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" /></Field>
              <div className="flex items-end"><button onClick={saveCashSource} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"><Plus size={16} /> Save Source</button></div>
            </div>

            <div className="mt-6 overflow-auto rounded-3xl border border-slate-200">
              <table className="w-full min-w-[720px]">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr><th className="px-5 py-4">Source</th><th className="px-5 py-4">Movement</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {(cashSources.length > 0 ? cashSources : fallbackCashSources).map((item, index) => (
                    <tr key={item.id || `${item.name}-${index}`}>
                      <td className="px-5 py-4 font-black text-slate-950">{item.name || item.source_name}</td>
                      <td className="px-5 py-4">{item.movement_type || "Cash In"}</td>
                      <td className="px-5 py-4">{item.category || "Revenue"}</td>
                      <td className="px-5 py-4"><Badge tone={item.is_active === false ? "neutral" : "success"}>{item.is_active === false ? "Inactive" : "Active"}</Badge></td>
                      <td className="px-5 py-4 text-right">{item.id ? <button onClick={() => toggleSourceActive(item)} className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">Toggle</button> : <span className="text-xs text-slate-400">Fallback</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Modal>
        )}

        {showOpenDrawer && (
          <Modal title="Open Cash Drawer" onClose={() => setShowOpenDrawer(false)}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Drawer Holder"><select value={drawerHolder} onChange={(e) => setDrawerHolder(e.target.value)} disabled className="h-11 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-800"><option value="">Select holder</option>{openDrawerHolderOptions.map((name) => <option key={name}>{name}</option>)}</select><p className="mt-1 text-[11px] font-bold text-slate-500">Drawer can only be opened under the currently logged-in employee.</p></Field>
              <Field label="Opening Float"><input value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-black text-slate-950" /></Field>
              <div className="md:col-span-2"><Field label="Remarks"><textarea value={drawerRemarks} onChange={(e) => setDrawerRemarks(e.target.value)} className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800" /></Field></div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4"><button onClick={() => setShowOpenDrawer(false)} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700">Cancel</button><button onClick={openDrawer} className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700">Open Drawer</button></div>
          </Modal>
        )}

        {showCloseDrawer && activeDrawer && (
          <Modal title="Close Cash Drawer" onClose={() => setShowCloseDrawer(false)}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                Expected physical cash before close: {formatMoney(cashOnHand)}
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                Current drawer GCash before close: {formatMoney(gcashTotal)}
              </div>
            </div>

            {drawerMismatchLocked && canOverrideDrawerLock && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                Override mode active. This drawer belongs to {activeDrawerHolderName || activeDrawer.holder_name}; closing will be logged under {currentActorName || "current user"}.
              </div>
            )}

            {gcashTotal < 0 && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                GCash is negative ({formatMoney(gcashTotal)}). Close is allowed only with variance / override reason.
              </div>
            )}

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Cash Count</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Actual Closing Cash">
                  <input value={actualClosingCash} onChange={(e) => setActualClosingCash(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-black text-slate-950" placeholder="0.00" />
                </Field>
                <Field label="Actual / Confirmed GCash">
                  <input value={actualClosingGcash} onChange={(e) => setActualClosingGcash(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-black text-slate-950" placeholder={String(gcashTotal)} />
                </Field>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">Leave GCash blank only if the system GCash balance is confirmed. Negative GCash or override close still requires a reason below.</p>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Remit to Management / Vault</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Cash Remit">
                  <input value={closingRemittanceAmount} onChange={(e) => setClosingRemittanceAmount(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-black text-slate-950" placeholder="0.00" />
                </Field>
                <Field label="GCash Remit">
                  <input value={closingGcashRemittanceAmount} onChange={(e) => setClosingGcashRemittanceAmount(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-black text-slate-950" placeholder="0.00" />
                </Field>
                <Field label="Remitted To">
                  <input value={closingRemittanceReceivedBy} onChange={(e) => setClosingRemittanceReceivedBy(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" placeholder="Management / Vault" />
                </Field>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                Cashier Close Guide
              </p>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-lg font-black text-slate-950">
                      Step 1: Count the actual cash in drawer
                    </h4>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                      Actual cash counted means the physical cash on hand before remittance or turnover.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                      OPSCORE Cash On Hand
                    </p>
                    <p className="text-xl font-black text-slate-950">
                      {formatMoney(cashOnHand)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Expected Cash
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">
                      {formatMoney(cashOnHand)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Actual Cash Counted
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">
                      {actualCashEntered ? formatMoney(actualClosingCashValue) : "Not entered"}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-4 ${
                    actualCashEntered && Math.abs(cashShortageOrOverage) > 0.009
                      ? "border-amber-200 bg-amber-50"
                      : "border-emerald-200 bg-emerald-100"
                  }`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </p>
                    <p className={`mt-2 text-xl font-black ${
                      actualCashEntered && Math.abs(cashShortageOrOverage) > 0.009
                        ? "text-amber-700"
                        : "text-emerald-700"
                    }`}>
                      {cashVarianceLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                actualCashEntered && Math.abs(cashShortageOrOverage) > 0.009
                  ? "border-amber-200 bg-white text-amber-800"
                  : "border-emerald-200 bg-white text-emerald-800"
              }`}>
                {actualCashEntered ? (
                  Math.abs(cashShortageOrOverage) > 0.009 ? (
                    <>
                      OPSCORE recommends closing with documented variance. Expected cash is {formatMoney(cashOnHand)}, but actual counted cash is {formatMoney(actualClosingCashValue)}. Enter a variance reason before closing.
                    </>
                  ) : (
                    <>
                      OPSCORE recommends turning over {formatMoney(suggestedActualCashTurnover)} if all counted cash will be handed to the next drawer holder.
                    </>
                  )
                ) : (
                  <>Enter actual cash counted first to see the OPSCORE recommendation.</>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!actualCashEntered) {
                      alert("Enter actual cash counted first.");
                      return;
                    }
                    setClosingCashTurnoverAmount(String(suggestedActualCashTurnover));
                  }}
                  className="rounded-2xl border border-emerald-200 bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-sm hover:bg-emerald-700"
                >
                  Turnover All Counted Cash ({actualCashEntered ? formatMoney(suggestedActualCashTurnover) : "Enter Cash"})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setClosingCashTurnoverAmount("");
                    setClosingGcashTurnoverAmount("");
                  }}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-100"
                >
                  Custom / Manual Turnover
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Cash Turnover">
                  <input
                    value={closingCashTurnoverAmount}
                    onChange={(e) => setClosingCashTurnoverAmount(e.target.value)}
                    className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-lg font-black text-slate-950"
                    placeholder="0.00"
                  />
                </Field>

                <Field label="GCash Turnover">
                  <input
                    value={closingGcashTurnoverAmount}
                    onChange={(e) => setClosingGcashTurnoverAmount(e.target.value)}
                    className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-lg font-black text-slate-950"
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Turnover To">
                  <select
                    value={closingTurnoverTo}
                    onChange={(e) => setClosingTurnoverTo(e.target.value)}
                    className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-800"
                  >
                    <option value="">Select receiver</option>
                    {drawerHolderOptions.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <p className="mt-3 text-xs font-bold text-emerald-700">
                Turnover automatically creates OUT rows from the closing drawer and IN rows for the receiver drawer using the same origin ID.
              </p>
            </div>

            <div className="mt-4">
              <Field label="Override / Variance Reason">
                <textarea value={drawerOverrideReason} onChange={(e) => setDrawerOverrideReason(e.target.value)} className="min-h-[88px] w-full resize-none rounded-xl border border-amber-200 bg-white p-3 text-sm font-semibold text-slate-800" placeholder="Required for override close, cash variance, or negative GCash. Example: Drawer holder already logged out; verified physical count with supervisor." />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Close Remarks">
                <input value={closingRemittanceRemarks} onChange={(e) => setClosingRemittanceRemarks(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" placeholder="Notes, reference, or shift handover details" />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button onClick={() => setShowCloseDrawer(false)} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700">Cancel</button>
              <button onClick={closeDrawer} disabled={isSaving || !canCloseActiveDrawer} className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">Close Drawer</button>
            </div>
          </Modal>
        )}
      </div>
    </PageGuard>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}


function CompactStat({ label, value, caption, tone = "neutral" }: { label: string; value: any; caption: string; tone?: Tone }) {
  const toneClasses =
    tone === "critical"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className="mt-1 truncate text-base font-black text-slate-950">{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-bold opacity-70">{caption}</p>
    </div>
  );
}

function KpiCard({ label, value, caption, tone = "neutral" }: { label: string; value: any; caption: string; tone?: Tone }) {
  const toneClasses = tone === "warning" ? "border-amber-200 bg-amber-50" : tone === "success" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{caption}</p>
    </div>
  );
}

function SummaryLine({ label, value, warning = false }: { label: string; value: any; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <strong className={warning ? "text-amber-700" : "text-slate-950"}>{value}</strong>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function Badge({ tone = "neutral", children }: { tone?: Tone; children: any }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(tone)}`}>{children}</span>;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: any; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className={`max-h-[90vh] overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl ${wide ? "w-full max-w-5xl" : "w-full max-w-2xl"}`}>
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <button onClick={onClose} className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"><X className="mx-auto" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}







