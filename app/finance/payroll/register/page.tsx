"use client";

import { logActivity } from "@/app/lib/activityLogger";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  DollarSign,
  Lock,
  Printer,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import OpscoreAssistant from "@/components/OpscoreAssistant";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";


export default function PayrollRegisterPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [periods, setPeriods] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [employeeBalances, setEmployeeBalances] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);

  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("Other Deduction");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentRemarks, setAdjustmentRemarks] = useState("");

  const [selectedPayslipId, setSelectedPayslipId] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [checkedAuditItems, setCheckedAuditItems] = useState<string[]>([]);
  const [payslipAdjustments, setPayslipAdjustments] = useState<any[]>([]);

  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [balanceDrafts, setBalanceDrafts] = useState<Record<string, string>>({});

  const deductionTypes = [
    "Other Deduction",
  ];

  const earningTypes = ["Allowance", "Bonus", "Incentive"];

  const balanceDeductionTypes = [
    "Employee Meal Charge",
    "Cash Advance",
    "Salary Loan",
  ];

  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const normalize = (value: any) => String(value || "").trim().toLowerCase();

  const getCurrentCompanyId = () => {
    if (typeof window === "undefined") return selectedPeriod?.company_id || null;

    const storedCompanyId =
      localStorage.getItem("opscore_current_company_id") ||
      localStorage.getItem("opscore_company_id") ||
      localStorage.getItem("company_id");

    const cleanedCompanyId = String(storedCompanyId || "").trim();

    if (cleanedCompanyId && cleanedCompanyId !== "null" && cleanedCompanyId !== "undefined") {
      return cleanedCompanyId;
    }

    return selectedPeriod?.company_id || null;
  };

  const normalizeDate = (value: any) => {
    if (!value) return "";
    return String(value).slice(0, 10);
  };

  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId);
  const periodStatus = String(selectedPeriod?.status || "OPEN").trim().toUpperCase();
  const payrollIsOutdated = Boolean(selectedPeriod?.needs_regeneration);

  // OPSCORE Payroll V2 lifecycle lock:
  // Payroll Period controls the cutoff header only.
  // payroll_records.record_status controls each employee row.
  // Register is editable only while OPEN/DRAFT, or for rows returned by Manager.
  const PAYROLL_RECORD_STATUSES = {
    DRAFT: "DRAFT",
    REGISTERED: "REGISTERED",
    MANAGER_REVIEW: "MANAGER_REVIEW",
    RETURNED_FOR_CORRECTION: "RETURNED_FOR_CORRECTION",
    LOCKED: "LOCKED",
    RELEASED: "RELEASED",
  } as const;

  const isOpenPeriod = ["OPEN", "REOPENED", "DRAFT"].includes(periodStatus);
  const isRegisteredPeriod = periodStatus === "REGISTERED";
  const isLocked =
    ["LOCKED", "RELEASED", "PAID", "PARTIALLY RELEASED"].includes(periodStatus) ||
    selectedPeriod?.attendance_locked === true;

  const getRecordStatus = (record: any) => {
    const explicitStatus = String(record?.record_status || "").trim().toUpperCase();

    if (explicitStatus) return explicitStatus;

    const legacyStatus = String(record?.status || "").trim().toUpperCase();
    const releaseStatus = String(record?.release_status || "").trim().toUpperCase();
    const paidAmount = Number(record?.paid_amount || record?.released_amount || 0);
    const hasReleaseDate = Boolean(record?.released_at);

    if (legacyStatus === "RETURNED_FOR_CORRECTION") return PAYROLL_RECORD_STATUSES.RETURNED_FOR_CORRECTION;
    if (legacyStatus === "FOR APPROVAL" || legacyStatus === "REGISTERED") return PAYROLL_RECORD_STATUSES.MANAGER_REVIEW;
    if (legacyStatus === "APPROVED" || legacyStatus === "LOCKED") return PAYROLL_RECORD_STATUSES.LOCKED;
    if (legacyStatus === "RELEASED" || legacyStatus === "PAID" || legacyStatus === "PARTIALLY RELEASED") return PAYROLL_RECORD_STATUSES.RELEASED;
    if (releaseStatus === "RELEASED" || releaseStatus === "PAID" || releaseStatus === "PARTIALLY RELEASED" || paidAmount > 0 || hasReleaseDate) {
      return PAYROLL_RECORD_STATUSES.RELEASED;
    }

    return PAYROLL_RECORD_STATUSES.DRAFT;
  };

  const canEditDraftRegister = isOpenPeriod && !isLocked && !isRegisteredPeriod;

  const isReturnedCorrectionRecord = (record: any) =>
    getRecordStatus(record) === PAYROLL_RECORD_STATUSES.RETURNED_FOR_CORRECTION;

  const canEditRecordInRegister = (record: any) =>
    canEditDraftRegister || isReturnedCorrectionRecord(record);

  const canEditPayroll = canEditDraftRegister;

  const canGenerateRegister = Boolean(selectedPeriodId) && canEditDraftRegister;

  const canManageRegisterForm = Boolean(selectedPeriodId) && canEditDraftRegister;

  const isRecordClosedForRegister = (record: any) => {
    const status = getRecordStatus(record);
    return [
      PAYROLL_RECORD_STATUSES.MANAGER_REVIEW,
      PAYROLL_RECORD_STATUSES.LOCKED,
      PAYROLL_RECORD_STATUSES.RELEASED,
    ].includes(status as any);
  };

  const isRecordSendableFromRegister = (record: any) => {
    const status = getRecordStatus(record);
    return (
      (canEditDraftRegister && status === PAYROLL_RECORD_STATUSES.DRAFT) ||
      status === PAYROLL_RECORD_STATUSES.RETURNED_FOR_CORRECTION
    );
  };

const canViewAuditFromRegister = (record: any) => Boolean(record?.id);

