"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  DollarSign,
  Eye,
  Lock,
  RotateCcw,
  Search,
  X,
  Send,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { canAccessPage } from "@/app/lib/pageAccess";

export default function PayrollManagerPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<any[]>([]);
  const [employeeBalances, setEmployeeBalances] = useState<any[]>([]);
  const [payrollReleaseTransactions, setPayrollReleaseTransactions] = useState<
    any[]
  >([]);
  const [activeAuditRecord, setActiveAuditRecord] = useState<any | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const [releaseDrafts, setReleaseDrafts] = useState<Record<string, string>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<"queue" | "partial" | "history">(
    "queue",
  );
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  /// HELPERS
  const formatPeso = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const normalizeStatus = (value: any) => String(value || "").trim();

  const getCurrentCompanyId = () =>
    localStorage.getItem("opscore_current_company_id") ||
    localStorage.getItem("company_id") ||
    "";

  const getRecordCompanyId = (record: any) =>
    record?.company_id || record?.companyId || getCurrentCompanyId() || "";

  const getActualPayrollRecordId = (record: any) =>
    record.__payrollRecordId ||
    record.payroll_record_id ||
    record.source_id ||
    record.id;

  const getLinkedPayrollBalanceId = (record: any) =>
    record.__payrollBalanceId || null;

  const isPartialSalaryBalanceRecord = (record: any) =>
    record.__recordType === "PARTIAL_SALARY_BALANCE";

  const isActivePayrollBalanceRow = (balance: any) =>
    String(balance.status || "Active") === "Active" &&
    Number(balance.remaining_balance || 0) > 0 &&
    String(balance.balance_type || "")
      .toLowerCase()
      .includes("payroll balance");

  const getRowsFromTables = async (tableNames: string[]) => {
    for (const table of tableNames) {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && data) return data;
    }

    return [];
  };

  const getEmployeeName = (record: any) => {
    if (record.employee_name) return record.employee_name;

    const employee = employees.find(
      (emp) =>
        String(emp.id) === String(record.employee_id) ||
        String(emp.employee_no) === String(record.employee_no),
    );

    if (!employee) return "Unknown Employee";
    return `${employee.first_name} ${employee.last_name}`;
  };

  const getRecordAmount = (record: any) => {
    if (isPartialSalaryBalanceRecord(record)) {
      return Number(record.remaining_balance || record.net_pay || 0);
    }

    return Number(
      record.net_pay ||
        record.net_amount ||
        record.total_pay ||
        record.amount ||
        0,
    );
  };

  const getRecordGross = (record: any) => {
    if (isPartialSalaryBalanceRecord(record)) {
      return Number(record.original_amount || record.gross_pay || 0);
    }

    return Number(
      record.gross_pay || record.gross_amount || record.total_gross || 0,
    );
  };

  const getRecordDeduction = (record: any) => {
    if (isPartialSalaryBalanceRecord(record)) return 0;

    return Number(
      record.total_deductions ||
        record.deductions ||
        record.total_deduction ||
        0,
    );
  };

  const getAlreadyReleasedAmount = (record: any) => {
    if (isPartialSalaryBalanceRecord(record)) {
      return Number(record.previous_released_amount || 0);
    }

    return Number(record.paid_amount || record.amount_released || 0);
  };

  const hasNumericValue = (value: any) =>
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !Number.isNaN(Number(value));

  const getReleaseBaseAmount = (record: any) => {
    if (isPartialSalaryBalanceRecord(record)) {
      return Number(record.remaining_balance || 0);
    }

    // Source of truth for Payroll Manager release is the final computed net pay
    // from Payroll Register. release_amount can become stale after CA edits,
    // so prefer net_pay first, then fall back to release_amount for legacy rows.
    const base = Number(
      record.net_pay ??
        record.net_amount ??
        record.release_amount ??
        record.total_pay ??
        record.amount ??
        0,
    );

    return Math.max(base, 0);
  };

  const getOutstandingPayrollAmount = (record: any) => {
    if (isPartialSalaryBalanceRecord(record)) {
      return Math.max(Number(record.remaining_balance || 0), 0);
    }

    const baseAmount = getReleaseBaseAmount(record);
    const paidAmount = getAlreadyReleasedAmount(record);
    const status = normalizeStatus(record.status);
    const releaseStatus = normalizeStatus(record.release_status);
    const remainingAmount = hasNumericValue(record.remaining_amount)
      ? Number(record.remaining_amount)
      : null;
    const remainingPayrollBalance = hasNumericValue(
      record.remaining_payroll_balance,
    )
      ? Number(record.remaining_payroll_balance)
      : null;

    // Fresh records from Payroll Register may still have legacy/stale remaining_amount
    // from earlier Generate runs. Before any Manager release happens, the true due
    // amount is the final computed net pay from Register, not remaining_amount.
    if (
      paidAmount <= 0 &&
      ["Pending", "For Approval", "Approved"].includes(releaseStatus || status)
    ) {
      return baseAmount;
    }

    if (paidAmount > 0) {
      if (remainingAmount !== null) return Math.max(remainingAmount, 0);
      if (remainingPayrollBalance !== null)
        return Math.max(remainingPayrollBalance, 0);
      return Math.max(baseAmount - paidAmount, 0);
    }

    if (releaseStatus === "Released" || status === "Paid") return 0;

    if (remainingAmount !== null && remainingAmount > 0) return remainingAmount;
    if (remainingPayrollBalance !== null && remainingPayrollBalance > 0)
      return remainingPayrollBalance;

    return baseAmount;
  };

  const getReleaseAmount = (record: any) => getOutstandingPayrollAmount(record);

  const getReleaseDisplayStatus = (record: any) => {
    const outstanding = getOutstandingPayrollAmount(record);
    const paidAmount = getAlreadyReleasedAmount(record);
    const releaseStatus = normalizeStatus(record.release_status);
    const status = normalizeStatus(record.status);

    if (outstanding > 0 && paidAmount > 0) return "Partially Released";
    if (outstanding > 0) return releaseStatus || status || "Pending";
    if (
      paidAmount > 0 ||
      releaseStatus === "Released" ||
      status === "Released" ||
      status === "Paid"
    )
      return "Released";

    return releaseStatus || status || "Pending";
  };

  const getReleaseDraftAmount = (record: any) => {
    const outstanding = getOutstandingPayrollAmount(record);
    const rawValue = releaseDrafts[String(record.id)];

    if (rawValue === undefined || rawValue === "") return outstanding;

    return Math.min(Math.max(Number(rawValue || 0), 0), outstanding);
  };

  const getRemainingAfterRelease = (record: any) =>
    Math.max(
      getOutstandingPayrollAmount(record) - getReleaseDraftAmount(record),
      0,
    );

  const getCarryForwardAmount = (record: any) =>
    Math.max(Math.abs(Math.min(getRecordAmount(record), 0)), 0);

  const getPeriodLabel = (record: any) =>
    record.period_label ||
    record.payroll_period ||
    record.period_name ||
    record.__periodLabel ||
    "Payroll Period";

  const formatDateTime = (value: any) => {
    if (!value) return "-";
    return String(value).slice(0, 19).replace("T", " ");
  };

  const getReleaseTransactionsForRecord = (record: any) => {
    const actualRecordId = getActualPayrollRecordId(record);

    return payrollReleaseTransactions
      .filter(
        (item) =>
          String(item.payroll_record_id) === String(actualRecordId) ||
          String(item.payroll_record_id) === String(record.id),
      )
      .sort((a, b) =>
        String(b.created_at || b.released_at || "").localeCompare(
          String(a.created_at || a.released_at || ""),
        ),
      );
  };

  const getReleaseCountForRecord = (record: any) => {
    const transactions = getReleaseTransactionsForRecord(record);

    if (transactions.length > 0) return transactions.length;

    return getAlreadyReleasedAmount(record) > 0 ? 1 : 0;
  };

  const getLastReleaseDateForRecord = (record: any) => {
    const transactions = getReleaseTransactionsForRecord(record);
    const latestTransaction = transactions[0];

    return (
      latestTransaction?.released_at ||
      latestTransaction?.created_at ||
      record.released_at ||
      record.updated_at ||
      null
    );
  };

  const getReleaseHistoryHint = (record: any) => {
    const count = getReleaseCountForRecord(record);
    const lastReleaseDate = getLastReleaseDateForRecord(record);

    if (count <= 0) return "No previous release";

    const label = count === 1 ? "1 release" : `${count} releases`;
    const dateLabel = lastReleaseDate
      ? ` • ${formatDateTime(lastReleaseDate)}`
      : "";

    return `${label}${dateLabel}`;
  };

  const getAuditBalanceRowsForRecord = (record: any) => {
    const actualRecordId = getActualPayrollRecordId(record);
    const employeeId = record.employee_id ? String(record.employee_id) : "";
    const employeeName = getEmployeeName(record);

    return employeeBalances
      .filter((item) => {
        const status = String(item.status || "").toLowerCase();
        const sameEmployeeById =
          employeeId && String(item.employee_id || "") === employeeId;
        const sameEmployeeByName =
          employeeName && String(item.employee_name || "") === employeeName;
        const directlyLinked =
          String(item.source_id || "") === String(actualRecordId) ||
          String(item.remarks || "").includes(String(actualRecordId));

        if (status === "cancelled" || status === "canceled")
          return directlyLinked;

        return sameEmployeeById || sameEmployeeByName || directlyLinked;
      })
      .sort((a, b) => {
        const paidA = Math.max(
          Number(a.original_amount || 0) - Number(a.remaining_balance || 0),
          0,
        );
        const paidB = Math.max(
          Number(b.original_amount || 0) - Number(b.remaining_balance || 0),
          0,
        );

        if (paidB !== paidA) return paidB - paidA;

        return String(b.created_at || "").localeCompare(
          String(a.created_at || ""),
        );
      });
  };

  const getAuditCaAppliedAmount = (record: any) => {
    const ledgerPaidTotal = getAuditBalanceRowsForRecord(record).reduce(
      (sum, item) =>
        sum +
        Math.max(
          Number(item.original_amount || 0) -
            Number(item.remaining_balance || 0),
          0,
        ),
      0,
    );

    if (ledgerPaidTotal > 0) return ledgerPaidTotal;

    const transactionsTotal = getReleaseTransactionsForRecord(record).reduce(
      (sum, item) => {
        const match = String(item.remarks || "").match(
          /CA deduction applied:\s*₱?([\d,]+(?:\.\d+)?)/i,
        );
        return sum + (match ? Number(match[1].replaceAll(",", "")) : 0);
      },
      0,
    );

    if (transactionsTotal > 0) return transactionsTotal;

    return getPayrollBalanceDeductionAmount(record);
  };

  /// DATA LOADERS
  const loadData = async () => {
    const { data: employeesData } = await supabase
      .from("employees")
      .select("*");

    const records = await getRowsFromTables([
      "payroll_records",
      "payroll_register",
      "payroll_period_records",
    ]);

    const adjustments = await getRowsFromTables([
      "payroll_adjustments",
      "payroll_deductions",
      "employee_deductions",
      "cash_advances",
    ]);

    const balances = await getRowsFromTables(["employee_balances"]);

    const releaseTransactions = await getRowsFromTables([
      "payroll_release_transactions",
    ]);

    setEmployees(employeesData || []);
    setPayrollRecords(records || []);
    setPayrollAdjustments(adjustments || []);
    setEmployeeBalances(balances || []);
    setPayrollReleaseTransactions(releaseTransactions || []);
  };

  /// FUNCTIONS
  const createPayrollExpense = async (recordsToRelease: any[]) => {
    if (recordsToRelease.length === 0) return;

    const firstRecord = recordsToRelease[0];
    const periodLabel = getPeriodLabel(firstRecord);
    const totalNetPay = recordsToRelease.reduce(
      (sum, record) => sum + getReleaseDraftAmount(record),
      0,
    );

    const today = new Date().toISOString().slice(0, 10);
    const periodId = firstRecord?.period_id || "NO_PERIOD";
    const payload = {
      company_id: getRecordCompanyId(firstRecord),
      expense_date: today,
      category: "Payroll",
      subcategory: "Payroll Release",
      department: "Payroll",
      description: `Payroll Release - ${periodLabel}`,
      amount: totalNetPay,
      payment_method: "Payroll",
      remarks: `Auto Generated from Payroll Manager. Period ID: ${periodId}. Employees: ${recordsToRelease.length}. Updated: ${new Date().toISOString()}.`,
      source: "Payroll Release",
    };

    const { data: existingExpense } = await supabase
      .from("expenses")
      .select("id")
      .eq("source", "Payroll Release")
      .ilike("remarks", `%Period ID: ${periodId}%`)
      .maybeSingle();

    const { error } = existingExpense?.id
      ? await supabase
          .from("expenses")
          .update(payload)
          .eq("id", existingExpense.id)
      : await supabase.from("expenses").insert(payload);

    if (error) {
      console.log("CREATE/UPDATE PAYROLL EXPENSE ERROR:", error.message);
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Payroll Expense Failed",
        description: `Payroll released but expense entry failed for ${periodLabel}: ${error.message}`,
        severity: "critical",
        recordId: periodId,
        newValue: { payload, error: error.message },
      });
      alert(
        "Payroll released, but payroll expense entry failed. Check expenses table columns.",
      );
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: existingExpense?.id
        ? "Update Payroll Expense"
        : "Create Payroll Expense",
      description: `${existingExpense?.id ? "Updated" : "Created"} payroll release expense for ${periodLabel}: ${formatPeso(totalNetPay)}`,
      severity: "info",
      recordId: existingExpense?.id || periodId,
      newValue: payload,
    });
  };

  const createCarryForwardBalances = async (recordsToRelease: any[]) => {
    const negativeRecords = recordsToRelease.filter(
      (record) => getCarryForwardAmount(record) > 0,
    );

    if (negativeRecords.length === 0) return;

    const sourceIds = negativeRecords
      .map((record) => getActualPayrollRecordId(record))
      .filter(Boolean);

    const { data: existingBalances, error: existingError } = await supabase
      .from("employee_balances")
      .select("id, source_id, status")
      .eq("source_module", "Payroll Manager")
      .in("source_id", sourceIds);

    if (existingError) {
      console.log("CHECK EXISTING CARRY FORWARD ERROR:", existingError.message);
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Carry Forward Check Failed",
        description: `Carry-forward duplicate check failed: ${existingError.message}`,
        severity: "critical",
        newValue: { error: existingError.message, sourceIds },
      });
      alert("Payroll was released, but carry-forward duplicate check failed.");
      return;
    }

    const existingSourceIds = new Set(
      (existingBalances || []).map((item) => String(item.source_id)),
    );

    const balanceRows = negativeRecords
      .filter((record) => !existingSourceIds.has(String(record.id)))
      .map((record) => ({
        company_id: getRecordCompanyId(record),
        employee_id: record.employee_id || null,
        employee_name: getEmployeeName(record),
        balance_type: "Employee Balance Carry Forward",
        original_amount: getCarryForwardAmount(record),
        remaining_balance: getCarryForwardAmount(record),
        status: "Active",
        source_module: "Payroll Manager",
        source_id: getActualPayrollRecordId(record),
        period_id: record.period_id || null,
        remarks: `Auto carry forward from ${getPeriodLabel(record)}. Net pay was ${formatPeso(getRecordAmount(record))}. Payroll Record ID: ${getActualPayrollRecordId(record)}.`,
      }));

    if (balanceRows.length === 0) return;

    const { error } = await supabase
      .from("employee_balances")
      .insert(balanceRows);

    if (error) {
      console.log("CREATE CARRY FORWARD BALANCE ERROR:", error.message);
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Create Carry Forward Failed",
        description: `Payroll released but carry-forward balances failed: ${error.message}`,
        severity: "critical",
        newValue: { error: error.message, balanceRows },
      });
      alert(
        "Payroll was released, but carry-forward balance failed to save. Check employee_balances table columns.",
      );
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Create Carry Forward Balances",
      description: `${balanceRows.length} carry-forward balance(s) created from payroll release`,
      severity: "warning",
      newValue: { balanceRows },
    });
  };

  const createOrUpdatePayrollBalance = async (
    record: any,
    remainingBalance: number,
  ) => {
    const employeeName = getEmployeeName(record);
    const sourceId = getActualPayrollRecordId(record);
    const linkedPayrollBalanceId = getLinkedPayrollBalanceId(record);

    const existingQuery = linkedPayrollBalanceId
      ? supabase
          .from("employee_balances")
          .select("*")
          .eq("id", linkedPayrollBalanceId)
          .maybeSingle()
      : supabase
          .from("employee_balances")
          .select("*")
          .eq("source_module", "Payroll Manager")
          .eq("source_id", sourceId)
          .maybeSingle();

    const { data: existingBalance, error: existingError } = await existingQuery;

    if (existingError) {
      console.log("CHECK PAYROLL BALANCE ERROR:", existingError.message);
      throw new Error(existingError.message);
    }

    if (remainingBalance <= 0) {
      if (existingBalance?.id) {
        const { error } = await supabase
          .from("employee_balances")
          .update({
            remaining_balance: 0,
            status: "Paid",
            remarks:
              `${existingBalance.remarks || ""} Fully paid from Payroll Manager on ${new Date().toISOString()}.`.trim(),
          })
          .eq("id", existingBalance.id);

        if (error) throw new Error(error.message);
      }

      return;
    }

    const payload = {
      company_id: getRecordCompanyId(record),
      employee_id: record.employee_id || null,
      employee_name: employeeName,
      balance_type: "Payroll Balance",
      original_amount: Number(
        existingBalance?.original_amount ||
          record.original_amount ||
          record.net_pay ||
          record.release_amount ||
          getRecordAmount(record) ||
          0,
      ),
      remaining_balance: remainingBalance,
      status: "Active",
      source_module: "Payroll Manager",
      source_id: sourceId,
      period_id: record.period_id || null,
      remarks: `Partial salary release from ${getPeriodLabel(record)}. Payroll Record ID: ${sourceId}. Remaining salary balance: ${formatPeso(remainingBalance)}.`,
    };

    const { error } = existingBalance?.id
      ? await supabase
          .from("employee_balances")
          .update(payload)
          .eq("id", existingBalance.id)
      : await supabase.from("employee_balances").insert(payload);

    if (error) throw new Error(error.message);
  };

  const getPayrollBalanceDeductionAmount = (record: any) =>
    Math.max(
      0,
      Number(
        record.balance_deduction ??
          record.cash_advance_deduction ??
          record.ca_deduction ??
          record.balance_deductions ??
          0,
      ),
    );

  const getDeductionAppliedMarker = (record: any) =>
    `CA_DEDUCTION_APPLIED:${String(getActualPayrollRecordId(record))}`;

  const cashAdvanceAlreadyApplied = async (record: any) => {
    const marker = getDeductionAppliedMarker(record);
    const employeeId = record.employee_id ? String(record.employee_id) : "";
    const employeeName = getEmployeeName(record);

    // Source of truth for "already applied" is the employee_balances row itself.
    // Old transaction rows can exist even when the balance update failed, so we do
    // not trust payroll_release_transactions for this check.
    if (employeeId) {
      const byId = await supabase
        .from("employee_balances")
        .select("id, remarks")
        .eq("employee_id", employeeId)
        .ilike("remarks", `%${marker}%`)
        .limit(1);

      if (!byId.error && byId.data && byId.data.length > 0) return true;
    }

    if (employeeName) {
      const byName = await supabase
        .from("employee_balances")
        .select("id, remarks")
        .eq("employee_name", employeeName)
        .ilike("remarks", `%${marker}%`)
        .limit(1);

      if (!byName.error && byName.data && byName.data.length > 0) return true;
    }

    return false;
  };

  const loadDeductibleEmployeeBalances = async (record: any) => {
    const employeeId = record.employee_id ? String(record.employee_id) : "";
    const employeeName = getEmployeeName(record);

    let balances: any[] = [];

    if (employeeId) {
      const byId = await supabase
        .from("employee_balances")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("status", "Active")
        .gt("remaining_balance", 0)
        .order("created_at", { ascending: true });

      if (byId.error) {
        console.log("LOAD CA BALANCES BY ID ERROR:", byId.error.message);
        throw new Error(byId.error.message);
      }

      balances = byId.data || [];
    }

    if (balances.length === 0 && employeeName) {
      const byName = await supabase
        .from("employee_balances")
        .select("*")
        .eq("employee_name", employeeName)
        .eq("status", "Active")
        .gt("remaining_balance", 0)
        .order("created_at", { ascending: true });

      if (byName.error) {
        console.log("LOAD CA BALANCES BY NAME ERROR:", byName.error.message);
        throw new Error(byName.error.message);
      }

      balances = byName.data || [];
    }

    return balances.filter((balance: any) => {
      const type = String(balance.balance_type || "").toLowerCase();

      // Salary partial balances are handled by createOrUpdatePayrollBalance().
      // Everything else with Active remaining balance is an employee liability:
      // Cash Advance, Employee Meal Charge, Salary Loan, and prior Carry Forward.
      // Do NOT exclude source_module = Payroll Manager because carry-forward rows
      // are created from Payroll Manager and must be deductible in the next cutoff.
      if (type.includes("payroll balance")) return false;

      return true;
    });
  };

  const previewCashAdvanceApplications = async (recordsToRelease: any[]) => {
    const previews: Record<string, any> = {};

    for (const record of recordsToRelease) {
      const deductionNeeded = getPayrollBalanceDeductionAmount(record);

      if (deductionNeeded <= 0) continue;

      const alreadyApplied = await cashAdvanceAlreadyApplied(record);

      if (alreadyApplied) {
        previews[String(record.id)] = {
          skipped: true,
          appliedAmount: 0,
          reason: "CA deduction already applied for this payroll record.",
        };
        continue;
      }

      const balances = await loadDeductibleEmployeeBalances(record);
      const availableBalance = balances.reduce(
        (sum, balance) => sum + Number(balance.remaining_balance || 0),
        0,
      );

      if (availableBalance < deductionNeeded) {
        throw new Error(
          `${getEmployeeName(record)} has insufficient active CA balance. Needed: ${formatPeso(
            deductionNeeded,
          )}. Available: ${formatPeso(availableBalance)}.`,
        );
      }

      previews[String(record.id)] = {
        skipped: false,
        appliedAmount: deductionNeeded,
        balances,
      };
    }

    return previews;
  };

  const applyCashAdvanceDeductions = async (
    recordsToRelease: any[],
    caPreviews: Record<string, any>,
  ) => {
    const appliedMap: Record<string, number> = {};

    for (const record of recordsToRelease) {
      let remainingDeduction = getPayrollBalanceDeductionAmount(record);
      const preview = caPreviews[String(record.id)];

      if (remainingDeduction <= 0 || preview?.skipped) {
        appliedMap[String(record.id)] = 0;
        continue;
      }

      const employeeName = getEmployeeName(record);
      const balances =
        preview?.balances || (await loadDeductibleEmployeeBalances(record));

      for (const balance of balances) {
        if (remainingDeduction <= 0) break;

        const currentBalance = Number(balance.remaining_balance || 0);
        const appliedAmount = Math.min(currentBalance, remainingDeduction);
        const newRemainingBalance = Math.max(currentBalance - appliedAmount, 0);
        const newStatus = newRemainingBalance <= 0 ? "Paid" : "Active";

        const marker = getDeductionAppliedMarker(record);
        const updatedRemarks =
          `${balance.remarks || ""} | Payroll deduction applied from Manager: ${formatPeso(
            appliedAmount,
          )}. Remaining: ${formatPeso(newRemainingBalance)}. ${marker}.`.trim();

        // Keep the update payload limited to columns that are confirmed in your
        // employee_balances table screenshots. Extra columns here can silently
        // break the CA deduction flow depending on schema cache.
        const { error: updateError } = await supabase
          .from("employee_balances")
          .update({
            remaining_balance: newRemainingBalance,
            status: newStatus,
            remarks: updatedRemarks,
          })
          .eq("id", balance.id);

        if (updateError) {
          console.log("APPLY CA BALANCE ERROR:", updateError.message);
          throw new Error(updateError.message);
        }

        await createAuditLog({
          userName: "OPSCORE USER",
          module: "Payroll",
          action: "Apply CA Deduction From Manager",
          description: `${employeeName} CA deduction ${formatPeso(
            appliedAmount,
          )} applied from Payroll Manager. Remaining CA: ${formatPeso(
            newRemainingBalance,
          )}`,
          severity: "warning",
          recordId: balance.id,
          oldValue: balance,
          newValue: {
            payrollRecordId: getActualPayrollRecordId(record),
            periodId: record.period_id || null,
            appliedAmount,
            remaining_balance: newRemainingBalance,
            status: newStatus,
          },
        });

        appliedMap[String(record.id)] =
          Number(appliedMap[String(record.id)] || 0) + appliedAmount;

        remainingDeduction -= appliedAmount;
      }

      if (remainingDeduction > 0) {
        throw new Error(
          `${employeeName} CA deduction was not fully applied. Unapplied amount: ${formatPeso(
            remainingDeduction,
          )}.`,
        );
      }
    }

    return appliedMap;
  };

  const hasRecentPayrollReleaseDuplicate = async (transactionRows: any[]) => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    for (const row of transactionRows) {
      const { data, error } = await supabase
        .from("payroll_release_transactions")
        .select("id, created_at, released_at")
        .eq("payroll_record_id", row.payroll_record_id)
        .eq("release_amount", row.release_amount)
        .eq("released_by", row.released_by)
        .gte("created_at", oneMinuteAgo)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log("PAYROLL RELEASE DUPLICATE CHECK ERROR:", error.message);
        throw new Error(error.message);
      }

      if (data?.id) return true;
    }

    return false;
  };

  const savePayrollReleaseTransactions = async (
    recordsToRelease: any[],
    releasedBy: string,
    caAppliedMap: Record<string, number> = {},
  ) => {
    const transactionRows = recordsToRelease.map((record) => {
      const releaseAmount = getReleaseDraftAmount(record);
      const remainingBalance = getRemainingAfterRelease(record);
      const caApplied = Number(caAppliedMap[String(record.id)] || 0);
      const caMarker =
        caApplied > 0
          ? ` CA deduction applied: ${formatPeso(caApplied)}. ${getDeductionAppliedMarker(record)}.`
          : "";

      const companyId = getRecordCompanyId(record);

      if (!companyId) {
        throw new Error(
          "No company selected. Please login again before releasing payroll.",
        );
      }

      return {
        company_id: companyId,
        payroll_record_id: getActualPayrollRecordId(record),
        payroll_period_id: record.period_id || null,
        employee_id: record.employee_id || null,
        employee_name: getEmployeeName(record),
        net_pay: getRecordAmount(record),
        release_amount: releaseAmount,
        remaining_balance: remainingBalance,
        release_batch: getPeriodLabel(record),
        released_by: releasedBy,
        released_at: new Date().toISOString(),
        remarks:
          remainingBalance > 0
            ? `Partial salary release. Remaining balance: ${formatPeso(remainingBalance)}.${caMarker}`
            : `Full salary release.${caMarker}`,
      };
    });

    const duplicateReleaseExists =
      await hasRecentPayrollReleaseDuplicate(transactionRows);

    if (duplicateReleaseExists) {
      throw new Error(
        "Possible duplicate payroll release detected. Transaction was not saved again.",
      );
    }

    const { error } = await supabase
      .from("payroll_release_transactions")
      .insert(transactionRows);

    if (error) {
      console.log("SAVE PAYROLL RELEASE TRANSACTIONS ERROR:", error.message);
      throw new Error(error.message);
    }
  };

  const releasePayrollRecords = async (targetRecords: any[], label: string) => {
    if (processingRef.current || isProcessing) return;

    if (targetRecords.length === 0) {
      alert("No approved payroll records selected for release.");
      return;
    }

    if (pendingAdjustments.length > 0) {
      alert(
        `${pendingAdjustments.length} payroll adjustment(s) are still pending in Payroll Register. Approve/reject them in Register first, then regenerate payroll.`,
      );
      return;
    }

    const negativeRecords = targetRecords.filter(
      (record) => getRecordAmount(record) < 0,
    );

    const totalGross = targetRecords.reduce(
      (sum, record) => sum + getRecordGross(record),
      0,
    );

    const totalDeductions = targetRecords.reduce(
      (sum, record) => sum + getRecordDeduction(record),
      0,
    );

    const totalOutstanding = targetRecords.reduce(
      (sum, record) => sum + getOutstandingPayrollAmount(record),
      0,
    );

    const totalReleaseNow = targetRecords.reduce(
      (sum, record) => sum + getReleaseDraftAmount(record),
      0,
    );

    const totalRemainingSalaryBalance = targetRecords.reduce(
      (sum, record) => sum + getRemainingAfterRelease(record),
      0,
    );

    const totalCarryForward = targetRecords.reduce(
      (sum, record) => sum + getCarryForwardAmount(record),
      0,
    );

    const confirmed = confirm(
      `Release Payroll?

Mode: ${label}
Employees: ${targetRecords.length}
Gross Pay: ${formatPeso(totalGross)}
Deductions: ${formatPeso(totalDeductions)}
Outstanding Payroll: ${formatPeso(totalOutstanding)}
Release Now: ${formatPeso(totalReleaseNow)}
Remaining Salary Balance: ${formatPeso(totalRemainingSalaryBalance)}
Carry Forward: ${formatPeso(totalCarryForward)}

Employees with carry forward: ${negativeRecords.length}

This will record the actual released amount only. Any unpaid salary balance will remain outstanding.`,
    );

    if (!confirmed) return;

    const releasedBy =
      prompt("Released by:", "Payroll Admin") || "Payroll Admin";

    processingRef.current = true;
    setIsProcessing(true);

    const targetIds = targetRecords.map((record) =>
      getActualPayrollRecordId(record),
    );
    const periodIds = Array.from(
      new Set(targetRecords.map((record) => record.period_id).filter(Boolean)),
    );

    let caPreviews: Record<string, any> = {};
    let caAppliedMap: Record<string, number> = {};

    try {
      // Validate CA balances before touching payroll status. This prevents
      // "Partially Released" records when the CA balance cannot be found/applied.
      caPreviews = await previewCashAdvanceApplications(targetRecords);
    } catch (validationError: any) {
      setIsProcessing(false);
      processingRef.current = false;
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Payroll Release Validation Failed",
        description: `Release blocked before payroll status update: ${validationError?.message || validationError}`,
        severity: "critical",
        newValue: {
          error: validationError?.message || String(validationError),
          targetCount: targetRecords.length,
        },
      });
      alert(`Release blocked before saving payroll status.

${validationError?.message || validationError}`);
      return;
    }

    const statusResults = await Promise.all(
      targetRecords.map((record) => {
        const releaseNow = getReleaseDraftAmount(record);
        const previousReleased = getAlreadyReleasedAmount(record);
        const totalReleased = previousReleased + releaseNow;
        const remainingSalaryBalance = getRemainingAfterRelease(record);
        const newStatus =
          remainingSalaryBalance > 0 ? "Partially Released" : "Released";

        return supabase
          .from("payroll_records")
          .update({
            status: newStatus,
            release_status: newStatus,
            paid_amount: totalReleased,
            remaining_amount: remainingSalaryBalance,
            remaining_payroll_balance: remainingSalaryBalance,
            carry_forward_amount: getCarryForwardAmount(record),
            released_at: new Date().toISOString(),
            released_by: releasedBy.trim(),
          })
          .eq("id", getActualPayrollRecordId(record));
      }),
    );

    const failedStatusUpdate = statusResults.find(
      (result: any) => result.error,
    );

    if (failedStatusUpdate?.error) {
      setIsProcessing(false);
      processingRef.current = false;
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Payroll Status Update Failed",
        description: `Release blocked because payroll record update failed: ${failedStatusUpdate.error.message}`,
        severity: "critical",
        newValue: {
          error: failedStatusUpdate.error.message,
          targetCount: targetRecords.length,
        },
      });
      alert(`Payroll release failed before balance update.

${failedStatusUpdate.error.message}`);
      return;
    }

    try {
      caAppliedMap = await applyCashAdvanceDeductions(
        targetRecords,
        caPreviews,
      );
      await savePayrollReleaseTransactions(
        targetRecords,
        releasedBy.trim(),
        caAppliedMap,
      );
      await Promise.all(
        targetRecords.map((record) =>
          createOrUpdatePayrollBalance(
            record,
            getRemainingAfterRelease(record),
          ),
        ),
      );
    } catch (partialReleaseError: any) {
      setIsProcessing(false);
      processingRef.current = false;
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Partial Payroll Release Balance Failed",
        description: `Payroll status was updated but CA/salary balance tracking failed: ${partialReleaseError?.message || partialReleaseError}`,
        severity: "critical",
        newValue: {
          error: partialReleaseError?.message || String(partialReleaseError),
          targetCount: targetRecords.length,
        },
      });
      alert(`Payroll status was updated, but CA/salary balance tracking failed.

${partialReleaseError?.message || partialReleaseError}`);
      return;
    }

    await createCarryForwardBalances(targetRecords);

    for (const periodId of periodIds) {
      const periodRecords = targetRecords.filter(
        (record) => record.period_id === periodId,
      );

      await createPayrollExpense(periodRecords);

      const remainingApproved = payrollRecords.filter(
        (record) =>
          record.period_id === periodId &&
          !targetIds.includes(record.id) &&
          (getOutstandingPayrollAmount(record) > 0 ||
            getCarryForwardAmount(record) > 0),
      );

      const periodHasRemainingSalaryBalance = targetRecords.some(
        (record) =>
          record.period_id === periodId && getRemainingAfterRelease(record) > 0,
      );

      await supabase
        .from("payroll_periods")
        .update({
          status:
            remainingApproved.length > 0 || periodHasRemainingSalaryBalance
              ? "Partially Released"
              : "Released",
          released_at: new Date().toISOString(),
        })
        .eq("id", periodId);
    }

    setIsProcessing(false);
    processingRef.current = false;
    setSelectedRecordIds([]);
    await loadData();

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Release Payroll From Manager",
      description: `${targetRecords.length} payroll record(s) released from Payroll Manager (${label})`,
      severity: "warning",
      newValue: {
        label,
        recordCount: targetRecords.length,
        periodIds,
        totalGross,
        totalDeductions,
        totalReleaseNow,
        totalCarryForward,
        negativeEmployees: negativeRecords.length,
        targetIds,
      },
    });

    alert("Payroll released and expense entry created.");
  };

  const releasePayroll = async (mode: "selected" | "all") => {
    const sourceRows =
      activeTab === "partial" ? partialReleasePayroll : releaseQueuePayroll;

    const targetRecords =
      mode === "all"
        ? sourceRows
        : sourceRows.filter((record) =>
            selectedRecordIds.includes(String(record.id)),
          );

    await releasePayrollRecords(
      targetRecords,
      mode === "all" ? "Release All" : "Release Selected",
    );
  };

  const releaseSinglePayroll = async (record: any) => {
    await releasePayrollRecords([record], `Release ${getEmployeeName(record)}`);
  };

  const returnPayrollToRegister = async (record: any) => {
    const status = normalizeStatus(record.status);
    const releaseStatus = normalizeStatus(record.release_status);
    const alreadyReleased =
      status === "Released" ||
      status === "Paid" ||
      releaseStatus === "Released" ||
      releaseStatus === "Paid" ||
      getAlreadyReleasedAmount(record) > 0;

    if (alreadyReleased) {
      alert(
        "Released payroll cannot be returned to Register. Use next cutoff dispute/correction instead.",
      );
      return;
    }

    const reason = prompt(
      `Return ${getEmployeeName(record)} to Payroll Register?\n\nReason is required:`,
      "Payroll correction needed",
    );

    if (!reason || !reason.trim()) {
      alert("Return reason is required.");
      return;
    }

    const confirmed = confirm(
      `Return to Payroll Register?\n\nEmployee: ${getEmployeeName(record)}\nPeriod: ${getPeriodLabel(record)}\nReason: ${reason.trim()}\n\nThis will remove the record from Manager queue and make it editable again in Payroll Register.`,
    );

    if (!confirmed) return;

    setIsProcessing(true);

    const { error } = await supabase
      .from("payroll_records")
      .update({
        status: "Draft",
        release_status: "Returned",
        reopen_reason: reason.trim(),
        reopened_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (error) {
      setIsProcessing(false);
      processingRef.current = false;
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Return Payroll To Register Failed",
        description: `Failed to return payroll record to Register: ${error.message}`,
        severity: "critical",
        recordId: record.id,
        newValue: {
          error: error.message,
          recordId: record.id,
          reason: reason.trim(),
        },
      });
      alert(`Failed to return payroll to Register.\n\n${error.message}`);
      return;
    }

    if (record.period_id) {
      await supabase
        .from("payroll_periods")
        .update({
          status: "Needs Correction",
          needs_regeneration: true,
        })
        .eq("id", record.period_id);
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Return Payroll To Register",
      description: `${getEmployeeName(record)} was returned to Payroll Register for correction. Reason: ${reason.trim()}`,
      severity: "warning",
      recordId: record.id,
      oldValue: record,
      newValue: {
        status: "Draft",
        release_status: "Returned",
        reason: reason.trim(),
        periodId: record.period_id || null,
      },
    });

    setIsProcessing(false);
    processingRef.current = false;
    setSelectedRecordIds([]);
    await loadData();

    alert("Payroll returned to Register for correction.");
  };

  const reopenPayroll = async () => {
    const targetRecords = releasedPayroll.filter((record) =>
      selectedRecordIds.includes(String(record.id)),
    );

    if (targetRecords.length === 0) {
      alert("Select released payroll records to reopen.");
      return;
    }

    const reason = prompt("Reason for reopening released payroll?");
    if (!reason || !reason.trim()) {
      alert("Reopen reason is required.");
      return;
    }

    const confirmed = confirm(
      `Reopen ${targetRecords.length} released payroll record(s)?`,
    );

    if (!confirmed) return;

    setIsProcessing(true);

    const targetIds = targetRecords.map((record) =>
      getActualPayrollRecordId(record),
    );
    const periodIds = Array.from(
      new Set(targetRecords.map((record) => record.period_id).filter(Boolean)),
    );

    const { error } = await supabase
      .from("payroll_records")
      .update({
        status: "Draft",
        reopen_reason: reason.trim(),
        reopened_at: new Date().toISOString(),
      })
      .in("id", targetIds);

    if (error) {
      setIsProcessing(false);
      processingRef.current = false;
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Payroll",
        action: "Reopen Payroll Failed",
        description: `Failed to reopen released payroll: ${error.message}`,
        severity: "critical",
        newValue: {
          error: error.message,
          targetCount: targetRecords.length,
          targetIds,
        },
      });
      alert("Failed to reopen payroll.");
      return console.log("REOPEN PAYROLL ERROR:", error.message);
    }

    for (const periodId of periodIds) {
      await supabase
        .from("payroll_periods")
        .update({
          status: "Reopened",
          reopen_reason: reason.trim(),
          reopened_at: new Date().toISOString(),
          needs_regeneration: true,
        })
        .eq("id", periodId);
    }

    await supabase
      .from("employee_balances")
      .update({
        status: "Cancelled",
        remaining_balance: 0,
        cancelled_at: new Date().toISOString(),
        cancel_reason: `Payroll reopened: ${reason.trim()}`,
      })
      .eq("source_module", "Payroll Manager")
      .in("source_id", targetIds);

    setIsProcessing(false);
    processingRef.current = false;
    setSelectedRecordIds([]);
    await loadData();

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Payroll",
      action: "Reopen Released Payroll",
      description: `${targetRecords.length} released payroll record(s) reopened. Reason: ${reason.trim()}`,
      severity: "critical",
      newValue: {
        reason: reason.trim(),
        recordCount: targetRecords.length,
        periodIds,
        targetIds,
      },
    });

    alert("Payroll reopened. Review Payroll Register before release.");
  };

  /// EFFECTS
  useEffect(() => {
    const checkAccessAndLoad = async () => {
      const access = await canAccessPage("payroll_manager");

      if (!access.allowed) {
        setAccessMessage(access.reason || "Access denied.");
        setHasPageAccess(false);
        setCheckingAccess(false);
        return;
      }

      setHasPageAccess(true);
      setCheckingAccess(false);
      await loadData();
    };

    checkAccessAndLoad();
  }, []);

  /// CALCULATIONS
  const approvedPayroll = payrollRecords.filter((record) => {
    const status = normalizeStatus(record.status);
    const releaseStatus = normalizeStatus(record.release_status);
    const blockedStatuses = [
      "Draft",
      "Rejected",
      "Cancelled",
      "Reopened",
      "Released",
      "Paid",
      "Partially Released",
    ];
    const blockedReleaseStatuses = ["Released", "Paid", "Partially Released"];
    const outstandingPayroll = getOutstandingPayrollAmount(record);
    const carryForward = getCarryForwardAmount(record);

    if (blockedStatuses.includes(status)) return false;
    if (blockedReleaseStatuses.includes(releaseStatus)) return false;

    // Important:
    // Some payroll records have ₱0 release amount but still need Manager processing
    // because deductions created a negative net pay / carry-forward balance.
    // Example: Employee Meal Charge with no salary in the cutoff.
    // Once processed, status/release_status becomes Released and this row leaves queue.
    return outstandingPayroll > 0 || carryForward > 0;
  });

  const releasedPayroll = payrollRecords.filter((record) => {
    const status = normalizeStatus(record.status);
    const releaseStatus = normalizeStatus(record.release_status);

    return (
      status === "Released" ||
      status === "Paid" ||
      releaseStatus === "Released" ||
      releaseStatus === "Paid"
    );
  });

  const pendingAdjustments = payrollAdjustments.filter(
    (item) => normalizeStatus(item.status || "Pending") === "Pending",
  );

  const approvedAdjustments = payrollAdjustments.filter(
    (item) => normalizeStatus(item.status) === "Approved",
  );

  const rejectedAdjustments = payrollAdjustments.filter(
    (item) => normalizeStatus(item.status) === "Rejected",
  );

  const payrollRecordById = new Map(
    payrollRecords.map((record) => [String(record.id), record]),
  );

  const activePayrollBalanceRows = employeeBalances.filter(
    isActivePayrollBalanceRow,
  );

  const partialSalaryBalanceReleaseRows = activePayrollBalanceRows.map(
    (balance) => {
      const linkedRecord = payrollRecordById.get(
        String(balance.source_id || ""),
      );
      const previousReleasedAmount = Number(
        linkedRecord?.paid_amount || linkedRecord?.amount_released || 0,
      );
      const periodLabel =
        linkedRecord?.period_label ||
        linkedRecord?.payroll_period ||
        linkedRecord?.period_name ||
        balance.period_label ||
        "Payroll Balance";

      return {
        ...(linkedRecord || {}),
        id: `PAYROLL_BALANCE:${balance.id}`,
        __recordType: "PARTIAL_SALARY_BALANCE",
        __payrollBalanceId: balance.id,
        __payrollRecordId: balance.source_id || linkedRecord?.id || balance.id,
        __periodLabel: periodLabel,
        employee_id: balance.employee_id || linkedRecord?.employee_id || null,
        employee_name:
          balance.employee_name ||
          linkedRecord?.employee_name ||
          "Unknown Employee",
        department: linkedRecord?.department || balance.department || "",
        position: linkedRecord?.position || balance.position || "",
        period_id: balance.period_id || linkedRecord?.period_id || null,
        period_label: periodLabel,
        payroll_period: periodLabel,
        original_amount: Number(balance.original_amount || 0),
        remaining_balance: Number(balance.remaining_balance || 0),
        net_pay: Number(balance.remaining_balance || 0),
        gross_pay: Number(balance.original_amount || 0),
        total_deductions: 0,
        balance_deduction: 0,
        cash_advance_deduction: 0,
        ca_deduction: 0,
        balance_deductions: 0,
        paid_amount: previousReleasedAmount,
        previous_released_amount: previousReleasedAmount,
        release_status: "Partially Released",
        status: "Partially Released",
      };
    },
  );

  const periodOptions = Array.from(
    new Set(
      [
        ...approvedPayroll,
        ...partialSalaryBalanceReleaseRows,
        ...releasedPayroll,
      ]
        .map((record) => getPeriodLabel(record))
        .filter(Boolean),
    ),
  );

  const filteredApprovedPayroll = approvedPayroll.filter((record) => {
    const text =
      `${getEmployeeName(record)} ${record.department} ${record.position} ${getPeriodLabel(record)}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const periodMatch =
      periodFilter === "All" || getPeriodLabel(record) === periodFilter;

    return text && periodMatch;
  });

  const filteredPartialSalaryBalanceRows =
    partialSalaryBalanceReleaseRows.filter((record) => {
      const text =
        `${getEmployeeName(record)} ${record.department} ${record.position} ${getPeriodLabel(record)}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const periodMatch =
        periodFilter === "All" || getPeriodLabel(record) === periodFilter;

      return text && periodMatch;
    });

  const negativePayroll = filteredApprovedPayroll.filter(
    (record) => getRecordAmount(record) < 0,
  );

  const readyForRelease = filteredApprovedPayroll;

  const releasePipelineRows = [
    ...filteredApprovedPayroll,
    ...filteredPartialSalaryBalanceRows,
  ];

  const totalPendingNet = releasePipelineRows.reduce(
    (sum, record) => sum + getReleaseAmount(record),
    0,
  );

  const totalCarryForward = releasePipelineRows.reduce(
    (sum, record) => sum + getCarryForwardAmount(record),
    0,
  );

  const totalPendingGross = releasePipelineRows.reduce(
    (sum, record) => sum + getRecordGross(record),
    0,
  );

  const totalPendingDeductions = releasePipelineRows.reduce(
    (sum, record) => sum + getRecordDeduction(record),
    0,
  );

  const selectedRecords = [
    ...filteredApprovedPayroll,
    ...filteredPartialSalaryBalanceRows,
    ...releasedPayroll,
  ].filter((record) => selectedRecordIds.includes(String(record.id)));

  const selectedNet = selectedRecords.reduce(
    (sum, record) => sum + getReleaseAmount(record),
    0,
  );

  const selectedCarryForward = selectedRecords.reduce(
    (sum, record) => sum + getCarryForwardAmount(record),
    0,
  );

  const selectedNegative = selectedRecords.filter(
    (record) => getRecordAmount(record) < 0,
  );

  const filteredAdjustments = payrollAdjustments.filter((item) => {
    const employeeName = item.employee_name || getEmployeeName(item);
    return `${employeeName} ${item.type} ${item.category} ${item.adjustment_type} ${item.description} ${item.remarks} ${item.status}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  const totalApprovedAdjustmentAmount = approvedAdjustments.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  /// CALCULATIONS - PAYROLL SUMMARY / COMPARISON
  const getRecordOtPay = (record: any) =>
    Number(record.ot_pay || record.overtime_pay || record.ot_amount || 0);

  const getRecordHolidayPay = (record: any) =>
    Number(record.holiday_pay || record.holiday_amount || 0);

  const getRecordAllowance = (record: any) =>
    Number(
      record.allowance ||
        record.allowances ||
        record.bonus ||
        record.incentive ||
        0,
    );

  const getRecordLateDeduction = (record: any) =>
    Number(record.late_deduction || record.late_amount || 0);

  const getRecordUndertimeDeduction = (record: any) =>
    Number(record.undertime_deduction || record.undertime_amount || 0);

  const getRecordBalanceDeduction = (record: any) =>
    Number(record.balance_deduction || record.cash_advance_deduction || 0);

  const getRecordBasicPay = (record: any) => Number(record.basic_pay || 0);

  const getPeriodSortDate = (records: any[]) => {
    const dates = records
      .map((record) =>
        String(
          record.released_at ||
            record.snapshot_created_at ||
            record.created_at ||
            record.updated_at ||
            "",
        ).slice(0, 10),
      )
      .filter(Boolean)
      .sort();

    return dates[dates.length - 1] || "";
  };

  const summarizePayrollPeriod = (periodLabel: string, rows: any[]) => {
    const gross = rows.reduce((sum, record) => sum + getRecordGross(record), 0);
    const deductions = rows.reduce(
      (sum, record) => sum + getRecordDeduction(record),
      0,
    );
    const release = rows.reduce(
      (sum, record) => sum + getReleaseAmount(record),
      0,
    );
    const carryForward = rows.reduce(
      (sum, record) => sum + getCarryForwardAmount(record),
      0,
    );
    const ot = rows.reduce((sum, record) => sum + getRecordOtPay(record), 0);
    const holiday = rows.reduce(
      (sum, record) => sum + getRecordHolidayPay(record),
      0,
    );
    const allowance = rows.reduce(
      (sum, record) => sum + getRecordAllowance(record),
      0,
    );
    const late = rows.reduce(
      (sum, record) => sum + getRecordLateDeduction(record),
      0,
    );
    const undertime = rows.reduce(
      (sum, record) => sum + getRecordUndertimeDeduction(record),
      0,
    );
    const balanceDeduction = rows.reduce(
      (sum, record) => sum + getRecordBalanceDeduction(record),
      0,
    );
    const basicPay = rows.reduce(
      (sum, record) => sum + getRecordBasicPay(record),
      0,
    );

    return {
      periodLabel,
      rows,
      employees: new Set(
        rows.map((record) =>
          String(record.employee_id || record.employee_no || record.id),
        ),
      ).size,
      gross,
      deductions,
      release,
      carryForward,
      basicPay,
      ot,
      holiday,
      allowance,
      late,
      undertime,
      balanceDeduction,
      sortDate: getPeriodSortDate(rows),
    };
  };

  const payrollPeriodSummaries = Object.values(
    payrollRecords.reduce((acc: Record<string, any[]>, record) => {
      const label = getPeriodLabel(record);

      if (!acc[label]) acc[label] = [];
      acc[label].push(record);

      return acc;
    }, {}),
  )
    .map((rows: any[]) => summarizePayrollPeriod(getPeriodLabel(rows[0]), rows))
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  const currentPayrollSummary =
    payrollPeriodSummaries.find((item) => item.periodLabel === periodFilter) ||
    payrollPeriodSummaries[0] ||
    summarizePayrollPeriod("No payroll period", []);

  const previousPayrollSummary =
    payrollPeriodSummaries.find(
      (item) => item.periodLabel !== currentPayrollSummary.periodLabel,
    ) || summarizePayrollPeriod("No previous payroll", []);

  const payrollDifference =
    currentPayrollSummary.release - previousPayrollSummary.release;

  const payrollDifferencePercent =
    previousPayrollSummary.release > 0
      ? Math.round(
          (payrollDifference / previousPayrollSummary.release) * 1000,
        ) / 10
      : currentPayrollSummary.release > 0
        ? 100
        : 0;

  const payrollComparisonStatus =
    payrollDifference > 0
      ? `Increased by ${formatPeso(payrollDifference)} (${payrollDifferencePercent}%)`
      : payrollDifference < 0
        ? `Decreased by ${formatPeso(Math.abs(payrollDifference))} (${Math.abs(payrollDifferencePercent)}%)`
        : "No change";

  const payrollIncreaseDrivers = [
    {
      label: "Basic Pay",
      difference:
        currentPayrollSummary.basicPay - previousPayrollSummary.basicPay,
    },
    {
      label: "OT Pay",
      difference: currentPayrollSummary.ot - previousPayrollSummary.ot,
    },
    {
      label: "Holiday Pay",
      difference:
        currentPayrollSummary.holiday - previousPayrollSummary.holiday,
    },
    {
      label: "Allowances / Bonus",
      difference:
        currentPayrollSummary.allowance - previousPayrollSummary.allowance,
    },
    {
      label: "Cash Advance / Balances",
      difference:
        currentPayrollSummary.balanceDeduction -
        previousPayrollSummary.balanceDeduction,
    },
  ]
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, 4);

  const aiAlerts = [
    ...(pendingAdjustments.length > 0
      ? [
          `${pendingAdjustments.length} pending adjustment(s) still need Register approval before release.`,
        ]
      : []),
    ...(negativePayroll.length > 0
      ? [
          `${negativePayroll.length} employee(s) have negative net pay. They will release as ₱0 with carry-forward balance.`,
        ]
      : []),
    ...(readyForRelease.length > 0
      ? [`${readyForRelease.length} payroll record(s) ready for release.`]
      : []),
    ...(totalPendingNet > 0
      ? [`Approved payroll net amount: ${formatPeso(totalPendingNet)}.`]
      : []),
  ];

  const releaseActionRequired = pendingAdjustments.length > 0;

  const filteredReleasedPayroll = releasedPayroll.filter((record) => {
    const text =
      `${getEmployeeName(record)} ${record.department} ${record.position} ${getPeriodLabel(record)}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const periodMatch =
      periodFilter === "All" || getPeriodLabel(record) === periodFilter;

    return text && periodMatch;
  });

  const releaseQueuePayroll = filteredApprovedPayroll.filter(
    (record) =>
      getAlreadyReleasedAmount(record) <= 0 &&
      (getOutstandingPayrollAmount(record) > 0 ||
        getCarryForwardAmount(record) > 0),
  );

  const partialReleasePayroll = filteredPartialSalaryBalanceRows;

  const visibleReleaseRows =
    activeTab === "partial" ? partialReleasePayroll : releaseQueuePayroll;

  const tabRows =
    activeTab === "history" ? filteredReleasedPayroll : visibleReleaseRows;

  const totalReleasedHistory = filteredReleasedPayroll.reduce(
    (sum, record) =>
      sum +
      Number(
        record.paid_amount ||
          record.amount_released ||
          getReleaseBaseAmount(record) ||
          0,
      ),
    0,
  );

  const toggleSelect = (id: any) => {
    const key = String(id);
    setSelectedRecordIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

const selectAllReadyForRelease = () => {
      if (activeTab === "history") {
      setSelectedRecordIds(
        filteredReleasedPayroll.map((record) => String(record.id)),
      );
      return;
    }

    if (activeTab === "partial") {
      setSelectedRecordIds(
        partialReleasePayroll.map((record) => String(record.id)),
      );
      return;
    }

    setSelectedRecordIds(
      releaseQueuePayroll.map((record) => String(record.id)),
    );
  };

  const clearSelection = () => {
    setSelectedRecordIds([]);
  };

  const payrollHealthStatus = releaseActionRequired
    ? "Action Required"
    : releaseQueuePayroll.length > 0 || partialReleasePayroll.length > 0
      ? "Ready for Release"
      : "Controlled";

  const payrollHealthScore = Math.max(
    0,
    100 -
      (pendingAdjustments.length > 0 ? 30 : 0) -
      (negativePayroll.length > 0 ? 12 : 0) -
      (partialReleasePayroll.length > 0 ? 8 : 0),
  );

  const payrollBriefingPoints = [
    pendingAdjustments.length > 0
      ? `${pendingAdjustments.length} pending register approval(s) must be cleared before release.`
      : "No pending register approval is blocking payroll release.",
    releaseQueuePayroll.length > 0
      ? `${releaseQueuePayroll.length} payroll record(s) are ready for first release.`
      : "No first-time release queue is currently waiting.",
    partialReleasePayroll.length > 0
      ? `${partialReleasePayroll.length} partial salary balance(s) are still outstanding.`
      : "No partial salary balance pressure detected.",
    totalPendingNet > 0
      ? `${formatPeso(totalPendingNet)} outstanding payroll is visible in the release pipeline.`
      : "Outstanding payroll is currently clear for the selected view.",
  ];

  const recommendedPayrollAction = releaseActionRequired
    ? "Resolve pending Payroll Register approvals before releasing payroll."
    : releaseQueuePayroll.length > 0
      ? "Review the release queue and process approved payroll records."
      : partialReleasePayroll.length > 0
        ? "Review remaining partial salary balances and release when funded."
        : "Monitor payroll history and keep the release workflow controlled.";

  /// UI
  if (checkingAccess) {
    return (
      <div className="flex min-h-screen bg-[#07111f] text-white">
        <Sidebar />

        <main className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-300">
            Checking page access...
          </div>
        </main>
      </div>
    );
  }

  if (!hasPageAccess) {
    return (
      <div className="flex min-h-screen bg-[#07111f] text-white">
        <Sidebar />

        <main className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <Lock className="mx-auto text-red-300" size={36} />
            <h1 className="mt-4 text-2xl font-black text-red-200">
              Access Denied
            </h1>
            <p className="mt-2 text-sm text-red-100/80">{accessMessage}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#07111f] text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <section className="mb-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/20 lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
                  Operational Workbench
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-bold text-slate-300">
                  {currentPayrollSummary.periodLabel}
                </span>
                {releaseActionRequired && (
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-black text-red-300">
                    Register review required
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Payroll Manager
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Review payroll queues, release approved records, process partial salary balances, reopen verified corrections, and audit release history.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[520px]">
              <WorkbenchStat title="Ready" value={releaseQueuePayroll.length} danger={releaseQueuePayroll.length > 0} />
              <WorkbenchStat title="Partial" value={partialReleasePayroll.length} danger={partialReleasePayroll.length > 0} />
              <WorkbenchStat title="Selected" value={selectedRecordIds.length} />
              <WorkbenchStat title="Blocked" value={pendingAdjustments.length} danger={pendingAdjustments.length > 0} />
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-30 mb-4 rounded-3xl border border-slate-800 bg-[#07111f]/95 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[auto_minmax(280px,1fr)_260px_auto] 2xl:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => releasePayroll("selected")}
                disabled={isProcessing || selectedRecordIds.length === 0 || releaseActionRequired || activeTab === "history"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} /> Release Selected
              </button>

              <button
                onClick={() => releasePayroll("all")}
                disabled={isProcessing || releaseActionRequired || activeTab === "history" || visibleReleaseRows.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-black text-blue-200 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={16} /> Release All
              </button>

              <button
                onClick={selectAllReadyForRelease}
                disabled={tabRows.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Users size={16} /> Select Visible
              </button>

              {activeTab === "history" && (
                <button
                  onClick={reopenPayroll}
                  disabled={isProcessing || selectedRecordIds.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={16} /> Reopen
                </button>
              )}

              <button
                onClick={clearSelection}
                disabled={selectedRecordIds.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={16} /> Clear
              </button>
            </div>

            <div className="relative min-w-0">
              <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee, department, position, or payroll period..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-9 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500/50"
              />
            </div>

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-blue-500/50"
            >
              <option value="All">All Periods</option>
              {periodOptions.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Selected Amount
              </p>
              <p className="mt-0.5 font-black text-white">
                {formatPeso(selectedNet)}
              </p>
            </div>
          </div>
        </section>

        {pendingAdjustments.length > 0 && (
          <section className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-red-200">Release blocked by pending Register approval.</p>
                <p className="mt-1 text-red-100/75">
                  Resolve {pendingAdjustments.length} pending adjustment(s) in Payroll Register before releasing payroll.
                </p>
              </div>
              <Lock size={20} className="text-red-300" />
            </div>
          </section>
        )}

        <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-4 shadow-xl shadow-black/15">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setActiveTab("queue");
                    setSelectedRecordIds([]);
                  }}
                  className={
                    activeTab === "queue"
                      ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white"
                      : "rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  }
                >
                  Queue <span className="ml-2 text-xs opacity-75">{releaseQueuePayroll.length}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("partial");
                    setSelectedRecordIds([]);
                  }}
                  className={
                    activeTab === "partial"
                      ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white"
                      : "rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  }
                >
                  Partial <span className="ml-2 text-xs opacity-75">{partialReleasePayroll.length}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("history");
                    setSelectedRecordIds([]);
                  }}
                  className={
                    activeTab === "history"
                      ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white"
                      : "rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  }
                >
                  History <span className="ml-2 text-xs opacity-75">{filteredReleasedPayroll.length}</span>
                </button>
              </div>

              <div className="text-xs font-semibold text-slate-400">
                {activeTab === "queue"
                  ? "Approved payroll records ready for release."
                  : activeTab === "partial"
                    ? "Remaining salary balances from partial releases."
                    : "Released payroll records for audit and correction review."}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-4 shadow-xl shadow-black/15">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Workbench Status
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-slate-500">Outstanding</p>
                <p className="mt-1 font-black text-white">{formatPeso(totalPendingNet)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-slate-500">Released</p>
                <p className="mt-1 font-black text-white">{formatPeso(totalReleasedHistory)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-slate-500">Carry Forward</p>
                <p className="mt-1 font-black text-white">{formatPeso(totalCarryForward)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-slate-500">Status</p>
                <p className="mt-1 font-black text-white">{payrollHealthStatus}</p>
              </div>
            </div>
          </div>
        </section>

        {selectedRecordIds.length > 0 && (
          <section className="sticky top-3 z-40 mb-6 rounded-3xl border border-blue-300/20 bg-[#0B1220]/95 p-5 shadow-2xl shadow-blue-950/20 backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-black text-blue-200">
                  {selectedRecordIds.length} payroll record(s) selected
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {activeTab === "history"
                    ? "Released records are read-only. Use reopen only when there is a verified payroll correction."
                    : `Release Amount: ${formatPeso(selectedNet)} • Carry Forward: ${formatPeso(selectedCarryForward)}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={clearSelection}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Clear
                </button>

                {activeTab === "history" ? (
                  <button
                    onClick={reopenPayroll}
                    disabled={isProcessing}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2 text-sm font-black text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                  >
                    <RotateCcw size={16} /> Reopen Selected
                  </button>
                ) : (
                  <button
                    onClick={() => releasePayroll("selected")}
                    disabled={isProcessing || pendingAdjustments.length > 0}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    <Send size={16} /> Release Selected
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 rounded-3xl border border-blue-300/15 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {activeTab === "queue"
                  ? "Payroll Release Queue"
                  : activeTab === "partial"
                    ? "Partial Releases"
                    : "Released History"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {activeTab === "queue"
                  ? "Approved payroll records ready for first release."
                  : activeTab === "partial"
                    ? "Outstanding salary balances from previous partial releases."
                    : "Released payroll archive for audit review and verified corrections."}
              </p>
            </div>

            {activeTab !== "history" && (
              <button
                onClick={() => releasePayroll("selected")}
                disabled={
                  isProcessing ||
                  selectedRecordIds.length === 0 ||
                  releaseActionRequired
                }
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <Send size={16} /> Release Selected
              </button>
            )}
          </div>

          <div className="mt-5 max-h-[620px] overflow-auto rounded-2xl border border-slate-800">
            {activeTab === "history" ? (
              <table className="w-full min-w-[1250px] text-sm">
                <thead className="sticky top-0 bg-[#08111f] text-left text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Select</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-right">Released</th>
                    <th className="px-4 py-3">Released By</th>
                    <th className="px-4 py-3">Released At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReleasedPayroll.map((record) => (
                    <tr
                      key={record.id}
                      className="border-t border-slate-800/80 hover:bg-blue-500/5"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRecordIds.includes(
                            String(record.id),
                          )}
                          onChange={() => toggleSelect(record.id)}
                          className="h-4 w-4 accent-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black">{getEmployeeName(record)}</p>
                        <p className="text-xs text-slate-500">
                          {record.department || "-"} • {record.position || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{getPeriodLabel(record)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatPeso(getRecordGross(record))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {formatPeso(getRecordDeduction(record))}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-100">
                        {formatPeso(getRecordAmount(record))}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-100">
                        {formatPeso(
                          record.paid_amount ||
                            record.amount_released ||
                            getReleaseBaseAmount(record),
                        )}
                      </td>
                      <td className="px-4 py-3">{record.released_by || "-"}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {record.released_at
                          ? String(record.released_at)
                              .slice(0, 19)
                              .replace("T", " ")
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={getReleaseDisplayStatus(record)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setActiveAuditRecord(record)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 hover:bg-slate-800"
                        >
                          <Eye size={14} /> View Audit
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredReleasedPayroll.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No released payroll history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[1400px] text-sm">
                <thead className="sticky top-0 bg-[#08111f] text-left text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Select</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Computed Net</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-right">Release Now</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleReleaseRows.map((record) => (
                    <tr
                      key={record.id}
                      className={`border-t border-slate-800/80 hover:bg-blue-500/5 ${
                        getRecordAmount(record) < 0 ? "bg-red-500/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRecordIds.includes(
                            String(record.id),
                          )}
                          onChange={() => toggleSelect(record.id)}
                          className="h-4 w-4 accent-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black">{getEmployeeName(record)}</p>
                        <p className="text-xs text-slate-500">
                          {record.department || "-"} • {record.position || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{getPeriodLabel(record)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatPeso(getRecordGross(record))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {formatPeso(getRecordDeduction(record))}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-black ${getRecordAmount(record) < 0 ? "text-red-400" : "text-emerald-400"}`}
                      >
                        {formatPeso(getRecordAmount(record))}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-100">
                        {formatPeso(getOutstandingPayrollAmount(record))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max={getOutstandingPayrollAmount(record)}
                          value={
                            releaseDrafts[String(record.id)] ??
                            String(getOutstandingPayrollAmount(record))
                          }
                          onChange={(event) => {
                            const maxAmount =
                              getOutstandingPayrollAmount(record);
                            const requestedAmount = Math.max(
                              0,
                              Number(event.target.value || 0),
                            );
                            const safeAmount = Math.min(
                              requestedAmount,
                              maxAmount,
                            );

                            setReleaseDrafts((prev) => ({
                              ...prev,
                              [String(record.id)]: String(safeAmount),
                            }));
                          }}
                          className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right text-xs font-black text-slate-100 outline-none"
                        />
                        <p className="mt-1 text-right text-[10px] text-slate-500">
                          Max {formatPeso(getOutstandingPayrollAmount(record))}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-100">
                        {formatPeso(getRemainingAfterRelease(record))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={getReleaseDisplayStatus(record)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {getAlreadyReleasedAmount(record) > 0 && (
                            <div className="min-w-[170px] rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-right shadow-sm">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Previous Release
                              </p>
                              <p className="mt-1 text-sm font-black text-slate-100">
                                {formatPeso(getAlreadyReleasedAmount(record))}
                              </p>
                              <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">
                                {getReleaseHistoryHint(record)}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-col items-end gap-2">
                            {!isPartialSalaryBalanceRecord(record) && (
                              <button
                                onClick={() => returnPayrollToRegister(record)}
                                disabled={isProcessing}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                              >
                                Return
                              </button>
                            )}
                            <button
                              onClick={() => releaseSinglePayroll(record)}
                              disabled={isProcessing || releaseActionRequired}
                              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                              Release
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {visibleReleaseRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        {activeTab === "queue"
                          ? "No new approved payroll records waiting for release."
                          : "No partially released payroll records with remaining balance."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-blue-300/15 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Employee Balance Monitor</h2>
              <p className="mt-1 text-sm text-slate-400">
                Active employee balances only. Remaining salary and employee liabilities are shown in one clean ledger.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Active Balance Rows
              </p>
              <p className="mt-1 text-lg font-black text-slate-100">
                {
                  employeeBalances.filter(
                    (item) => String(item.status || "Active") === "Active",
                  ).length
                }
              </p>
            </div>
          </div>

          <div className="mt-5 max-h-[360px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950/40">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Balance Type</th>
                  <th className="px-4 py-3 text-right">Original</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Audit Remarks</th>
                </tr>
              </thead>

              <tbody>
                {employeeBalances
                  .filter(
                    (item) => String(item.status || "Active") === "Active",
                  )
                  .map((item) => {
                    const balanceType = String(item.balance_type || "Balance");
                    const remaining = Number(item.remaining_balance || 0);
                    const isPayrollBalance = balanceType
                      .toLowerCase()
                      .includes("payroll balance");

                    return (
                      <tr
                        key={item.id}
                        className="border-t border-slate-800/80 hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3 align-top">
                          <p className="font-bold text-slate-100">
                            {item.employee_name || "Unknown Employee"}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {item.employee_id ? `ID: ${item.employee_id}` : "No employee ID"}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              isPayrollBalance
                                ? "border-blue-500/20 bg-blue-500/5 text-blue-300"
                                : "border-slate-700 bg-slate-800/60 text-slate-300"
                            }`}
                          >
                            {balanceType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right align-top font-semibold text-slate-300">
                          {formatPeso(item.original_amount)}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <p className="font-black text-slate-100">
                            {formatPeso(remaining)}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusBadge status={item.status || "Active"} />
                        </td>
                        <td className="max-w-[520px] px-4 py-3 align-top text-slate-400">
                          <p className="line-clamp-2 leading-5">
                            {item.remarks || "-"}
                          </p>
                        </td>
                      </tr>
                    );
                  })}

                {employeeBalances.filter(
                  (item) => String(item.status || "Active") === "Active",
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No active employee balances.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-blue-300/15 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur lg:p-6">
          <h2 className="text-xl font-bold">Register Adjustment Status</h2>
          <p className="mt-1 text-sm text-slate-400">
            Read-only. Approve or reject adjustments in Payroll Register only.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <MiniStat
              title="Pending"
              value={pendingAdjustments.length}
              danger={pendingAdjustments.length > 0}
            />
            <MiniStat
              title="Approved"
              value={approvedAdjustments.length}
              success
            />
            <MiniStat title="Rejected" value={rejectedAdjustments.length} />
            <MiniStat
              title="Approved Amount"
              value={formatPeso(totalApprovedAdjustmentAmount)}
            />
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredAdjustments.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-800/80 hover:bg-blue-500/5"
                  >
                    <td className="px-4 py-3 font-bold">
                      {item.employee_name || getEmployeeName(item)}
                    </td>
                    <td className="px-4 py-3">
                      {item.adjustment_type ||
                        item.type ||
                        item.category ||
                        "Adjustment"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.description || item.remarks || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatPeso(item.amount || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status || "Pending"} />
                    </td>
                  </tr>
                ))}

                {filteredAdjustments.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No payroll adjustments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {activeAuditRecord && (
        <PayrollAuditModal
          record={activeAuditRecord}
          transactions={getReleaseTransactionsForRecord(activeAuditRecord)}
          balanceRows={getAuditBalanceRowsForRecord(activeAuditRecord)}
          employeeName={getEmployeeName(activeAuditRecord)}
          periodLabel={getPeriodLabel(activeAuditRecord)}
          formatPeso={formatPeso}
          formatDateTime={formatDateTime}
          getRecordGross={getRecordGross}
          getRecordDeduction={getRecordDeduction}
          getRecordAmount={getRecordAmount}
          getAlreadyReleasedAmount={getAlreadyReleasedAmount}
          getReleaseBaseAmount={getReleaseBaseAmount}
          getOutstandingPayrollAmount={getOutstandingPayrollAmount}
          getAuditCaAppliedAmount={getAuditCaAppliedAmount}
          getReleaseDisplayStatus={getReleaseDisplayStatus}
          onClose={() => setActiveAuditRecord(null)}
        />
      )}
    </div>
  );
}

function PayrollAuditModal({
  record,
  transactions,
  balanceRows,
  employeeName,
  periodLabel,
  formatPeso,
  formatDateTime,
  getRecordGross,
  getRecordDeduction,
  getRecordAmount,
  getAlreadyReleasedAmount,
  getReleaseBaseAmount,
  getOutstandingPayrollAmount,
  getAuditCaAppliedAmount,
  getReleaseDisplayStatus,
  onClose,
}: any) {
  const releasedAmount = Number(
    getAlreadyReleasedAmount(record) ||
      record.paid_amount ||
      record.amount_released ||
      getReleaseBaseAmount(record) ||
      0,
  );

  // Single source of truth for audit remaining salary.
  // Do not read remaining_amount / remaining_payroll_balance directly here because
  // old regenerated or manually tested rows can keep stale values.
  const remainingPayrollBalance = Number(getOutstandingPayrollAmount(record) || 0);
  const liabilityPaidTotal = Number(getAuditCaAppliedAmount(record) || 0);

  const liabilityRows = balanceRows.map((item: any) => {
    const original = Number(item.original_amount || 0);
    const remaining = Number(item.remaining_balance || 0);
    const paid = Math.max(original - remaining, 0);
    const progress = original > 0 ? Math.min((paid / original) * 100, 100) : 0;

    return {
      ...item,
      original,
      paid,
      remaining,
      progress,
    };
  });

  const totalLiabilityOriginal = liabilityRows.reduce(
    (sum: number, item: any) => sum + Number(item.original || 0),
    0,
  );
  const totalLiabilityPaid = liabilityRows.reduce(
    (sum: number, item: any) => sum + Number(item.paid || 0),
    0,
  );
  const totalLiabilityRemaining = liabilityRows.reduce(
    (sum: number, item: any) => sum + Number(item.remaining || 0),
    0,
  );

  const lastTransaction = transactions[0] || null;
  const releaseType =
    remainingPayrollBalance > 0
      ? "Partial Release"
      : releasedAmount > 0
        ? "Full Release"
        : "No Release Recorded";

  const releaseStatus = getReleaseDisplayStatus(record);

  const timelineRows = [
    {
      label: "Generated",
      value: record.snapshot_created_at || record.generated_at || record.created_at,
    },
    { label: "Approved", value: record.approved_at || record.reviewed_at },
    {
      label: "Last Released",
      value: lastTransaction?.released_at || lastTransaction?.created_at || record.released_at,
    },
    { label: "Reopened", value: record.reopened_at },
  ].filter((item) => item.value);

  const summaryCards = [
    {
      title: "Released Salary",
      value: formatPeso(releasedAmount),
      helper: "Actual amount released to employee",
      tone: "success",
    },
    {
      title: "CA / Loan Paid",
      value: formatPeso(liabilityPaidTotal),
      helper: "Applied from employee balance ledger",
      tone: liabilityPaidTotal > 0 ? "warning" : "default",
    },
    {
      title: "Remaining CA / Loan",
      value: formatPeso(totalLiabilityRemaining),
      helper: "Open employee liability balance",
      tone: totalLiabilityRemaining > 0 ? "warning" : "success",
    },
    {
      title: "Payroll Balance",
      value: formatPeso(remainingPayrollBalance),
      helper: "Unpaid salary after release",
      tone: remainingPayrollBalance > 0 ? "danger" : "success",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="border-b border-slate-800 bg-slate-900/90 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                Payroll Release Audit
              </p>
              <h2 className="mt-2 truncate text-2xl font-black text-white sm:text-3xl">
                {employeeName}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span>{periodLabel}</span>
                <span className="text-slate-600">•</span>
                <StatusBadge status={releaseStatus} />
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-black text-slate-300">
                  {releaseType}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-300 hover:bg-slate-800"
              title="Close audit modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-128px)] overflow-auto p-5 sm:p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <AuditSummaryCard key={card.title} {...card} />
            ))}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-blue-300/15 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur xl:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">
                    Executive Payroll Summary
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Frontend-only audit view. Figures below come from released payroll,
                    release transactions, and employee balance ledger rows.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <AuditLine label="Department" value={record.department || "-"} />
                <AuditLine label="Position" value={record.position || "-"} />
                <AuditLine label="Gross Pay" value={formatPeso(getRecordGross(record))} />
                <AuditLine
                  label="Total Deductions"
                  value={formatPeso(getRecordDeduction(record))}
                  danger
                />
                <AuditLine
                  label="Computed Net Pay"
                  value={formatPeso(getRecordAmount(record))}
                  success
                />
                <AuditLine
                  label="Released Salary"
                  value={formatPeso(releasedAmount)}
                  success
                />
                <AuditLine
                  label="Released By"
                  value={lastTransaction?.released_by || record.released_by || "-"}
                />
                <AuditLine
                  label="Last Release Date"
                  value={formatDateTime(
                    lastTransaction?.released_at ||
                      lastTransaction?.created_at ||
                      record.released_at,
                  )}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-blue-300/15 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur">
              <h3 className="text-lg font-black text-white">Audit Timeline</h3>
              <div className="mt-4 space-y-3">
                {timelineRows.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 font-bold text-slate-200">
                      {formatDateTime(item.value)}
                    </p>
                  </div>
                ))}

                {timelineRows.length === 0 && (
                  <p className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-center text-sm text-slate-500">
                    No timeline dates saved on this payroll record.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-blue-300/15 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-black text-white">
                  Release Transaction History
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Every saved release transaction connected to this payroll record.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/70">
                  Transactions
                </p>
                <p className="text-xl font-black text-emerald-300">
                  {transactions.length}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Released By</th>
                    <th className="px-4 py-3 text-right">Net Pay</th>
                    <th className="px-4 py-3 text-right">Released</th>
                    <th className="px-4 py-3 text-right">Remaining Payroll</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item: any) => (
                    <tr key={item.id} className="border-t border-slate-800/80 hover:bg-blue-500/5">
                      <td className="px-4 py-3 font-bold text-slate-200">
                        {formatDateTime(item.released_at || item.created_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.released_by || "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {formatPeso(item.net_pay)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-100">
                        {formatPeso(item.release_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-100">
                        {formatPeso(item.remaining_balance)}
                      </td>
                      <td className="max-w-md px-4 py-3 text-slate-400">
                        {item.remarks || "-"}
                      </td>
                    </tr>
                  ))}

                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        No release transaction row found. Showing payroll record audit only.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-black text-blue-100">
                  Employee Balance Ledger Audit
                </h3>
                <p className="mt-1 text-sm text-blue-100/70">
                  Shows CA, salary loan, meal charge, carry-forward, and payroll balance rows linked to this employee or payroll record.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-right text-xs">
                <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                  <p className="text-slate-500">Original</p>
                  <p className="font-black text-white">
                    {formatPeso(totalLiabilityOriginal)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <p className="text-emerald-200/70">Paid</p>
                  <p className="font-black text-emerald-300">
                    {formatPeso(totalLiabilityPaid)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                  <p className="text-slate-400">Remaining</p>
                  <p className="font-black text-amber-300">
                    {formatPeso(totalLiabilityRemaining)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Balance Type</th>
                    <th className="px-4 py-3 text-right">Original</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {liabilityRows.map((item: any) => (
                    <tr key={item.id} className="border-t border-slate-800/80 hover:bg-blue-500/5">
                      <td className="px-4 py-3 font-bold text-white">
                        {item.balance_type || "Balance"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {formatPeso(item.original)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-100">
                        {formatPeso(item.paid)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-100">
                        {formatPeso(item.remaining)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[180px] items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${Math.round(item.progress)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs font-black text-emerald-300">
                            {item.progress.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status || "-"} />
                      </td>
                      <td className="max-w-md px-4 py-3 text-slate-400">
                        {item.remarks || "-"}
                      </td>
                    </tr>
                  ))}

                  {liabilityRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        No employee balance ledger rows found for this employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {record.reopen_reason && (
            <section className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
              <h3 className="text-lg font-black text-red-300">Reopen History</h3>
              <p className="mt-2 text-sm text-red-100">{record.reopen_reason}</p>
              <p className="mt-1 text-xs text-red-200/80">
                Reopened At: {formatDateTime(record.reopened_at)}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditSummaryCard({ title, value, helper, tone = "default" }: any) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : tone === "warning"
        ? "border-amber-500/15 bg-amber-500/5 text-amber-300"
        : tone === "danger"
          ? "border-red-500/20 bg-red-500/10 text-red-300"
          : "border-slate-800 bg-slate-900 text-white";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-75">
        {title}
      </p>
      <h3 className="mt-3 text-2xl font-black">{value}</h3>
      <p className="mt-2 text-xs opacity-75">{helper}</p>
    </div>
  );
}

function AuditLine({ label, value, success, danger }: any) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span
        className={`text-right font-black ${
          danger ? "text-red-400" : success ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PayrollComparisonCard({ title, period, rows }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{period}</p>

      <div className="mt-4 space-y-2">
        {rows.map(([label, value]: any[]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm"
          >
            <span className="text-slate-400">{label}</span>
            <span className="font-black text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


function WorkbenchStat({ title, value, danger }: any) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        danger
          ? "border-red-500/25 bg-red-500/10"
          : "border-slate-800 bg-slate-950"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <p className={danger ? "mt-1 text-2xl font-black text-red-300" : "mt-1 text-2xl font-black text-white"}>
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
  const cardStyle = danger
    ? "border-blue-300/20 bg-white/[0.045]"
    : success
      ? "border-blue-300/20 bg-white/[0.045]"
      : "border-blue-300/15 bg-white/[0.035]";

  const iconStyle = danger
    ? "bg-blue-500/10 text-blue-200"
    : success
      ? "bg-blue-500/10 text-blue-200"
      : "bg-slate-950/80 text-blue-100";

  return (
    <div className={`rounded-3xl border p-5 shadow-xl shadow-black/15 backdrop-blur ${cardStyle}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${iconStyle}`}>{icon}</div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          {title}
        </p>
      </div>
      <h2 className="text-2xl font-black text-white">{value}</h2>
    </div>
  );
}

function MiniStat({ title, value, success, danger }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <h3
        className={`mt-1 text-2xl font-black ${
          danger ? "text-red-400" : success ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </h3>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "");

  const style =
    normalized === "Released" || normalized === "Paid" || normalized === "Closed"
      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
      : normalized === "Rejected" || normalized === "Cancelled" || normalized === "Canceled"
        ? "border-red-500/20 bg-red-500/5 text-red-300"
        : normalized === "Partially Released"
          ? "border-amber-500/20 bg-amber-500/5 text-amber-300"
          : normalized === "Approved" || normalized === "For Approval" || normalized === "Active"
            ? "border-blue-500/20 bg-blue-500/5 text-blue-300"
            : "border-slate-700 bg-slate-800/60 text-slate-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
      {normalized || "Pending"}
    </span>
  );
}
