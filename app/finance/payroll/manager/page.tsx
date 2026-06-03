"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  Search,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function PayrollManagerPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<any[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const formatPeso = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
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

    const attendance = await getRowsFromTables([
      "attendance_entries",
      "time_entries",
      "attendance_records",
    ]);

    setEmployees(employeesData || []);
    setPayrollRecords(records || []);
    setPayrollAdjustments(adjustments || []);
    setAttendanceEntries(attendance || []);
  };

  const getEmployeeName = (employeeId: any) => {
    const employee = employees.find(
      (emp) =>
        String(emp.id) === String(employeeId) ||
        String(emp.employee_no) === String(employeeId)
    );

    if (!employee) return "Unknown Employee";
    return `${employee.first_name} ${employee.last_name}`;
  };

  const approveAdjustment = async (adjustment: any) => {
    const confirmed = confirm("Approve this payroll adjustment?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("payroll_adjustments")
      .update({ status: "Approved" })
      .eq("id", adjustment.id);

    if (error) {
      alert("Failed to approve adjustment. Check table name/columns.");
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
      alert("Failed to reject adjustment. Check table name/columns.");
      return;
    }

    loadData();
  };

  const markPayrollReleased = async (record: any) => {
    const confirmed = confirm("Mark this payroll as released?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("payroll_records")
      .update({
        status: "Released",
        released_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (error) {
      alert("Failed to release payroll. Check payroll_records columns.");
      return;
    }

    loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingAdjustments = payrollAdjustments.filter(
    (item) => String(item.status || "Pending") === "Pending"
  );

  const approvedAdjustments = payrollAdjustments.filter(
    (item) => String(item.status || "") === "Approved"
  );

  const pendingPayroll = payrollRecords.filter(
    (item) =>
      String(item.status || "Pending") === "Pending" ||
      String(item.status || "") === "For Approval"
  );

  const releasedPayroll = payrollRecords.filter(
    (item) => String(item.status || "") === "Released"
  );

  const totalPendingAmount = pendingPayroll.reduce(
    (sum, item) =>
      sum +
      Number(
        item.net_pay ||
          item.net_amount ||
          item.total_pay ||
          item.amount ||
          0
      ),
    0
  );

  const otEntries = attendanceEntries.filter(
    (entry) =>
      Number(entry.ot_hours || entry.overtime_hours || 0) > 0 &&
      String(entry.ot_status || entry.status || "Pending") === "Pending"
  );

  const filteredAdjustments = payrollAdjustments.filter((item) => {
    const employeeName = getEmployeeName(item.employee_id || item.employee_no);
    const text = `${employeeName} ${item.type} ${item.category} ${item.description} ${item.status}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const status =
      statusFilter === "All" ||
      String(item.status || "Pending") === statusFilter;

    return text && status;
  });

  const aiAlerts = [
    ...(pendingAdjustments.length > 0
      ? [`${pendingAdjustments.length} payroll adjustment(s) pending approval.`]
      : []),
    ...(otEntries.length > 0
      ? [`${otEntries.length} OT record(s) need review.`]
      : []),
    ...(pendingPayroll.length > 0
      ? [`${pendingPayroll.length} payroll record(s) awaiting release.`]
      : []),
    ...(totalPendingAmount > 0
      ? [`Pending payroll amount: ${formatPeso(totalPendingAmount)}.`]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payroll Manager</h1>
            <p className="mt-2 text-slate-400">
              Review payroll exceptions, OT records, deductions, cash advances, and final payroll release.
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-yellow-300">
              Payroll Status
            </p>
            <h2 className="mt-1 text-xl font-black text-yellow-400">
              Review Mode
            </h2>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={<Clock size={22} />} title="Pending Adjustments" value={pendingAdjustments.length} danger={pendingAdjustments.length > 0} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Pending OT" value={otEntries.length} danger={otEntries.length > 0} />
          <KpiCard icon={<FileCheck size={22} />} title="For Release" value={pendingPayroll.length} danger={pendingPayroll.length > 0} />
          <KpiCard icon={<CheckCircle2 size={22} />} title="Released Payroll" value={releasedPayroll.length} success />
          <KpiCard icon={<DollarSign size={22} />} title="Pending Amount" value={formatPeso(totalPendingAmount)} />
        </section>

        <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-yellow-300">
            <Brain size={22} /> AI Payroll Notifications
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {aiAlerts.length > 0 ? (
              aiAlerts.map((alert, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-yellow-500/20 bg-slate-950/70 p-4 text-sm text-yellow-200"
                >
                  ⚠ {alert}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                ✅ No payroll alerts detected.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <h2 className="text-xl font-bold">Payroll Approval Center</h2>
            <p className="mt-1 text-sm text-slate-400">
              Review adjustments before payroll release.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee / adjustment..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option>All</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
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
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAdjustments.map((item) => (
                    <tr key={item.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold">
                        {getEmployeeName(item.employee_id || item.employee_no)}
                      </td>
                      <td className="px-4 py-3">
                        {item.type || item.category || "Adjustment"}
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
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="text-xl font-bold">Payroll Release Monitor</h2>
            <p className="mt-1 text-sm text-slate-400">
              Final payroll records awaiting release.
            </p>

            <div className="mt-5 space-y-3">
              {pendingPayroll.length > 0 ? (
                pendingPayroll.slice(0, 8).map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">
                          {getEmployeeName(record.employee_id || record.employee_no)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {record.period_label || record.payroll_period || "Payroll Period"}
                        </p>
                      </div>

                      <p className="font-black text-yellow-400">
                        {formatPeso(record.net_pay || record.total_pay || record.amount || 0)}
                      </p>
                    </div>

                    <button
                      onClick={() => markPayrollReleased(record)}
                      className="mt-3 w-full rounded-lg bg-yellow-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-yellow-300"
                    >
                      Mark Released
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                  ✅ No payroll pending for release.
                </div>
              )}
            </div>
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
        <div className="rounded-full bg-slate-800 p-3 text-yellow-400">
          {icon}
        </div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "Approved"
      ? "bg-green-500/10 text-green-400"
      : status === "Rejected"
      ? "bg-red-500/10 text-red-400"
      : status === "Released"
      ? "bg-blue-500/10 text-blue-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {status}
    </span>
  );
}