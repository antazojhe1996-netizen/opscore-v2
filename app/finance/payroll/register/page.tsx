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
  RotateCcw,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
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
  const periodStatus = selectedPeriod?.status || "Draft";
  const payrollIsOutdated = Boolean(selectedPeriod?.needs_regeneration);

  const isLocked =
    periodStatus === "Released" ||
    periodStatus === "Partially Released" ||
    periodStatus === "Paid" ||
    (periodStatus === "Approved" && selectedPeriod?.attendance_locked === true);

  const canEditPayroll = !isLocked;

  const closedRegisterStatuses = [
    "For Approval",
    "Approved",
    "Released",
    "Partially Released",
    "Paid",
    "Cancelled",
  ];

  const isRecordClosedForRegister = (record: any) => {
    const status = String(record.status || "").trim();
    const releaseStatus = String(record.release_status || "").trim();
    const paidAmount = Number(record.paid_amount || record.released_amount || 0);
    const hasReleaseDate = Boolean(record.released_at);

    return (
      closedRegisterStatuses.includes(status) ||
      closedRegisterStatuses.includes(releaseStatus) ||
      paidAmount > 0 ||
      hasReleaseDate
    );
  };

  const isRecordSendableFromRegister = (record: any) => {
    const status = String(record.status || "Draft").trim();
    const releaseStatus = String(record.release_status || "Pending").trim();

    if (isRecordClosedForRegister(record)) return false;
    if (["For Approval", "Approved"].includes(status)) return false;
    if (["For Approval", "Approved"].includes(releaseStatus)) return false;

    return true;
  };

  const isSettingEnabled = (
    activeSettings: Record<string, string>,
    key: string
  ) => String(activeSettings[key] || "No") === "Yes";

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

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("payroll_active", true)
      .order("department", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) return console.log("GET EMPLOYEES ERROR:", error.message);
    setEmployees(data || []);
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
    if (!canEditPayroll) {
      alert("This payroll is locked. Reopen first before editing CA deductions.");
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
        status: "Draft",
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

    if (!canEditPayroll) {
      alert("This payroll is locked. Reopen first before deleting.");
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
    if (!selectedPeriodId) return;

    const reason = prompt(
      "Reason for reopening payroll? This is required for audit trail."
    );

    if (!reason || !reason.trim()) {
      alert("Reopen reason is required.");
      return;
    }

    const confirmed = confirm(
      "Reopen this payroll? Records will return to Draft and can be edited/regenerated."
    );

    if (!confirmed) return;

    const { error: periodError } = await supabase
      .from("payroll_periods")
      .update({
        status: "Reopened",
        reopen_reason: reason.trim(),
        reopened_at: new Date().toISOString(),
        attendance_locked: false,
        attendance_locked_at: null,
        snapshot_created_at: null,
      })
      .eq("id", selectedPeriodId);

    if (periodError) {
      alert("Failed to reopen payroll period.");
      return console.log("REOPEN PERIOD ERROR:", periodError.message);
    }

    const { error: recordsError } = await supabase
      .from("payroll_records")
      .update({
        status: "Draft",
        reopen_reason: reason.trim(),
      })
      .eq("period_id", selectedPeriodId);

    if (recordsError) {
      console.log("REOPEN RECORDS ERROR:", recordsError.message);
    }

    await getPeriods();
    await getRecords(selectedPeriodId);
    await getEmployeeBalances();
    setSelectedRecordIds([]);

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Reopen Payroll Period",
      description: `Reopened payroll period ${selectedPeriod?.period_name || selectedPeriodId}. Reason: ${reason.trim()}`,
      severity: "critical",
      recordId: selectedPeriodId,
      oldValue: selectedPeriod,
      newValue: {
        status: "Reopened",
        reopen_reason: reason.trim(),
        attendance_locked: false,
      },
    });

    alert("Payroll reopened.");
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
      otMinutes: workRows.reduce((sum, row) => sum + Number(row.ot_minutes || 0), 0),
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
    const otMinutes = Number(base.ot_minutes || 0);
    const otHours = otMinutes / 60;

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

    const otPay = otEnabled ? otHours * hourlyRate * otMultiplier : 0;

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
      basic_pay: basicPay,
      holiday_pay: holidayPay,
      ot_pay: otPay,
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

    if (!canEditPayroll) {
      alert("This payroll is locked. Reopen first before generating again.");
      return;
    }

    if (employees.length === 0) {
      alert("No payroll active employees.");
      return;
    }

    const currentCompanyId = getCurrentCompanyId();

    if (!currentCompanyId) {
      alert("No company selected. Please login again before generating payroll.");
      return;
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

    const protectedExistingRecords = (existingPeriodRecords || []).filter((record) => {
      const status = String(record.status || "");
      const releaseStatus = String(record.release_status || "");
      const paidAmount = Number(record.paid_amount || 0);
      const remainingAmount = Number(record.remaining_amount || 0);

      return (
        status === "For Approval" ||
        status === "Approved" ||
        status === "Released" ||
        status === "Paid" ||
        status === "Partially Released" ||
        releaseStatus === "For Approval" ||
        releaseStatus === "Approved" ||
        releaseStatus === "Released" ||
        releaseStatus === "Partially Released" ||
        paidAmount > 0 ||
        (remainingAmount > 0 && status !== "Draft")
      );
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

    const employeesToGenerate = employees.filter(
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
      action: "Generate Payroll",
      description: `${generated.length} payroll record(s) generated for ${selectedPeriod?.period_name || selectedPeriodId}`,
      severity: "info",
      recordId: selectedPeriodId,
      newValue: {
        period: selectedPeriod,
        generatedCount: generated.length,
        preservedReleasedCount: protectedExistingRecords.length,
        totalGross: generated.reduce((sum, record) => sum + Number(record.gross_pay || 0), 0),
        totalDeductions: generated.reduce((sum, record) => sum + Number(record.total_deductions || 0), 0),
        totalRelease: generated.reduce((sum, record) => sum + Number(record.release_amount || 0), 0),
        balanceDeductions: generated.reduce((sum, record) => sum + Number(record.balance_deduction || 0), 0),
      },
    });

    alert(`Payroll generated. CA balances are available for manual partial deduction. Preserved released/partial records: ${protectedExistingRecords.length}.`);
  };

  const addAdjustment = async () => {
    if (!canEditPayroll) {
      alert("This payroll is locked. Reopen first before adding adjustments.");
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
        `${adjustmentType} saved to Employee Balances. Generate payroll again, then set partial deduction under "Balance Deduct This Cutoff".`
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
    if (!canEditPayroll) {
      alert("This payroll is locked. Reopen first before deleting adjustments.");
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

    alert("Adjustment deleted. Generate payroll again to update payroll.");
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

    if (source === "Cash Drawer") return "bg-blue-500/10 text-blue-400";
    if (source === "Expenses") return "bg-purple-500/10 text-purple-400";
    if (source === "Payroll Manager") return "bg-blue-500/10 text-blue-300";

    return "bg-slate-700 text-slate-300";
  };

  const deleteEmployeeBalance = async (balance: any) => {
    if (!canEditPayroll) {
      alert("This payroll is locked. Reopen first before cancelling employee balances.");
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

    alert("Employee balance cancelled. Generate payroll again to update deductions.");
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
      if (otMinutes > 0) issueParts.push(`${otMinutes} mins OT`);

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
    snapshotType = "Manager Approval Snapshot"
  ) => {
    if (!selectedPeriodId || targetRecords.length === 0) return true;

    const currentCompanyId = getCurrentCompanyId();

    if (!currentCompanyId) {
      alert("No company selected. Please login again before creating payroll snapshot.");
      return false;
    }

    const now = new Date().toISOString();

    const snapshotRows = targetRecords.map((record) => ({
      company_id: record.company_id || currentCompanyId,
      payroll_record_id: record.id,
      payroll_period_id: selectedPeriodId,
      period_id: selectedPeriodId,
      employee_id: record.employee_id,

      employee_no: record.employee_no,
      employee_name: record.employee_name,
      department: record.department,
      position: record.position,
      period_label: record.period_label || selectedPeriod?.period_name || "Payroll Period",

      scheduled_days: Number(record.scheduled_days || 0),
      rest_days: Number(record.rest_days || 0),
      days_worked: Number(record.days_worked || 0),
      absent_days: Number(record.absent_days || 0),
      late_minutes: Number(record.late_minutes || 0),
      undertime_minutes: Number(record.undertime_minutes || 0),
      ot_minutes: Number(record.ot_minutes || 0),

      basic_pay: Number(record.basic_pay || 0),
      holiday_pay: Number(record.holiday_pay || 0),
      ot_pay: Number(record.ot_pay || 0),
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
      total_deductions: getDisplayedTotalDeductions(record),
      net_pay: getDisplayedNetPay(record),
      release_amount: getDisplayedReleaseAmount(record),
      carry_forward_amount: getDisplayedCarryForwardAmount(record),

      record_status: record.status || "Draft",
      snapshot_type: snapshotType,
      snapshot_created_at: now,
    }));

    const { error } = await supabase
      .from("payroll_snapshots")
      .upsert(snapshotRows, {
        onConflict: "payroll_record_id",
      });

    if (error) {
      console.log("CREATE PAYROLL SNAPSHOT ERROR:", error);
      alert(`Failed to create payroll snapshot.\n\n${error.message}`);
      return false;
    }

    return true;
  };

  const sendPayrollToManager = async (mode: "all" | "selected") => {
    if (!selectedPeriodId || records.length === 0) return;

    if (selectedPeriod?.needs_regeneration) {
      alert(
        "Cannot send payroll. Payroll is outdated because adjustments were changed. Generate Payroll first."
      );
      return;
    }

    const sendableRecords = records.filter((record) => isRecordSendableFromRegister(record));

    const targetRecords =
      mode === "all"
        ? sendableRecords
        : sendableRecords.filter((record) => selectedRecordIds.includes(String(record.id)));

    if (targetRecords.length === 0) {
      alert("No selected employees.");
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

    const confirmMessage = `Send Payroll to Manager?

Mode: ${mode === "all" ? "Send All Ready" : "Send Selected"}
Employees: ${targetRecords.length}
Gross Pay: ${formatMoney(targetGross)}
Deductions: ${formatMoney(targetDeductions)}
Net Pay: ${formatMoney(targetNet)}

High Alerts: ${targetHighAlerts.length}

Supervisor audit reminder:
- Review OT, late, undertime, absent, leave pay, holiday pay, and high deductions before sending.

This will:
1. Create a permanent payroll snapshot
2. Lock attendance for this cutoff
3. Send payroll records to Payroll Manager`;

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
      "Manager Approval Snapshot"
    );

    if (!snapshotOk) {
      setIsSaving(false);
      return;
    }

    const { error: periodError } = await supabase
      .from("payroll_periods")
      .update({
        status: mode === "all" ? "Approved" : "Partially Approved",
        attendance_locked: mode === "all",
        attendance_locked_at: mode === "all" ? now : null,
        snapshot_created_at: now,
        needs_regeneration: false,
      })
      .eq("id", selectedPeriodId);

    if (periodError) {
      setIsSaving(false);
      alert("Failed to update payroll period.");
      return console.log("APPROVE PERIOD ERROR:", periodError.message);
    }

    const { error: recordsError } = await supabase
      .from("payroll_records")
      .update({
        status: "For Approval",
        period_label: selectedPeriod?.period_name || "Payroll Period",
        snapshot_created_at: now,
      })
      .in("id", targetIds);

    if (recordsError) {
      setIsSaving(false);
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Send Payroll To Manager Failed",
        description: `Failed to send payroll records to Payroll Manager for ${selectedPeriod?.period_name || selectedPeriodId}: ${recordsError.message}`,
        severity: "critical",
        recordId: selectedPeriodId,
        newValue: { error: recordsError.message, targetCount: targetRecords.length },
      });
      alert("Records failed to send to Payroll Manager.");
      return console.log("APPROVE RECORDS ERROR:", recordsError.message);
    }

    setIsSaving(false);

    await getPeriods();
    await getRecords(selectedPeriodId);
    await getEmployeeBalances();
    setSelectedRecordIds([]);

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Send Payroll To Manager",
      description: `${targetRecords.length} payroll record(s) sent to Payroll Manager for ${selectedPeriod?.period_name || selectedPeriodId}`,
      severity: "warning",
      recordId: selectedPeriodId,
      newValue: {
        mode,
        recordCount: targetRecords.length,
        totalNet,
        targetIds,
      },
    });

    alert("Payroll snapshot created, attendance locked, and payroll sent to Payroll Manager for release.");
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

  const editableRegisterRecords = useMemo(() => {
    return records.filter((record) => !isRecordClosedForRegister(record));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return editableRegisterRecords.filter((record) =>
      `${record.employee_name} ${record.department} ${record.position}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [editableRegisterRecords, searchTerm]);

  const totalGross = editableRegisterRecords.reduce(
    (sum, record) => sum + Number(record.gross_pay || 0),
    0
  );

  const totalDeductions = editableRegisterRecords.reduce(
    (sum, record) => sum + getDisplayedTotalDeductions(record),
    0
  );

  const totalNet = editableRegisterRecords.reduce(
    (sum, record) => sum + getDisplayedNetPay(record),
    0
  );

  const totalReleaseAmount = editableRegisterRecords.reduce(
    (sum, record) => sum + getDisplayedReleaseAmount(record),
    0
  );

  const totalCarryForwardAmount = editableRegisterRecords.reduce(
    (sum, record) => sum + getDisplayedCarryForwardAmount(record),
    0
  );

  const totalGovernmentDeductions = editableRegisterRecords.reduce(
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

  const selectedRecords = editableRegisterRecords.filter((record) =>
    selectedRecordIds.includes(String(record.id))
  );

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
    const otMinutes = Number(record.ot_minutes || 0);
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

    if (otMinutes > 0 && settings.ot_requires_approval === "Yes") {
      alerts.push({
        employee: record.employee_name,
        type: "OT Needs Supervisor Review",
        message: `${otMinutes} OT minutes detected and OT review is enabled in Payroll Settings.`,
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
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : riskLevel === "Medium Risk"
      ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
      : "border-green-500/30 bg-green-500/10 text-green-300";

  const toggleRecordSelection = (id: any) => {
    const key = String(id);

    setSelectedRecordIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const selectAllFiltered = () => {
    setSelectedRecordIds(filteredRecords.map((record) => String(record.id)));
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

  return (
    <PageGuard moduleKey="payroll_register">
      <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
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
            }

            .payslip-avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>
        <section className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              Payroll Operations
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              Payroll Register
            </h1>
            <p className="mt-1 max-w-4xl text-sm text-slate-400">
              Generate payroll, review employee records, apply CA deductions, and send ready payroll to manager.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={generatePayroll}
              disabled={isSaving || !selectedPeriodId || isLocked}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {selectedPeriod?.needs_regeneration ? "Regenerate Payroll" : "Generate Payroll"}
            </button>

            <button
              onClick={reopenPayroll}
              disabled={isSaving || !selectedPeriodId || !isLocked}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              <RotateCcw size={15} /> Reopen
            </button>

            <button
              onClick={() =>
                selectedRecordIds.length > 0
                  ? sendPayrollToManager("selected")
                  : sendPayrollToManager("all")
              }
              disabled={filteredRecords.length === 0 || Boolean(selectedPeriod?.needs_regeneration) || isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <Send size={15} />
              {selectedRecordIds.length > 0
                ? `Send Selected (${selectedRecordIds.length})`
                : "Send All Ready"}
            </button>
          </div>
        </section>

        <section className="sticky top-0 z-30 mb-5 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 shadow-xl shadow-black/20 backdrop-blur">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[260px_minmax(260px,1fr)_220px]">
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-9 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Status</span>
                  <span className="font-black text-white">{selectedPeriod?.status || "No Period"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CompactMetric label="Records" value={editableRegisterRecords.length} />
              <CompactMetric label="Net Pay" value={formatMoney(totalNet)} danger={totalNet < 0} />
              <CompactMetric label="To Manager" value={formatMoney(totalReleaseAmount)} />
              <CompactMetric label="Alerts" value={managerAlerts.length} danger={managerAlerts.length > 0} />
            </div>
          </div>
        </section>

        {selectedPeriod?.needs_regeneration && (
          <section className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-black text-red-300">Payroll needs regeneration.</p>
                <p className="mt-1 text-red-100/80">
                  Attendance, adjustments, or employee balances changed after the last payroll computation.
                </p>
              </div>

              <button
                onClick={generatePayroll}
                disabled={isSaving || !selectedPeriodId || isLocked}
                className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-black text-white hover:bg-red-400 disabled:opacity-50"
              >
                Regenerate Now
              </button>
            </div>
          </section>
        )}

        {managerAlerts.length > 0 && (
          <section className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <p className="font-bold text-amber-200">
                {managerAlerts.length} payroll audit alert{managerAlerts.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-100/80">
                {managerAlerts.slice(0, 4).map((alert, index) => (
                  <span key={index}>
                    • {alert.employee}: {alert.type}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {selectedRecordIds.length > 0 && (
          <section className="sticky top-3 z-40 mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-black text-blue-300">
                  {selectedRecordIds.length} employee(s) selected
                </p>
                <p className="mt-1 text-xs text-blue-100/80">
                  Gross: {formatMoney(selectedGross)} • Deductions:{" "}
                  {formatMoney(selectedDeductions)} • Computed Net:{" "}
                  {formatMoney(selectedNet)} • To Manager: {formatMoney(selectedReleaseAmount)} • Carry Forward: {formatMoney(selectedCarryForwardAmount)}
                  {(showGovernmentSection || showTax) && (
                    <> • Gov/Tax: {formatMoney(selectedGovernmentDeductions)}</>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={clearSelection}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Clear
                </button>

                <button
                  onClick={() => sendPayrollToManager("selected")}
                  disabled={selectedRecords.length === 0 || Boolean(selectedPeriod?.needs_regeneration) || isSaving}
                  className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
                >
                  <Send size={16} /> Send Selected to Manager
                </button>

              </div>
            </div>
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold">Final Payroll Register</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review final computed payroll. Set partial CA deduction, then send selected employees to Payroll Manager for actual release.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={selectAllFiltered}
                disabled={filteredRecords.length === 0}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Select All
              </button>

              <button
                onClick={() =>
                  selectedRecordIds.length > 0
                    ? sendPayrollToManager("selected")
                    : sendPayrollToManager("all")
                }
                disabled={filteredRecords.length === 0 || Boolean(selectedPeriod?.needs_regeneration) || isSaving}
                className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
              >
                <Send size={16} />
                {selectedRecordIds.length > 0
                  ? `Send Selected (${selectedRecordIds.length})`
                  : "Send All Ready"}
              </button>


              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none xl:w-80"
                />
              </div>
            </div>
          </div>

          {selectedPeriod?.needs_regeneration && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
              <AlertTriangle className="mx-auto mb-3" size={34} />
              <h3 className="text-xl font-black text-red-300">Payroll table hidden because data is outdated.</h3>
              <p className="mt-2 text-sm">
                Attendance, CA/deductions, or carry-forward balances changed after the last generation.
                Click Generate Payroll before reviewing employee totals.
              </p>
            </div>
          )}

          {!selectedPeriod?.needs_regeneration && (
          <div className="max-h-[650px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1900px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Sched</th>
                  <th className="px-4 py-3 text-right">Worked</th>
                  <th className="px-4 py-3 text-right">RD/OFF</th>
                  <th className="px-4 py-3 text-right">Absent</th>
                  <th className="px-4 py-3 text-right">Late</th>
                  <th className="px-4 py-3 text-right">UT</th>
                  <th className="px-4 py-3 text-right">OT</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Holiday</th>
                  <th className="px-4 py-3 text-right">Auto Ded.</th>
                  <th className="px-4 py-3 text-right">Manual Ded.</th>
                  {(showGovernmentSection || showTax) && (
                    <th className="px-4 py-3 text-right">Gov / Tax</th>
                  )}
                  <th className="px-4 py-3 text-right">CA Deduct This Cutoff</th>
                  <th className="px-4 py-3 text-right">Computed Net</th>
                  <th className="px-4 py-3 text-right">To Manager</th>
                  <th className="px-4 py-3 text-right">Carry Forward</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const autoDeduction = getAutoDeductionTotal(record);
                  const governmentDeduction = getGovernmentDeductionTotal(record);
                  const displayedNetPay = getDisplayedNetPay(record);
                  const displayedReleaseAmount = getDisplayedReleaseAmount(record);
                  const displayedCarryForwardAmount =
                    getDisplayedCarryForwardAmount(record);

                  const selected = selectedRecordIds.includes(String(record.id));

                  return (
                    <tr
                      key={record.id}
                      className={`border-t border-slate-800 hover:bg-slate-800/40 ${
                        selected ? "bg-yellow-400/10" : ""
                      } ${displayedNetPay < 0 ? "bg-red-500/10" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRecordSelection(record.id)}
                          className="h-4 w-4 accent-yellow-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black">{record.employee_name}</p>
                        <p className="text-xs text-slate-500">
                          {record.department} • {record.position}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={record.status || "Draft"} />
                      </td>
                      <td className="px-4 py-3 text-right">{record.scheduled_days || 0}</td>
                      <td className="px-4 py-3 text-right">{record.days_worked || 0}</td>
                      <td className="px-4 py-3 text-right">{record.rest_days || 0}</td>
                      <td className="px-4 py-3 text-right">{record.absent_days || 0}</td>
                      <td className="px-4 py-3 text-right">{record.late_minutes || 0} min</td>
                      <td className="px-4 py-3 text-right">{record.undertime_minutes || 0} min</td>
                      <td className="px-4 py-3 text-right">{Number(record.ot_minutes || 0)} min</td>
                      <td className="px-4 py-3 text-right">{formatMoney(record.basic_pay)}</td>
                      <td className="px-4 py-3 text-right text-blue-400">{formatMoney(record.holiday_pay)}</td>
                      <td className="px-4 py-3 text-right text-red-400">{formatMoney(autoDeduction)}</td>
                      <td className="px-4 py-3 text-right text-red-400">{formatMoney(record.manual_deduction)}</td>
                      {(showGovernmentSection || showTax) && (
                        <td className="px-4 py-3 text-right text-red-400">
                          {formatMoney(governmentDeduction)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
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
                                disabled={!canEditPayroll || maxBalance <= 0 || isSaving}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setBalanceDrafts((prev) => ({
                                    ...prev,
                                    [record.id]: value,
                                  }));
                                }}
                                onBlur={(event) => updateRecordBalanceDeduction(record, event.target.value)}
                                className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-xs font-black text-blue-300 outline-none disabled:opacity-40"
                              />
                              <p className="text-[10px] text-slate-500">
                                Max CA: {formatMoney(maxBalance)}
                              </p>
                            </div>
                          );
                        })()}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-black ${
                          displayedNetPay < 0 ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {formatMoney(displayedNetPay)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">
                        {formatMoney(displayedReleaseAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-blue-300">
                        {formatMoney(displayedCarryForwardAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEmployeeAudit(record)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"
                        >
                          View Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={(showGovernmentSection || showTax) ? 20 : 19} className="px-4 py-14 text-center text-slate-500">
                      No payroll records. Select period then click Generate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="text-xl font-bold">Payroll Period</h2>
            <p className="mt-1 text-sm text-slate-400">
              Create, select, generate, reopen, or delete payroll period.
            </p>

            <div className="mt-5 space-y-3">
              <input
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="June 1-15, 2026"
                disabled={isLocked}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isLocked}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isLocked}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                />
              </div>

              <button
                onClick={createPeriod}
                disabled={isSaving || isLocked}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black hover:bg-blue-500 disabled:opacity-50"
              >
                Create Period
              </button>

              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="">Select payroll period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.period_name} ({period.status})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <button
                  onClick={generatePayroll}
                  disabled={isSaving || !selectedPeriodId || isLocked}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black hover:bg-emerald-500 disabled:opacity-50"
                >
                  Generate
                </button>

                <button
                  onClick={reopenPayroll}
                  disabled={isSaving || !selectedPeriodId || !isLocked}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={16} /> Reopen
                </button>

                <button
                  onClick={deletePeriod}
                  disabled={isSaving || !selectedPeriodId || isLocked}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black hover:bg-red-500 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              {selectedPeriodId && isLocked && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs font-semibold leading-5 text-blue-200">
                  This payroll is locked. Click <span className="font-black">Reopen</span> to unlock attendance, regenerate payroll, or edit partial CA deductions.
                </div>
              )}

              {selectedPeriod && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{selectedPeriod.period_name}</p>
                    <StatusBadge status={selectedPeriod.status} />
                  </div>
                  <p className="mt-1 text-slate-400">
                    {selectedPeriod.start_date} to {selectedPeriod.end_date}
                  </p>
                  {selectedPeriod?.needs_regeneration && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                      <AlertTriangle size={12} /> Needs regeneration.
                    </p>
                  )}
                  {selectedPeriod?.attendance_locked && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-blue-300">
                      <Lock size={12} /> Attendance locked for this cutoff. Reopen payroll to unlock.
                    </p>
                  )}
                  {selectedPeriod?.last_generated_at && (
                    <p className="mt-2 text-xs text-slate-500">
                      Last generated: {new Date(selectedPeriod.last_generated_at).toLocaleString()}
                    </p>
                  )}
                  {isLocked && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-blue-300">
                      <Lock size={12} /> Locked. Reopen to edit.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">Payroll Adjustments</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Earnings and non-liability adjustments only. Cash Advance, employee meals, salary loans, and restaurant unpaid balances should be created in Employee Balances, then deducted through payroll.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-300">
                  Pending {pendingAdjustments.length}
                </span>
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-green-300">
                  Approved {approvedAdjustments.length}
                </span>
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-300">
                  Rejected {rejectedAdjustments.length}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={!canEditPayroll}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50 md:col-span-2"
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
                disabled={!canEditPayroll}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
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
                disabled={!canEditPayroll}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
              />

              <button
                onClick={addAdjustment}
                disabled={isSaving || !selectedPeriodId || !canEditPayroll}
                className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
              >
                Save
              </button>

              <input
                value={adjustmentRemarks}
                onChange={(e) => setAdjustmentRemarks(e.target.value)}
                placeholder="Remarks"
                disabled={!canEditPayroll}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50 md:col-span-5"
              />
            </div>

            <div className="mt-5 max-h-64 overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1050px] text-xs">
                <thead className="bg-slate-950 text-left text-slate-400">
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
                    <tr key={item.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 font-bold">{item.employee_name}</td>
                      <td className="px-3 py-2">{item.adjustment_type}</td>
                      <td className="px-3 py-2">{item.adjustment_direction}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.amount)}</td>
                      <td className="px-3 py-2 text-slate-400">{item.remarks || "-"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={item.status || "Pending"} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {String(item.status || "Pending") === "Pending" && (
                            <span className="rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">
                              Pending Approval Center
                            </span>
                          )}

                          <button
                            onClick={() => deleteAdjustment(item.id)}
                            disabled={!canEditPayroll}
                            className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold hover:bg-slate-600 disabled:opacity-50"
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
              <p className="mt-3 text-xs text-blue-300">
                Reminder: pending adjustments will NOT affect payroll. Approve then click Generate.
              </p>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold">Employee Balance Monitor</h2>
              <p className="mt-1 text-sm text-slate-400">
Active balances are deducted through payroll only. Cancel here only when the balance link or amount is wrong; no hard delete is performed.
              </p>
            </div>

            <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-300">
              {employeesWithBalances} employee(s) • {formatMoney(activeBalanceTotal)}
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
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
                  <tr key={balance.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-black">{balance.employee_name}</td>
                    <td className="px-4 py-3">{balance.balance_type || "Carry Forward Balance"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getBalanceSourceStyle(balance)}`}>
                        {getBalanceSourceLabel(balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(balance.original_amount)}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-300">
                      {formatMoney(balance.remaining_balance)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={balance.status || "Active"} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">{balance.remarks || "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteEmployeeBalance(balance)}
                        disabled={!canEditPayroll || isSaving}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
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
          <section className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">
            <div className="mb-5 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold text-blue-400">
                  Employee Complete Audit
                </h2>
                <p className="text-sm text-slate-400">
                  {selectedAuditRecord.employee_name} • {selectedAuditRecord.department} • {selectedAuditRecord.position}
                </p>
              </div>

              <div className="rounded-full border border-blue-500/40 px-4 py-2 text-sm font-black text-blue-400">
                {auditLogs.filter((log) => log.isDeduction).length} deduction item/s
              </div>
            </div>

            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1400px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Checked</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Actual Attendance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Issue / Evidence</th>
                    <th className="px-4 py-3 text-right">Late Ded.</th>
                    <th className="px-4 py-3 text-right">UT Ded.</th>
                    <th className="px-4 py-3 text-right">Absent Ded.</th>
                    <th className="px-4 py-3 text-right">Total Ded.</th>
                  </tr>
                </thead>

                <tbody>
                  {auditLogs.map((log, index) => {
                    const key = getAuditKey(log, index);
                    const checked = checkedAuditItems.includes(key);

                    return (
                      <tr
                        key={index}
                        className={`border-t border-slate-800 ${
                          checked ? "bg-emerald-500/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleAuditCheck(key)}
                            className={`rounded-lg px-3 py-1 text-xs font-black ${
                              checked
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {checked ? "✓ Checked" : "Check"}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-bold">{log.date}</td>
                        <td className="px-4 py-3">{log.schedule}</td>
                        <td className="px-4 py-3">{log.actual}</td>
                        <td className="px-4 py-3">{log.status}</td>
                        <td className="px-4 py-3 text-slate-300">{log.issue}</td>
                        <td className="px-4 py-3 text-right text-red-400">{formatMoney(log.lateAmount)}</td>
                        <td className="px-4 py-3 text-right text-red-400">{formatMoney(log.undertimeAmount)}</td>
                        <td className="px-4 py-3 text-right text-red-400">{formatMoney(log.absentAmount)}</td>
                        <td className="px-4 py-3 text-right font-black text-red-400">{formatMoney(log.totalAmount)}</td>
                      </tr>
                    );
                  })}

                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                        No audit logs found for this employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!selectedPeriod?.needs_regeneration && selectedPayslip && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="payslip-no-print mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Professional Payslip Preview</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Print-safe A4 payslip with release status, deductions, and liability breakdown.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-yellow-300"
              >
                <Printer size={16} /> Print Payslip Only
              </button>
            </div>

            <div className="payslip-print-area">
              <div className="payslip-page bg-white p-8 text-slate-950">
                <div className="border-b-4 border-slate-900 pb-5">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <h1 className="text-2xl font-black tracking-wide">
                        VINCENT RESORT HOTEL
                      </h1>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Employee Payslip
                      </p>
                      <p className="mt-2 text-xs text-slate-600">
                        Payroll Period: <b>{selectedPayslip.period_label || selectedPeriod?.period_name}</b>
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-300 px-4 py-3 text-right text-xs">
                      <p className="font-black uppercase tracking-[0.18em] text-slate-500">
                        Payroll Status
                      </p>
                      <p className="mt-2 text-lg font-black text-slate-950">
                        {getPayslipReleaseStatus(selectedPayslip)}
                      </p>
                      <p className="mt-1 text-slate-500">
                        Generated: <b>{new Date().toLocaleDateString()}</b>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="payslip-avoid-break mt-6 grid grid-cols-1 gap-4 text-xs md:grid-cols-4">
                  <PayslipInfoBox label="Employee Name" value={selectedPayslip.employee_name || "-"} />
                  <PayslipInfoBox label="Employee No." value={selectedPayslip.employee_no || "-"} />
                  <PayslipInfoBox label="Department" value={selectedPayslip.department || "-"} />
                  <PayslipInfoBox label="Position" value={selectedPayslip.position || "-"} />
                </div>

                <div className="payslip-avoid-break mt-5 rounded-lg border border-slate-300">
                  <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 font-black uppercase tracking-[0.16em] text-slate-700">
                    Attendance Summary
                  </div>
                  <div className="grid grid-cols-6 gap-px bg-slate-300 text-center text-xs">
                    <div className="bg-white p-3"><p className="text-slate-500">Scheduled</p><b>{selectedPayslip.scheduled_days || 0}</b></div>
                    <div className="bg-white p-3"><p className="text-slate-500">Worked</p><b>{selectedPayslip.days_worked || 0}</b></div>
                    <div className="bg-white p-3"><p className="text-slate-500">RD/OFF</p><b>{selectedPayslip.rest_days || 0}</b></div>
                    <div className="bg-white p-3"><p className="text-slate-500">Absent</p><b>{selectedPayslip.absent_days || 0}</b></div>
                    <div className="bg-white p-3"><p className="text-slate-500">Late</p><b>{selectedPayslip.late_minutes || 0} min</b></div>
                    <div className="bg-white p-3"><p className="text-slate-500">Undertime</p><b>{selectedPayslip.undertime_minutes || 0} min</b></div>
                  </div>
                </div>

                <div className="payslip-avoid-break mt-6 rounded-lg border-2 border-slate-900">
                  <div className="grid grid-cols-4 divide-x divide-slate-900 text-center">
                    <div className="p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Net Pay</p>
                      <p className={`mt-2 text-2xl font-black ${getDisplayedNetPay(selectedPayslip) < 0 ? "text-red-700" : "text-slate-950"}`}>
                        {formatMoney(getDisplayedNetPay(selectedPayslip))}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Already Released</p>
                      <p className="mt-2 text-2xl font-black text-blue-700">
                        {formatMoney(getPayslipReleasedAmount(selectedPayslip))}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Release / Payable</p>
                      <p className="mt-2 text-2xl font-black text-emerald-700">
                        {formatMoney(getDisplayedReleaseAmount(selectedPayslip))}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Remaining Salary</p>
                      <p className="mt-2 text-2xl font-black text-yellow-700">
                        {formatMoney(getPayslipRemainingSalary(selectedPayslip))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="payslip-avoid-break mt-6 grid grid-cols-2 gap-6 text-xs">
                  <div className="rounded-lg border border-slate-300">
                    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 font-black uppercase tracking-[0.16em] text-slate-700">
                      Earnings
                    </div>
                    <table className="w-full">
                      <tbody>
                        <PayslipLine label="Basic Pay" value={formatMoney(selectedPayslip.basic_pay)} />
                        <PayslipLine label="Holiday Pay" value={formatMoney(selectedPayslip.holiday_pay)} />
                        <PayslipLine label="OT Pay" value={formatMoney(selectedPayslip.ot_pay)} />
                        <PayslipLine label="Allowance / Bonus" value={formatMoney(selectedPayslip.allowance)} />
                        <PayslipLine label="Gross Pay" value={formatMoney(selectedPayslip.gross_pay)} strong />
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-slate-300">
                    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 font-black uppercase tracking-[0.16em] text-slate-700">
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
                  <div className="payslip-avoid-break mt-6 rounded-lg border border-slate-300">
                    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 font-black uppercase tracking-[0.16em] text-slate-700">
                      Employee Liability Breakdown
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-white text-left text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Source / Remarks</th>
                          <th className="px-4 py-2 text-right">Available / Related Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPayslipLiabilityRows(selectedPayslip).map((item: any) => (
                          <tr key={item.id || item.source_id || item.adjustment_type} className="border-t border-slate-200">
                            <td className="px-4 py-2 font-bold text-slate-900">{item.adjustment_type || item.balance_type || "Employee Liability"}</td>
                            <td className="px-4 py-2 text-slate-600">{item.remarks || "Payroll-deductible employee balance"}</td>
                            <td className="px-4 py-2 text-right font-bold">{formatMoney(item.amount || item.remaining_balance || 0)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-900 font-black">
                          <td className="px-4 py-2" colSpan={2}>Deducted This Payroll</td>
                          <td className="px-4 py-2 text-right">{formatMoney(selectedPayslip?.balance_deduction)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {getDisplayedCarryForwardAmount(selectedPayslip) > 0 && (
                  <div className="payslip-avoid-break mt-4 rounded-lg border border-blue-600 bg-blue-50 p-4 text-xs text-blue-900">
                    <b>Carry Forward Notice:</b> Deductions exceeded available net pay. The unpaid amount will continue to the next payroll cutoff as employee balance.
                  </div>
                )}

                {getPayslipReleasedAmount(selectedPayslip) > 0 && getPayslipRemainingSalary(selectedPayslip) > 0 && (
                  <div className="payslip-avoid-break mt-4 rounded-lg border border-blue-600 bg-blue-50 p-4 text-xs text-blue-900">
                    <b>Partial Release Notice:</b> This payroll has already released {formatMoney(getPayslipReleasedAmount(selectedPayslip))}. Remaining salary balance is {formatMoney(getPayslipRemainingSalary(selectedPayslip))}.
                  </div>
                )}

                <div className="payslip-avoid-break mt-8 grid grid-cols-2 gap-10 text-xs">
                  <div><div className="mt-10 border-t border-slate-900 pt-2 text-center">Prepared / Checked By</div></div>
                  <div><div className="mt-10 border-t border-slate-900 pt-2 text-center">Employee Signature</div></div>
                </div>

                <p className="mt-8 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500">
                  {settings.payslip_footer || "This is a system-generated payslip."}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
      </div>
    </PageGuard>
  );
}



function PayslipInfoBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
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
    <tr className={`${strong ? "border-t-2 border-slate-900 font-black" : "border-b border-slate-200"}`}>
      <td className="px-4 py-2 text-slate-600">{label}</td>
      <td className="px-4 py-2 text-right font-bold">{value}</td>
    </tr>
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
    <div
      className={`rounded-xl border px-3 py-2 ${
        danger ? "border-red-500/20 bg-red-500/10" : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={
          danger
            ? "mt-1 text-lg font-black text-red-300"
            : "mt-1 text-lg font-black text-white"
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
        <div className="rounded-full bg-slate-800 p-3 text-blue-300">
          {icon}
        </div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "Draft");

  const style =
    normalized === "Active"
      ? "bg-blue-500/10 text-blue-300"
      : normalized === "Closed"
      ? "bg-green-500/10 text-green-400"
      : normalized === "Released" || normalized === "Paid"
      ? "bg-blue-500/10 text-blue-400"
      : normalized === "Approved" || normalized === "For Approval"
      ? "bg-green-500/10 text-green-400"
      : normalized === "Partially Approved"
      ? "bg-blue-500/10 text-blue-300"
      : normalized === "Reopened"
      ? "bg-orange-500/10 text-orange-400"
      : normalized === "Rejected"
      ? "bg-red-500/10 text-red-400"
      : "bg-slate-500/10 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
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