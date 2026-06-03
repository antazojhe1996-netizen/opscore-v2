"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  DollarSign,
  Lock,
  RotateCcw,
  Search,
  Send,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function PayrollManagerPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<any[]>([]);
  const [employeeBalances, setEmployeeBalances] = useState<any[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [isProcessing, setIsProcessing] = useState(false);

  /// HELPERS
  const formatPeso = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const normalizeStatus = (value: any) => String(value || "").trim();

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
        String(emp.employee_no) === String(record.employee_no)
    );

    if (!employee) return "Unknown Employee";
    return `${employee.first_name} ${employee.last_name}`;
  };

  const getRecordAmount = (record: any) =>
    Number(record.net_pay || record.net_amount || record.total_pay || record.amount || 0);

  const getRecordGross = (record: any) =>
    Number(record.gross_pay || record.gross_amount || record.total_gross || 0);

  const getRecordDeduction = (record: any) =>
    Number(record.total_deductions || record.deductions || record.total_deduction || 0);

  const getReleaseAmount = (record: any) => Math.max(getRecordAmount(record), 0);

  const getCarryForwardAmount = (record: any) =>
    Math.max(Math.abs(Math.min(getRecordAmount(record), 0)), 0);

  const getPeriodLabel = (record: any) =>
    record.period_label || record.payroll_period || record.period_name || "Payroll Period";

  /// DATA LOADERS
  const loadData = async () => {
    const { data: employeesData } = await supabase.from("employees").select("*");

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

    const balances = await getRowsFromTables([
      "employee_balances",
    ]);

    setEmployees(employeesData || []);
    setPayrollRecords(records || []);
    setPayrollAdjustments(adjustments || []);
    setEmployeeBalances(balances || []);
  };

  /// FUNCTIONS
  const createPayrollExpense = async (recordsToRelease: any[]) => {
    if (recordsToRelease.length === 0) return;

    const firstRecord = recordsToRelease[0];
    const periodLabel = getPeriodLabel(firstRecord);
    const totalNetPay = recordsToRelease.reduce(
      (sum, record) => sum + getReleaseAmount(record),
      0
    );

    const today = new Date().toISOString().slice(0, 10);
    const periodId = firstRecord?.period_id || "NO_PERIOD";

    const { data: existingExpense } = await supabase
      .from("expenses")
      .select("id")
      .eq("source", "Payroll Release")
      .ilike("remarks", `%Period ID: ${periodId}%`)
      .maybeSingle();

    if (existingExpense) return;

    const { error } = await supabase.from("expenses").insert({
      expense_date: today,
      category: "Payroll",
      department: "Payroll",
      description: `Payroll Release - ${periodLabel}`,
      amount: totalNetPay,
      payment_method: "Payroll",
      remarks: `Auto Generated from Payroll Manager. Period ID: ${periodId}. Employees: ${recordsToRelease.length}.`,
      source: "Payroll Release",
    });

    if (error) {
      console.log("CREATE PAYROLL EXPENSE ERROR:", error.message);
      alert("Payroll released, but expense entry failed. Check expenses table columns.");
    }
  };

  const createCarryForwardBalances = async (recordsToRelease: any[]) => {
    const negativeRecords = recordsToRelease.filter(
      (record) => getCarryForwardAmount(record) > 0
    );

    if (negativeRecords.length === 0) return;

    const balanceRows = negativeRecords.map((record) => ({
      employee_id: record.employee_id || null,
      employee_name: getEmployeeName(record),
      balance_type: "Cash Advance Carry Forward",
      original_amount: getCarryForwardAmount(record),
      remaining_balance: getCarryForwardAmount(record),
      status: "Active",
      source_module: "Payroll Manager",
      source_id: record.id,
      period_id: record.period_id || null,
      remarks: `Auto carry forward from ${getPeriodLabel(record)}. Net pay was ${formatPeso(getRecordAmount(record))}.`,
    }));

    const { error } = await supabase.from("employee_balances").insert(balanceRows);

    if (error) {
      console.log("CREATE CARRY FORWARD BALANCE ERROR:", error.message);
      alert(
        "Payroll was released, but carry-forward balance failed to save. Check employee_balances table columns."
      );
    }
  };

  const releasePayrollRecords = async (targetRecords: any[], label: string) => {
    if (targetRecords.length === 0) {
      alert("No approved payroll records selected for release.");
      return;
    }

    if (pendingAdjustments.length > 0) {
      alert(
        `${pendingAdjustments.length} payroll adjustment(s) are still pending in Payroll Register. Approve/reject them in Register first, then regenerate payroll.`
      );
      return;
    }

    const negativeRecords = targetRecords.filter((record) => getRecordAmount(record) < 0);

    const totalGross = targetRecords.reduce(
      (sum, record) => sum + getRecordGross(record),
      0
    );

    const totalDeductions = targetRecords.reduce(
      (sum, record) => sum + getRecordDeduction(record),
      0
    );

    const totalNet = targetRecords.reduce(
      (sum, record) => sum + getReleaseAmount(record),
      0
    );

    const totalCarryForward = targetRecords.reduce(
      (sum, record) => sum + getCarryForwardAmount(record),
      0
    );

    const confirmed = confirm(
      `Release Payroll?

Mode: ${label}
Employees: ${targetRecords.length}
Gross Pay: ${formatPeso(totalGross)}
Deductions: ${formatPeso(totalDeductions)}
Release Amount: ${formatPeso(totalNet)}
Carry Forward: ${formatPeso(totalCarryForward)}

Employees with carry forward: ${negativeRecords.length}

This will mark payroll as Released, create a Payroll expense for actual release amount, and save carry-forward balances.`
    );

    if (!confirmed) return;

    setIsProcessing(true);

    const targetIds = targetRecords.map((record) => record.id);
    const periodIds = Array.from(
      new Set(targetRecords.map((record) => record.period_id).filter(Boolean))
    );

    const { error } = await supabase
      .from("payroll_records")
      .update({
        status: "Released",
        released_at: new Date().toISOString(),
      })
      .in("id", targetIds);

    if (error) {
      setIsProcessing(false);
      alert("Failed to release payroll.");
      return console.log("RELEASE PAYROLL ERROR:", error.message);
    }

    await Promise.all(
      targetRecords.map((record) =>
        supabase
          .from("payroll_records")
          .update({
            paid_amount: getReleaseAmount(record),
            carry_forward_amount: getCarryForwardAmount(record),
          })
          .eq("id", record.id)
      )
    );

    await createCarryForwardBalances(targetRecords);

    for (const periodId of periodIds) {
      const periodRecords = targetRecords.filter((record) => record.period_id === periodId);

      await createPayrollExpense(periodRecords);

      const remainingApproved = payrollRecords.filter(
        (record) =>
          record.period_id === periodId &&
          !targetIds.includes(record.id) &&
          ["For Approval", "Approved"].includes(normalizeStatus(record.status))
      );

      await supabase
        .from("payroll_periods")
        .update({
          status: remainingApproved.length > 0 ? "Partially Released" : "Released",
          released_at: new Date().toISOString(),
        })
        .eq("id", periodId);
    }

    setIsProcessing(false);
    setSelectedRecordIds([]);
    await loadData();

    alert("Payroll released and expense entry created.");
  };

  const releasePayroll = async (mode: "selected" | "all") => {
    const targetRecords =
      mode === "all"
        ? filteredApprovedPayroll
        : filteredApprovedPayroll.filter((record) =>
            selectedRecordIds.includes(String(record.id))
          );

    await releasePayrollRecords(
      targetRecords,
      mode === "all" ? "Release All" : "Release Selected"
    );
  };

  const releaseSinglePayroll = async (record: any) => {
    await releasePayrollRecords([record], `Release ${getEmployeeName(record)}`);
  };

  const reopenPayroll = async () => {
    const targetRecords = releasedPayroll.filter((record) =>
      selectedRecordIds.includes(String(record.id))
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
      `Reopen ${targetRecords.length} released payroll record(s)?`
    );

    if (!confirmed) return;

    setIsProcessing(true);

    const targetIds = targetRecords.map((record) => record.id);
    const periodIds = Array.from(
      new Set(targetRecords.map((record) => record.period_id).filter(Boolean))
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
        })
        .eq("id", periodId);
    }

    setIsProcessing(false);
    setSelectedRecordIds([]);
    await loadData();

    alert("Payroll reopened. Review Payroll Register before release.");
  };

  /// EFFECTS
  useEffect(() => {
    loadData();
  }, []);

  /// CALCULATIONS
  const approvedPayroll = payrollRecords.filter((record) => {
    const status = normalizeStatus(record.status);
    return status === "For Approval" || status === "Approved";
  });

  const releasedPayroll = payrollRecords.filter((record) => {
    const status = normalizeStatus(record.status);
    return status === "Released" || status === "Paid";
  });

  const pendingAdjustments = payrollAdjustments.filter(
    (item) => normalizeStatus(item.status || "Pending") === "Pending"
  );

  const approvedAdjustments = payrollAdjustments.filter(
    (item) => normalizeStatus(item.status) === "Approved"
  );

  const rejectedAdjustments = payrollAdjustments.filter(
    (item) => normalizeStatus(item.status) === "Rejected"
  );

  const periodOptions = Array.from(
    new Set(approvedPayroll.map((record) => getPeriodLabel(record)).filter(Boolean))
  );

  const filteredApprovedPayroll = approvedPayroll.filter((record) => {
    const text = `${getEmployeeName(record)} ${record.department} ${record.position} ${getPeriodLabel(record)}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const periodMatch =
      periodFilter === "All" || getPeriodLabel(record) === periodFilter;

    return text && periodMatch;
  });

  const negativePayroll = filteredApprovedPayroll.filter(
    (record) => getRecordAmount(record) < 0
  );

  const readyForRelease = filteredApprovedPayroll;

  const totalPendingNet = filteredApprovedPayroll.reduce(
    (sum, record) => sum + getReleaseAmount(record),
    0
  );

  const totalCarryForward = filteredApprovedPayroll.reduce(
    (sum, record) => sum + getCarryForwardAmount(record),
    0
  );

  const totalPendingGross = filteredApprovedPayroll.reduce(
    (sum, record) => sum + getRecordGross(record),
    0
  );

  const totalPendingDeductions = filteredApprovedPayroll.reduce(
    (sum, record) => sum + getRecordDeduction(record),
    0
  );

  const selectedRecords = [...filteredApprovedPayroll, ...releasedPayroll].filter(
    (record) => selectedRecordIds.includes(String(record.id))
  );

  const selectedNet = selectedRecords.reduce(
    (sum, record) => sum + getReleaseAmount(record),
    0
  );

  const selectedCarryForward = selectedRecords.reduce(
    (sum, record) => sum + getCarryForwardAmount(record),
    0
  );

  const selectedNegative = selectedRecords.filter(
    (record) => getRecordAmount(record) < 0
  );

  const filteredAdjustments = payrollAdjustments.filter((item) => {
    const employeeName = item.employee_name || getEmployeeName(item);
    return `${employeeName} ${item.type} ${item.category} ${item.adjustment_type} ${item.description} ${item.remarks} ${item.status}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  const totalApprovedAdjustmentAmount = approvedAdjustments.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const aiAlerts = [
    ...(pendingAdjustments.length > 0
      ? [`${pendingAdjustments.length} pending adjustment(s) still need Register approval before release.`]
      : []),
    ...(negativePayroll.length > 0
      ? [`${negativePayroll.length} employee(s) have negative net pay. They will release as ₱0 with carry-forward balance.`]
      : []),
    ...(readyForRelease.length > 0
      ? [`${readyForRelease.length} payroll record(s) ready for release.`]
      : []),
    ...(totalPendingNet > 0
      ? [`Approved payroll net amount: ${formatPeso(totalPendingNet)}.`]
      : []),
  ];

  const releaseBlocked = pendingAdjustments.length > 0;

  const toggleSelect = (id: any) => {
    const key = String(id);
    setSelectedRecordIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const selectAllReady = () => {
    setSelectedRecordIds(readyForRelease.map((record) => String(record.id)));
  };

  const clearSelection = () => {
    setSelectedRecordIds([]);
  };

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payroll Manager</h1>
            <p className="mt-2 text-slate-400">
              Release approved payroll only. CA/deduction approvals must be completed in Payroll Register.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-5 py-4 ${
              releaseBlocked
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em]">
              Release Status
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-black">
              {releaseBlocked ? (
                <>
                  <Lock size={18} /> Blocked
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Ready
                </>
              )}
            </h2>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={<Users size={22} />} title="For Release" value={filteredApprovedPayroll.length} danger={filteredApprovedPayroll.length > 0} />
          <KpiCard icon={<DollarSign size={22} />} title="For Release Amount" value={formatPeso(totalPendingNet)} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Pending Register Approval" value={pendingAdjustments.length} danger={pendingAdjustments.length > 0} />
          <KpiCard icon={<Brain size={22} />} title="Carry Forward Employees" value={negativePayroll.length} danger={negativePayroll.length > 0} />
          <KpiCard icon={<CheckCircle2 size={22} />} title="Released Payroll" value={releasedPayroll.length} success />
        </section>

        <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-yellow-300">
            <Brain size={22} /> AI Payroll Release Check
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {aiAlerts.map((alert, index) => (
              <div
                key={index}
                className={`rounded-xl border p-4 text-sm ${
                  alert.includes("negative") || alert.includes("pending")
                    ? "border-red-500/20 bg-red-500/10 text-red-200"
                    : "border-yellow-500/20 bg-slate-950/70 text-yellow-200"
                }`}
              >
                ⚠ {alert}
              </div>
            ))}

            {aiAlerts.length === 0 && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                ✅ No payroll release alerts detected.
              </div>
            )}
          </div>
        </section>

        {selectedRecordIds.length > 0 && (
          <section className="sticky top-3 z-40 mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-black text-yellow-300">
                  {selectedRecordIds.length} payroll record(s) selected
                </p>
                <p className="mt-1 text-xs text-yellow-100/80">
                  Release Amount: {formatPeso(selectedNet)} • Carry Forward:{" "}
                  {formatPeso(selectedCarryForward)}
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
                  onClick={() => releasePayroll("selected")}
                  disabled={
                    isProcessing ||
                    pendingAdjustments.length > 0
                  }
                  className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
                >
                  <Send size={16} /> Release Selected
                </button>

                <button
                  onClick={reopenPayroll}
                  disabled={isProcessing}
                  className="flex items-center gap-2 rounded-xl border border-yellow-500/40 px-5 py-2 text-sm font-black text-yellow-300 hover:bg-yellow-500/10 disabled:opacity-50"
                >
                  <RotateCcw size={16} /> Reopen Selected
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">Payroll Batch Release Summary</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Release is allowed only after Register audit and adjustment approval.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={selectAllReady}
                  disabled={readyForRelease.length === 0}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Select All Ready
                </button>

                <button
                  onClick={() => releasePayroll("all")}
                  disabled={
                    isProcessing ||
                    readyForRelease.length === 0 ||
                    releaseBlocked
                  }
                  className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
                >
                  <Send size={16} /> Release All Payroll
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MiniStat title="Employees" value={filteredApprovedPayroll.length} />
              <MiniStat title="Gross Pay" value={formatPeso(totalPendingGross)} />
              <MiniStat title="Deductions" value={formatPeso(totalPendingDeductions)} danger />
              <MiniStat title="Release Amount" value={formatPeso(totalPendingNet)} success />
              <MiniStat title="Ready" value={readyForRelease.length} success />
              <MiniStat title="Carry Forward" value={formatPeso(totalCarryForward)} danger={totalCarryForward > 0} />
            </div>

            {pendingAdjustments.length > 0 && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="font-black text-red-300">
                  Release blocked: pending approvals must be handled in Payroll Register.
                </p>
                <p className="mt-1 text-sm text-red-200">
                  Approve/reject CA, deductions, or adjustments in Register, then generate payroll again before release.
                </p>
              </div>
            )}

            {negativePayroll.length > 0 && (
              <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="font-black text-yellow-300">
                  Carry-forward warning: negative net pay will be released as ₱0.
                </p>
                <p className="mt-1 text-sm text-yellow-100/80">
                  The remaining deduction will be saved to Employee Balances for the next cutoff.
                </p>
                <div className="mt-3 space-y-2">
                  {negativePayroll.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-lg bg-slate-950 px-4 py-2 text-sm"
                    >
                      <span>{getEmployeeName(record)}</span>
                      <span className="font-black text-yellow-300">
                        Carry Forward {formatPeso(getCarryForwardAmount(record))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="text-xl font-bold">Filters</h2>

            <div className="mt-5 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee / period..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none"
                />
              </div>

              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="All">All Periods</option>
                {periodOptions.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Payroll Release Queue</h2>

          <div className="mt-5 max-h-[620px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1400px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Computed Net</th>
                  <th className="px-4 py-3 text-right">Release</th>
                  <th className="px-4 py-3 text-right">Carry Forward</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredApprovedPayroll.map((record) => (
                  <tr
                    key={record.id}
                    className={`border-t border-slate-800 hover:bg-slate-800/40 ${
                      getRecordAmount(record) < 0 ? "bg-red-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRecordIds.includes(String(record.id))}
                        onChange={() => toggleSelect(record.id)}
                        className="h-4 w-4 accent-yellow-400"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-black">{getEmployeeName(record)}</p>
                      <p className="text-xs text-slate-500">
                        {record.department || "-"} • {record.position || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{getPeriodLabel(record)}</td>
                    <td className="px-4 py-3 text-right">{formatPeso(getRecordGross(record))}</td>
                    <td className="px-4 py-3 text-right text-red-400">
                      {formatPeso(getRecordDeduction(record))}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-black ${
                        getRecordAmount(record) < 0
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {formatPeso(getRecordAmount(record))}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-400">
                      {formatPeso(getReleaseAmount(record))}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-yellow-300">
                      {formatPeso(getCarryForwardAmount(record))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status || "For Approval"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => releaseSinglePayroll(record)}
                        disabled={
                          isProcessing ||
                          releaseBlocked
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Release
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredApprovedPayroll.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      No approved payroll records waiting for release.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Employee Balance Monitor</h2>
          <p className="mt-1 text-sm text-slate-400">
            Active carry-forward balances created from negative payroll releases.
          </p>

          <div className="mt-5 max-h-[360px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Original</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>

              <tbody>
                {employeeBalances
                  .filter((item) => String(item.status || "Active") === "Active")
                  .map((item) => (
                    <tr key={item.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold">{item.employee_name || "Unknown Employee"}</td>
                      <td className="px-4 py-3">{item.balance_type || "Balance"}</td>
                      <td className="px-4 py-3 text-right">{formatPeso(item.original_amount)}</td>
                      <td className="px-4 py-3 text-right font-black text-yellow-300">
                        {formatPeso(item.remaining_balance)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status || "Active"} />
                      </td>
                      <td className="px-4 py-3 text-slate-400">{item.remarks || "-"}</td>
                    </tr>
                  ))}

                {employeeBalances.filter((item) => String(item.status || "Active") === "Active").length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No active employee balances.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Register Adjustment Status</h2>
          <p className="mt-1 text-sm text-slate-400">
            Read-only. Approve or reject adjustments in Payroll Register only.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <MiniStat title="Pending" value={pendingAdjustments.length} danger={pendingAdjustments.length > 0} />
            <MiniStat title="Approved" value={approvedAdjustments.length} success />
            <MiniStat title="Rejected" value={rejectedAdjustments.length} />
            <MiniStat title="Approved Amount" value={formatPeso(totalApprovedAdjustmentAmount)} />
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
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
                  <tr key={item.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold">{item.employee_name || getEmployeeName(item)}</td>
                    <td className="px-4 py-3">{item.adjustment_type || item.type || item.category || "Adjustment"}</td>
                    <td className="px-4 py-3 text-slate-300">{item.description || item.remarks || "-"}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatPeso(item.amount || 0)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status || "Pending"} />
                    </td>
                  </tr>
                ))}

                {filteredAdjustments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No payroll adjustments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
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
        <div className="rounded-full bg-slate-800 p-3 text-yellow-400">{icon}</div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}

function MiniStat({ title, value, success, danger }: any) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
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
    normalized === "Active"
      ? "bg-yellow-500/10 text-yellow-400"
      : normalized === "Closed"
      ? "bg-green-500/10 text-green-400"
      : normalized === "Released" || normalized === "Paid"
      ? "bg-blue-500/10 text-blue-400"
      : normalized === "Approved" || normalized === "For Approval"
      ? "bg-green-500/10 text-green-400"
      : normalized === "Rejected"
      ? "bg-red-500/10 text-red-400"
      : normalized === "Partially Released"
      ? "bg-yellow-500/10 text-yellow-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {normalized || "Pending"}
    </span>
  );
}