const getRecordStatusLabel = (record: any) =>
  getRecordStatus(record).replace(/_/g, " ");

  const isSettingEnabled = (
    activeSettings: Record<string, string>,
    key: string
  ) => String(activeSettings[key] || "No") === "Yes";

  const isOvertimeApprovalRequired = (
    activeSettings: Record<string, string> = settings,
  ) => {
    const rawValue =
      activeSettings.ot_requires_approval ??
      activeSettings.overtime_requires_approval ??
      activeSettings.ot_approval_required ??
      activeSettings.overtime_approval_required ??
      "Yes";

    return !["No", "Off", "Disabled", "False", "0"].includes(String(rawValue));
  };

  const getOtApprovalStatus = (detectedMinutes: number, approvedMinutes: number) => {
    if (detectedMinutes <= 0) return "NOT_REQUIRED";
    if (approvedMinutes >= detectedMinutes) return "APPROVED";
    if (approvedMinutes > 0) return "PARTIALLY_APPROVED";
    return "PENDING_APPROVAL";
  };

  const getOtStatusStyle = (status: any) => {
    const normalized = String(status || "").toUpperCase();

    if (normalized === "APPROVED") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (normalized === "PARTIALLY_APPROVED") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    if (normalized === "PENDING_APPROVAL") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (normalized === "REJECTED") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  const isGovernmentEnabled = (activeSettings: Record<string, string>) =>
    isSettingEnabled(activeSettings, "government_contributions_enabled") ||
    isSettingEnabled(activeSettings, "benefits_enabled");

  const showGovernmentSection = isGovernmentEnabled(settings);
  const showSss = showGovernmentSection && isSettingEnabled(settings, "sss_enabled");
  const showPhilHealth =
    showGovernmentSection && isSettingEnabled(settings, "philhealth_enabled");
  const showPagibig =
    showGovernmentSection && isSettingEnabled(settings, "pagibig_enabled");
  const showTax = isSettingEnabled(settings, "withholding_tax_enabled");

  const getGovernmentDeductionTotal = (record: any) =>
    Number(record.sss_deduction || 0) +
    Number(record.philhealth_deduction || 0) +
    Number(record.pagibig_deduction || 0) +
    Number(record.tax_deduction || 0);

  const getAutoDeductionTotal = (record: any) =>
    Number(record.late_deduction || 0) +
    Number(record.undertime_deduction || 0) +
    Number(record.absent_deduction || 0);

  const getDisplayedTotalDeductions = (record: any) => {
    const rebuiltTotal =
      getAutoDeductionTotal(record) +
      Number(record.manual_deduction || 0) +
      Number(record.balance_deduction || 0) +
      getGovernmentDeductionTotal(record);

    const savedTotal = Number(record.total_deductions || 0);
    return Math.max(savedTotal, rebuiltTotal);
  };

  const getDisplayedNetPay = (record: any) =>
    Number(record.gross_pay || 0) - getDisplayedTotalDeductions(record);

  const getDisplayedReleaseAmount = (record: any) =>
    Math.max(getDisplayedNetPay(record), 0);

  const getDisplayedCarryForwardAmount = (record: any) =>
    Math.max(Math.abs(Math.min(getDisplayedNetPay(record), 0)), 0);


  const isRestDay = (entry: any) => {
    const combined = `${entry.status || ""} ${entry.schedule || ""} ${
      entry.shift || ""
    } ${entry.scheduled_shift || ""} ${entry.shift_name || ""}`.toLowerCase();

    return (
      combined.includes("rest") ||
      combined.includes("rd") ||
      combined.includes("off")
    );
  };

  const isLeaveDay = (entry: any) => {
    const combined = `${entry.status || ""} ${entry.schedule || ""} ${
      entry.shift || ""
    } ${entry.scheduled_shift || ""} ${entry.shift_name || ""} ${
      entry.leave_type || ""
    } ${entry.remarks || ""}`.toLowerCase();

    return (
      combined.includes("leave") ||
      combined.includes("vacation") ||
      combined.includes("sick") ||
      combined.includes("emergency") ||
      combined.includes("maternity") ||
      combined.includes("paternity")
    );
  };

  const isAbsent = (entry: any) => normalize(entry.status) === "absent";
  const hasActualTime = (entry: any) => Boolean(entry.time_in || entry.time_out);

  const getScheduleLabel = (entry: any) =>
    entry.scheduled_shift ||
    entry.shift ||
    entry.schedule ||
    entry.shift_name ||
    "-";

  const getActualLabel = (entry: any) => {
    if (!entry.time_in && !entry.time_out) return "No time entry";
    return `${entry.time_in || "-"} - ${entry.time_out || "-"}`;
  };

  const getAuditKey = (log: any, index: number) =>
    `${selectedPeriodId}-${selectedAuditRecord?.employee_id || ""}-${log.date}-${log.issue}-${index}`;

  const toggleAuditCheck = (key: string) => {
    setCheckedAuditItems((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const mapSettings = (rows: any[] = []) => {
    const mapped: Record<string, string> = {};
    rows.forEach((item: any) => {
      mapped[item.setting_key] = item.setting_value;
    });
    return mapped;
  };

  const isPayrollEligibleEmployee = (employee: any) => {
    const payrollActive = employee?.payroll_active;

    if (payrollActive === false || String(payrollActive).toLowerCase() === "false") {
      return false;
    }

    const employeeStatus = normalize(
      employee?.employment_status ||
        employee?.status ||
        employee?.employee_status ||
        ""
    );

    if (
      employeeStatus.includes("resigned") ||
      employeeStatus.includes("terminated") ||
      employeeStatus.includes("inactive") ||
      employeeStatus.includes("separated")
    ) {
      return false;
    }

    return true;
  };

  const loadPayrollEligibleEmployees = async () => {
    let query = supabase
      .from("employees")
      .select("*")
      .order("department", { ascending: true })
      .order("first_name", { ascending: true });

    const currentCompanyId = getCurrentCompanyId();

    if (currentCompanyId) {
      query = query.eq("company_id", currentCompanyId);
    }

    const { data, error } = await query;

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
      return [];
    }

    return (data || []).filter(isPayrollEligibleEmployee);
  };

  const getEmployees = async () => {
    const eligibleEmployees = await loadPayrollEligibleEmployees();
    setEmployees(eligibleEmployees);
  };

  const getSettings = async () => {
    const { data, error } = await supabase.from("payroll_settings").select("*");
    if (error) return console.log("GET SETTINGS ERROR:", error.message);
    setSettings(mapSettings(data || []));
  };

  const fetchLatestSettings = async () => {
    const { data, error } = await supabase.from("payroll_settings").select("*");

    if (error) {
      console.log("FETCH LATEST SETTINGS ERROR:", error.message);
      return settings;
    }

    const mapped = mapSettings(data || []);
    setSettings(mapped);
    return mapped;
  };

  const getHolidays = async () => {
    const { data, error } = await supabase
      .from("payroll_holidays")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.log("GET HOLIDAYS ERROR:", error.message);
      return [];
    }

    const mapped = (data || []).map((holiday) => {
      const resolvedDate =
        holiday.holiday_date ||
        holiday.date ||
        holiday.holidayDate ||
        holiday.business_date;

      return {
        ...holiday,
        holiday_date: normalizeDate(resolvedDate),
        date: normalizeDate(resolvedDate),
      };
    });

    setHolidays(mapped);
    return mapped;
  };

  const getPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return console.log("GET PERIODS ERROR:", error.message);
    setPeriods(data || []);
  };

  const getRecords = async (periodId: string) => {
    if (!periodId) return;

    const { data, error } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("period_id", periodId)
      .order("department", { ascending: true })
      .order("employee_name", { ascending: true });

    if (error) return console.log("GET RECORDS ERROR:", error.message);
    setRecords(data || []);
  };

  const getAdjustments = async (periodId: string) => {
    if (!periodId) return;

    const { data, error } = await supabase
      .from("payroll_adjustments")
      .select("*")
      .eq("period_id", periodId)
      .order("created_at", { ascending: false });

    if (error) return console.log("GET ADJUSTMENTS ERROR:", error.message);
    setAdjustments(data || []);
  };

  const getEmployeeBalances = async () => {
    const { data, error } = await supabase
      .from("employee_balances")
      .select("*")
      .eq("status", "Active")
      .gt("remaining_balance", 0)
      .order("employee_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEE BALANCES ERROR:", error.message);
      setEmployeeBalances([]);
      return;
    }

    setEmployeeBalances(data || []);
  };

  const markPayrollNeedsRegeneration = async () => {
    if (!selectedPeriodId) return;

    const { error } = await supabase
      .from("payroll_periods")
      .update({
        needs_regeneration: true,
      })
      .eq("id", selectedPeriodId);

    if (error) {
      console.log("MARK NEEDS REGENERATION ERROR:", error.message);
      return;
    }

    await getPeriods();
  };

  const getMaxBalanceDeductionForRecord = (record: any) => {
    return getActiveBalancesForEmployee(record.employee_id).reduce(
      (sum, balance) => sum + Number(balance.remaining_balance || 0),
      0
    );
  };

  const recomputeRecordTotals = (record: any, balanceDeductionValue: number) => {
    const autoDeduction = getAutoDeductionTotal(record);
    const governmentDeduction = getGovernmentDeductionTotal(record);
    const manualDeduction = Number(record.manual_deduction || 0);
    const grossPay = Number(record.gross_pay || 0);

    const totalDeductions =
      autoDeduction + manualDeduction + balanceDeductionValue + governmentDeduction;

    const netPay = grossPay - totalDeductions;
    const releaseAmount = Math.max(netPay, 0);
    const carryForwardAmount = Math.max(Math.abs(Math.min(netPay, 0)), 0);

    return {
      balance_deduction: balanceDeductionValue,
      total_deductions: totalDeductions,
      net_pay: netPay,
      release_amount: releaseAmount,
      carry_forward_amount: carryForwardAmount,
    };
  };

  const updateRecordBalanceDeduction = async (record: any, rawValue: any) => {
    if (!canEditRecordInRegister(record)) {
      alert("This employee row is review-only. Only DRAFT rows during OPEN cutoff or RETURNED FOR CORRECTION rows can be edited in Payroll Register.");
      return;
    }

    const maxBalance = getMaxBalanceDeductionForRecord(record);
    const requestedAmount = Math.max(0, Number(rawValue || 0));
    const safeAmount = Math.min(requestedAmount, maxBalance);

    if (requestedAmount > maxBalance) {
      alert(`Balance deduction cannot exceed active CA balance: ${formatMoney(maxBalance)}.`);
    }

    const updatedTotals = recomputeRecordTotals(record, safeAmount);

    setIsSaving(true);

    const { error } = await supabase
      .from("payroll_records")
      .update(updatedTotals)
      .eq("id", record.id);

    setIsSaving(false);

    if (error) {
      console.log("UPDATE BALANCE DEDUCTION ERROR:", error.message);
      alert(`Failed to update CA deduction.

${error.message}`);
      return;
    }

    setBalanceDrafts((prev) => ({
      ...prev,
      [record.id]: String(safeAmount),
    }));

    setRecords((prev) =>
      prev.map((item) =>
        String(item.id) === String(record.id)
          ? {
              ...item,
              ...updatedTotals,
            }
          : item
      )
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Update CA Deduction",
      description: `${record.employee_name} CA deduction set to ${formatMoney(safeAmount)} for ${selectedPeriod?.period_name || selectedPeriodId}`,
      severity: "warning",
      recordId: record.id,
      oldValue: record,
      newValue: updatedTotals,
    });
  };

  const applyReleasedBalanceDeductions = async (targetRecords: any[]) => {
    for (const record of targetRecords) {
      let remainingDeduction = Number(record.balance_deduction || 0);

      if (remainingDeduction <= 0) continue;

      const balances = getActiveBalancesForEmployee(record.employee_id).sort((a, b) =>
        String(a.created_at || "").localeCompare(String(b.created_at || ""))
      );

      for (const balance of balances) {
        if (remainingDeduction <= 0) break;

        const currentBalance = Number(balance.remaining_balance || 0);
        const appliedAmount = Math.min(currentBalance, remainingDeduction);
        const newRemainingBalance = Math.max(currentBalance - appliedAmount, 0);
        const newStatus = newRemainingBalance <= 0 ? "Paid" : "Active";

        const { error } = await supabase
          .from("employee_balances")
          .update({
            remaining_balance: newRemainingBalance,
            status: newStatus,
            last_deduction_amount: appliedAmount,
            last_deduction_period_id: selectedPeriodId,
            last_deduction_at: new Date().toISOString(),
          })
          .eq("id", balance.id);

        if (error) {
          console.log("APPLY BALANCE DEDUCTION ERROR:", error.message);
          throw new Error(error.message);
        }

        await createAuditLog({
          userName: "OPSCORE USER",
          module: "Payroll",
          action: "Apply CA Deduction",
          description: `${record.employee_name} CA deduction ${formatMoney(appliedAmount)} applied. Remaining: ${formatMoney(newRemainingBalance)}`,
          severity: "warning",
          recordId: balance.id,
          oldValue: balance,
          newValue: {
            payrollRecordId: record.id,
            periodId: selectedPeriodId,
            appliedAmount,
            remaining_balance: newRemainingBalance,
            status: newStatus,
          },
        });

        remainingDeduction -= appliedAmount;
      }
    }
  };


  const balanceAppliesToSelectedPeriod = (balance: any) => {
    const remaining = Number(balance.remaining_balance || 0);
    const status = String(balance.status || "Active");

    // V3 rule:
    // Active employee balances are available for deduction until fully paid.
    // Do not lock CA to the same payroll period because Cash Drawer / Expenses
    // can create a CA in one cutoff while the deduction is decided later.
    // The payroll admin controls the actual amount through "CA Deduct This Cutoff".
    if (status !== "Active") return false;
    if (remaining <= 0) return false;

    return true;
  };

  const getBalanceAuditLabel = (balance: any) => {
    const source = String(balance.source_module || "Employee Balances");
    const balanceId = balance.id ? `Balance ID: ${balance.id}` : "";
    const sourceId = balance.source_id ? `Source ID: ${balance.source_id}` : "";
    const periodId = balance.period_id ? `Period ID: ${balance.period_id}` : "";

    return [source, balanceId, sourceId, periodId].filter(Boolean).join(" • ");
  };

  const createPeriod = async () => {
    if (!periodName.trim() || !startDate || !endDate) {
      alert("Complete payroll period details.");
      return;
    }

    const currentCompanyId = getCurrentCompanyId();

    if (!currentCompanyId) {
      alert("No company selected. Please login again before creating payroll period.");
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("payroll_periods")
      .insert({
        company_id: currentCompanyId,
        period_name: periodName.trim(),
        start_date: startDate,
        end_date: endDate,
        status: "OPEN",
        attendance_locked: false,
        needs_regeneration: false,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("CREATE PERIOD ERROR:", error);
      alert(`Failed to create period.\n\n${error.message}`);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Create Payroll Period",
      description: `Created payroll period: ${periodName.trim()} (${startDate} to ${endDate})`,
      severity: "info",
      recordId: data.id,
      newValue: data,
    });

    setPeriodName("");
    setStartDate("");
    setEndDate("");
    setSelectedPeriodId(data.id);

    await getPeriods();
  };

  const deletePeriod = async () => {
    if (!selectedPeriodId) {
      alert("Select a payroll period first.");
      return;
    }

    if (!canEditDraftRegister) {
      alert("Only OPEN payroll periods can be deleted from Payroll Register. Sent, locked, or released cutoffs are controlled by Payroll Manager.");
      return;
    }

    const selected = periods.find((period) => period.id === selectedPeriodId);

    const confirmDelete = confirm(
      `Delete payroll period "${selected?.period_name || "selected period"}"? This will also delete its payroll records and manual adjustments.`
    );

    if (!confirmDelete) return;

    setIsSaving(true);

    await supabase.from("payroll_records").delete().eq("period_id", selectedPeriodId);
    await supabase.from("payroll_adjustments").delete().eq("period_id", selectedPeriodId);

    const { error } = await supabase
      .from("payroll_periods")
      .delete()
      .eq("id", selectedPeriodId);

    setIsSaving(false);

    if (error) {
      alert("Failed to delete payroll period.");
      return console.log("DELETE PERIOD ERROR:", error.message);
    }

    setSelectedPeriodId("");
    setRecords([]);
    setAdjustments([]);
    setSelectedPayslipId("");
    setSelectedPayslip(null);
    setSelectedAuditRecord(null);
    setAuditLogs([]);
    setPayslipAdjustments([]);
    setCheckedAuditItems([]);
    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Delete Payroll Period",
      description: `Deleted payroll period: ${selected?.period_name || selectedPeriodId}`,
      severity: "critical",
      recordId: selectedPeriodId,
      oldValue: selected,
      newValue: { deleted: true },
    });

    setSelectedRecordIds([]);

    await getPeriods();
  };

  const reopenPayroll = async () => {
    alert("Register-side reopen is disabled after payroll is sent to Manager. Use Payroll Manager return/request reopen workflow.");
  };

  const getAttendanceRows = async (employeeId: string) => {
    if (!selectedPeriod) return [];

    const { data, error } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("attendance_date", selectedPeriod.start_date)
      .lte("attendance_date", selectedPeriod.end_date)
      .order("attendance_date", { ascending: true });

    if (error) {
      console.log("GET ATTENDANCE ROWS ERROR:", error.message);
      return [];
    }

    return data || [];
  };

  const getAttendanceSummary = async (
    employeeId: string,
    activeSettings: Record<string, string> = settings
  ) => {
    const rows = await getAttendanceRows(employeeId);

    const restRows = rows.filter((row) => isRestDay(row));
    const scheduledRows = rows.filter((row) => !isRestDay(row));
    const leaveRows = scheduledRows.filter((row) => isLeaveDay(row));
    const workRows = scheduledRows.filter((row) => !isLeaveDay(row));

    const leavePayEnabled =
      isSettingEnabled(activeSettings, "leave_enabled") &&
      isSettingEnabled(activeSettings, "leave_pay_enabled");

    const workedDays = workRows.filter(
      (row) => !isAbsent(row) && hasActualTime(row)
    ).length;

    const paidLeaveDays = leavePayEnabled ? leaveRows.length : 0;

    const detectedOtMinutes = workRows.reduce(
      (sum, row) => sum + Number(row.ot_minutes || 0),
      0,
    );

    const approvedOtMinutes = workRows.reduce(
      (sum, row) => sum + Number(row.approved_ot_minutes || 0),
      0,
    );

    return {
      scheduledDays: scheduledRows.length,
      restDays: restRows.length,
      leaveDays: leaveRows.length,
      paidLeaveDays,
      daysWorked: workedDays + paidLeaveDays,
      actualWorkedDays: workedDays,
      lateMinutes: workRows.reduce((sum, row) => sum + Number(row.late_minutes || 0), 0),
      undertimeMinutes: workRows.reduce((sum, row) => sum + Number(row.undertime_minutes || 0), 0),
      absentDays: workRows.filter((row) => isAbsent(row) || !hasActualTime(row)).length,
      otMinutes: detectedOtMinutes,
      detectedOtMinutes,
      approvedOtMinutes,
      otApprovalStatus: getOtApprovalStatus(detectedOtMinutes, approvedOtMinutes),
      holidayWorkedDates: workRows
        .filter((row) => hasActualTime(row))
        .map((row) => normalizeDate(row.attendance_date)),
    };
  };

  const getActiveBalancesForEmployee = (employeeId: string) => {
    return employeeBalances.filter(
      (balance) =>
        String(balance.employee_id) === String(employeeId) &&
        String(balance.status || "Active") === "Active" &&
        Number(balance.remaining_balance || 0) > 0 &&
        balanceAppliesToSelectedPeriod(balance)
    );
  };

  const buildBalanceAdjustments = (employeeId: string) => {
    return getActiveBalancesForEmployee(employeeId).map((balance) => ({
      id: `balance-${balance.id}`,
      employee_id: balance.employee_id,
      employee_name: balance.employee_name,
      adjustment_type: balance.balance_type || "Carry Forward Balance",
      adjustment_direction: "Deduction",
      amount: Number(balance.remaining_balance || 0),
      remarks: balance.remarks || getBalanceAuditLabel(balance),
      status: "Approved",
      source_module: "Employee Balances",
      source_id: balance.id,
      is_employee_balance: true,
      balance_id: balance.id,
    }));
  };

  const computeRecord = (
    base: any,
    employeeAdjustments: any[] = [],
    activeSettings: Record<string, string> = settings,
    activeHolidays: any[] = holidays
  ) => {
    const paidHours = Number(activeSettings.paid_hours || 8);
    const lateGrace = Number(activeSettings.late_grace_minutes || 15);
    const undertimeGrace = Number(activeSettings.undertime_grace_minutes || 0);

    const lateEnabled = activeSettings.late_deduction_enabled === "Yes";
    const undertimeEnabled = activeSettings.undertime_deduction_enabled === "Yes";
    const absentEnabled = activeSettings.absent_deduction_enabled === "Yes";
    const holidayEnabled = activeSettings.holiday_pay_enabled === "Yes";

    // OT settings guard.
    // Some settings pages may save the switch under different keys depending on version.
    // If the key is missing, default is ON to preserve old payroll behavior.
    const otEnabled =
      !["No", "Off", "Disabled", "False", "0"].includes(
        String(
          activeSettings.ot_enabled ??
            activeSettings.overtime_enabled ??
            activeSettings.ot_pay_enabled ??
            activeSettings.overtime_pay_enabled ??
            activeSettings.ot_payroll_enabled ??
            "Yes"
        )
      );

    const otMultiplier = Number(activeSettings.ot_multiplier || 1.25);

    const rateType = base.rate_type || "Daily";
    const basicRate = Number(base.basic_rate || 0);

    const daysWorked = Number(base.days_worked || 0);
    const absentDays = Number(base.absent_days || 0);
    const lateMinutes = Number(base.late_minutes || 0);
    const undertimeMinutes = Number(base.undertime_minutes || 0);
    const detectedOtMinutes = Number(base.detected_ot_minutes ?? base.ot_minutes ?? 0);
    const approvedOtMinutes = Number(base.approved_ot_minutes || 0);
    const otApprovalRequired = isOvertimeApprovalRequired(activeSettings);
    const payableOtMinutes = otApprovalRequired ? approvedOtMinutes : detectedOtMinutes;
    const otMinutes = detectedOtMinutes;
    const otHours = payableOtMinutes / 60;
    const otApprovalStatus = otApprovalRequired
      ? getOtApprovalStatus(detectedOtMinutes, approvedOtMinutes)
      : detectedOtMinutes > 0
        ? "NOT_REQUIRED"
        : "NOT_REQUIRED";

    const dailyRate = rateType === "Monthly" ? basicRate / 26 : basicRate;
    const hourlyRate = dailyRate / paidHours;
    const minuteRate = hourlyRate / 60;

    const basicPay =
      rateType === "Monthly"
        ? basicRate
        : rateType === "Weekly"
        ? basicRate
        : dailyRate * daysWorked;

    const lateDeduction =
      lateEnabled && lateMinutes > lateGrace ? lateMinutes * minuteRate : 0;

    const undertimeDeduction =
      undertimeEnabled && undertimeMinutes > undertimeGrace
        ? undertimeMinutes * minuteRate
        : 0;

    const absentDeduction =
      absentEnabled && rateType === "Monthly" ? absentDays * dailyRate : 0;

    // OPSCORE V1.5 OT rule:
    // Detected OT is never payable by itself when approval is required.
    // Approved OT minutes are the source of truth for payroll payout.
    // If approved minutes exist, compute OT pay even when legacy OT toggle keys are missing/mismatched.
    const otComputationEnabled = otEnabled || payableOtMinutes > 0;
    const otPay = otComputationEnabled && payableOtMinutes > 0
      ? otHours * hourlyRate * otMultiplier
      : 0;

    const holidayWorkedDates = Array.from(
      new Set((base.holiday_worked_dates || []).map(normalizeDate).filter(Boolean))
    );

    const matchedHolidays = activeHolidays.filter((holiday) => {
      const holidayDate = normalizeDate(
        holiday.holiday_date ||
          holiday.date ||
          holiday.holidayDate ||
          holiday.business_date
      );

      return holidayDate && holidayWorkedDates.includes(holidayDate);
    });

    const holidayPayEnabled =
      holidayEnabled ||
      isSettingEnabled(activeSettings, "holiday_enabled") ||
      isSettingEnabled(activeSettings, "holiday_pay") ||
      isSettingEnabled(activeSettings, "auto_holiday_pay_enabled");

    const getHolidayMultiplier = (holiday: any) => {
      const rawType = normalize(
        holiday.holiday_type ||
          holiday.type ||
          holiday.category ||
          holiday.holiday_category
      );

      const savedMultiplier = Number(
        holiday.multiplier ||
          holiday.pay_multiplier ||
          holiday.holiday_multiplier ||
          0
      );

      if (savedMultiplier > 0) return savedMultiplier;

      if (rawType.includes("special")) {
        return Number(activeSettings.special_holiday_multiplier || 1.3);
      }

      if (rawType.includes("regular")) {
        return Number(activeSettings.regular_holiday_multiplier || 2);
      }

      return 1;
    };

    const holidayPay = holidayPayEnabled
      ? matchedHolidays.reduce((sum, holiday) => {
          const multiplier = getHolidayMultiplier(holiday);
          return sum + dailyRate * Math.max(multiplier - 1, 0);
        }, 0)
      : 0;

    const manualEarnings = employeeAdjustments
      .filter((item) => item.adjustment_direction === "Earning")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const balanceDeduction = Number(base.balance_deductions || 0);

    const manualDeductions = employeeAdjustments
      .filter(
        (item) =>
          item.adjustment_direction === "Deduction" &&
          item.source_module !== "Employee Balances"
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const grossPay = basicPay + holidayPay + otPay + manualEarnings;

    const governmentEnabled = isGovernmentEnabled(activeSettings);

    // Phase 2-ready fields.
    // Production-safe for Vincent Phase 1: keep at 0 until actual government formulas are added.
    const sssDeduction =
      governmentEnabled && isSettingEnabled(activeSettings, "sss_enabled") ? 0 : 0;

    const philhealthDeduction =
      governmentEnabled && isSettingEnabled(activeSettings, "philhealth_enabled")
        ? 0
        : 0;

    const pagibigDeduction =
      governmentEnabled && isSettingEnabled(activeSettings, "pagibig_enabled") ? 0 : 0;

    const taxDeduction = isSettingEnabled(activeSettings, "withholding_tax_enabled")
      ? 0
      : 0;

    const governmentDeductions =
      sssDeduction + philhealthDeduction + pagibigDeduction + taxDeduction;

    const totalDeductions =
      lateDeduction +
      undertimeDeduction +
      absentDeduction +
      manualDeductions +
      balanceDeduction +
      governmentDeductions;

    const netPay = grossPay - totalDeductions;
    const releaseAmount = Math.max(netPay, 0);
    const carryForwardAmount = Math.max(Math.abs(Math.min(netPay, 0)), 0);

    const { balance_deductions, ...cleanBase } = base;

    return {
      ...cleanBase,
      status: "Draft",
      record_status: PAYROLL_RECORD_STATUSES.DRAFT,
      basic_pay: basicPay,
      holiday_pay: holidayPay,
      ot_pay: otPay,
      detected_ot_minutes: detectedOtMinutes,
      approved_ot_minutes: approvedOtMinutes,
      ot_approval_status: otApprovalStatus,
      allowance: manualEarnings,
      manual_deduction: manualDeductions,
      balance_deduction: balanceDeduction,
      sss_deduction: sssDeduction,
      philhealth_deduction: philhealthDeduction,
      pagibig_deduction: pagibigDeduction,
      tax_deduction: taxDeduction,
      late_deduction: lateDeduction,
      undertime_deduction: undertimeDeduction,
      absent_deduction: absentDeduction,
      total_deductions: totalDeductions,
      gross_pay: grossPay,
      net_pay: netPay,
      release_amount: releaseAmount,
      carry_forward_amount: carryForwardAmount,

      // Payroll Manager V3 release tracking.
      // These fields keep release history stable and prevent partial releases
      // from disappearing after a refresh or future manager action.
      paid_amount: 0,
      remaining_amount: releaseAmount,
      release_status: "Pending",
      remaining_payroll_balance: releaseAmount,

      period_label: selectedPeriod?.period_name || "Payroll Period",
    };
  };

  const generatePayroll = async () => {
    if (!selectedPeriodId || !selectedPeriod) {
      alert("Select payroll period first.");
      return;
    }

    if (!canGenerateRegister) {
      alert("Generate Register is only allowed while the payroll period is OPEN. After REGISTERED, Manager must return individual employee rows for correction.");
      return;
    }

    const currentCompanyId = getCurrentCompanyId();

    if (!currentCompanyId) {
      alert("No company selected. Please login again before generating payroll.");
      return;
    }

    const payrollEmployees =
      employees.length > 0 ? employees : await loadPayrollEligibleEmployees();

    if (payrollEmployees.length === 0) {
      alert(
        "No payroll eligible employees found. Check employee status, company_id, or payroll_active values."
      );
      return;
    }

    if (employees.length === 0) {
      setEmployees(payrollEmployees);
    }

    const confirmGenerate = confirm(
      "Generate payroll using approved adjustments only? Draft / editable records for this period will be refreshed. Released or partially released payroll records will be preserved."
    );

    if (!confirmGenerate) return;

    setIsSaving(true);

    const latestSettings = await fetchLatestSettings();
    const latestHolidays = await getHolidays();
    await getEmployeeBalances();

    const { data: latestBalancesData, error: balancesError } = await supabase
      .from("employee_balances")
      .select("*")
      .eq("status", "Active")
      .gt("remaining_balance", 0);

    if (balancesError) {
      setIsSaving(false);
      alert("Failed to load employee balances.");
      return console.log("LOAD BALANCES ERROR:", balancesError.message);
    }

    const latestBalances = latestBalancesData || [];

    const { data: existingPeriodRecords, error: existingRecordsError } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("period_id", selectedPeriodId);

    if (existingRecordsError) {
      setIsSaving(false);
      alert("Failed to check existing payroll records before generation.");
      return console.log("CHECK EXISTING PAYROLL RECORDS ERROR:", existingRecordsError.message);
    }

    const isAttendanceReopenRegeneration =
      ["OPEN", "REOPENED", "DRAFT"].includes(periodStatus) &&
      selectedPeriod?.attendance_locked === false &&
      selectedPeriod?.needs_regeneration === true;

    // Protect only records that have entered approval/release lifecycle.
    // IMPORTANT:
    // Draft/Pending open-register records must be refreshable when attendance,
    // approved OT, CA deductions, or settings change. The previous guard protected
    // any record with remaining_amount > 0, which blocked OT recomputation after
    // an overtime approval.
    const protectedExistingRecords = isAttendanceReopenRegeneration
      ? []
      : (existingPeriodRecords || []).filter((record) => {
          const status = getRecordStatus(record);
          return ![
            PAYROLL_RECORD_STATUSES.DRAFT,
            PAYROLL_RECORD_STATUSES.RETURNED_FOR_CORRECTION,
          ].includes(status as any);
        });

    const protectedEmployeeIds = new Set(
      protectedExistingRecords.map((record) => String(record.employee_id))
    );

    const editableExistingIds = (existingPeriodRecords || [])
      .filter((record) => !protectedExistingRecords.some((protectedRecord) => String(protectedRecord.id) === String(record.id)))
      .map((record) => record.id);

    if (editableExistingIds.length > 0) {
      const { error: deleteEditableError } = await supabase
        .from("payroll_records")
        .delete()
        .in("id", editableExistingIds);

      if (deleteEditableError) {
        setIsSaving(false);
        alert("Failed to refresh editable payroll records.");
        return console.log("DELETE EDITABLE PAYROLL RECORDS ERROR:", deleteEditableError.message);
      }
    }

    const employeesToGenerate = payrollEmployees.filter(
      (employee) => !protectedEmployeeIds.has(String(employee.id))
    );

    const generated = await Promise.all(
      employeesToGenerate.map(async (employee) => {
        const attendance = await getAttendanceSummary(employee.id, latestSettings);

        const approvedPeriodAdjustments = adjustments.filter(
          (item) =>
            item.employee_id === employee.id &&
            String(item.status || "Pending") === "Approved"
        );

        const activeBalanceAdjustments = latestBalances
          .filter(
            (balance) =>
              String(balance.employee_id) === String(employee.id) &&
              String(balance.status || "Active") === "Active" &&
              Number(balance.remaining_balance || 0) > 0 &&
              balanceAppliesToSelectedPeriod(balance)
          )
          .map((balance) => ({
            id: `balance-${balance.id}`,
            employee_id: balance.employee_id,
            employee_name: balance.employee_name,
            adjustment_type: balance.balance_type || "Carry Forward Balance",
            adjustment_direction: "Deduction",
            amount: Number(balance.remaining_balance || 0),
            remarks: balance.remarks || getBalanceAuditLabel(balance),
            status: "Approved",
            source_module: "Employee Balances",
            source_id: balance.id,
            is_employee_balance: true,
            balance_id: balance.id,
          }));

        const employeeAdjustments = [
          ...approvedPeriodAdjustments,
          ...activeBalanceAdjustments,
        ];

        const base = {
          company_id: currentCompanyId,
          period_id: selectedPeriodId,
          employee_id: employee.id,
          employee_no: employee.employee_no,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          department: employee.department,
          position: employee.position,
          rate_type: employee.rate_type || latestSettings.default_rate_type || "Daily",
          basic_rate: Number(employee.basic_rate || employee.daily_rate || 0),

          scheduled_days: attendance.scheduledDays,
          rest_days: attendance.restDays,
          days_worked: attendance.daysWorked,
          weeks_worked: 0,
          late_minutes: attendance.lateMinutes,
          undertime_minutes: attendance.undertimeMinutes,
          absent_days: attendance.absentDays,
          ot_minutes: attendance.otMinutes,
          detected_ot_minutes: attendance.detectedOtMinutes,
          approved_ot_minutes: attendance.approvedOtMinutes,
          ot_approval_status: attendance.otApprovalStatus,
          holiday_worked_dates: attendance.holidayWorkedDates,
          remarks:
            attendance.leaveDays > 0
              ? `Approved leave day(s): ${attendance.leaveDays}. Paid leave day(s): ${attendance.paidLeaveDays}.`
              : "",
          // CA / employee balances are intentionally not auto-deducted in full.
          // Payroll admin sets the partial amount in the Final Payroll Register.
          balance_deductions: 0,
        };

        return computeRecord(base, employeeAdjustments, latestSettings, latestHolidays);
      })
    );

    if (generated.length > 0) {
      const { error } = await supabase.from("payroll_records").insert(generated);

      if (error) {
        setIsSaving(false);
        console.log("GENERATE PAYROLL ERROR:", error);
        alert(`Failed to generate payroll.\n\n${error.message}`);
        return;
      }
    }

    setIsSaving(false);

    await supabase
      .from("payroll_periods")
      .update({
        needs_regeneration: false,
        last_generated_at: new Date().toISOString(),
      })
      .eq("id", selectedPeriodId);

    await getPeriods();
    await getRecords(selectedPeriodId);
    await getEmployeeBalances();
    setSelectedRecordIds([]);
    setSelectedPayslipId("");
    setSelectedPayslip(null);
    setSelectedAuditRecord(null);
    setAuditLogs([]);
    setPayslipAdjustments([]);
    setCheckedAuditItems([]);

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Generate Register",
      description: `${generated.length} payroll record(s) generated for ${selectedPeriod?.period_name || selectedPeriodId}`,
      severity: "info",
      recordId: selectedPeriodId,
      newValue: {
        period: selectedPeriod,
        generatedCount: generated.length,
        preservedReleasedCount: protectedExistingRecords.length,
        attendanceReopenRegeneration: isAttendanceReopenRegeneration,
        totalGross: generated.reduce((sum, record) => sum + Number(record.gross_pay || 0), 0),
        totalDeductions: generated.reduce((sum, record) => sum + Number(record.total_deductions || 0), 0),
        totalRelease: generated.reduce((sum, record) => sum + Number(record.release_amount || 0), 0),
        balanceDeductions: generated.reduce((sum, record) => sum + Number(record.balance_deduction || 0), 0),
      },
    });

    alert(`Payroll generated. CA balances are available for manual partial deduction. Preserved approved/released records: ${protectedExistingRecords.length}.`);
  };

  const addAdjustment = async () => {
    if (!canManageRegisterForm) {
      alert("Adjustments can only be added while the payroll period is OPEN. For sent payroll, Manager must return the employee row for correction.");
      return;
    }

    if (!selectedPeriodId || !selectedEmployeeId || !adjustmentAmount) {
      alert("Complete adjustment form.");
      return;
    }

    const employee = employees.find((item) => item.id === selectedEmployeeId);
    if (!employee) return;

    const amountValue = Number(adjustmentAmount || 0);

    if (amountValue <= 0) {
      alert("Adjustment amount must be greater than zero.");
      return;
    }

    const isEmployeeBalanceType = balanceDeductionTypes.includes(adjustmentType);
    const direction = earningTypes.includes(adjustmentType)
      ? "Earning"
      : "Deduction";

    setIsSaving(true);

    if (isEmployeeBalanceType) {
      const balancePayload = {
        employee_id: selectedEmployeeId,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        balance_type: adjustmentType,
        original_amount: amountValue,
        remaining_balance: amountValue,
        status: "Active",
        source_module: "Payroll Register",
        source_id: selectedPeriodId,
        period_id: selectedPeriodId,
        remarks:
          adjustmentRemarks.trim() ||
          `${adjustmentType} created from Payroll Register for ${selectedPeriod?.period_name || "Payroll Period"}.`,
        created_at: new Date().toISOString(),
      };

      const { data: newBalance, error: balanceError } = await supabase
        .from("employee_balances")
        .insert(balancePayload)
        .select()
        .single();

      setIsSaving(false);

      if (balanceError) {
        console.log("CREATE EMPLOYEE BALANCE ERROR:", balanceError.message);
        alert(`Failed to create employee balance.\n\n${balanceError.message}`);
        return;
      }

      setSelectedEmployeeId("");
      setAdjustmentType("Other Deduction");
      setAdjustmentAmount("");
      setAdjustmentRemarks("");

      await getEmployeeBalances();
      await markPayrollNeedsRegeneration();

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Create Employee Balance From Register",
        description: `${adjustmentType} balance created for ${employee.first_name} ${employee.last_name}: ${formatMoney(amountValue)}. This supports partial payroll deduction.`,
        severity: "warning",
        recordId: newBalance?.id || selectedPeriodId,
        newValue: {
          ...balancePayload,
          supportsPartialDeduction: true,
        },
      });

      alert(
        `${adjustmentType} saved to Employee Balances. Generate register again, then set partial deduction under "Balance Deduct This Cutoff".`
      );
      return;
    }

    const adjustmentPayload = {
      period_id: selectedPeriodId,
      employee_id: selectedEmployeeId,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      adjustment_type: adjustmentType,
      adjustment_direction: direction,
      amount: amountValue,
      remarks: adjustmentRemarks,
      status: "Pending",
    };

    const { data: newAdjustment, error } = await supabase
      .from("payroll_adjustments")
      .insert(adjustmentPayload)
      .select()
      .single();

    if (error) {
      setIsSaving(false);
      alert("Failed to add adjustment.");
      return console.log("ADD ADJUSTMENT ERROR:", error.message);
    }

    const { error: approvalError } = await supabase
      .from("approval_requests")
      .insert({
        request_type: "PAYROLL_ADJUSTMENT",
        module: "Payroll",
        reference_id: String(newAdjustment.id),
        title: `${direction}: ${adjustmentType} - ${formatMoney(amountValue)}`,
        description: `${newAdjustment.employee_name} | ${selectedPeriod?.period_name || "Payroll Period"} | ${adjustmentRemarks || "No remarks"}`,
        requested_by: "Payroll Register",
        status: "PENDING",
        request_payload: {
          payroll_adjustment_id: newAdjustment.id,
          period_id: selectedPeriodId,
          period_name: selectedPeriod?.period_name || "Payroll Period",
          employee_id: selectedEmployeeId,
          employee_name: newAdjustment.employee_name,
          adjustment_type: adjustmentType,
          adjustment_direction: direction,
          amount: amountValue,
          remarks: adjustmentRemarks,
          approver_role: "MANAGER",
        },
      });

    setIsSaving(false);

    if (approvalError) {
      console.log("CREATE PAYROLL ADJUSTMENT APPROVAL ERROR:", approvalError.message);
      alert("Adjustment was saved, but Approval Center request failed. Please check approval_requests columns.");
    }

    setSelectedEmployeeId("");
    setAdjustmentType("Employee Meal Charge");
    setAdjustmentAmount("");
    setAdjustmentRemarks("");

    await getAdjustments(selectedPeriodId);
    await markPayrollNeedsRegeneration();

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Submit Payroll Adjustment For Approval",
      description: `${direction} adjustment submitted for ${employee.first_name} ${employee.last_name}: ${adjustmentType} ${formatMoney(amountValue)}`,
      severity: "warning",
      recordId: newAdjustment.id,
      newValue: {
        ...adjustmentPayload,
        approvalRequestCreated: !approvalError,
      },
    });

    alert(
      approvalError
        ? "Adjustment saved as Pending, but Approval Center request failed."
        : "Adjustment sent to Approval Center. Generate payroll only after approval."
    );
  };

  // Payroll adjustment approval is now routed through Manager Approval Center.
  // Keep these no-op guards only to prevent old UI calls from accidentally approving directly.
  const approveAdjustment = async (_id: string) => {
    alert("Payroll adjustments must be approved in Manager Approval Center.");
  };

  const rejectAdjustment = async (_id: string) => {
    alert("Payroll adjustments must be rejected in Manager Approval Center.");
  };

  const deleteAdjustment = async (id: string) => {
    if (!canManageRegisterForm) {
      alert("Adjustments can only be deleted while the payroll period is OPEN.");
      return;
    }

    const confirmDelete = confirm("Delete this manual adjustment?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("payroll_adjustments")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Failed to delete adjustment.");
      return console.log("DELETE ADJUSTMENT ERROR:", error.message);
    }

    await getAdjustments(selectedPeriodId);
    await markPayrollNeedsRegeneration();

    const deletedAdjustment = adjustments.find((item) => String(item.id) === String(id));
    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Delete Payroll Adjustment",
      description: `Deleted payroll adjustment ${deletedAdjustment?.adjustment_type || id}`,
      severity: "critical",
      recordId: id,
      oldValue: deletedAdjustment,
      newValue: { deleted: true },
    });

    alert("Adjustment deleted. Generate register again to update payroll.");
  };


  const getBalanceSourceLabel = (balance: any) => {
    const source = String(balance.source_module || "");

    if (source === "Cash Drawer") return "Cash Drawer";
    if (source === "Expenses") return "Expenses";
    if (source === "Payroll Manager") return "Carry Forward";
    if (source) return source;

    return "Employee Balance";
  };

  const getBalanceSourceStyle = (balance: any) => {
    const source = String(balance.source_module || "");

    if (source === "Cash Drawer") return "bg-blue-500/10 text-blue-700";
    if (source === "Expenses") return "bg-blue-50 text-blue-700";
    if (source === "Payroll Manager") return "bg-blue-500/10 text-blue-700";

    return "bg-slate-100 text-slate-700";
  };

  const deleteEmployeeBalance = async (balance: any) => {
    if (!canManageRegisterForm) {
      alert("Employee balances can only be cancelled from Register while the payroll period is OPEN.");
      return;
    }

    const reason = prompt(
      `Reason for cancelling this employee balance?

Employee: ${balance.employee_name || "Unknown"}
Type: ${balance.balance_type || "Balance"}
Remaining: ${formatMoney(balance.remaining_balance)}
Source: ${getBalanceSourceLabel(balance)}`
    );

    if (!reason || !reason.trim()) {
      alert("Cancellation reason is required for audit trail.");
      return;
    }

    const confirmed = confirm(
      `Cancel this employee balance?

Employee: ${balance.employee_name || "Unknown"}
Type: ${balance.balance_type || "Balance"}
Remaining: ${formatMoney(balance.remaining_balance)}
Source: ${getBalanceSourceLabel(balance)}

This will remove it from future payroll deductions but keep the audit trail.`
    );

    if (!confirmed) return;

    setIsSaving(true);

    const { error: expenseUpdateError } = await supabase
      .from("expenses")
      .update({
        employee_balance_id: null,
        deduct_to_payroll: false,
        payroll_period_id: null,
        remarks: `Payroll balance cancelled from Payroll Register. Reason: ${reason.trim()}`,
      })
      .eq("employee_balance_id", balance.id);

    if (expenseUpdateError) {
      console.log("UNLINK EXPENSE BALANCE ERROR:", expenseUpdateError.message);
    }

    const { error } = await supabase
      .from("employee_balances")
      .update({
        status: "Cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason.trim(),
        remaining_balance: 0,
        remarks: `${balance.remarks || ""} Cancelled from Payroll Register. Reason: ${reason.trim()}`.trim(),
      })
      .eq("id", balance.id);

    if (error) {
      setIsSaving(false);
      alert("Failed to cancel employee balance.");
      return console.log("CANCEL EMPLOYEE BALANCE ERROR:", error.message);
    }

    const targetPeriodId = balance.period_id || selectedPeriodId;

    if (targetPeriodId) {
      await supabase
        .from("payroll_periods")
        .update({ needs_regeneration: true })
        .eq("id", targetPeriodId);
    }

    setIsSaving(false);

    await getEmployeeBalances();
    await getPeriods();
    if (selectedPeriodId) await getRecords(selectedPeriodId);

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Cancel Employee Balance",
      description: `Cancelled ${balance.balance_type || "employee balance"} for ${balance.employee_name || "Unknown"}: ${formatMoney(balance.remaining_balance)}. Reason: ${reason.trim()}`,
      severity: "critical",
      recordId: balance.id,
      oldValue: balance,
      newValue: {
        status: "Cancelled",
        remaining_balance: 0,
        cancel_reason: reason.trim(),
      },
    });

    alert("Employee balance cancelled. Generate register again to update deductions.");
  };

  const getEmployeeAuditLogs = async (record: any) => {
    if (!selectedPeriod) return [];

    const activeSettings = await fetchLatestSettings();

    const paidHours = Number(activeSettings.paid_hours || 8);
    const lateGrace = Number(activeSettings.late_grace_minutes || 15);
    const undertimeGrace = Number(activeSettings.undertime_grace_minutes || 0);

    const lateEnabled = activeSettings.late_deduction_enabled === "Yes";
    const undertimeEnabled = activeSettings.undertime_deduction_enabled === "Yes";
    const absentEnabled = activeSettings.absent_deduction_enabled === "Yes";
    const leavePayEnabled =
      isSettingEnabled(activeSettings, "leave_enabled") &&
      isSettingEnabled(activeSettings, "leave_pay_enabled");

    const basicRate = Number(record.basic_rate || 0);
    const rateType = record.rate_type || "Daily";

    const dailyRate = rateType === "Monthly" ? basicRate / 26 : basicRate;
    const minuteRate = dailyRate / paidHours / 60;

    const attendanceData = await getAttendanceRows(record.employee_id);

    const attendanceLogs = (attendanceData || []).map((entry: any) => {
      const restDay = isRestDay(entry);
      const leaveDay = isLeaveDay(entry);
      const absent =
        !leaveDay && (isAbsent(entry) || (!restDay && !hasActualTime(entry)));
      const lateMinutes = Number(entry.late_minutes || 0);
      const undertimeMinutes = Number(entry.undertime_minutes || 0);
      const otMinutes = Number(entry.ot_minutes || 0);
      const approvedOtMinutes = Number(entry.approved_ot_minutes || 0);
      const otApprovalRequired = isOvertimeApprovalRequired(activeSettings);
      const payableOtMinutes = otApprovalRequired ? approvedOtMinutes : otMinutes;
      const otHours = payableOtMinutes / 60;
      const otMultiplier = Number(activeSettings.ot_multiplier || 1.25);
      const otAmount = otHours * (dailyRate / paidHours) * otMultiplier;
      const otApprovalStatus = otApprovalRequired
        ? getOtApprovalStatus(otMinutes, approvedOtMinutes)
        : "NOT_REQUIRED";

      const lateAmount =
        lateEnabled && lateMinutes > lateGrace ? lateMinutes * minuteRate : 0;

      const undertimeAmount =
        undertimeEnabled && undertimeMinutes > undertimeGrace
          ? undertimeMinutes * minuteRate
          : 0;

      const absentAmount =
        absentEnabled && rateType === "Monthly" && absent ? dailyRate : 0;

      let issue = "OK";
      const issueParts: string[] = [];

      if (restDay) issueParts.push("Rest Day / Off");
      if (leaveDay) {
        issueParts.push(
          leavePayEnabled
            ? "Approved Leave / Paid"
            : "Approved Leave / Unpaid"
        );
      }
      if (!restDay && !leaveDay && absent) issueParts.push("Absent from scheduled work day");
      if (lateMinutes > 0) issueParts.push(`${lateMinutes} mins late`);
      if (undertimeMinutes > 0) issueParts.push(`${undertimeMinutes} mins undertime`);
      if (otMinutes > 0) {
        issueParts.push(
          `${otMinutes} mins OT • Approved ${approvedOtMinutes} mins • ${otApprovalStatus.replace(/_/g, " ")}`
        );
      }

      if (issueParts.length > 0) issue = issueParts.join(" • ");

      return {
        date: normalizeDate(entry.attendance_date),
        schedule: getScheduleLabel(entry),
        actual: getActualLabel(entry),
        status: entry.status || (restDay ? "RD/OFF" : "No Status"),
        issue,
        lateAmount,
        undertimeAmount,
        absentAmount,
        otAmount,
        detectedOtMinutes: otMinutes,
        approvedOtMinutes,
        otApprovalStatus,
        totalAmount: lateAmount + undertimeAmount + absentAmount,
        isDeduction: lateAmount + undertimeAmount + absentAmount > 0,
      };
    });

    const manualLogs = adjustments
      .filter(
        (item) =>
          item.employee_id === record.employee_id &&
          String(item.status || "Pending") === "Approved"
      )
      .map((item) => ({
        date: normalizeDate(item.created_at) || "-",
        schedule: "Manual",
        actual: "Manual adjustment",
        status: item.adjustment_direction,
        issue: `${item.adjustment_type} • ${item.remarks || "No remarks"}`,
        lateAmount: 0,
        undertimeAmount: 0,
        absentAmount: 0,
        totalAmount:
          item.adjustment_direction === "Deduction" ? Number(item.amount || 0) : 0,
        isDeduction: item.adjustment_direction === "Deduction",
      }));

    const balanceLogs = buildBalanceAdjustments(record.employee_id).map((item) => ({
      date: "-",
      schedule: "Carry Forward",
      actual: "Employee balance",
      status: "Deduction",
      issue: `${item.adjustment_type} • ${item.remarks || "Outstanding balance"}`,
      lateAmount: 0,
      undertimeAmount: 0,
      absentAmount: 0,
      totalAmount: Number(item.amount || 0),
      isDeduction: true,
    }));

    return [...attendanceLogs, ...manualLogs, ...balanceLogs];
  };

  const openEmployeeAudit = async (record: any) => {
    const { data: freshRecord, error } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("id", record.id)
      .maybeSingle();

    if (error) {
      console.log("FETCH FRESH PAYSLIP RECORD ERROR:", error.message);
    }

    const activeRecord = freshRecord || record;

    setRecords((prev) =>
      prev.map((item) =>
        String(item.id) === String(activeRecord.id) ? activeRecord : item
      )
    );

    setSelectedAuditRecord(activeRecord);
    setSelectedPayslipId(String(activeRecord.id));
    setSelectedPayslip(activeRecord);

    const logs = await getEmployeeAuditLogs(activeRecord);
    setAuditLogs(logs);

    const employeeAdjustments = adjustments.filter(
      (item) =>
        String(item.employee_id) === String(activeRecord.employee_id) &&
        String(item.status || "Pending") === "Approved"
    );

    const balanceAdjustments = buildBalanceAdjustments(activeRecord.employee_id);

    setPayslipAdjustments([...employeeAdjustments, ...balanceAdjustments]);
  };

  
  const createPayrollSnapshots = async (
    targetRecords: any[],
    snapshotType = "Payroll Register Snapshot"
  ) => {
    if (!selectedPeriodId || targetRecords.length === 0) return true;

    const currentCompanyId = getCurrentCompanyId();

    if (!currentCompanyId) {
      alert("No company selected. Please login again before creating payroll snapshot.");
      return false;
    }

    const now = new Date().toISOString();
    const snapshotNo = `SNAP-${selectedPeriodId}-${Date.now()}`;

    const { data: snapshot, error: snapshotError } = await supabase
      .from("payroll_snapshots")
      .insert({
        company_id: currentCompanyId,
        period_id: selectedPeriodId,
        snapshot_no: snapshotNo,
        status: "REGISTERED",
        snapshot_date: now,
        created_by: "OPSCORE USER",
        created_at: now,
      })
      .select()
      .single();

    if (snapshotError || !snapshot) {
      console.log("CREATE PAYROLL SNAPSHOT HEADER ERROR:", snapshotError);
      alert(`Failed to create payroll snapshot.\n\n${snapshotError?.message || "No snapshot returned."}`);
      return false;
    }

    const snapshotItems = targetRecords.map((record) => {
      const totalDeductions = getDisplayedTotalDeductions(record);
      const netPay = getDisplayedNetPay(record);

      return {
        company_id: record.company_id || currentCompanyId,
        snapshot_id: snapshot.id,

        employee_id: record.employee_id || null,
        employee_name: record.employee_name || "Unknown Employee",
        department: record.department || null,
        position: record.position || null,

        regular_days: Number(record.days_worked || record.regular_days || 0),
        late_minutes: Number(record.late_minutes || 0),
        undertime_minutes: Number(record.undertime_minutes || 0),
        ot_minutes: Number(record.ot_minutes || 0),

        gross_pay: Number(record.gross_pay || 0),
        total_deductions: totalDeductions,
        net_pay: netPay,

        attendance_json: {
          source: "attendance_entries",
          snapshot_type: snapshotType,
          payroll_record_id: record.id,
          period_id: selectedPeriodId,
          employee_no: record.employee_no || null,
          scheduled_days: Number(record.scheduled_days || 0),
          rest_days: Number(record.rest_days || 0),
          days_worked: Number(record.days_worked || 0),
          absent_days: Number(record.absent_days || 0),
          late_minutes: Number(record.late_minutes || 0),
          undertime_minutes: Number(record.undertime_minutes || 0),
          ot_minutes: Number(record.ot_minutes || 0),
          detected_ot_minutes: Number(record.detected_ot_minutes ?? record.ot_minutes ?? 0),
          approved_ot_minutes: Number(record.approved_ot_minutes || 0),
          ot_approval_status: record.ot_approval_status || "NOT_REQUIRED",
          holiday_worked_dates: record.holiday_worked_dates || [],
          remarks: record.remarks || "",
        },
        calculation_json: {
          snapshot_no: snapshotNo,
          snapshot_created_at: now,
          payroll_record_id: record.id,
          period_label: record.period_label || selectedPeriod?.period_name || "Payroll Period",
          rate_type: record.rate_type || null,
          basic_rate: Number(record.basic_rate || 0),
          basic_pay: Number(record.basic_pay || 0),
          holiday_pay: Number(record.holiday_pay || 0),
          ot_pay: Number(record.ot_pay || 0),
          detected_ot_minutes: Number(record.detected_ot_minutes ?? record.ot_minutes ?? 0),
          approved_ot_minutes: Number(record.approved_ot_minutes || 0),
          ot_approval_status: record.ot_approval_status || "NOT_REQUIRED",
          allowance: Number(record.allowance || 0),
          late_deduction: Number(record.late_deduction || 0),
          undertime_deduction: Number(record.undertime_deduction || 0),
          absent_deduction: Number(record.absent_deduction || 0),
          manual_deduction: Number(record.manual_deduction || 0),
          balance_deduction: Number(record.balance_deduction || 0),
          sss_deduction: Number(record.sss_deduction || 0),
          philhealth_deduction: Number(record.philhealth_deduction || 0),
          pagibig_deduction: Number(record.pagibig_deduction || 0),
          tax_deduction: Number(record.tax_deduction || 0),
          gross_pay: Number(record.gross_pay || 0),
          total_deductions: totalDeductions,
          net_pay: netPay,
          release_amount: getDisplayedReleaseAmount(record),
          carry_forward_amount: getDisplayedCarryForwardAmount(record),
          legacy_record_status: record.status || "Draft",
          record_status: getRecordStatus(record),
        },
        created_at: now,
      };
    });

    const { error: itemsError } = await supabase
      .from("payroll_snapshot_items")
      .insert(snapshotItems);

    if (itemsError) {
      console.log("CREATE PAYROLL SNAPSHOT ITEMS ERROR:", itemsError);
      await supabase.from("payroll_snapshots").delete().eq("id", snapshot.id);
      alert(`Failed to create payroll snapshot items.\n\n${itemsError.message}`);
      return false;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Create Payroll Snapshot",
      description: `${targetRecords.length} payroll snapshot item(s) created for ${selectedPeriod?.period_name || selectedPeriodId}. Snapshot: ${snapshotNo}`,
      severity: "warning",
      recordId: snapshot.id,
      newValue: {
        snapshot,
        itemCount: targetRecords.length,
        totalGross: targetRecords.reduce((sum, record) => sum + Number(record.gross_pay || 0), 0),
        totalDeductions: targetRecords.reduce((sum, record) => sum + getDisplayedTotalDeductions(record), 0),
        totalNet: targetRecords.reduce((sum, record) => sum + getDisplayedNetPay(record), 0),
      },
    });

    return true;
  };

  const sendPayrollToManager = async () => {
    if (!selectedPeriodId || records.length === 0) return;

    const sendableRecords = records.filter((record) => isRecordSendableFromRegister(record));
    const selectedSendableRecords = selectedRecords.filter((record) => isRecordSendableFromRegister(record));
    const targetRecords = selectedSendableRecords.length > 0 ? selectedSendableRecords : sendableRecords;
    const isSelectedAction = selectedSendableRecords.length > 0;

    if (targetRecords.length === 0) {
      alert("No DRAFT or RETURNED FOR CORRECTION payroll records are ready to send to Manager.");
      return;
    }

    if (selectedPeriod?.needs_regeneration && targetRecords.some((record) => getRecordStatus(record) === PAYROLL_RECORD_STATUSES.DRAFT)) {
      alert(
        "Cannot register payroll. Payroll is outdated because attendance, adjustments, or employee balances changed. Generate Register first."
      );
      return;
    }

    const payrollBlockingApprovalTypes = [
      "OVERTIME_APPROVAL",
      "PAYROLL_ADJUSTMENT",
      "PAYROLL_REOPEN",
      "LEAVE_REQUEST",
      "LEAVE_CANCELLATION",
      "CASH_ADVANCE_RELEASE",
    ];

    let approvalQuery = supabase
      .from("approval_requests")
      .select("id, request_type, status, company_id, reference_id, title, requested_by, request_payload, created_at")
      .eq("status", "PENDING")
      .in("request_type", payrollBlockingApprovalTypes);

    const currentCompanyForApprovalCheck = getCurrentCompanyId();

    if (currentCompanyForApprovalCheck) {
      approvalQuery = approvalQuery.eq("company_id", currentCompanyForApprovalCheck);
    }

    const { data: pendingApprovalData, error: pendingApprovalError } = await approvalQuery;

    if (pendingApprovalError) {
      alert(`Cannot verify Approval Center before registration. ${pendingApprovalError.message}`);
      return;
    }

    const parseApprovalPayload = (payload: any) => {
      if (!payload) return {};
      if (typeof payload === "string") {
        try {
          return JSON.parse(payload);
        } catch {
          return {};
        }
      }
      return payload;
    };

    const dateFallsInsideSelectedPeriod = (value: any) => {
      const normalized = normalizeDate(value);
      const periodStart = normalizeDate(selectedPeriod?.start_date);
      const periodEnd = normalizeDate(selectedPeriod?.end_date);

      if (!normalized || !periodStart || !periodEnd) return false;
      return normalized >= periodStart && normalized <= periodEnd;
    };

    const targetEmployeeIds = new Set(targetRecords.map((record) => String(record.employee_id)));

    const approvalTouchesSelectedPeriod = (request: any) => {
      const payload = parseApprovalPayload(request.request_payload);
      const periodId = String(
        payload.period_id ||
          payload.payroll_period_id ||
          payload.periodId ||
          payload.payrollPeriodId ||
          "",
      ).trim();

      if (periodId && periodId !== selectedPeriodId) return false;

      const payloadEmployeeId = String(payload.employee_id || payload.employeeId || "").trim();
      if (payloadEmployeeId && !targetEmployeeIds.has(payloadEmployeeId)) return false;

      if (request.request_type === "OVERTIME_APPROVAL") {
        return dateFallsInsideSelectedPeriod(
          payload.attendance_date ||
            payload.business_date ||
            payload.date,
        );
      }

      if (request.request_type === "LEAVE_REQUEST" || request.request_type === "LEAVE_CANCELLATION") {
        const start = normalizeDate(payload.start_date || payload.leave_start_date || payload.from_date);
        const end = normalizeDate(payload.end_date || payload.leave_end_date || payload.to_date || start);
        const periodStart = normalizeDate(selectedPeriod?.start_date);
        const periodEnd = normalizeDate(selectedPeriod?.end_date);

        if (!start || !end || !periodStart || !periodEnd) return true;
        return start <= periodEnd && end >= periodStart;
      }

      if (request.request_type === "CASH_ADVANCE_RELEASE") {
        return true;
      }

      return true;
    };

    const blockingApprovals = (pendingApprovalData || []).filter(approvalTouchesSelectedPeriod);

    if (blockingApprovals.length > 0) {
      const approvalLabels: Record<string, string> = {
        OVERTIME_APPROVAL: "Overtime Approval",
        PAYROLL_ADJUSTMENT: "Payroll Adjustment",
        PAYROLL_REOPEN: "Payroll Reopen",
        LEAVE_REQUEST: "Leave Request",
        LEAVE_CANCELLATION: "Leave Cancellation",
        CASH_ADVANCE_RELEASE: "Cash Advance Release",
      };

      const summaryMap = blockingApprovals.reduce(
        (acc: Record<string, number>, item: any) => {
          const type = String(item.request_type || "UNKNOWN").toUpperCase();
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {},
      );

      const summary = Object.entries(summaryMap)
        .map(([type, count]) => `- ${count} ${approvalLabels[type] || type}`)
        .join("\n");

      alert(
        `Cannot send payroll yet.\n\nPending payroll-impacting approvals found:\n\n${summary}\n\nResolve all pending approvals in Approval Center first, then Generate Register again.`,
      );

      return;
    }

    const targetIds = targetRecords.map((record) => record.id);

    const targetNet = targetRecords.reduce(
      (sum, record) => sum + getDisplayedNetPay(record),
      0
    );

    const targetGross = targetRecords.reduce(
      (sum, record) => sum + Number(record.gross_pay || 0),
      0
    );

    const targetDeductions = targetRecords.reduce(
      (sum, record) => sum + getDisplayedTotalDeductions(record),
      0
    );

    const targetHighAlerts = managerAlerts.filter(
      (alert) =>
        alert.severity === "High" &&
        targetRecords.some((record) => record.employee_name === alert.employee)
    );

    const isCorrectionResubmit = targetRecords.every(
      (record) => getRecordStatus(record) === PAYROLL_RECORD_STATUSES.RETURNED_FOR_CORRECTION
    );

    const confirmMessage = `${isCorrectionResubmit ? "Resubmit Returned Correction" : "Send Payroll to Manager"}?\n\nAction: ${isSelectedAction ? "Selected employee row(s) only" : "All ready employee rows"}\nEmployees: ${targetRecords.length}\nGross Pay: ${formatMoney(targetGross)}\nDeductions: ${formatMoney(targetDeductions)}\nNet Pay: ${formatMoney(targetNet)}\nHigh Alerts: ${targetHighAlerts.length}\n\nRules:\n- Only DRAFT or RETURNED FOR CORRECTION rows are sent.\n- Other Manager Review, Locked, or Released rows are untouched.\n- Register becomes review-only after sending.\n- Manager owns Return, Lock, Release, and Reopen Request.`;

    const confirmed = confirm(confirmMessage);
    if (!confirmed) return;

    if (targetHighAlerts.length > 0) {
      const proceed = confirm(
        `There are ${targetHighAlerts.length} HIGH alert(s). Send anyway?`
      );

      if (!proceed) return;
    }

    setIsSaving(true);

    const now = new Date().toISOString();

    const snapshotOk = await createPayrollSnapshots(
      targetRecords,
      isCorrectionResubmit ? "Returned Correction Resubmission Snapshot" : "Payroll Register Snapshot"
    );

    if (!snapshotOk) {
      setIsSaving(false);
      return;
    }

    if (isOpenPeriod) {
      const { error: periodError } = await supabase
        .from("payroll_periods")
        .update({
          status: "REGISTERED",
          attendance_locked: false,
          attendance_locked_at: null,
          snapshot_created_at: now,
          needs_regeneration: false,
        })
        .eq("id", selectedPeriodId);

      if (periodError) {
        setIsSaving(false);
        alert("Failed to update payroll period to REGISTERED.");
        return console.log("REGISTER PERIOD ERROR:", periodError.message);
      }
    }

    const { error: recordsError } = await supabase
      .from("payroll_records")
      .update({
        status: "For Approval",
        record_status: PAYROLL_RECORD_STATUSES.MANAGER_REVIEW,
        period_label: selectedPeriod?.period_name || "Payroll Period",
        snapshot_created_at: now,
        resubmitted_at: isCorrectionResubmit ? now : null,
        return_reason: null,
      })
      .in("id", targetIds);

    if (recordsError) {
      setIsSaving(false);
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Register Payroll Records Failed",
        description: `Snapshot was created but payroll_records failed to update for ${selectedPeriod?.period_name || selectedPeriodId}: ${recordsError.message}`,
        severity: "critical",
        recordId: selectedPeriodId,
        newValue: { error: recordsError.message, targetCount: targetRecords.length },
      });
      alert("Snapshot created, but payroll records failed to update. Check payroll_records table and record_status column.");
      return console.log("REGISTER RECORDS ERROR:", recordsError.message);
    }

    setIsSaving(false);

    await getPeriods();
    await getRecords(selectedPeriodId);
    await getEmployeeBalances();
    setSelectedRecordIds([]);

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: isCorrectionResubmit ? "Resubmit Returned Payroll Correction" : "Send Payroll to Manager",
      description: `${targetRecords.length} payroll record(s) sent to Manager Review for ${selectedPeriod?.period_name || selectedPeriodId}`,
      severity: "warning",
      recordId: selectedPeriodId,
      newValue: {
        lifecycle: isCorrectionResubmit ? "RETURNED_FOR_CORRECTION_TO_MANAGER_REVIEW" : "DRAFT_TO_MANAGER_REVIEW",
        recordCount: targetRecords.length,
        totalNet: targetNet,
        targetIds,
      },
    });

    alert(isCorrectionResubmit ? "Returned correction resubmitted to Payroll Manager." : "Payroll sent to Payroll Manager review.");
  };

  useEffect(() => {
    getEmployees();
    getSettings();
    getHolidays();
    getPeriods();
    getEmployeeBalances();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      getRecords(selectedPeriodId);
      getAdjustments(selectedPeriodId);
      setSelectedRecordIds([]);
    }
  }, [selectedPeriodId]);

  const draftRegisterRecords = useMemo(() => {
    return records.filter(
      (record) => getRecordStatus(record) === PAYROLL_RECORD_STATUSES.DRAFT
    );
  }, [records]);

  const returnedCorrectionRecords = useMemo(() => {
    return records.filter(
      (record) =>
        getRecordStatus(record) ===
        PAYROLL_RECORD_STATUSES.RETURNED_FOR_CORRECTION
    );
  }, [records]);

  const managerReviewRecords = useMemo(() => {
    return records.filter(
      (record) =>
        getRecordStatus(record) === PAYROLL_RECORD_STATUSES.MANAGER_REVIEW
    );
  }, [records]);

  const lockedOrReleasedRecords = useMemo(() => {
    return records.filter((record) =>
      [
        PAYROLL_RECORD_STATUSES.LOCKED,
        PAYROLL_RECORD_STATUSES.RELEASED,
      ].includes(getRecordStatus(record) as any)
    );
  }, [records]);

  const reviewOnlyRecords = useMemo(() => {
    return [...managerReviewRecords, ...lockedOrReleasedRecords];
  }, [managerReviewRecords, lockedOrReleasedRecords]);

  // Register table display rule:
  // - OPEN cutoff: show editable DRAFT register rows.
  // - REGISTERED/LOCKED/RELEASED with returned rows: show only returned correction rows.
  // - REGISTERED/LOCKED/RELEASED with no returned rows: show review-only rows for visibility/audit.
  const registerDisplayRecords = useMemo(() => {
    if (canEditDraftRegister) return draftRegisterRecords;
    if (returnedCorrectionRecords.length > 0) return returnedCorrectionRecords;
    return reviewOnlyRecords;
  }, [
    canEditDraftRegister,
    draftRegisterRecords,
    returnedCorrectionRecords,
    reviewOnlyRecords,
  ]);

  // Action queue is intentionally stricter than display rows.
  // MANAGER_REVIEW / LOCKED / RELEASED may be visible in Register,
  // but only DRAFT or RETURNED_FOR_CORRECTION can be sent/resubmitted.
  const registerQueueRecords = useMemo(() => {
    if (canEditDraftRegister) return draftRegisterRecords;
    return returnedCorrectionRecords;
  }, [canEditDraftRegister, draftRegisterRecords, returnedCorrectionRecords]);

  const editableRegisterRecords = registerQueueRecords;

  const filteredRecords = useMemo(() => {
    return registerDisplayRecords.filter((record) =>
      `${record.employee_name} ${record.department} ${record.position} ${getRecordStatusLabel(record)}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [registerDisplayRecords, searchTerm]);

  const totalGross = filteredRecords.reduce(
    (sum, record) => sum + Number(record.gross_pay || 0),
    0
  );

  const totalDeductions = filteredRecords.reduce(
    (sum, record) => sum + getDisplayedTotalDeductions(record),
    0
  );

  const totalNet = filteredRecords.reduce(
    (sum, record) => sum + getDisplayedNetPay(record),
    0
  );

  const totalReleaseAmount = filteredRecords.reduce(
    (sum, record) => sum + getDisplayedReleaseAmount(record),
    0
  );

  const totalCarryForwardAmount = filteredRecords.reduce(
    (sum, record) => sum + getDisplayedCarryForwardAmount(record),
    0
  );

  const totalGovernmentDeductions = filteredRecords.reduce(
    (sum, record) =>
      sum +
      Number(record.sss_deduction || 0) +
      Number(record.philhealth_deduction || 0) +
      Number(record.pagibig_deduction || 0) +
      Number(record.tax_deduction || 0),
    0
  );

  const pendingAdjustments = adjustments.filter(
    (item) => String(item.status || "Pending") === "Pending"
  );

  const approvedAdjustments = adjustments.filter(
    (item) => String(item.status || "Pending") === "Approved"
  );

  const rejectedAdjustments = adjustments.filter(
    (item) => String(item.status || "Pending") === "Rejected"
  );

  const selectedRecords = registerQueueRecords.filter((record) =>
    selectedRecordIds.includes(String(record.id))
  );

  const sendableFilteredRecords = filteredRecords.filter((record) => isRecordSendableFromRegister(record));
  const allFilteredSendableSelected =
    sendableFilteredRecords.length > 0 &&
    sendableFilteredRecords.every((record) => selectedRecordIds.includes(String(record.id)));
  const selectedSendableCount = selectedRecords.filter((record) => isRecordSendableFromRegister(record)).length;
  const registerActionLabel = selectedSendableCount > 0
    ? `Send Selected (${selectedSendableCount})`
    : `Send All Ready (${sendableFilteredRecords.length})`;

  const selectedGross = selectedRecords.reduce(
    (sum, record) => sum + Number(record.gross_pay || 0),
    0
  );

  const selectedDeductions = selectedRecords.reduce(
    (sum, record) => sum + getDisplayedTotalDeductions(record),
    0
  );

  const selectedNet = selectedRecords.reduce(
    (sum, record) => sum + getDisplayedNetPay(record),
    0
  );

  const selectedReleaseAmount = selectedRecords.reduce(
    (sum, record) => sum + getDisplayedReleaseAmount(record),
    0
  );

  const selectedCarryForwardAmount = selectedRecords.reduce(
    (sum, record) => sum + getDisplayedCarryForwardAmount(record),
    0
  );

  const selectedGovernmentDeductions = selectedRecords.reduce(
    (sum, record) =>
      sum +
      Number(record.sss_deduction || 0) +
      Number(record.philhealth_deduction || 0) +
      Number(record.pagibig_deduction || 0) +
      Number(record.tax_deduction || 0),
    0
  );

  const activeBalanceTotal = employeeBalances.reduce(
    (sum, balance) => sum + Number(balance.remaining_balance || 0),
    0
  );

  const employeesWithBalances = new Set(
    employeeBalances.map((balance) => String(balance.employee_id))
  ).size;

  const managerAlerts = records.flatMap((record) => {
    const alerts: any[] = [];

    const scheduledDays = Number(record.scheduled_days || 0);
    const restDays = Number(record.rest_days || 0);
    const daysWorked = Number(record.days_worked || 0);
    const absentDays = Number(record.absent_days || 0);
    const lateMinutes = Number(record.late_minutes || 0);
    const undertimeMinutes = Number(record.undertime_minutes || 0);
    const otMinutes = Number(record.detected_ot_minutes ?? record.ot_minutes ?? 0);
    const approvedOtMinutes = Number(record.approved_ot_minutes || 0);
    const otApprovalStatus = getOtApprovalStatus(otMinutes, approvedOtMinutes);
    const netPay = getDisplayedNetPay(record);
    const basicPay = Number(record.basic_pay || 0);
    const totalDeduction = getDisplayedTotalDeductions(record);

    if (scheduledDays === 0 && daysWorked === 0 && absentDays === 0) {
      alerts.push({
        employee: record.employee_name,
        type: "No Schedule / Attendance Summary",
        message:
          "No scheduled work day, worked day, or absent day found. Check schedule and attendance matching.",
        severity: "High",
      });
    }

    if (restDays > 2) {
      alerts.push({
        employee: record.employee_name,
        type: "More Than 2 Rest Days",
        message: `${restDays} rest/off days detected in this payroll period.`,
        severity: "Medium",
      });
    }

    if (absentDays > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "Scheduled Absence",
        message: `${absentDays} scheduled work day/s with no valid attendance.`,
        severity: "Medium",
      });
    }

    if (daysWorked === 0 && netPay > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "Pay Without Attendance",
        message: "Employee has net pay but zero worked days.",
        severity: "High",
      });
    }

    if (netPay < 0) {
      alerts.push({
        employee: record.employee_name,
        type: "Carry Forward Required",
        message: `${formatMoney(netPay)} computed net pay. Release will be ₱0 and balance will carry forward.`,
        severity: "Medium",
      });
    }

    if (lateMinutes >= 60) {
      alerts.push({
        employee: record.employee_name,
        type: "High Late Minutes",
        message: `${lateMinutes} minutes late.`,
        severity: "Medium",
      });
    }

    if (undertimeMinutes >= 60) {
      alerts.push({
        employee: record.employee_name,
        type: "High Undertime",
        message: `${undertimeMinutes} minutes undertime.`,
        severity: "Medium",
      });
    }

    const otPayAmount = Number(record.ot_pay || 0);
    const otMultiplierSetting = Number(settings.ot_multiplier || 0);
    const otReviewThreshold = Number(settings.ot_review_threshold_minutes || 60);
    const excessiveOtThreshold = Number(settings.excessive_ot_threshold_minutes || 120);

    if (otMinutes > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "OT Detected",
        message: `${otMinutes} OT minutes detected. Supervisor should verify if this is valid before sending payroll.`,
        severity: "Medium",
      });
    }

    if (otMinutes > 0 && isOvertimeApprovalRequired(settings) && approvedOtMinutes <= 0) {
      alerts.push({
        employee: record.employee_name,
        type: "OT Pending Approval",
        message: `${otMinutes} OT minutes detected. Approved OT is ${approvedOtMinutes} minutes. Payroll will not pay OT until approval is completed.`,
        severity: "Medium",
      });
    }

    if (otMinutes > 0 && ["APPROVED", "PARTIALLY_APPROVED"].includes(String(otApprovalStatus))) {
      alerts.push({
        employee: record.employee_name,
        type: "Approved OT Included",
        message: `${approvedOtMinutes} approved OT minutes will be included in payroll.`,
        severity: "Medium",
      });
    }

    if (otMinutes >= otReviewThreshold && otReviewThreshold > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "OT Review Threshold",
        message: `${otMinutes} OT minutes reached the review threshold of ${otReviewThreshold} minutes.`,
        severity: "Medium",
      });
    }

    if (otMinutes >= excessiveOtThreshold && excessiveOtThreshold > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "Excessive OT",
        message: `${otMinutes} OT minutes reached the high-risk threshold of ${excessiveOtThreshold} minutes.`,
        severity: "High",
      });
    }

    if (otMinutes > 0 && otPayAmount <= 0 && otMultiplierSetting <= 0) {
      alerts.push({
        employee: record.employee_name,
        type: "OT Not Paid",
        message: `${otMinutes} OT minutes detected, but OT pay is currently disabled because OT multiplier is 0.`,
        severity: "Medium",
      });
    }

    if (Number(record.holiday_pay || 0) > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "Holiday Pay Detected",
        message: `${formatMoney(record.holiday_pay)} holiday pay included.`,
        severity: "Medium",
      });
    }

    if (totalDeduction > basicPay * 0.5 && basicPay > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "High Deduction",
        message: "Deductions are more than 50% of basic pay.",
        severity: "High",
      });
    }

    return alerts;
  });

  const highAlertCount = managerAlerts.filter(
    (alert) => alert.severity === "High"
  ).length;

  const mediumAlertCount = managerAlerts.filter(
    (alert) => alert.severity === "Medium"
  ).length;

  const riskLevel =
    highAlertCount > 0 ? "High Risk" : mediumAlertCount > 0 ? "Medium Risk" : "Low Risk";

  const riskStyle =
    riskLevel === "High Risk"
      ? "border-red-500/30 bg-red-500/10 text-red-700"
      : riskLevel === "Medium Risk"
      ? "border-blue-500/20 bg-blue-500/10 text-blue-700"
      : "border-green-500/30 bg-green-500/10 text-emerald-700";

  const toggleRecordSelection = (id: any) => {
    const key = String(id);

    setSelectedRecordIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const selectAllFiltered = () => {
    setSelectedRecordIds(sendableFilteredRecords.map((record) => String(record.id)));
  };

  const clearSelection = () => {
    setSelectedRecordIds([]);
  };


  const getPayslipReleasedAmount = (record: any) =>
    Number(record?.paid_amount || record?.amount_released || record?.released_amount || 0);

  const getPayslipRemainingSalary = (record: any) => {
    if (record?.remaining_amount !== null && record?.remaining_amount !== undefined && record?.remaining_amount !== "") {
      return Math.max(Number(record.remaining_amount || 0), 0);
    }

    if (record?.remaining_payroll_balance !== null && record?.remaining_payroll_balance !== undefined && record?.remaining_payroll_balance !== "") {
      return Math.max(Number(record.remaining_payroll_balance || 0), 0);
    }

    return Math.max(getDisplayedReleaseAmount(record) - getPayslipReleasedAmount(record), 0);
  };

  const getPayslipReleaseStatus = (record: any) => {
    const released = getPayslipReleasedAmount(record);
    const remaining = getPayslipRemainingSalary(record);

    if (released > 0 && remaining > 0) return "PARTIALLY RELEASED";
    if (released > 0 && remaining <= 0) return "RELEASED";
    if (getDisplayedCarryForwardAmount(record) > 0) return "CARRY FORWARD";
    return String(record?.release_status || record?.status || "DRAFT").toUpperCase();
  };

  const getPayslipLiabilityRows = (record: any) => {
    const employeeBalanceRows = payslipAdjustments.filter(
      (item) => item?.source_module === "Employee Balances" || item?.is_employee_balance
    );

    if (employeeBalanceRows.length > 0) return employeeBalanceRows;

    if (Number(record?.balance_deduction || 0) > 0) {
      return [
        {
          id: "balance-deduction-summary",
          adjustment_type: "Employee Liability Deduction",
          amount: Number(record.balance_deduction || 0),
          remarks: "Payroll-deductible balance applied in this cutoff.",
        },
      ];
    }

    return [];
  };


  const assistantReminders = [
    ...(payrollIsOutdated
      ? [
          {
            type: "Warning",
            tone: "warning",
            text: "Payroll is outdated. Regenerate payroll before sending to Payroll Manager.",
          },
        ]
      : []),
    ...(highAlertCount > 0
      ? [
          {
            type: "Critical",
            tone: "critical",
            text: `${highAlertCount} high payroll audit alert(s) need review before sending.`,
          },
        ]
      : []),
    ...(mediumAlertCount > 0
      ? [
          {
            type: "Warning",
            tone: "warning",
            text: `${mediumAlertCount} payroll warning(s) detected in attendance, OT, deduction, or schedule review.`,
          },
        ]
      : []),
    ...(pendingAdjustments.length > 0
      ? [
          {
            type: "Warning",
            tone: "warning",
            text: `${pendingAdjustments.length} payroll adjustment(s) are still pending approval.`,
          },
        ]
      : []),
    ...(employeeBalances.length > 0
      ? [
          {
            type: "Information",
            tone: "info",
            text: `${employeesWithBalances} employee(s) have active balance deductions totaling ${formatMoney(activeBalanceTotal)}.`,
          },
        ]
      : []),
    ...(records.length > 0
      ? [
          {
            type: "Information",
            tone: "info",
            text: `${registerQueueRecords.length} register queue record(s), ${returnedCorrectionRecords.length} returned correction(s), ${managerReviewRecords.length} in Manager Review, and ${lockedOrReleasedRecords.length} locked/released row(s).`,
          },
        ]
      : [
          {
            type: "Information",
            tone: "info",
            text: "Select or create a payroll period, then generate payroll records.",
          },
        ]),
  ].slice(0, 5);

  return (
    <PageGuard moduleKey="payroll_register">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />
        <TopNavbar breadcrumb="PAYROLL / PAYROLL REGISTER" />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 12mm;
            }

            html,
            body {
              background: #ffffff !important;
              color: #111827 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body * {
              visibility: hidden !important;
            }

            .payslip-print-area,
            .payslip-print-area * {
              visibility: visible !important;
            }

            .payslip-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #111827 !important;
              box-shadow: none !important;
            }

            .payslip-no-print {
              display: none !important;
            }

            .payslip-page {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              font-size: 11px !important;
            }

            .payslip-print-area {
              border: none !important;
            }

            .payslip-avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>
        <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Payroll Operations
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Payroll Register
            </h1>
            <p className="mt-1 max-w-4xl text-sm font-medium text-slate-500">
              Prepare payroll register, review employee records, apply CA deductions, and register the payroll snapshot.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={generatePayroll}
              disabled={isSaving || !canGenerateRegister}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {selectedPeriod?.needs_regeneration ? "Regenerate Register" : "Generate Register"}
            </button>

            <button
              onClick={sendPayrollToManager}
              disabled={sendableFilteredRecords.length === 0 || Boolean(selectedPeriod?.needs_regeneration && canEditDraftRegister) || isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Send size={15} /> {registerActionLabel}
            </button>
          </div>
        </section>

        <section className="sticky top-0 z-30 mb-5 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[260px_minmax(260px,1fr)_220px]">
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Select payroll period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.period_name} ({period.status})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee, department, or position..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-9 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Status</span>
                  <span className="font-black text-slate-950">{selectedPeriod?.status || "No Period"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CompactMetric label="Queue" value={registerQueueRecords.length} />
              <CompactMetric label="Net Pay" value={formatMoney(totalNet)} danger={totalNet < 0} />
              <CompactMetric label="To Manager" value={formatMoney(totalReleaseAmount)} />
              <CompactMetric label="Alerts" value={managerAlerts.length} danger={managerAlerts.length > 0} />
            </div>
          </div>
        </section>

        {selectedPeriod?.needs_regeneration && (
          <section className="mb-5 rounded-3xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-black text-red-700">Payroll register needs regeneration.</p>
                <p className="mt-1 text-red-700">
                  Attendance, adjustments, or employee balances changed after the last payroll computation.
                </p>
              </div>

              <button
                onClick={generatePayroll}
                disabled={isSaving || !canGenerateRegister}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-red-400 disabled:opacity-50"
              >
                Regenerate Register
              </button>
            </div>
          </section>
        )}

        {selectedPeriodId && !canEditDraftRegister && returnedCorrectionRecords.length === 0 && (
          <section className="mb-5 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <p className="font-black text-slate-950">Payroll Register is review-only.</p>
            <p className="mt-1 font-semibold">
              This cutoff has already been sent to Payroll Manager. Register-side reopen is disabled. Only employees returned by Manager will appear here for correction.
            </p>
          </section>
        )}

        {selectedPeriodId && returnedCorrectionRecords.length > 0 && (
          <section className="mb-5 rounded-3xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-black text-blue-900">Returned Corrections Queue: {returnedCorrectionRecords.length} employee row(s)</p>
            <p className="mt-1 font-semibold">
              Fix only the returned employee row(s), then use {registerActionLabel}. Other Manager Review, Locked, or Released employees remain untouched.
            </p>
          </section>
        )}

        {managerAlerts.length > 0 && (
          <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <p className="font-bold text-amber-700">
                {managerAlerts.length} payroll audit alert{managerAlerts.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-700/80">
                {managerAlerts.slice(0, 4).map((alert, index) => (
                  <span key={index}>
                    • {alert.employee}: {alert.type}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Review Table
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Final Payroll Register</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Compact payroll review. Detailed attendance, rest days, OT, and deduction evidence are inside View Audit.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative lg:w-80">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employee..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-9 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <MiniStat label="Employees" value={filteredRecords.length} />
              <MiniStat label="Gross" value={formatMoney(totalGross)} />
              <MiniStat label="Deduct." value={formatMoney(totalDeductions)} danger />
              <MiniStat label="Net Pay" value={formatMoney(totalNet)} success />
              <MiniStat label="To Manager" value={formatMoney(totalReleaseAmount)} success />
              <MiniStat label="Carry Fwd" value={formatMoney(totalCarryForwardAmount)} />
            </div>
          </div>

          {selectedPeriod?.needs_regeneration && (
            <div className="m-6 rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
              <AlertTriangle className="mx-auto mb-3" size={34} />
              <h3 className="text-xl font-black text-red-700">Payroll table hidden because data is outdated.</h3>
              <p className="mt-2 text-sm font-semibold">
                Attendance, CA/deductions, or carry-forward balances changed after the last generation. Click Generate Register before reviewing employee totals.
              </p>
            </div>
          )}

          {!selectedPeriod?.needs_regeneration && (
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="w-[44px] px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allFilteredSendableSelected}
                        disabled={sendableFilteredRecords.length === 0}
                        onChange={() => (allFilteredSendableSelected ? clearSelection() : selectAllFiltered())}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </th>
                    <th className="w-[18%] px-3 py-3">Employee</th>
                    <th className="w-[90px] px-3 py-3">Status</th>
                    <th className="w-[74px] px-3 py-3 text-center">Work</th>
                    <th className="w-[86px] px-3 py-3 text-right">Late/UT</th>
                    <th className="w-[112px] px-3 py-3 text-right">OT</th>
                    <th className="w-[88px] px-3 py-3 text-right">Basic</th>
                    <th className="w-[92px] px-3 py-3 text-right">Auto Ded.</th>
                    <th className="w-[92px] px-3 py-3 text-right">Manual</th>
                    {(showGovernmentSection || showTax) && (
                      <th className="w-[92px] px-3 py-3 text-right">Gov/Tax</th>
                    )}
                    <th className="w-[130px] px-3 py-3 text-right">CA This Cutoff</th>
                    <th className="w-[104px] px-3 py-3 text-right">Net</th>
                    <th className="w-[104px] px-3 py-3 text-right">To Mgr</th>
                    <th className="w-[92px] px-3 py-3 text-right">Carry</th>
                    <th className="w-[108px] px-3 py-3 text-right">Audit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredRecords.map((record) => {
                    const autoDeduction = getAutoDeductionTotal(record);
                    const governmentDeduction = getGovernmentDeductionTotal(record);
                    const displayedNetPay = getDisplayedNetPay(record);
                    const displayedReleaseAmount = getDisplayedReleaseAmount(record);
                    const displayedCarryForwardAmount = getDisplayedCarryForwardAmount(record);
                    const riskCount = managerAlerts.filter((alert) => alert.employee === record.employee_name).length;
                    const detectedOtMinutes = Number(record.detected_ot_minutes ?? record.ot_minutes ?? 0);
                    const approvedOtMinutes = Number(record.approved_ot_minutes || 0);
                    const otApprovalStatus = getOtApprovalStatus(detectedOtMinutes, approvedOtMinutes);

                    return (
                      <tr
                        key={record.id}
                        className="bg-white transition-all duration-200 hover:bg-slate-50"
                      >
                        <td className="px-3 py-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={selectedRecordIds.includes(String(record.id))}
                            disabled={!isRecordSendableFromRegister(record)}
                            onChange={() => toggleRecordSelection(record.id)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <button
                            onClick={() => openEmployeeAudit(record)}
                            className="group max-w-full text-left"
                            title="Open employee audit"
                          >
                            <p className="truncate font-black text-slate-950 group-hover:underline">
                              {record.employee_name}
                            </p>
                            <p className="truncate text-[11px] font-bold text-slate-500">
                              {record.department} • {record.position}
                            </p>
                          </button>
                        </td>

                        <td className="px-3 py-3 align-middle">
                          <StatusBadge status={getRecordStatusLabel(record)} />
                        </td>

                        <td className="px-3 py-3 text-center align-middle">
                          <p className="font-black text-slate-950">{record.days_worked || 0}/{record.scheduled_days || 0}</p>
                          <p className="text-[10px] font-bold text-slate-500">worked/sched</p>
                        </td>

                        <td className="px-3 py-3 text-right align-middle">
                          <p className={Number(record.undertime_minutes || 0) + Number(record.late_minutes || 0) > 0 ? "font-black text-red-600" : "font-black text-slate-700"}>
                            {Number(record.late_minutes || 0)}/{Number(record.undertime_minutes || 0)}m
                          </p>
                          {riskCount > 0 && (
                            <p className="text-[10px] font-bold text-amber-700">{riskCount} alert/s</p>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right align-middle">
                          <p className={detectedOtMinutes > 0 ? "font-black text-slate-950" : "font-black text-slate-400"}>
                            {detectedOtMinutes / 60}h
                          </p>
                          {detectedOtMinutes > 0 && (
                            <div className="mt-1 flex flex-col items-end gap-1">
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${getOtStatusStyle(otApprovalStatus)}`}>
                                {String(otApprovalStatus).replace(/_/g, " ")}
                              </span>
                              <p className="text-[10px] font-bold text-slate-500">
                                Approved {approvedOtMinutes / 60}h • {formatMoney(record.ot_pay)}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right align-middle font-black text-slate-950">
                          {formatMoney(record.basic_pay)}
                        </td>

                        <td className="px-3 py-3 text-right align-middle font-black text-red-600">
                          {formatMoney(autoDeduction)}
                        </td>

                        <td className="px-3 py-3 text-right align-middle font-black text-red-600">
                          {formatMoney(record.manual_deduction)}
                        </td>

                        {(showGovernmentSection || showTax) && (
                          <td className="px-3 py-3 text-right align-middle font-black text-red-600">
                            {formatMoney(governmentDeduction)}
                          </td>
                        )}

                        <td className="px-3 py-3 text-right align-middle">
                          {(() => {
                            const maxBalance = getMaxBalanceDeductionForRecord(record);
                            const draftValue = balanceDrafts[record.id] ?? String(Number(record.balance_deduction || 0));

                            return (
                              <div className="flex flex-col items-end gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxBalance}
                                  value={draftValue}
                                  disabled={!canEditRecordInRegister(record) || maxBalance <= 0 || isSaving}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setBalanceDrafts((prev) => ({
                                      ...prev,
                                      [record.id]: value,
                                    }));
                                  }}
                                  onBlur={(event) => updateRecordBalanceDeduction(record, event.target.value)}
                                  className="h-8 w-24 rounded-xl border border-slate-300 bg-white px-2 text-right text-xs font-black text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400"
                                />
                                <p className="text-[10px] font-bold text-slate-500">
                                  Max {formatMoney(maxBalance)}
                                </p>
                              </div>
                            );
                          })()}
                        </td>

                        <td className={`px-3 py-3 text-right align-middle font-black ${displayedNetPay < 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {formatMoney(displayedNetPay)}
                        </td>

                        <td className="px-3 py-3 text-right align-middle font-black text-emerald-700">
                          {formatMoney(displayedReleaseAmount)}
                        </td>

                        <td className="px-3 py-3 text-right align-middle font-black text-blue-700">
                          {formatMoney(displayedCarryForwardAmount)}
                        </td>

                        <td className="px-3 py-3 text-right align-middle">
                          {canViewAuditFromRegister(record) ? (
                            <button
                              onClick={() => openEmployeeAudit(record)}
                              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                            >
                              View Audit
                            </button>
                          ) : (
<button
  onClick={() => openEmployeeAudit(record)}
  className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
>
  View Audit
</button>                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={(showGovernmentSection || showTax) ? 16 : 15} className="px-4 py-14 text-center">
                        <p className="font-black text-slate-950">No payroll records found.</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Select a period, generate payroll, or adjust your search.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <h2 className="text-xl font-bold">Payroll Period</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create, select, generate, reopen, or delete payroll period.
            </p>

            <div className="mt-5 space-y-3">
              <input
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="June 1-15, 2026"
                disabled={!canEditDraftRegister && Boolean(selectedPeriodId)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!canEditDraftRegister && Boolean(selectedPeriodId)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={!canEditDraftRegister && Boolean(selectedPeriodId)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                />
              </div>

              <button
                onClick={createPeriod}
                disabled={isSaving || (Boolean(selectedPeriodId) && !canEditDraftRegister)}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Create Period
              </button>

              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
              >
                <option value="">Select payroll period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.period_name} ({period.status})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  onClick={generatePayroll}
                  disabled={isSaving || !canGenerateRegister}
                  className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Generate Register
                </button>

                <button
                  onClick={deletePeriod}
                  disabled={isSaving || !selectedPeriodId || !canEditDraftRegister}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              {selectedPeriodId && !canEditDraftRegister && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-700">
                  Register is review-only after sending to Manager. Returned employees only will appear in the correction queue.
                </div>
              )}

              {selectedPeriod && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{selectedPeriod.period_name}</p>
                    <StatusBadge status={selectedPeriod.status} />
                  </div>
                  <p className="mt-1 text-slate-500">
                    {selectedPeriod.start_date} to {selectedPeriod.end_date}
                  </p>
                  {selectedPeriod?.needs_regeneration && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle size={12} /> Needs regeneration.
                    </p>
                  )}
                  {selectedPeriod?.attendance_locked && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-blue-700">
                      <Lock size={12} /> Attendance locked for this cutoff. Manager controls reopen or return workflow.
                    </p>
                  )}
                  {selectedPeriod?.last_generated_at && (
                    <p className="mt-2 text-xs text-slate-500">
                      Last generated: {new Date(selectedPeriod.last_generated_at).toLocaleString()}
                    </p>
                  )}
                  {isLocked && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-blue-700">
                      <Lock size={12} /> Locked. Register-side editing is disabled.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">Payroll Adjustments</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Earnings and non-liability adjustments only. Cash Advance, employee meals, salary loans, and restaurant unpaid balances should be created in Employee Balances, then deducted through payroll.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
                  Pending {pendingAdjustments.length}
                </span>
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-emerald-700">
                  Approved {approvedAdjustments.length}
                </span>
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-700">
                  Rejected {rejectedAdjustments.length}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={!canManageRegisterForm}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 md:col-span-2"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
              </select>

              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                disabled={!canManageRegisterForm}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
              >
                {[...earningTypes, ...deductionTypes].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>

              <input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="Amount"
                disabled={!canManageRegisterForm}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
              />

              <button
                onClick={addAdjustment}
                disabled={isSaving || !selectedPeriodId || !canManageRegisterForm}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Save
              </button>

              <input
                value={adjustmentRemarks}
                onChange={(e) => setAdjustmentRemarks(e.target.value)}
                placeholder="Remarks"
                disabled={!canManageRegisterForm}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 md:col-span-5"
              />
            </div>

            <div className="mt-5 max-h-64 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1050px] text-xs">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Direction</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Remarks</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {adjustments.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-bold">{item.employee_name}</td>
                      <td className="px-3 py-2">{item.adjustment_type}</td>
                      <td className="px-3 py-2">{item.adjustment_direction}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.amount)}</td>
                      <td className="px-3 py-2 text-slate-500">{item.remarks || "-"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={item.status || "Pending"} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {String(item.status || "Pending") === "Pending" && (
                            <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                              Pending Approval Center
                            </span>
                          )}

                          <button
                            onClick={() => deleteAdjustment(item.id)}
                            disabled={!canManageRegisterForm}
                            className="rounded-xl bg-slate-700 px-3 py-1 text-xs font-bold hover:bg-slate-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {adjustments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                        No manual adjustments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pendingAdjustments.length > 0 && (
              <p className="mt-3 text-xs text-blue-700">
                Reminder: pending adjustments will NOT affect payroll. Approve then click Generate.
              </p>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold">Employee Balance Monitor</h2>
              <p className="mt-1 text-sm text-slate-500">
Active balances are deducted through payroll only. Cancel here only when the balance link or amount is wrong; no hard delete is performed.
              </p>
            </div>

            <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              {employeesWithBalances} employee(s) • {formatMoney(activeBalanceTotal)}
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Original</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {employeeBalances.map((balance) => (
                  <tr key={balance.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-black">{balance.employee_name}</td>
                    <td className="px-4 py-3">{balance.balance_type || "Carry Forward Balance"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getBalanceSourceStyle(balance)}`}>
                        {getBalanceSourceLabel(balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(balance.original_amount)}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-700">
                      {formatMoney(balance.remaining_balance)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={balance.status || "Active"} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{balance.remarks || "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteEmployeeBalance(balance)}
                        disabled={!canManageRegisterForm || isSaving}
                        className="rounded-xl bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}

                {employeeBalances.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      No active employee balances.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {!selectedPeriod?.needs_regeneration && selectedAuditRecord && (
          <div className="fixed inset-x-0 bottom-0 top-16 z-50 flex justify-end bg-slate-950/35 payslip-no-print">
            <button
              type="button"
              aria-label="Close employee audit overlay"
              onClick={() => setSelectedAuditRecord(null)}
              className="absolute inset-0 cursor-default"
            />

            <aside className="relative z-10 flex h-full w-full max-w-[680px] flex-col border-l border-slate-200 bg-white shadow-2xl">
              <div className="shrink-0 border-b border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                      Employee Audit
                    </p>
                    <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950">
                      {selectedAuditRecord.employee_name || "Selected Employee"}
                    </h2>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                      {selectedAuditRecord.department || "-"} • {selectedAuditRecord.position || "-"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-right">
                      <p className="text-lg font-black leading-none text-emerald-700">
                        {checkedAuditItems.filter((item) => item.startsWith(`${selectedPeriodId}-${selectedAuditRecord?.employee_id || ""}`)).length}/{auditLogs.length}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        Checked
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedAuditRecord(null)}
                      className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                      aria-label="Close audit drawer"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                    {auditLogs.length} items
                  </span>
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                    {auditLogs.filter((log) => log.isDeduction).length} deduction item(s)
                  </span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    {formatMoney(auditLogs.reduce((sum, log) => sum + Number(log.totalAmount || 0), 0))} evidence
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {auditLogs.map((log, index) => {
                    const key = getAuditKey(log, index);
                    const checked = checkedAuditItems.includes(key);

                    return (
                      <div
                        key={index}
                        className={`rounded-2xl border p-3 transition-all duration-200 ${
                          checked
                            ? "border-emerald-200 bg-emerald-50"
                            : log.isDeduction
                            ? "border-red-200 bg-white"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-black text-slate-950">{log.date}</p>
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                                {log.status}
                              </span>
                              {log.isDeduction && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-700">
                                  Deduction
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm font-bold leading-5 text-slate-700">
                              {log.issue}
                            </p>

                            <div className="mt-2 grid grid-cols-1 gap-1 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                              <p><span className="font-black text-slate-700">Schedule:</span> {log.schedule}</p>
                              <p><span className="font-black text-slate-700">Actual:</span> {log.actual}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleAuditCheck(key)}
                            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black transition-all duration-200 active:scale-[0.98] ${
                              checked
                                ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            title={checked ? "Marked as checked" : "Click to mark this audit item as checked"}
                          >
                            {checked ? "✓ Checked" : "Mark Check"}
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-5 overflow-hidden rounded-xl border border-slate-200 bg-white text-xs">
                          <div className="border-r border-slate-100 p-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Late</p>
                            <p className="mt-1 font-black text-red-600">{formatMoney(log.lateAmount)}</p>
                          </div>
                          <div className="border-r border-slate-100 p-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">UT</p>
                            <p className="mt-1 font-black text-red-600">{formatMoney(log.undertimeAmount)}</p>
                          </div>
                          <div className="border-r border-slate-100 p-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Absent</p>
                            <p className="mt-1 font-black text-red-600">{formatMoney(log.absentAmount)}</p>
                          </div>
                          <div className="border-r border-slate-100 p-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">OT Pay</p>
                            <p className="mt-1 font-black text-emerald-700">{formatMoney(log.otAmount)}</p>
                            {Number(log.detectedOtMinutes || 0) > 0 && (
                              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
                                {String(log.otApprovalStatus || "").replace(/_/g, " ")}
                              </p>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Total Ded.</p>
                            <p className="mt-1 font-black text-red-600">{formatMoney(log.totalAmount)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {auditLogs.length === 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white py-14 text-center">
                      <p className="font-black text-slate-950">No audit logs found.</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">This employee has no attendance or deduction evidence for this period.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white/95 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedAuditRecord(null)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Close Audit
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                  >
                    Print Payslip
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {!selectedPeriod?.needs_regeneration && selectedPayslip && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="payslip-no-print mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Payslip Preview</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Clean A4 payroll document for printing, release review, and employee signing.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
              >
                <Printer size={16} /> Print Payslip
              </button>
            </div>

            <div className="payslip-print-area mx-auto max-w-[920px] rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="payslip-page bg-white p-8 text-slate-950">
                <div className="payslip-avoid-break border-b-2 border-slate-950 pb-5">
                  <div className="flex items-start justify-between gap-8">
                    <div className="min-w-0">
                      <h1 className="text-2xl font-black tracking-[0.08em] text-slate-950">
                        VINCENT RESORT HOTEL
                      </h1>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
                        Employee Payslip
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-600">
                        <p>Payroll Period: <b className="text-slate-950">{selectedPayslip.period_label || selectedPeriod?.period_name || "-"}</b></p>
                        <p>Generated: <b className="text-slate-950">{new Date().toLocaleDateString()}</b></p>
                        <p>Employee No.: <b className="text-slate-950">{selectedPayslip.employee_no || "-"}</b></p>
                        <p>Status: <b className="text-slate-950">{getPayslipReleaseStatus(selectedPayslip)}</b></p>
                      </div>
                    </div>

                    <div className="w-[210px] rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Release / Payable
                      </p>
                      <p className="mt-2 text-2xl font-black text-emerald-700">
                        {formatMoney(getDisplayedReleaseAmount(selectedPayslip))}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-500">
                        Net: {formatMoney(getDisplayedNetPay(selectedPayslip))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="payslip-avoid-break mt-5 grid grid-cols-[1fr_240px] gap-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Employee Details</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {selectedPayslip.employee_name || "-"}
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <PayslipInfoBox label="Department" value={selectedPayslip.department || "-"} />
                      <PayslipInfoBox label="Position" value={selectedPayslip.position || "-"} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Payroll Status</p>
                    <p className="mt-3 text-xl font-black text-slate-950">{getPayslipReleaseStatus(selectedPayslip)}</p>
                    <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between"><span>Released</span><b>{formatMoney(getPayslipReleasedAmount(selectedPayslip))}</b></div>
                      <div className="flex justify-between"><span>Remaining</span><b>{formatMoney(getPayslipRemainingSalary(selectedPayslip))}</b></div>
                    </div>
                  </div>
                </div>

                <div className="payslip-avoid-break mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                    Attendance Summary
                  </div>
                  <div className="grid grid-cols-6 divide-x divide-slate-200 text-center text-xs">
                    <PayslipAttendance label="Scheduled" value={selectedPayslip.scheduled_days || 0} />
                    <PayslipAttendance label="Worked" value={selectedPayslip.days_worked || 0} />
                    <PayslipAttendance label="RD/OFF" value={selectedPayslip.rest_days || 0} />
                    <PayslipAttendance label="Absent" value={selectedPayslip.absent_days || 0} />
                    <PayslipAttendance label="Late" value={`${selectedPayslip.late_minutes || 0} min`} />
                    <PayslipAttendance label="Undertime" value={`${selectedPayslip.undertime_minutes || 0} min`} />
                  </div>
                </div>

                <div className="payslip-avoid-break mt-5 grid grid-cols-4 overflow-hidden rounded-2xl border border-slate-950 text-center">
                  <PayslipAmountBox label="Gross Pay" value={formatMoney(selectedPayslip.gross_pay)} />
                  <PayslipAmountBox label="Total Deductions" value={formatMoney(getDisplayedTotalDeductions(selectedPayslip))} danger />
                  <PayslipAmountBox label="Net Pay" value={formatMoney(getDisplayedNetPay(selectedPayslip))} />
                  <PayslipAmountBox label="Payable" value={formatMoney(getDisplayedReleaseAmount(selectedPayslip))} success />
                </div>

                <div className="payslip-avoid-break mt-5 grid grid-cols-2 gap-5 text-xs">
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                      Earnings
                    </div>
                    <table className="w-full">
                      <tbody>
                        <PayslipLine label="Basic Pay" value={formatMoney(selectedPayslip.basic_pay)} />
                        <PayslipLine label="Holiday Pay" value={formatMoney(selectedPayslip.holiday_pay)} />
                        <PayslipLine
                          label={`OT Pay (${(
                            Number(selectedPayslip.approved_ot_minutes || 0) > 0
                              ? Number(selectedPayslip.approved_ot_minutes || 0)
                              : Number(selectedPayslip.ot_pay || 0) > 0
                                ? Number(selectedPayslip.detected_ot_minutes ?? selectedPayslip.ot_minutes ?? 0)
                                : 0
                          ) / 60}h approved / ${Number(selectedPayslip.detected_ot_minutes ?? selectedPayslip.ot_minutes ?? 0) / 60}h detected)`}
                          value={formatMoney(selectedPayslip.ot_pay)}
                        />
                        <PayslipLine label="Allowance / Bonus" value={formatMoney(selectedPayslip.allowance)} />
                        <PayslipLine label="Gross Pay" value={formatMoney(selectedPayslip.gross_pay)} strong />
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                      Deductions
                    </div>
                    <table className="w-full">
                      <tbody>
                        <PayslipLine label="Late Deduction" value={formatMoney(selectedPayslip?.late_deduction)} />
                        <PayslipLine label="Undertime Deduction" value={formatMoney(selectedPayslip?.undertime_deduction)} />
                        <PayslipLine label="Absent Deduction" value={formatMoney(selectedPayslip?.absent_deduction)} />
                        <PayslipLine label="Manual Deductions" value={formatMoney(selectedPayslip?.manual_deduction)} />
                        {showSss && <PayslipLine label="SSS" value={formatMoney(selectedPayslip?.sss_deduction)} />}
                        {showPhilHealth && <PayslipLine label="PhilHealth" value={formatMoney(selectedPayslip?.philhealth_deduction)} />}
                        {showPagibig && <PayslipLine label="Pag-IBIG" value={formatMoney(selectedPayslip?.pagibig_deduction)} />}
                        {showTax && <PayslipLine label="Withholding Tax" value={formatMoney(selectedPayslip?.tax_deduction)} />}
                        <PayslipLine label="Employee Liability Deduction" value={formatMoney(selectedPayslip?.balance_deduction)} />
                        <PayslipLine label="Total Deductions" value={formatMoney(getDisplayedTotalDeductions(selectedPayslip))} strong />
                      </tbody>
                    </table>
                  </div>
                </div>

                {getPayslipLiabilityRows(selectedPayslip).length > 0 && (
                  <div className="payslip-avoid-break mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                      Employee Liability Breakdown
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-white text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Source / Remarks</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPayslipLiabilityRows(selectedPayslip).map((item: any) => (
                          <tr key={item.id || item.source_id || item.adjustment_type} className="border-t border-slate-100">
                            <td className="w-[140px] px-4 py-2 font-black text-slate-950">{item.adjustment_type || item.balance_type || "Employee Liability"}</td>
                            <td className="px-4 py-2 leading-5 text-slate-600">{item.remarks || "Payroll-deductible employee balance"}</td>
                            <td className="w-[120px] px-4 py-2 text-right font-black text-slate-950">{formatMoney(item.amount || item.remaining_balance || 0)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-950 bg-slate-50 font-black">
                          <td className="px-4 py-2" colSpan={2}>Deducted This Payroll</td>
                          <td className="px-4 py-2 text-right">{formatMoney(selectedPayslip?.balance_deduction)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {getDisplayedCarryForwardAmount(selectedPayslip) > 0 && (
                  <div className="payslip-avoid-break mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold leading-5 text-blue-900">
                    <b>Carry Forward Notice:</b> Deductions exceeded available net pay. The unpaid amount will continue to the next payroll cutoff as employee balance.
                  </div>
                )}

                {getPayslipReleasedAmount(selectedPayslip) > 0 && getPayslipRemainingSalary(selectedPayslip) > 0 && (
                  <div className="payslip-avoid-break mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold leading-5 text-blue-900">
                    <b>Partial Release Notice:</b> This payroll has already released {formatMoney(getPayslipReleasedAmount(selectedPayslip))}. Remaining salary balance is {formatMoney(getPayslipRemainingSalary(selectedPayslip))}.
                  </div>
                )}

                <div className="payslip-avoid-break mt-10 grid grid-cols-2 gap-12 text-xs font-semibold text-slate-600">
                  <div><div className="mt-10 border-t border-slate-950 pt-2 text-center">Prepared / Checked By</div></div>
                  <div><div className="mt-10 border-t border-slate-950 pt-2 text-center">Employee Signature</div></div>
                </div>

                <p className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] font-medium text-slate-500">
                  {settings.payslip_footer || "This is a system-generated payslip."}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* OPSCORE Assistant: locked global floating signature */}
      <OpscoreAssistant reminders={assistantReminders} />
      </div>
    </PageGuard>
  );
}



function PayslipInfoBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function PayslipLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <tr className={`${strong ? "border-t-2 border-slate-900 font-black" : "border-b border-slate-100"}`}>
      <td className="px-4 py-2 text-slate-600">{label}</td>
      <td className="px-4 py-2 text-right font-bold">{value}</td>
    </tr>
  );
}



function PayslipAttendance({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function PayslipAmountBox({
  label,
  value,
  danger,
  success,
}: {
  label: string;
  value: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="border-r border-slate-950 px-4 py-4 last:border-r-0">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p
        className={
          danger
            ? "mt-2 text-xl font-black text-red-700"
            : success
            ? "mt-2 text-xl font-black text-emerald-700"
            : "mt-2 text-xl font-black text-slate-950"
        }
      >
        {value}
      </p>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  danger,
}: {
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={danger ? "mt-1 text-lg font-black text-red-700" : "mt-1 text-lg font-black text-slate-950"}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger,
  success,
}: {
  label: string;
  value: any;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p
        className={
          danger
            ? "mt-1 text-lg font-black text-red-700"
            : success
            ? "mt-1 text-lg font-black text-emerald-700"
            : "mt-1 text-lg font-black text-slate-950"
        }
      >
        {value}
      </p>
    </div>
  );
}

function KpiCard({
  icon,
  title,
  value,
  success,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="mb-3 flex items-center gap-3">
        <div className={danger ? "rounded-2xl bg-red-50 p-3 text-red-700" : success ? "rounded-2xl bg-emerald-50 p-3 text-emerald-700" : "rounded-2xl bg-slate-100 p-3 text-slate-700"}>
          {icon}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      </div>
      <h2 className={danger ? "text-3xl font-black tracking-tight text-red-700" : "text-3xl font-black tracking-tight text-slate-950"}>{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "Draft");

  const style =
    normalized === "Active" ||
    normalized === "Approved" ||
    normalized === "For Approval" ||
    normalized === "MANAGER REVIEW" ||
    normalized === "LOCKED" ||
    normalized === "RELEASED" ||
    normalized === "Released" ||
    normalized === "Paid"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "Pending" ||
        normalized === "OPEN" ||
        normalized === "DRAFT" ||
        normalized === "RETURNED FOR CORRECTION" ||
        normalized === "Partially Approved" ||
        normalized === "Reopened" ||
        normalized === "Draft"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : normalized === "Rejected" || normalized === "Cancelled"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
      {normalized}
    </span>
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value, strong = false }: any) {
  return (
    <div
      className={`flex justify-between py-1 ${
        strong ? "mt-3 border-t pt-3 font-black" : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}