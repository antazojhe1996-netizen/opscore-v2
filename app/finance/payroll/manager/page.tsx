"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Lock, Search, Send, Users, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { canAccessPage } from "@/app/lib/pageAccess";

type ManagerTab = "review" | "locked" | "released" | "returned";
type RecordStatus = "DRAFT" | "REGISTERED" | "MANAGER_REVIEW" | "RETURNED_FOR_CORRECTION" | "LOCKED" | "RELEASED";

const STATUS = {
  DRAFT: "DRAFT",
  REGISTERED: "REGISTERED",
  MANAGER_REVIEW: "MANAGER_REVIEW",
  RETURNED_FOR_CORRECTION: "RETURNED_FOR_CORRECTION",
  LOCKED: "LOCKED",
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
    if (activeTab === "released" || activeTab === "returned") {
      setSelectedRecordIds([]);
    }
  }, [activeTab]);

  const formatPeso = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
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
    if (Object.values(STATUS).includes(explicit as RecordStatus)) return explicit as RecordStatus;

    const legacyStatus = String(record?.status || "").trim().toUpperCase();
    const releaseStatus = String(record?.release_status || "").trim().toUpperCase();
    const paidAmount = Number(record?.paid_amount || record?.released_amount || 0);

    if (legacyStatus === STATUS.RETURNED_FOR_CORRECTION) return STATUS.RETURNED_FOR_CORRECTION;
    if (["FOR APPROVAL", "APPROVED", "REGISTERED", "MANAGER REVIEW"].includes(legacyStatus)) return STATUS.MANAGER_REVIEW;
    if (legacyStatus === "LOCKED" || releaseStatus === "LOCKED") return STATUS.LOCKED;
    if (["RELEASED", "PAID", "PARTIALLY RELEASED"].includes(legacyStatus)) return STATUS.RELEASED;
    if (["RELEASED", "PAID", "PARTIALLY RELEASED"].includes(releaseStatus) || paidAmount > 0 || record?.released_at) return STATUS.RELEASED;
    return STATUS.DRAFT;
  };

  const getStatusLabel = (record: any) => getRecordStatus(record).replace(/_/g, " ");
  const getStatusClass = (status: RecordStatus) => {
    if (status === STATUS.MANAGER_REVIEW) return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === STATUS.RETURNED_FOR_CORRECTION) return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === STATUS.LOCKED) return "border-indigo-200 bg-indigo-50 text-indigo-700";
    if (status === STATUS.RELEASED) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  const getEmployeeName = (record: any) => record.employee_name || "Unknown Employee";
  const getRecordGross = (record: any) => Number(record.gross_pay || record.gross_amount || 0);
  const getRecordDeduction = (record: any) => Number(record.total_deductions || record.deductions || record.total_deduction || 0);
  const getRecordNet = (record: any) => Number(record.net_pay ?? record.net_amount ?? record.release_amount ?? 0);
  const getReleaseAmount = (record: any) => Math.max(getRecordNet(record), 0);
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
          [STATUS.MANAGER_REVIEW, STATUS.RETURNED_FOR_CORRECTION, STATUS.LOCKED, STATUS.RELEASED].includes(getRecordStatus(record) as any),
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
  const lockedRows = useMemo(() => records.filter((record) => getRecordStatus(record) === STATUS.LOCKED), [records]);
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
    if (activeTab === "locked") return filteredRows.filter((record) => getRecordStatus(record) === STATUS.LOCKED);
    return [];
  }, [activeTab, filteredRows]);

  const selectedActionableRows = useMemo(() => actionableRows.filter((record) => selectedRecordIds.includes(String(record.id))), [actionableRows, selectedRecordIds]);

  // One-button rule:
  // Review/Locked tabs may run selected or all.
  // Released History is read-only and has no workflow action.
  const actionTargetRows =
    selectedActionableRows.length > 0 ? selectedActionableRows : actionableRows;

  const actionLabel = (() => {
    if (activeTab === "released") return "History Only";

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
      } else if (statuses.some((status) => status === STATUS.LOCKED || status === STATUS.RELEASED)) {
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

  const createPayrollExpense = async (targetRows: any[]) => {
    if (targetRows.length === 0) return;
    const firstRecord = targetRows[0];
    const totalRelease = targetRows.reduce((sum, record) => sum + getReleaseAmount(record), 0);
    await supabase.from("expenses").insert({ company_id: firstRecord.company_id || getCurrentCompanyId(), expense_date: new Date().toISOString().slice(0, 10), category: "Payroll", subcategory: "Payroll Release", department: "Payroll", description: `Payroll Release - ${getPeriodLabel(firstRecord)}`, amount: totalRelease, payment_method: "Payroll", source: "Payroll Release", remarks: `Auto-generated from Payroll Manager per-record release. Period ID: ${firstRecord.period_id || "NO_PERIOD"}. Employees: ${targetRows.length}.` });
  };

  const saveReleaseTransactions = async (targetRows: any[], releasedBy: string) => {
    const companyId = getCurrentCompanyId();
    const payload = targetRows.map((record) => ({ company_id: record.company_id || companyId, payroll_record_id: record.id, payroll_period_id: record.period_id || null, employee_id: record.employee_id || null, employee_name: getEmployeeName(record), net_pay: getRecordNet(record), release_amount: getReleaseAmount(record), remaining_balance: 0, release_batch: getPeriodLabel(record), released_by: releasedBy, released_at: new Date().toISOString(), remarks: "Full salary release from Payroll Manager per-record workflow." }));
    if (payload.length === 0) return;
    const { error } = await supabase.from("payroll_release_transactions").insert(payload);
    if (error) throw new Error(error.message);
  };

  const releaseRecords = async (targetRows: any[]) => {
    const invalidRows = targetRows.filter((record) => getRecordStatus(record) !== STATUS.LOCKED);
    if (invalidRows.length > 0) return alert("Release blocked. Only LOCKED payroll records can be released.");
    const totalRelease = targetRows.reduce((sum, record) => sum + getReleaseAmount(record), 0);
    if (!confirm(`Release Payroll?\n\nEmployees: ${targetRows.length}\nRelease Amount: ${formatPeso(totalRelease)}\n\nOnly LOCKED rows will be released.`)) return;
    const releasedBy = prompt("Released by:", "Payroll Manager") || "Payroll Manager";
    const now = new Date().toISOString();
    const ids = targetRows.map((record) => record.id);
    const periodIds = Array.from(new Set(targetRows.map((record) => record.period_id).filter(Boolean)));
    await saveReleaseTransactions(targetRows, releasedBy.trim());
    await createPayrollExpense(targetRows);
    const { error } = await supabase.from("payroll_records").update({ record_status: STATUS.RELEASED, status: "Released", release_status: "Released", paid_amount: totalRelease, remaining_amount: 0, remaining_payroll_balance: 0, released_at: now, released_by: releasedBy.trim() }).in("id", ids);
    if (error) throw new Error(error.message);
    await updatePeriodStatusIfComplete(periodIds);
    await createAuditLog({ userName: releasedBy.trim(), module: "Payroll", action: "Release Payroll Records", description: `${targetRows.length} locked employee payroll record(s) released.`, severity: "warning", newValue: { ids, periodIds, totalRelease, status: STATUS.RELEASED } });
  };

  const returnEmployeeForCorrection = async (record: any) => {
    if (getRecordStatus(record) !== STATUS.MANAGER_REVIEW) return alert("Only MANAGER REVIEW rows can be returned for correction.");
    const reason = prompt(`Return ${getEmployeeName(record)} to Payroll Register correction queue?\n\nReason is required:`, "Payroll correction needed");
    if (!reason || !reason.trim()) return alert("Return reason is required.");
    if (!confirm(`Return Employee Only?\n\nEmployee: ${getEmployeeName(record)}\nPeriod: ${getPeriodLabel(record)}\nReason: ${reason.trim()}\n\nOnly this employee row will return to Payroll Register.`)) return;
    setIsProcessing(true);
    processingRef.current = true;
    try {
      const { error } = await supabase.from("payroll_records").update({ record_status: STATUS.RETURNED_FOR_CORRECTION, status: "Returned for Correction", release_status: "Returned for Correction", return_reason: reason.trim(), returned_at: new Date().toISOString(), returned_by: "Payroll Manager" }).eq("id", record.id).eq("record_status", STATUS.MANAGER_REVIEW);
      if (error) throw new Error(error.message);
      if (record.period_id) await updatePeriodStatusIfComplete([record.period_id]);
      await createAuditLog({ userName: "Payroll Manager", module: "Payroll", action: "Return Employee Payroll For Correction", description: `${getEmployeeName(record)} was returned to Payroll Register correction queue. Reason: ${reason.trim()}`, severity: "warning", recordId: record.id, oldValue: record, newValue: { record_status: STATUS.RETURNED_FOR_CORRECTION, reason: reason.trim() } });
      setSelectedRecordIds([]);
      await loadData();
      alert("Employee returned to Payroll Register correction queue.");
    } catch (error: any) {
      alert(`Return failed.\n\n${error?.message || error}`);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const tabConfig: Array<{ id: ManagerTab; label: string; count: number }> = [
    { id: "review", label: "Queue", count: managerReviewRows.length },
    { id: "locked", label: "Locked", count: lockedRows.length },
    { id: "released", label: "History", count: releasedRows.length },
    { id: "returned", label: "Returned", count: returnedRows.length },
  ];

  const workbenchStatus = managerReviewRows.length > 0 ? "Ready for Manager Lock" : lockedRows.length > 0 ? "Ready for Release" : returnedRows.length > 0 ? "Corrections Pending" : releasedRows.length > 0 ? "Released" : "Controlled";
  const queueTitle = activeTab === "review" ? "Payroll Review Queue" : activeTab === "locked" ? "Payroll Release Queue" : activeTab === "released" ? "Released Payroll History" : "Returned Corrections Monitor";
  const queueDescription = activeTab === "review" ? "Manager Review rows can be locked with one main button or returned individually for Register correction." : activeTab === "locked" ? "Only LOCKED payroll rows can be released." : activeTab === "released" ? "Released payroll is final and read-only. Corrections must be processed as Payroll Adjustments in the next cutoff." : "Rows here are no longer editable in Manager. Payroll Register must correct and resubmit them.";

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
            <p className="mt-1 text-sm font-medium text-slate-600">Per-employee payroll workflow. Manager Review → Locked → Released. Returns affect one employee only.</p>
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
            {selectedRecordIds.length > 0 && activeTab !== "released" && activeTab !== "returned" && (
              <button type="button" onClick={clearSelection} className={secondaryButton}>
                <X className="h-4 w-4" /> Clear ({selectedRecordIds.length})
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
                <tr><th className="w-12 px-4 py-4"><input type="checkbox" checked={actionableRows.length > 0 && actionableRows.every((record) => selectedRecordIds.includes(String(record.id)))} onChange={toggleSelectAll} disabled={activeTab === "returned" || activeTab === "released" || actionableRows.length === 0} /></th><th className="px-4 py-4">Employee</th><th className="px-4 py-4">Period</th><th className="px-4 py-4">Gross</th><th className="px-4 py-4">Deductions</th><th className="px-4 py-4">Net</th><th className="px-4 py-4">Release</th><th className="px-4 py-4">Carry</th><th className="px-4 py-4">Status</th><th className="px-4 py-4 text-right">Row Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((record) => {
                  const status = getRecordStatus(record);
                  const isActionable = actionableRows.some((row) => String(row.id) === String(record.id));
                  const isSelected = selectedRecordIds.includes(String(record.id));
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-4"><input type="checkbox" checked={isSelected} disabled={!isActionable} onChange={() => toggleSelect(record.id)} /></td>
                      <td className="px-4 py-4"><div className="font-black text-slate-950">{getEmployeeName(record)}</div><div className="mt-1 text-[11px] font-semibold text-slate-500">{record.department || "Unassigned"} • {record.position || "Unassigned"}</div></td>
                      <td className="px-4 py-4 font-bold text-slate-700">{getPeriodLabel(record)}</td>
                      <td className="px-4 py-4 font-black text-slate-950">{formatPeso(getRecordGross(record))}</td>
                      <td className="px-4 py-4 font-black text-rose-700">{formatPeso(getRecordDeduction(record))}</td>
                      <td className="px-4 py-4 font-black text-emerald-700">{formatPeso(getRecordNet(record))}</td>
                      <td className="px-4 py-4 font-black text-slate-950">{formatPeso(getReleaseAmount(record))}</td>
                      <td className="px-4 py-4 font-black text-indigo-700">{formatPeso(getCarryForwardAmount(record))}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase ${getStatusClass(status)}`}>{getStatusLabel(record)}</span>{status === STATUS.RETURNED_FOR_CORRECTION && record.return_reason && <div className="mt-1 max-w-[220px] text-[10px] font-semibold text-amber-700">{record.return_reason}</div>}</td>
                      <td className="px-4 py-4 text-right">{status === STATUS.MANAGER_REVIEW ? <button type="button" onClick={() => returnEmployeeForCorrection(record)} disabled={isProcessing} className={dangerButton}>Return</button> : status === STATUS.RETURNED_FOR_CORRECTION ? <span className="rounded-full bg-amber-50 px-3 py-2 text-[10px] font-black uppercase text-amber-700">Register Correction</span> : status === STATUS.LOCKED ? <span className="rounded-full bg-indigo-50 px-3 py-2 text-[10px] font-black uppercase text-indigo-700">Ready to Release</span> : <span className="rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase text-emerald-700">History Only</span>}</td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && <tr><td colSpan={10} className="px-4 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-500"><Users className="h-5 w-5" /></div><p className="mt-4 text-sm font-black text-slate-950">No payroll records found.</p><p className="mt-1 text-xs font-semibold text-slate-500">Change tab, period, or search filter.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-blue-100 bg-blue-50 p-5 text-sm font-semibold text-blue-900 shadow-sm"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Locked payroll rule</p><p className="mt-1">Release is blocked unless every selected row is LOCKED. Released payroll is final and history-only; corrections are handled through Payroll Adjustments in the next cutoff.</p></div></div></section>
    </>,
  );
}
