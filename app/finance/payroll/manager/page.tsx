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
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<any[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPeso = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getRowsFromTables = async (tableNames: string[]) => {
    for (const table of tableNames) {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && data) return data;
    }

    return [];
  };

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

    setEmployees(employeesData || []);
    setPayrollRecords(records || []);
    setPayrollAdjustments(adjustments || []);
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

  const getPeriodLabel = (record: any) =>
    record.period_label || record.payroll_period || record.period_name || "Payroll Period";

  const createPayrollExpense = async (recordsToRelease: any[]) => {
    const firstRecord = recordsToRelease[0];
    const periodLabel = getPeriodLabel(firstRecord);
    const totalNetPay = recordsToRelease.reduce(
      (sum, record) => sum + getRecordAmount(record),
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

  const releasePayroll = async (mode: "selected" | "all") => {
    const targetRecords =
      mode === "all"
        ? filteredPendingPayroll
        : filteredPendingPayroll.filter((record) =>
            selectedRecordIds.includes(String(record.id))
          );

    if (targetRecords.length === 0) {
      alert("No payroll records selected for release.");
      return;
    }

    const negativeRecords = targetRecords.filter((record) => getRecordAmount(record) < 0);

    if (negativeRecords.length > 0) {
      alert(
        `Cannot release payroll. ${negativeRecords.length} employee(s) have negative net pay. Fix them in Payroll Register first.`
      );
      return;
    }

    const totalGross = targetRecords.reduce(
      (sum, record) => sum + getRecordGross(record),
      0
    );

    const totalDeductions = targetRecords.reduce(
      (sum, record) => sum + getRecordDeduction(record),
      0
    );

    const totalNet = targetRecords.reduce(
      (sum, record) => sum + getRecordAmount(record),
      0
    );

    const confirmed = confirm(
      `Release Payroll?

Mode: ${mode === "all" ? "Release All" : "Release Selected"}
Employees: ${targetRecords.length}
Gross Pay: ${formatPeso(totalGross)}
Deductions: ${formatPeso(totalDeductions)}
Net Pay: ${formatPeso(totalNet)}

This will create a Payroll expense automatically.`
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
      alert("Failed to release payroll records.");
      return console.log("RELEASE PAYROLL ERROR:", error.message);
    }

    for (const periodId of periodIds) {
      const periodRecords = targetRecords.filter((record) => record.period_id === periodId);
      await createPayrollExpense(periodRecords);

      await supabase
        .from("payroll_periods")
        .update({ status: "Released", released_at: new Date().toISOString() })
        .eq("id", periodId);
    }

    setIsProcessing(false);
    setSelectedRecordIds([]);
    await loadData();

    alert("Payroll released and expense entry created.");
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

  const approveAdjustment = async (adjustment: any) => {
    const confirmed = confirm("Approve this payroll adjustment?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("payroll_adjustments")
      .update({ status: "Approved" })
      .eq("id", adjustment.id);

    if (error) {
      alert("Failed to approve adjustment.");
      return;
    }

    loadData();
  };

  const rejectAdjustment = async (adjustment: any) => {
    const confirmed = confirm("Reject this payroll adjustment?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("payroll_adjustments")
      .update({ status: "Rejected" })
      .eq("id", adjustment.id);

    if (error) {
      alert("Failed to reject adjustment.");
      return;
    }

    loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingPayroll = payrollRecords.filter(
    (record) => String(record.status || "") === "For Approval"
  );

  const releasedPayroll = payrollRecords.filter(
    (record) => String(record.status || "") === "Released"
  );

  const pendingAdjustments = payrollAdjustments.filter(
    (item) => String(item.status || "Pending") === "Pending"
  );

  const periodOptions = Array.from(
    new Set(
      pendingPayroll
        .map((record) => getPeriodLabel(record))
        .filter(Boolean)
    )
  );

  const filteredPendingPayroll = pendingPayroll.filter((record) => {
    const text = `${getEmployeeName(record)} ${record.department} ${record.position} ${getPeriodLabel(record)}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const periodMatch = periodFilter === "All" || getPeriodLabel(record) === periodFilter;

    return text && periodMatch;
  });

  const negativePayroll = filteredPendingPayroll.filter(
    (record) => getRecordAmount(record) < 0
  );

  const readyForRelease = filteredPendingPayroll.filter(
    (record) => getRecordAmount(record) >= 0
  );

  const totalPendingNet = filteredPendingPayroll.reduce(
    (sum, record) => sum + getRecordAmount(record),
    0
  );

  const totalPendingGross = filteredPendingPayroll.reduce(
    (sum, record) => sum + getRecordGross(record),
    0
  );

  const totalPendingDeductions = filteredPendingPayroll.reduce(
    (sum, record) => sum + getRecordDeduction(record),
    0
  );

  const selectedRecords = [...filteredPendingPayroll, ...releasedPayroll].filter(
    (record) => selectedRecordIds.includes(String(record.id))
  );

  const selectedNet = selectedRecords.reduce(
    (sum, record) => sum + getRecordAmount(record),
    0
  );

  const selectedNegative = selectedRecords.filter(
    (record) => getRecordAmount(record) < 0
  );

  const filteredAdjustments = payrollAdjustments.filter((item) => {
    const employeeName = getEmployeeName(item);
    const text = `${employeeName} ${item.type} ${item.category} ${item.adjustment_type} ${item.description} ${item.remarks} ${item.status}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return text;
  });

  const aiAlerts = [
    ...(negativePayroll.length > 0
      ? [`${negativePayroll.length} employee(s) have negative net pay. Release is blocked.`]
      : []),
    ...(pendingAdjustments.length > 0
      ? [`${pendingAdjustments.length} payroll adjustment(s) pending approval.`]
      : []),
    ...(readyForRelease.length > 0
      ? [`${readyForRelease.length} payroll record(s) ready for release.`]
      : []),
    ...(totalPendingNet > 0
      ? [`Pending payroll net amount: ${formatPeso(totalPendingNet)}.`]
      : []),
  ];

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

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payroll Manager</h1>
            <p className="mt-2 text-slate-400">
              Batch review, release payroll, block negative net pay, and auto-create payroll expense.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-5 py-4 ${
              negativePayroll.length > 0
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em]">
              Release Status
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-black">
              {negativePayroll.length > 0 ? (
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
          <KpiCard icon={<Users size={22} />} title="For Release" value={filteredPendingPayroll.length} danger={filteredPendingPayroll.length > 0} />
          <KpiCard icon={<DollarSign size={22} />} title="Total Net Pay" value={formatPeso(totalPendingNet)} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Negative Payroll" value={negativePayroll.length} danger={negativePayroll.length > 0} />
          <KpiCard icon={<Brain size={22} />} title="Pending Adjustments" value={pendingAdjustments.length} danger={pendingAdjustments.length > 0} />
          <KpiCard icon={<CheckCircle2 size={22} />} title="Released" value={releasedPayroll.length} success />
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
                  alert.includes("negative")
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
                  Selected Net Pay: {formatPeso(selectedNet)} • Negative:{" "}
                  {selectedNegative.length}
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
                  disabled={isProcessing || selectedNegative.length > 0}
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
                <h2 className="text-xl font-bold">Payroll Batch Summary</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Batch release should be used after Register audit is complete.
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
                    negativePayroll.length > 0
                  }
                  className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
                >
                  <Send size={16} /> Release All Payroll
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MiniStat title="Employees" value={filteredPendingPayroll.length} />
              <MiniStat title="Gross Pay" value={formatPeso(totalPendingGross)} />
              <MiniStat title="Deductions" value={formatPeso(totalPendingDeductions)} danger />
              <MiniStat title="Net Pay" value={formatPeso(totalPendingNet)} success />
              <MiniStat title="Ready" value={readyForRelease.length} success />
              <MiniStat title="Blocked" value={negativePayroll.length} danger={negativePayroll.length > 0} />
            </div>

            {negativePayroll.length > 0 && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="font-black text-red-300">
                  Release blocked due to negative net pay.
                </p>
                <div className="mt-3 space-y-2">
                  {negativePayroll.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-lg bg-slate-950 px-4 py-2 text-sm"
                    >
                      <span>{getEmployeeName(record)}</span>
                      <span className="font-black text-red-400">
                        {formatPeso(getRecordAmount(record))}
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
          <h2 className="text-xl font-bold">Payroll Records For Release</h2>

          <div className="mt-5 max-h-[620px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1250px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredPendingPayroll.map((record) => (
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
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status || "For Approval"} />
                    </td>
                  </tr>
                ))}

                {filteredPendingPayroll.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No payroll records waiting for release.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Payroll Adjustment Review</h2>

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
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
                    <td className="px-4 py-3">
                      {String(item.status || "Pending") === "Pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveAdjustment(item)}
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold hover:bg-green-500"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectAdjustment(item)}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredAdjustments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
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
    normalized === "Released"
      ? "bg-blue-500/10 text-blue-400"
      : normalized === "Approved" || normalized === "For Approval"
      ? "bg-green-500/10 text-green-400"
      : normalized === "Rejected"
      ? "bg-red-500/10 text-red-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {normalized || "Pending"}
    </span>
  );
}