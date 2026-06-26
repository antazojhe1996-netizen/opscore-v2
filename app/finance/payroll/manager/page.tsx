"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Lock, Search, Send, Users, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";
import { createAuditLog } from "@/lib/audit";
import { canAccessPage } from "@/lib/pageAccess";

type ManagerTab = "review" | "locked" | "released" | "returned";
type RecordStatus = "DRAFT" | "REGISTERED" | "MANAGER_REVIEW" | "RETURNED_FOR_CORRECTION" | "LOCKED" | "PARTIALLY_RELEASED" | "RELEASED";

const STATUS = {
  DRAFT: "DRAFT",
  REGISTERED: "REGISTERED",
  MANAGER_REVIEW: "MANAGER_REVIEW",
  RETURNED_FOR_CORRECTION: "RETURNED_FOR_CORRECTION",
  LOCKED: "LOCKED",
  PARTIALLY_RELEASED: "PARTIALLY_RELEASED",
  RELEASED: "RELEASED",
} as const;

const shellCard = "rounded-[28px] border border-slate-200 bg-white shadow-sm";
const metricCard = "rounded-3xl border border-slate-200 bg-slate-50/70 p-4";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#07111f] px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#0b1d35] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const dangerButton = "inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export default function PayrollManagerPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<ManagerTab>("review");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showPartialReleaseModal, setShowPartialReleaseModal] = useState(false);
  const [partialReleaseRecord, setPartialReleaseRecord] = useState<any | null>(null);
  const [partialReleaseAmount, setPartialReleaseAmount] = useState("");
  const [partialReleaseMethod, setPartialReleaseMethod] = useState("Cash");
  const [partialReleaseRemarks, setPartialReleaseRemarks] = useState("");
  const [showReopenPaymentModal, setShowReopenPaymentModal] = useState(false);
  const [reopenPaymentRecord, setReopenPaymentRecord] = useState<any | null>(null);
  const [actualPaidAmount, setActualPaidAmount] = useState("");
  const [reopenPaymentReason, setReopenPaymentReason] = useState("");
  const [showBatchReopenModal, setShowBatchReopenModal] = useState(false);
  const [batchReopenReason, setBatchReopenReason] = useState("");
  const processingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (activeTab === "returned") {
      setSelectedRecordIds([]);
    }
  }, [activeTab]);

  const formatPeso = (value: any) =>
    `â‚±${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getCurrentCompanyId = () => {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("opscore_current_company_id") ||
      localStorage.getItem("opscore_company_id") ||
      localStorage.getItem("company_id") ||
      ""
    );
  };

  const getRecordStatus = (record: any): RecordStatus => {
    const explicit = String(record?.record_status || "").trim().toUpperCase();
    const legacyStatus = String(record?.status || "").trim().toUpperCase();
    const releaseStatus = String(record?.release_status || "").trim().toUpperCase();
    const paidAmount = Number(record?.paid_amount || record?.released_amount || 0);
    const remainingAmount = Number(record?.remaining_amount ?? record?.remaining_payroll_balance ?? 0);

    // DB constraint may not allow PARTIALLY_RELEASED in record_status yet.
    // Treat partial release as a release_status/payment-state overlay while keeping record_status as LOCKED.
    if (legacyStatus === "PARTIALLY_RELEASED" || legacyStatus === "PARTIALLY RELEASED") return STATUS.PARTIALLY_RELEASED;
    if (releaseStatus === "PARTIALLY_RELEASED" || releaseStatus === "PARTIALLY RELEASED") return STATUS.PARTIALLY_RELEASED;
    if (paidAmount > 0 && remainingAmount > 0) return STATUS.PARTIALLY_RELEASED;

    if (Object.values(STATUS).includes(explicit as RecordStatus)) return explicit as RecordStatus;

    if (legacyStatus === STATUS.RETURNED_FOR_CORRECTION) return STATUS.RETURNED_FOR_CORRECTION;
    if (["FOR APPROVAL", "APPROVED", "REGISTERED", "MANAGER REVIEW"].includes(legacyStatus)) return STATUS.MANAGER_REVIEW;
    if (legacyStatus === "LOCKED" || releaseStatus === "LOCKED") return STATUS.LOCKED;
    if (["RELEASED", "PAID"].includes(legacyStatus)) return STATUS.RELEASED;
    if (["RELEASED", "PAID"].includes(releaseStatus) || record?.released_at) return STATUS.RELEASED;
    return STATUS.DRAFT;
  };

  const getStatusLabel = (record: any) => getRecordStatus(record).replace(/_/g, " ");
  const getStatusClass = (status: RecordStatus) => {
    if (status === STATUS.MANAGER_REVIEW) return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === STATUS.RETURNED_FOR_CORRECTION) return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === STATUS.LOCKED) return "border-indigo-200 bg-indigo-50 text-indigo-700";
    if (status === STATUS.PARTIALLY_RELEASED) return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === STATUS.RELEASED) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  const getEmployeeName = (record: any) => record.employee_name || "Unknown Employee";
  const getRecordGross = (record: any) => Number(record.gross_pay || record.gross_amount || 0);
  const getRecordDeduction = (record: any) => Number(record.total_deductions || record.deductions || record.total_deduction || 0);
  const getRecordNet = (record: any) => Number(record.net_pay ?? record.net_amount ?? record.release_amount ?? 0);
  const getTotalReleasedAmount = (record: any) =>
    Number(record.paid_amount || record.released_amount || 0);

  const getRemainingPayrollAmount = (record: any) => {
    const savedRemaining = Number(
      record.remaining_amount ?? record.remaining_payroll_balance ?? 0,
    );

    if (savedRemaining > 0) return savedRemaining;

    const netPay = Math.max(getRecordNet(record), 0);
    const paidAmount = getTotalReleasedAmount(record);

    return Math.max(netPay - paidAmount, 0);
  };

  const getReleaseAmount = (record: any) => getRemainingPayrollAmount(record);
  const getCarryForwardAmount = (record: any) => Math.max(Math.abs(Math.min(getRecordNet(record), 0)), 0);
  const getPeriodLabel = (record: any) => record.period_label || record.period_name || record.payroll_period || "Payroll Period";

  const loadData = async () => {
    setLoadError("");
    const companyId = getCurrentCompanyId();

    try {
      let periodQuery = supabase.from("payroll_periods").select("*").order("created_at", { ascending: false });
      if (companyId) periodQuery = periodQuery.eq("company_id", companyId);
      const { data: periodData, error: periodError } = await periodQuery;
      if (periodError) throw new Error(periodError.message);

      const periodRows = periodData || [];
      const periodById = new Map(periodRows.map((period: any) => [String(period.id), period]));

      let recordQuery = supabase.from("payroll_records").select("*").order("employee_name", { ascending: true });
      if (companyId) recordQuery = recordQuery.eq("company_id", companyId);
      const { data: recordData, error: recordError } = await recordQuery;
      if (recordError) throw new Error(recordError.message);

      const mappedRecords = (recordData || [])
        .map((record: any) => {
          const period: any = periodById.get(String(record.period_id)) || {};
          return {
            ...record,
            period_name: period.period_name || record.period_name || record.period_label || "Payroll Period",
            period_label: period.period_name || record.period_label || "Payroll Period",
            period_status: String(period.status || record.period_status || "").toUpperCase(),
            period_start_date: period.start_date || null,
            period_end_date: period.end_date || null,
            attendance_locked: Boolean(period.attendance_locked),
            needs_regeneration: Boolean(period.needs_regeneration),
          };
        })
        .filter((record: any) =>
          [STATUS.MANAGER_REVIEW, STATUS.RETURNED_FOR_CORRECTION, STATUS.LOCKED, STATUS.PARTIALLY_RELEASED, STATUS.RELEASED].includes(getRecordStatus(record) as any),
        );

      setRecords(mappedRecords);
    } catch (error: any) {
      console.log("LOAD PAYROLL MANAGER ERROR:", error?.message || error);
      setLoadError(error?.message || String(error));
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const access = await canAccessPage("payroll_manager");
        if (!access.allowed) {
          setAccessMessage(access.reason || "Access denied.");
          setHasPageAccess(false);
          return;
        }
        setHasPageAccess(true);
        await loadData();
      } catch (error: any) {
        setAccessMessage(error?.message || "Payroll Manager access check failed.");
        setHasPageAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };
    initialize();
  }, []);

  const managerReviewRows = useMemo(() => records.filter((record) => getRecordStatus(record) === STATUS.MANAGER_REVIEW), [records]);
  const lockedRows = useMemo(() => records.filter((record) => [STATUS.LOCKED, STATUS.PARTIALLY_RELEASED].includes(getRecordStatus(record) as any)), [records]);
  const releasedRows = useMemo(() => records.filter((record) => getRecordStatus(record) === STATUS.RELEASED), [records]);
  const returnedRows = useMemo(() => records.filter((record) => getRecordStatus(record) === STATUS.RETURNED_FOR_CORRECTION), [records]);

  const periodOptions = useMemo(() => Array.from(new Set(records.map((record) => getPeriodLabel(record)).filter(Boolean))), [records]);

  const rowsForActiveTab = useMemo(() => {
    if (activeTab === "locked") return lockedRows;
    if (activeTab === "released") return releasedRows;
    if (activeTab === "returned") return returnedRows;
    return managerReviewRows;
  }, [activeTab, lockedRows, releasedRows, returnedRows, managerReviewRows]);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return rowsForActiveTab.filter((record) => {
      const periodMatch = periodFilter === "All" || getPeriodLabel(record) === periodFilter;
      const text = `${getEmployeeName(record)} ${record.employee_no || ""} ${record.department || ""} ${record.position || ""} ${getPeriodLabel(record)} ${getStatusLabel(record)}`.toLowerCase();
      return periodMatch && (!search || text.includes(search));
    });
  }, [rowsForActiveTab, searchTerm, periodFilter]);

  const totals = useMemo(() => filteredRows.reduce((acc, record) => {
    acc.gross += getRecordGross(record);
    acc.deductions += getRecordDeduction(record);
    acc.net += getRecordNet(record);
    acc.release += getReleaseAmount(record);
    acc.carry += getCarryForwardAmount(record);
    return acc;
  }, { gross: 0, deductions: 0, net: 0, release: 0, carry: 0 }), [filteredRows]);

  const getPrimaryAction = () => {
    if (activeTab === "review") return "Lock";
    if (activeTab === "locked") return "Release";
    if (activeTab === "released") return "History";
    return "Waiting for Register";
  };

  const actionableRows = useMemo(() => {
    if (activeTab === "review") return filteredRows.filter((record) => getRecordStatus(record) === STATUS.MANAGER_REVIEW);
    if (activeTab === "locked") return filteredRows.filter((record) => [STATUS.LOCKED, STATUS.PARTIALLY_RELEASED].includes(getRecordStatus(record) as any));
    if (activeTab === "released") return filteredRows.filter((record) => getRecordStatus(record) === STATUS.RELEASED);
    return [];
  }, [activeTab, filteredRows]);

  const selectedActionableRows = useMemo(() => actionableRows.filter((record) => selectedRecordIds.includes(String(record.id))), [actionableRows, selectedRecordIds]);

  // One-button rule:
  // Review/Locked tabs may run selected or all.
  // Released History is read-only and has no workflow action.
  const actionTargetRows =
    selectedActionableRows.length > 0 ? selectedActionableRows : actionableRows;

  const actionLabel = (() => {
    if (activeTab === "released") {
      return selectedActionableRows.length > 0
        ? `Reopen Selected (${selectedActionableRows.length})`
        : "History Only";
    }

    return selectedActionableRows.length > 0
      ? `${getPrimaryAction()} Selected (${selectedActionableRows.length})`
      : `${getPrimaryAction()} All (${actionableRows.length})`;
  })();

  const toggleSelect = (id: any) => {
    const key = String(id);
    setSelectedRecordIds((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
  };

  const toggleSelectAll = () => {
    const allSelected = actionableRows.length > 0 && actionableRows.every((record) => selectedRecordIds.includes(String(record.id)));
    if (allSelected) {
      setSelectedRecordIds((prev) => prev.filter((id) => !actionableRows.some((record) => String(record.id) === id)));
      return;
    }
    setSelectedRecordIds(actionableRows.map((record) => String(record.id)));
  };

  const clearSelection = () => setSelectedRecordIds([]);

  const updatePeriodStatusIfComplete = async (periodIds: string[]) => {
    for (const periodId of periodIds.filter(Boolean)) {
      const { data: periodRecords, error } = await supabase.from("payroll_records").select("record_status").eq("period_id", periodId);
      if (error || !periodRecords) continue;
      const statuses = periodRecords.map((record: any) => String(record.record_status || "").toUpperCase());
      let nextStatus = "REGISTERED";
      let attendanceLocked = false;
      if (statuses.length > 0 && statuses.every((status) => status === STATUS.RELEASED)) {
        nextStatus = "RELEASED";
        attendanceLocked = true;
      } else if (statuses.some((status) => status === STATUS.LOCKED || status === STATUS.PARTIALLY_RELEASED || status === STATUS.RELEASED)) {
        nextStatus = "LOCKED";
        attendanceLocked = true;
      } else if (statuses.some((status) => status === STATUS.MANAGER_REVIEW || status === STATUS.RETURNED_FOR_CORRECTION)) {
        nextStatus = "REGISTERED";
      }
      await supabase.from("payroll_periods").update({ status: nextStatus, attendance_locked: attendanceLocked, needs_regeneration: false }).eq("id", periodId);
    }
  };

  const lockRecords = async (targetRows: any[]) => {
    const invalidRows = targetRows.filter((record) => getRecordStatus(record) !== STATUS.MANAGER_REVIEW);
    if (invalidRows.length > 0) return alert("Only MANAGER REVIEW payroll records can be locked.");
    const totalNet = targetRows.reduce((sum, record) => sum + getRecordNet(record), 0);
    if (!confirm(`Lock Payroll?\n\nEmployees: ${targetRows.length}\nNet Pay: ${formatPeso(totalNet)}\n\nThis freezes selected employee payroll rows. Release is allowed only after LOCKED.`)) return;
    const lockedBy = prompt("Locked by:", "Payroll Manager") || "Payroll Manager";
    const now = new Date().toISOString();
    const ids = targetRows.map((record) => record.id);
    const periodIds = Array.from(new Set(targetRows.map((record) => record.period_id).filter(Boolean)));
    const { error } = await supabase.from("payroll_records").update({ record_status: STATUS.LOCKED, status: "Locked", release_status: "Locked", locked_at: now, locked_by: lockedBy.trim() }).in("id", ids);
    if (error) throw new Error(error.message);
    await updatePeriodStatusIfComplete(periodIds);
    await createAuditLog({ userName: lockedBy.trim(), module: "Payroll", action: "Lock Payroll Records", description: `${targetRows.length} employee payroll record(s) locked for release.`, severity: "warning", newValue: { ids, periodIds, totalNet, status: STATUS.LOCKED } });
  };

  const createPayrollExpense = async (
    targetRows: any[],
    totalReleaseOverride?: number,
    paymentMethod = "Payroll",
    remarksSuffix = "",
  ) => {
    if (targetRows.length === 0) return;
    const firstRecord = targetRows[0];
    const totalRelease =
      typeof totalReleaseOverride === "number"
        ? totalReleaseOverride
        : targetRows.reduce((sum, record) => sum + getRemainingPayrollAmount(record), 0);

    if (totalRelease <= 0) return;

    await supabase.from("expenses").insert({
      company_id: firstRecord.company_id || getCurrentCompanyId(),
      expense_date: new Date().toISOString().slice(0, 10),
      category: "Payroll",
      subcategory: "Payroll Release",
      department: "Payroll",
      description: `Payroll Release - ${getPeriodLabel(firstRecord)}`,
      amount: totalRelease,
      payment_method: paymentMethod,
      source: "Payroll Release",
      remarks: `Auto-generated from Payroll Manager release. Period ID: ${firstRecord.period_id || "NO_PERIOD"}. Employees: ${targetRows.length}.${remarksSuffix ? ` ${remarksSuffix}` : ""}`,
    });
  };

  const saveReleaseTransactions = async (
    targetRows: any[],
    releasedBy: string,
    releaseAmountResolver?: (record: any) => number,
    releaseMethod = "Payroll",
    remarks = "Salary release from Payroll Manager per-record workflow.",
  ) => {
    const companyId = getCurrentCompanyId();
    const payload = targetRows.map((record) => {
      const releaseAmount = Math.max(
        0,
        Number(
          releaseAmountResolver
            ? releaseAmountResolver(record)
            : getRemainingPayrollAmount(record),
        ),
      );

      return {
        company_id: record.company_id || companyId,
        payroll_record_id: record.id,
        payroll_period_id: record.period_id || null,
        employee_id: record.employee_id || null,
        employee_name: getEmployeeName(record),
        net_pay: getRecordNet(record),
        release_amount: releaseAmount,
        remaining_balance: Math.max(getRemainingPayrollAmount(record) - releaseAmount, 0),
        release_batch: getPeriodLabel(record),
        payment_method: releaseMethod,
        released_by: releasedBy,
        released_at: new Date().toISOString(),
        remarks,
      };
    });

    if (payload.length === 0) return;

    const { error } = await supabase.from("payroll_release_transactions").insert(payload);
    if (error) throw new Error(error.message);
  };

  const releaseRecords = async (targetRows: any[]) => {
    const invalidRows = targetRows.filter((record) => {
      const status = getRecordStatus(record);
      return status !== STATUS.LOCKED && status !== STATUS.PARTIALLY_RELEASED;
    });

    if (invalidRows.length > 0) {
      return alert("Release blocked. Only LOCKED or PARTIALLY RELEASED payroll records can be released.");
    }

    const totalRelease = targetRows.reduce(
      (sum, record) => sum + getRemainingPayrollAmount(record),
      0,
    );

    if (totalRelease <= 0) return alert("No remaining payroll balance to release.");

    if (!confirm(`Release Full Remaining Payroll?\n\nEmployees: ${targetRows.length}\nRelease Amount: ${formatPeso(totalRelease)}\n\nThis will release the full remaining balance of selected rows.`)) return;

    const releasedBy = prompt("Released by:", "Payroll Manager") || "Payroll Manager";
    const now = new Date().toISOString();
    const periodIds = Array.from(new Set(targetRows.map((record) => record.period_id).filter(Boolean)));

    await saveReleaseTransactions(
      targetRows,
      releasedBy.trim(),
      (record) => getRemainingPayrollAmount(record),
      "Payroll",
      "Full remaining salary release from Payroll Manager.",
    );

    await createPayrollExpense(targetRows, totalRelease, "Payroll", "Full remaining payroll release.");

    for (const record of targetRows) {
      const netPay = Math.max(getRecordNet(record), 0);
      const alreadyPaid = getTotalReleasedAmount(record);
      const releaseNow = getRemainingPayrollAmount(record);
      const totalPaid = Math.min(alreadyPaid + releaseNow, netPay);

      const { error } = await supabase
        .from("payroll_records")
        .update({
          record_status: STATUS.RELEASED,
          status: "Released",
          release_status: "Released",
          paid_amount: totalPaid,
          remaining_amount: 0,
          remaining_payroll_balance: 0,
          released_at: now,
          released_by: releasedBy.trim(),
        })
        .eq("id", record.id);

      if (error) throw new Error(error.message);
    }

    await updatePeriodStatusIfComplete(periodIds);

    await createAuditLog({
      userName: releasedBy.trim(),
      module: "Payroll",
      action: "Release Full Remaining Payroll Records",
      description: `${targetRows.length} employee payroll record(s) fully released.`,
      severity: "warning",
      newValue: {
        ids: targetRows.map((record) => record.id),
        periodIds,
        totalRelease,
        status: STATUS.RELEASED,
      },
    });
  };

  const openPartialReleaseModal = (record: any) => {
    const remaining = getRemainingPayrollAmount(record);

    if (![STATUS.LOCKED, STATUS.PARTIALLY_RELEASED].includes(getRecordStatus(record) as any)) {
      alert("Partial release is allowed only for LOCKED or PARTIALLY RELEASED rows.");
      return;
    }

    if (remaining <= 0) {
      alert("This employee has no remaining payroll balance.");
      return;
    }

    setPartialReleaseRecord(record);
    setPartialReleaseAmount(String(remaining));
    setPartialReleaseMethod("Cash");
    setPartialReleaseRemarks("");
    setShowPartialReleaseModal(true);
  };

  const closePartialReleaseModal = () => {
    if (isProcessing) return;
    setShowPartialReleaseModal(false);
    setPartialReleaseRecord(null);
    setPartialReleaseAmount("");
    setPartialReleaseMethod("Cash");
    setPartialReleaseRemarks("");
  };

  const releasePartialAmount = async () => {
    if (!partialReleaseRecord || isProcessing) return;

    const currentStatus = getRecordStatus(partialReleaseRecord);

    if (![STATUS.LOCKED, STATUS.PARTIALLY_RELEASED].includes(currentStatus as any)) {
      alert("Partial release is allowed only for LOCKED or PARTIALLY RELEASED rows.");
      return;
    }

    const amount = Number(partialReleaseAmount || 0);
    const remaining = getRemainingPayrollAmount(partialReleaseRecord);
    const netPay = Math.max(getRecordNet(partialReleaseRecord), 0);
    const alreadyPaid = getTotalReleasedAmount(partialReleaseRecord);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Release amount must be greater than zero.");
      return;
    }

    if (amount > remaining) {
      alert(`Release amount cannot exceed remaining balance: ${formatPeso(remaining)}.`);
      return;
    }

    const releasedBy = prompt("Released by:", "Payroll Manager") || "Payroll Manager";
    const totalPaid = Math.min(alreadyPaid + amount, netPay);
    const nextRemaining = Math.max(netPay - totalPaid, 0);
    const isFullyReleased = nextRemaining <= 0;
    const now = new Date().toISOString();

    if (
      !confirm(
        `${isFullyReleased ? "Final" : "Partial"} Payroll Release?\n\nEmployee: ${getEmployeeName(partialReleaseRecord)}\nNet Pay: ${formatPeso(netPay)}\nAlready Released: ${formatPeso(alreadyPaid)}\nRelease Now: ${formatPeso(amount)}\nRemaining After: ${formatPeso(nextRemaining)}\nPayment Method: ${partialReleaseMethod}`,
      )
    ) {
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;

    try {
      await saveReleaseTransactions(
        [partialReleaseRecord],
        releasedBy.trim(),
        () => amount,
        partialReleaseMethod,
        `${isFullyReleased ? "Final" : "Partial"} salary release from Payroll Manager. ${partialReleaseRemarks || ""}`.trim(),
      );

      await createPayrollExpense(
        [partialReleaseRecord],
        amount,
        partialReleaseMethod,
        `${isFullyReleased ? "Final" : "Partial"} payroll amount release. ${partialReleaseRemarks || ""}`.trim(),
      );

      const { error } = await supabase
        .from("payroll_records")
        .update({
          record_status: isFullyReleased ? STATUS.RELEASED : STATUS.LOCKED,
          status: isFullyReleased ? "Released" : "Partially Released",
          release_status: isFullyReleased ? "Released" : "Partially Released",
          paid_amount: totalPaid,
          remaining_amount: nextRemaining,
          remaining_payroll_balance: nextRemaining,
          released_at: isFullyReleased ? now : partialReleaseRecord.released_at || null,
          released_by: isFullyReleased ? releasedBy.trim() : partialReleaseRecord.released_by || null,
        })
        .eq("id", partialReleaseRecord.id);

      if (error) throw new Error(error.message);

      if (partialReleaseRecord.period_id) {
        await updatePeriodStatusIfComplete([partialReleaseRecord.period_id]);
      }

      await createAuditLog({
        userName: releasedBy.trim(),
        module: "Payroll",
        action: isFullyReleased ? "Final Payroll Release" : "Partial Payroll Release",
        description: `${getEmployeeName(partialReleaseRecord)} released ${formatPeso(amount)}. Remaining: ${formatPeso(nextRemaining)}.`,
        severity: "warning",
        recordId: partialReleaseRecord.id,
        oldValue: partialReleaseRecord,
        newValue: {
          payrollRecordId: partialReleaseRecord.id,
          netPay,
          alreadyPaid,
          releaseAmount: amount,
          totalPaid,
          remainingAmount: nextRemaining,
          paymentMethod: partialReleaseMethod,
          remarks: partialReleaseRemarks,
          record_status: isFullyReleased ? STATUS.RELEASED : STATUS.PARTIALLY_RELEASED,
        },
      });

      await loadData();
      closePartialReleaseModal();
      alert(`${isFullyReleased ? "Final" : "Partial"} payroll release saved.`);
    } catch (error: any) {
      alert(`Partial release failed.\n\n${error?.message || error}`);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };



  const openBatchReopenModal = () => {
    if (activeTab !== "released") {
      alert("Batch reopen is available only in Released History.");
      return;
    }

    if (selectedActionableRows.length === 0) {
      alert("Select released payroll rows first.");
      return;
    }

    setBatchReopenReason("");
    setShowBatchReopenModal(true);
  };

  const closeBatchReopenModal = () => {
    if (isProcessing) return;
    setShowBatchReopenModal(false);
    setBatchReopenReason("");
  };

  const reopenSelectedPaymentsAsPartial = async () => {
    if (isProcessing) return;

    const targetRows = selectedActionableRows.filter(
      (record) => getRecordStatus(record) === STATUS.RELEASED,
    );

    if (targetRows.length === 0) {
      alert("Select released payroll rows first.");
      return;
    }

    const reason = batchReopenReason.trim();

    if (!reason) {
      alert("Reason is required for audit trail.");
      return;
    }

    const totalNet = targetRows.reduce((sum, record) => sum + Math.max(getRecordNet(record), 0), 0);
    const reopenedBy = prompt("Reopened by:", "Payroll Manager") || "Payroll Manager";

    if (
      !confirm(
        `Batch Reopen Payment As Partial?\n\nEmployees: ${targetRows.length}\nTotal Net / Remaining: ${formatPeso(totalNet)}\nActual Paid Amount: ${formatPeso(0)} each\nReason: ${reason}\n\nThis will move selected rows from Released History back to Locked tab as PARTIALLY RELEASED. It will not send them back to Payroll Register.`,
      )
    ) {
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;

    try {
      const now = new Date().toISOString();
      const ids = targetRows.map((record) => record.id);
      const periodIds = Array.from(
        new Set(targetRows.map((record) => record.period_id).filter(Boolean)),
      );

      for (const record of targetRows) {
        const netPay = Math.max(getRecordNet(record), 0);

        const { error } = await supabase
          .from("payroll_records")
          .update({
            record_status: STATUS.LOCKED,
            status: "Partially Released",
            release_status: "Partially Released",
            paid_amount: 0,
            remaining_amount: netPay,
            remaining_payroll_balance: netPay,
            released_at: null,
            released_by: null,
          })
          .eq("id", record.id);

        if (error) throw new Error(error.message);
      }

      await updatePeriodStatusIfComplete(periodIds);

      await createAuditLog({
        userName: reopenedBy.trim(),
        module: "Payroll",
        action: "Batch Reopen Released Payments As Partial",
        description: `${targetRows.length} released payroll row(s) reopened as partial payment. Total remaining: ${formatPeso(totalNet)}. Reason: ${reason}`,
        severity: "critical",
        newValue: {
          ids,
          periodIds,
          previousStatus: STATUS.RELEASED,
          record_status: STATUS.PARTIALLY_RELEASED,
          actualPaidPerEmployee: 0,
          totalRemaining: totalNet,
          reason,
          reopenedBy: reopenedBy.trim(),
          reopenedAt: now,
          managerOnly: true,
        },
      });

      setSelectedRecordIds([]);
      await loadData();
      setActiveTab("locked");
      closeBatchReopenModal();
      alert("Selected released rows reopened as partial. Rows are now in Payroll Manager Locked tab.");
    } catch (error: any) {
      alert(`Batch reopen failed.\n\n${error?.message || error}`);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const openReopenPaymentModal = (record: any) => {
    if (getRecordStatus(record) !== STATUS.RELEASED) {
      alert("Reopen Payment is allowed only from Released History.");
      return;
    }

    const netPay = Math.max(getRecordNet(record), 0);
    const paidAmount = getTotalReleasedAmount(record) || netPay;

    setReopenPaymentRecord(record);
    setActualPaidAmount(String(Math.min(paidAmount, netPay)));
    setReopenPaymentReason("");
    setShowReopenPaymentModal(true);
  };

  const closeReopenPaymentModal = () => {
    if (isProcessing) return;

    setShowReopenPaymentModal(false);
    setReopenPaymentRecord(null);
    setActualPaidAmount("");
    setReopenPaymentReason("");
  };

  const reopenReleasedPaymentAsPartial = async () => {
    if (!reopenPaymentRecord || isProcessing) return;

    if (getRecordStatus(reopenPaymentRecord) !== STATUS.RELEASED) {
      alert("Only RELEASED payroll rows can be reopened as partial payment.");
      return;
    }

    const netPay = Math.max(getRecordNet(reopenPaymentRecord), 0);
    const actualPaid = Math.max(0, Number(actualPaidAmount || 0));
    const reason = reopenPaymentReason.trim();

    if (!Number.isFinite(actualPaid) || actualPaid < 0) {
      alert("Actual paid amount must be a valid amount.");
      return;
    }

    if (actualPaid >= netPay) {
      alert("Actual paid amount is already full or above net pay. No partial balance to reopen.");
      return;
    }

    if (!reason) {
      alert("Reason is required for audit trail.");
      return;
    }

    const remaining = Math.max(netPay - actualPaid, 0);
    const reopenedBy = prompt("Reopened by:", "Payroll Manager") || "Payroll Manager";

    if (
      !confirm(
        `Reopen Payment As Partial?\n\nEmployee: ${getEmployeeName(reopenPaymentRecord)}\nNet Pay: ${formatPeso(netPay)}\nActual Paid: ${formatPeso(actualPaid)}\nRemaining Balance: ${formatPeso(remaining)}\nReason: ${reason}\n\nThis stays in Payroll Manager. It will return the row to the Locked tab as PARTIALLY RELEASED.`,
      )
    ) {
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("payroll_records")
        .update({
          record_status: STATUS.LOCKED,
          status: "Partially Released",
          release_status: "Partially Released",
          paid_amount: actualPaid,
          remaining_amount: remaining,
          remaining_payroll_balance: remaining,
          released_at: null,
          released_by: null,
        })
        .eq("id", reopenPaymentRecord.id);

      if (error) throw new Error(error.message);

      if (reopenPaymentRecord.period_id) {
        await updatePeriodStatusIfComplete([reopenPaymentRecord.period_id]);
      }

      await createAuditLog({
        userName: reopenedBy.trim(),
        module: "Payroll",
        action: "Reopen Released Payment As Partial",
        description: `${getEmployeeName(reopenPaymentRecord)} released payroll was reopened as partial payment. Actual paid: ${formatPeso(actualPaid)}. Remaining: ${formatPeso(remaining)}. Reason: ${reason}`,
        severity: "critical",
        recordId: reopenPaymentRecord.id,
        oldValue: reopenPaymentRecord,
        newValue: {
          payrollRecordId: reopenPaymentRecord.id,
          previousStatus: STATUS.RELEASED,
          record_status: STATUS.PARTIALLY_RELEASED,
          netPay,
          actualPaid,
          remaining,
          reason,
          reopenedBy: reopenedBy.trim(),
          reopenedAt: now,
          managerOnly: true,
        },
      });

      await loadData();
      setActiveTab("locked");
      closeReopenPaymentModal();
      alert("Payment reopened as partial. Row is back in Payroll Manager Locked tab.");
    } catch (error: any) {
      alert(`Reopen payment failed.\n\n${error?.message || error}`);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const returnRecordsForCorrection = async (targetRows: any[]) => {
    if (targetRows.length === 0) return alert("No payroll records selected for return.");

    const invalidRows = targetRows.filter((record) => {
      const status = getRecordStatus(record);
      return status !== STATUS.MANAGER_REVIEW && status !== STATUS.LOCKED && status !== STATUS.PARTIALLY_RELEASED;
    });

    if (invalidRows.length > 0) {
      return alert("Only MANAGER REVIEW or LOCKED payroll records can be returned to Register.");
    }

    const releasedRows = targetRows.filter((record) => getRecordStatus(record) === STATUS.RELEASED || getRecordStatus(record) === STATUS.PARTIALLY_RELEASED || Number(record.paid_amount || 0) > 0 || record.released_at);

    if (releasedRows.length > 0) {
      return alert("Return blocked. Released payroll is final and cannot be returned to Register.");
    }

    const defaultReason =
      targetRows.length === 1
        ? "Payroll correction needed"
        : "Payroll correction needed for selected locked rows";

    const reason = prompt(
      `Return ${targetRows.length} payroll row(s) to Payroll Register correction queue?\n\nReason is required:`,
      defaultReason,
    );

    if (!reason || !reason.trim()) return alert("Return reason is required.");

    const totalNet = targetRows.reduce((sum, record) => sum + getRecordNet(record), 0);

    if (
      !confirm(
        `Return To Register?\n\nEmployees: ${targetRows.length}\nNet Pay: ${formatPeso(totalNet)}\nReason: ${reason.trim()}\n\nReturned rows will be editable again in Payroll Register. They must be corrected, resent to Manager, locked again, then released.`,
      )
    ) {
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;

    try {
      const ids = targetRows.map((record) => record.id);
      const periodIds = Array.from(
        new Set(targetRows.map((record) => record.period_id).filter(Boolean)),
      );
      const returnedAt = new Date().toISOString();
      const returnedBy = "Payroll Manager";

      const { error } = await supabase
        .from("payroll_records")
        .update({
          record_status: STATUS.RETURNED_FOR_CORRECTION,
          status: "Returned for Correction",
          release_status: "Returned for Correction",
          return_reason: reason.trim(),
          returned_at: returnedAt,
          returned_by: returnedBy,
          locked_at: null,
          locked_by: null,
        })
        .in("id", ids)
        .in("record_status", [STATUS.MANAGER_REVIEW, STATUS.LOCKED]);

      if (error) throw new Error(error.message);

      await updatePeriodStatusIfComplete(periodIds);

      await createAuditLog({
        userName: returnedBy,
        module: "Payroll",
        action: "Return Payroll Records To Register",
        description: `${targetRows.length} payroll record(s) returned to Payroll Register correction queue. Reason: ${reason.trim()}`,
        severity: "warning",
        newValue: {
          ids,
          periodIds,
          returnedAt,
          returnedBy,
          reason: reason.trim(),
          record_status: STATUS.RETURNED_FOR_CORRECTION,
        },
      });

      setSelectedRecordIds([]);
      await loadData();
      alert("Payroll row(s) returned to Payroll Register correction queue.");
    } catch (error: any) {
      alert(`Return failed.\n\n${error?.message || error}`);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const returnEmployeeForCorrection = async (record: any) => {
    await returnRecordsForCorrection([record]);
  };

  const tabConfig: Array<{ id: ManagerTab; label: string; count: number }> = [
    { id: "review", label: "Queue", count: managerReviewRows.length },
    { id: "locked", label: "Locked", count: lockedRows.length },
    { id: "released", label: "History", count: releasedRows.length },
    { id: "returned", label: "Returned", count: returnedRows.length },
  ];

  const workbenchStatus = managerReviewRows.length > 0 ? "Ready for Manager Lock" : lockedRows.length > 0 ? "Ready for Release" : returnedRows.length > 0 ? "Corrections Pending" : releasedRows.length > 0 ? "Released" : "Controlled";
  const queueTitle = activeTab === "review" ? "Payroll Review Queue" : activeTab === "locked" ? "Payroll Release Queue" : activeTab === "released" ? "Released Payroll History" : "Returned Corrections Monitor";
  const queueDescription = activeTab === "review" ? "Manager Review rows can be locked with one main button or returned individually for Register correction." : activeTab === "locked" ? "Only LOCKED payroll rows can be released." : activeTab === "released" ? "Released payroll is history-only for payroll corrections. Payment mistakes can be reopened as partial payment from Manager." : "Rows here are no longer editable in Manager. Payroll Register must correct and resubmit them.";

  const renderPageChrome = (children: React.ReactNode) => (
    <div className="h-screen overflow-hidden bg-[#f5f7fb] text-slate-950">
      <Sidebar />
      <div className="fixed left-0 right-0 top-0 z-20 lg:left-72">
        <TopNavbar />
      </div>
      <main className="fixed bottom-0 left-0 right-0 top-[64px] z-10 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:left-72">
        <div className="space-y-5">{children}</div>
      </main>
      <OpscoreAssistant />
    </div>
  );

  if (checkingAccess) return renderPageChrome(<div className={`${shellCard} p-8 text-sm font-semibold text-slate-600`}>Checking Payroll Manager access...</div>);
  if (!hasPageAccess) return renderPageChrome(<div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm font-semibold text-rose-700 shadow-sm">{accessMessage || "Access denied."}</div>);

  return renderPageChrome(
    <>
      {loadError && <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">Payroll Manager load warning: {loadError}</section>}

      <section className={`${shellCard} overflow-hidden`}>
        <div className="grid gap-4 p-5 xl:grid-cols-[1.4fr_1fr] xl:items-stretch">
          <div className="rounded-3xl border border-slate-100 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Payroll / Payroll Manager</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Payroll Manager</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">Per-employee payroll workflow. Manager Review â†’ Locked â†’ Released. Returns affect one employee only.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Review</p><p className="mt-2 text-xl font-black">{managerReviewRows.length}</p></div>
            <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Locked</p><p className="mt-2 text-xl font-black">{lockedRows.length}</p></div>
            <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Released</p><p className="mt-2 text-xl font-black">{releasedRows.length}</p></div>
            <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Status</p><p className="mt-2 text-sm font-black text-blue-700">{workbenchStatus}</p></div>
          </div>
        </div>
      </section>

      <section className={`${shellCard} p-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabConfig.map((tab) => (
              <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setSelectedRecordIds([]); }} className={`rounded-2xl border px-4 py-3 text-xs font-black transition ${activeTab === tab.id ? "border-[#07111f] bg-[#07111f] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{tab.label} <span className="ml-2 opacity-75">{tab.count}</span></button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select value={periodFilter} onChange={(event) => { setPeriodFilter(event.target.value); setSelectedRecordIds([]); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400">
              <option value="All">All Periods</option>
              {periodOptions.map((period) => <option key={period} value={period}>{period}</option>)}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search employee..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 sm:w-72" />
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Employees</p><p className="mt-2 text-xl font-black">{filteredRows.length}</p></div>
          <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Gross</p><p className="mt-2 text-xl font-black">{formatPeso(totals.gross)}</p></div>
          <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Deductions</p><p className="mt-2 text-xl font-black text-rose-700">{formatPeso(totals.deductions)}</p></div>
          <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Net</p><p className="mt-2 text-xl font-black text-emerald-700">{formatPeso(totals.net)}</p></div>
          <div className={metricCard}><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Carry Fwd</p><p className="mt-2 text-xl font-black text-indigo-700">{formatPeso(totals.carry)}</p></div>
        </div>
      </section>

      <section className={`${shellCard} p-5`}>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div><h2 className="text-lg font-black tracking-tight text-slate-950">{queueTitle}</h2><p className="mt-1 text-sm font-medium text-slate-600">{queueDescription}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {selectedRecordIds.length > 0 && activeTab !== "returned" && (
              <button type="button" onClick={clearSelection} className={secondaryButton}>
                <X className="h-4 w-4" /> Clear ({selectedRecordIds.length})
              </button>
            )}

            {activeTab === "released" && selectedActionableRows.length > 0 && (
              <button
                type="button"
                onClick={openBatchReopenModal}
                disabled={isProcessing}
                className={dangerButton}
              >
                Reopen Selected ({selectedActionableRows.length})
              </button>
            )}

            {activeTab === "locked" && (
              <button
                type="button"
                onClick={() => returnRecordsForCorrection(actionTargetRows)}
                disabled={isProcessing || actionTargetRows.length === 0}
                className={dangerButton}
              >
                Return {selectedActionableRows.length > 0 ? `Selected (${selectedActionableRows.length})` : `All (${actionableRows.length})`}
              </button>
            )}

            {activeTab !== "released" && activeTab !== "returned" && (
              <button
                type="button"
                onClick={async () => {
                  if (processingRef.current || isProcessing) return;
                  if (actionTargetRows.length === 0) return alert("No actionable payroll records in this view.");

                  processingRef.current = true;
                  setIsProcessing(true);

                  try {
                    if (activeTab === "review") await lockRecords(actionTargetRows);
                    if (activeTab === "locked") await releaseRecords(actionTargetRows);

                    setSelectedRecordIds([]);
                    await loadData();
                  } catch (error: any) {
                    await createAuditLog({
                      userName: "OPSCORE USER",
                      module: "Payroll",
                      action: "Payroll Manager Action Failed",
                      description: `${getPrimaryAction()} failed: ${error?.message || error}`,
                      severity: "critical",
                      newValue: { activeTab, error: error?.message || String(error) },
                    });

                    alert(`${getPrimaryAction()} failed.\n\n${error?.message || error}`);
                  } finally {
                    setIsProcessing(false);
                    processingRef.current = false;
                  }
                }}
                disabled={isProcessing || actionableRows.length === 0}
                className={primaryButton}
              >
                {activeTab === "review" && <Lock className="h-4 w-4" />}
                {activeTab === "locked" && <Send className="h-4 w-4" />}
                {isProcessing ? "Processing..." : actionLabel}
              </button>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <tr><th className="w-12 px-4 py-4"><input type="checkbox" checked={actionableRows.length > 0 && actionableRows.every((record) => selectedRecordIds.includes(String(record.id)))} onChange={toggleSelectAll} disabled={activeTab === "returned" || actionableRows.length === 0} /></th><th className="px-4 py-4">Employee</th><th className="px-4 py-4">Period</th><th className="px-4 py-4">Gross</th><th className="px-4 py-4">Deductions</th><th className="px-4 py-4">Net</th><th className="px-4 py-4">Released</th><th className="px-4 py-4">Remaining</th><th className="px-4 py-4">Status</th><th className="px-4 py-4 text-right">Row Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((record) => {
                  const status = getRecordStatus(record);
                  const isActionable = actionableRows.some((row) => String(row.id) === String(record.id));
                  const isSelected = selectedRecordIds.includes(String(record.id));
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-4"><input type="checkbox" checked={isSelected} disabled={!isActionable} onChange={() => toggleSelect(record.id)} /></td>
                      <td className="px-4 py-4"><div className="font-black text-slate-950">{getEmployeeName(record)}</div><div className="mt-1 text-[11px] font-semibold text-slate-500">{record.department || "Unassigned"} â€¢ {record.position || "Unassigned"}</div></td>
                      <td className="px-4 py-4 font-bold text-slate-700">{getPeriodLabel(record)}</td>
                      <td className="px-4 py-4 font-black text-slate-950">{formatPeso(getRecordGross(record))}</td>
                      <td className="px-4 py-4 font-black text-rose-700">{formatPeso(getRecordDeduction(record))}</td>
                      <td className="px-4 py-4 font-black text-emerald-700">{formatPeso(getRecordNet(record))}</td>
                      <td className="px-4 py-4 font-black text-slate-950">{formatPeso(getTotalReleasedAmount(record))}</td>
                      <td className="px-4 py-4 font-black text-indigo-700">{formatPeso(getRemainingPayrollAmount(record))}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase ${getStatusClass(status)}`}>{getStatusLabel(record)}</span>{status === STATUS.RETURNED_FOR_CORRECTION && record.return_reason && <div className="mt-1 max-w-[220px] text-[10px] font-semibold text-amber-700">{record.return_reason}</div>}</td>
                      <td className="px-4 py-4 text-right">{status === STATUS.MANAGER_REVIEW ? <button type="button" onClick={() => returnEmployeeForCorrection(record)} disabled={isProcessing} className={dangerButton}>Return</button> : status === STATUS.RETURNED_FOR_CORRECTION ? <span className="rounded-full bg-amber-50 px-3 py-2 text-[10px] font-black uppercase text-amber-700">Register Correction</span> : (status === STATUS.LOCKED || status === STATUS.PARTIALLY_RELEASED) ? <div className="flex justify-end gap-2"><button type="button" onClick={() => openPartialReleaseModal(record)} disabled={isProcessing} className={secondaryButton}>Partial</button><span className="rounded-full bg-indigo-50 px-3 py-2 text-[10px] font-black uppercase text-indigo-700">{status === STATUS.PARTIALLY_RELEASED ? "Partial Paid" : "Ready"}</span><button type="button" onClick={() => returnEmployeeForCorrection(record)} disabled={isProcessing} className={dangerButton}>Return</button></div> : <div className="flex justify-end gap-2"><button type="button" onClick={() => openReopenPaymentModal(record)} disabled={isProcessing} className={secondaryButton}>Reopen Payment</button><span className="rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase text-emerald-700">History</span></div>}</td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && <tr><td colSpan={10} className="px-4 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-500"><Users className="h-5 w-5" /></div><p className="mt-4 text-sm font-black text-slate-950">No payroll records found.</p><p className="mt-1 text-xs font-semibold text-slate-500">Change tab, period, or search filter.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>


      {showPartialReleaseModal && partialReleaseRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                  Payroll Release
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Partial Amount Release
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Release only the amount actually paid. Remaining balance stays payable.
                </p>
              </div>

              <button
                type="button"
                onClick={closePartialReleaseModal}
                disabled={isProcessing}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Employee
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {getEmployeeName(partialReleaseRecord)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {partialReleaseRecord.department || "Unassigned"} â€¢ {partialReleaseRecord.position || "Unassigned"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Period
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {getPeriodLabel(partialReleaseRecord)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className={metricCard}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Net Pay</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{formatPeso(getRecordNet(partialReleaseRecord))}</p>
                </div>
                <div className={metricCard}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Released</p>
                  <p className="mt-2 text-lg font-black text-blue-700">{formatPeso(getTotalReleasedAmount(partialReleaseRecord))}</p>
                </div>
                <div className={metricCard}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Remaining</p>
                  <p className="mt-2 text-lg font-black text-indigo-700">{formatPeso(getRemainingPayrollAmount(partialReleaseRecord))}</p>
                </div>
                <div className={metricCard}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">After Release</p>
                  <p className="mt-2 text-lg font-black text-emerald-700">
                    {formatPeso(Math.max(getRemainingPayrollAmount(partialReleaseRecord) - Number(partialReleaseAmount || 0), 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Release Amount
                </span>
                <input
                  value={partialReleaseAmount}
                  onChange={(event) => setPartialReleaseAmount(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none focus:border-blue-400"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Payment Method
                </span>
                <select
                  value={partialReleaseMethod}
                  onChange={(event) => setPartialReleaseMethod(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none focus:border-blue-400"
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank">Bank</option>
                  <option value="Payroll">Payroll</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Remarks
              </span>
              <textarea
                value={partialReleaseRemarks}
                onChange={(event) => setPartialReleaseRemarks(event.target.value)}
                placeholder="Optional note, reference number, or reason for partial payout..."
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closePartialReleaseModal}
                disabled={isProcessing}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={releasePartialAmount}
                disabled={isProcessing}
                className={primaryButton}
              >
                {isProcessing ? "Processing..." : "Release Amount"}
              </button>
            </div>
          </div>
        </div>
      )}



      {showBatchReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                  Payroll Manager
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Batch Reopen Payments
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Reopen selected released rows as partial payout without sending them back to Payroll Register.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBatchReopenModal}
                disabled={isProcessing}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
              Selected employees will return to the Locked tab as PARTIALLY RELEASED with â‚±0.00 actual paid and full net pay remaining.
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className={metricCard}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Selected</p>
                <p className="mt-2 text-lg font-black text-slate-950">{selectedActionableRows.length}</p>
              </div>
              <div className={metricCard}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Actual Paid</p>
                <p className="mt-2 text-lg font-black text-blue-700">â‚±0.00 each</p>
              </div>
              <div className={metricCard}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Total Remaining</p>
                <p className="mt-2 text-lg font-black text-indigo-700">
                  {formatPeso(selectedActionableRows.reduce((sum, record) => sum + Math.max(getRecordNet(record), 0), 0))}
                </p>
              </div>
            </div>

            <div className="mt-5 max-h-52 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3">
              <div className="space-y-2">
                {selectedActionableRows.map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700">
                    <span>{getEmployeeName(record)}</span>
                    <span className="text-slate-950">{formatPeso(getRecordNet(record))}</span>
                  </div>
                ))}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Reason
              </span>
              <textarea
                value={batchReopenReason}
                onChange={(event) => setBatchReopenReason(event.target.value)}
                placeholder="Example: Funding shortage / full release clicked by mistake for selected employees."
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeBatchReopenModal}
                disabled={isProcessing}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reopenSelectedPaymentsAsPartial}
                disabled={isProcessing || selectedActionableRows.length === 0}
                className={dangerButton}
              >
                {isProcessing ? "Processing..." : `Reopen ${selectedActionableRows.length} Employee(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReopenPaymentModal && reopenPaymentRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                  Payroll Manager
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Reopen Payment As Partial
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Use this only when the row was marked released but the employee was not fully paid.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReopenPaymentModal}
                disabled={isProcessing}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
              This will not send the row back to Payroll Register. It stays in Payroll Manager and returns to the Locked tab as PARTIALLY RELEASED.
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Employee
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {getEmployeeName(reopenPaymentRecord)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {reopenPaymentRecord.department || "Unassigned"} â€¢ {reopenPaymentRecord.position || "Unassigned"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Period
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {getPeriodLabel(reopenPaymentRecord)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className={metricCard}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Net Pay</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{formatPeso(getRecordNet(reopenPaymentRecord))}</p>
                </div>
                <div className={metricCard}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Actual Paid</p>
                  <p className="mt-2 text-lg font-black text-blue-700">{formatPeso(Number(actualPaidAmount || 0))}</p>
                </div>
                <div className={metricCard}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Remaining</p>
                  <p className="mt-2 text-lg font-black text-indigo-700">
                    {formatPeso(Math.max(getRecordNet(reopenPaymentRecord) - Number(actualPaidAmount || 0), 0))}
                  </p>
                </div>
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Actual Paid Amount
              </span>
              <input
                value={actualPaidAmount}
                onChange={(event) => setActualPaidAmount(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none focus:border-blue-400"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Reason
              </span>
              <textarea
                value={reopenPaymentReason}
                onChange={(event) => setReopenPaymentReason(event.target.value)}
                placeholder="Example: Accidentally clicked full release but employee received partial payout only."
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeReopenPaymentModal}
                disabled={isProcessing}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reopenReleasedPaymentAsPartial}
                disabled={isProcessing}
                className={dangerButton}
              >
                {isProcessing ? "Processing..." : "Reopen As Partial"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-[28px] border border-blue-100 bg-blue-50 p-5 text-sm font-semibold text-blue-900 shadow-sm"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Locked payroll rule</p><p className="mt-1">Release is allowed for LOCKED or PARTIALLY RELEASED rows. Payment mistakes in Released History can be reopened individually or in batch as PARTIALLY RELEASED from Payroll Manager only.</p></div></div></section>
    </>,
  );
}





