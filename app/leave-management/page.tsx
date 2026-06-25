import { supabase } from '@/lib/supabase';
"use client";


"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  Search,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";
import { createAuditLog } from "@/lib/audit";
import * as XLSX from "xlsx";

export default function LeaveManagementPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveSettings, setLeaveSettings] = useState<any[]>([]);
  const [leaveCredits, setLeaveCredits] = useState<any[]>([]);
  const [pendingCancellationLeaveIds, setPendingCancellationLeaveIds] =
    useState<string[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);

  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentMonthKey = todayKey.slice(0, 7);

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    if (end < start) return 0;
    return (
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) return console.log("GET EMPLOYEES ERROR:", error);

    setEmployees(
      (data || []).filter((emp) => {
        const status = String(emp.employment_status || "").toLowerCase();
        return !["resigned", "terminated", "inactive", "awol"].includes(status);
      }),
    );
  };

  const getLeaveRequests = async () => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return console.log("GET LEAVE REQUESTS ERROR:", error);
    setLeaveRequests(data || []);
  };

  const getPendingCancellationRequests = async () => {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("reference_id")
      .eq("request_type", "LEAVE_CANCELLATION")
      .eq("status", "PENDING");

    if (error) {
      console.log("GET PENDING LEAVE CANCELLATIONS ERROR:", error.message);
      setPendingCancellationLeaveIds([]);
      return;
    }

    setPendingCancellationLeaveIds(
      (data || []).map((r) => String(r.reference_id || "")).filter(Boolean),
    );
  };

  const getLeaveSettings = async () => {
    const { data, error } = await supabase
      .from("leave_settings")
      .select("*")
      .eq("is_enabled", true)
      .order("id", { ascending: true });

    if (error) return console.log("GET LEAVE SETTINGS ERROR:", error);

    setLeaveSettings(data || []);
    if (data && data.length > 0 && !leaveType) setLeaveType(data[0].leave_type);
  };

  const getLeaveCredits = async () => {
    const { data, error } = await supabase
      .from("employee_leave_credits")
      .select("*");

    if (error) return console.log("GET LEAVE CREDITS ERROR:", error);
    setLeaveCredits(data || []);
  };

  const getEmployee = (employeeId: any) =>
    employees.find(
      (emp) =>
        String(emp.id) === String(employeeId) ||
        String(emp.employee_no) === String(employeeId),
    );

  const getEmployeeName = (employeeId: any) => {
    const employee = getEmployee(employeeId);
    if (!employee) return "Unknown Employee";
    return `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
  };

  const getCurrentUserName = () =>
    localStorage.getItem("opscore_current_employee_name") ||
    localStorage.getItem("opscore_current_user_name") ||
    localStorage.getItem("opscore_username") ||
    "OPSCORE USER";

  const isLeaveCancellationPending = (leaveId: any) =>
    pendingCancellationLeaveIds.includes(String(leaveId));

  const submitLeave = async () => {
    const days = calculateDays();

    if (!employeeNo || !leaveType || !startDate || !endDate || !reason.trim()) {
      alert("Please complete all fields.");
      return;
    }

    if (days < 1) {
      alert("End date must be same or after start date.");
      return;
    }

    const employee = getEmployee(employeeNo);
    const employeeName = employee
      ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
      : "Unknown Employee";

    const companyId =
      employee?.company_id ||
      localStorage.getItem("opscore_company_id") ||
      "default";

    const leavePayload = {
      company_id: companyId,
      employee_id: employeeNo,
      employee_name: employeeName,
      employee_no: employee?.employee_no || null,
      department: employee?.department || null,
      position: employee?.position || null,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days,
      total_days: days,
      reason: reason.trim(),
      requested_by: getCurrentUserName(),
      requested_at: new Date().toISOString(),
    };

    const { data: leaveData, error: leaveError } = await supabase
      .from("leave_requests")
      .insert({
        ...leavePayload,
        status: "Pending",
      })
      .select()
      .single();

    if (leaveError) {
      console.log("SUBMIT LEAVE ERROR:", leaveError);
      alert(leaveError.message);
      return;
    }

    const { error: approvalError } = await supabase
      .from("approval_requests")
      .insert({
        company_id: companyId,
        request_type: "LEAVE_REQUEST",
        module: "Leave Management",
        reference_id: leaveData.id,
        title: `Leave Request - ${employeeName}`,
        description: `${employeeName} requested ${leaveType} from ${startDate} to ${endDate} (${days} day/s). Reason: ${reason.trim()}`,
        requested_by: getCurrentUserName(),
        status: "PENDING",
        request_payload: leavePayload,
      });

    if (approvalError) {
      await supabase
        .from("leave_requests")
        .update({
          status: "Draft",
          reason: `${reason.trim()} | Approval request failed: ${approvalError.message}`,
        })
        .eq("id", leaveData.id);

      alert("Leave was saved, but approval request failed.");
      await getLeaveRequests();
      return;
    }

    await createAuditLog({
      userName: getCurrentUserName(),
      module: "Leave Management",
      action: "Submit Leave Request",
      description: `${employeeName} submitted ${leaveType} leave for ${days} day(s).`,
      severity: "info",
      recordId: leaveData.id,
      newValue: { leaveRequest: leaveData, approvalPayload: leavePayload },
    });

    setEmployeeNo("");
    setStartDate("");
    setEndDate("");
    setReason("");

    await getLeaveRequests();
    alert("Leave request submitted to Manager Approval Center.");
  };

  const requestLeaveCancellation = async (leave: any) => {
    if (!leave?.id) return alert("Leave request not found.");
    if (String(leave.status || "") !== "Approved") {
      alert("Only approved leaves can be requested for cancellation.");
      return;
    }

    if (isLeaveCancellationPending(leave.id)) {
      alert("A cancellation request is already pending for this leave.");
      return;
    }

    const cancellationReason = prompt("Reason for cancelling this approved leave?");
    if (!cancellationReason?.trim()) return alert("Cancellation reason is required.");

    const employee = getEmployee(leave.employee_id);
    const employeeName =
      leave.employee_name || getEmployeeName(leave.employee_id);
    const days = Number(leave.days || leave.total_days || 0);
    const companyId =
      leave.company_id ||
      employee?.company_id ||
      localStorage.getItem("opscore_company_id") ||
      "default";

    const payload = {
      company_id: companyId,
      leave_id: leave.id,
      employee_id: leave.employee_id,
      employee_name: employeeName,
      employee_no: employee?.employee_no || leave.employee_no || null,
      department: employee?.department || leave.department || null,
      position: employee?.position || leave.position || null,
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      days,
      total_days: days,
      original_reason: leave.reason || "",
      cancellation_reason: cancellationReason.trim(),
      requested_by: getCurrentUserName(),
      requested_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("approval_requests").insert({
      company_id: companyId,
      request_type: "LEAVE_CANCELLATION",
      module: "Leave Management",
      reference_id: leave.id,
      title: `Leave Cancellation - ${employeeName}`,
      description: `${employeeName} requested cancellation of ${leave.leave_type || "leave"} from ${leave.start_date} to ${leave.end_date}. Reason: ${cancellationReason.trim()}`,
      requested_by: getCurrentUserName(),
      status: "PENDING",
      request_payload: payload,
    });

    if (error) {
      console.log("CREATE LEAVE CANCELLATION REQUEST ERROR:", error.message);
      alert(error.message);
      return;
    }

    await createAuditLog({
      userName: getCurrentUserName(),
      module: "Leave Management",
      action: "Request Leave Cancellation",
      description: `${employeeName} requested cancellation of approved leave.`,
      severity: "warning",
      recordId: String(leave.id),
      oldValue: leave,
      newValue: payload,
    });

    await getPendingCancellationRequests();
    alert("Leave cancellation request submitted to Manager Approval Center.");
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "Approved")
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "Rejected")
      return "border-red-200 bg-red-50 text-red-700";
    if (status === "Cancelled" || status === "Draft")
      return "border-slate-200 bg-slate-100 text-slate-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  const exportLeaveReport = () => {
    const rows = filteredLeaveRequests.map((leave) => ({
      Employee: getEmployeeName(leave.employee_id),
      Type: leave.leave_type,
      "Start Date": leave.start_date,
      "End Date": leave.end_date,
      Days: leave.days,
      Status: leave.status,
      Reason: leave.reason,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Report");
    XLSX.writeFile(workbook, "opscore_leave_report.xlsx");
  };

  useEffect(() => {
    getEmployees();
    getLeaveRequests();
    getLeaveSettings();
    getLeaveCredits();
    getPendingCancellationRequests();
  }, []);

  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((leave) => {
      const employeeName = getEmployeeName(leave.employee_id).toLowerCase();
      const matchesStatus =
        statusFilter === "All" || leave.status === statusFilter;
      const matchesSearch =
        employeeName.includes(searchTerm.toLowerCase()) ||
        String(leave.leave_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(leave.reason || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [leaveRequests, statusFilter, searchTerm, employees]);

  const pendingCount = leaveRequests.filter((leave) => leave.status === "Pending").length;

  const approvedThisMonth = leaveRequests.filter(
    (leave) =>
      leave.status === "Approved" &&
      String(leave.start_date || "").startsWith(currentMonthKey),
  ).length;

  const employeesOnLeaveToday = leaveRequests.filter(
    (leave) =>
      leave.status === "Approved" &&
      todayKey >= String(leave.start_date) &&
      todayKey <= String(leave.end_date),
  );

  const leaveDaysThisMonth = leaveRequests
    .filter(
      (leave) =>
        leave.status === "Approved" &&
        String(leave.start_date || "").startsWith(currentMonthKey),
    )
    .reduce((sum, leave) => sum + Number(leave.days || 0), 0);

  const pendingOlderThan3Days = leaveRequests.filter((leave) => {
    if (leave.status !== "Pending" || !leave.created_at) return false;
    const created = new Date(leave.created_at);
    const today = new Date(todayKey);
    const diff = Math.floor(
      (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff >= 3;
  });

  const upcomingLeaves = leaveRequests
    .filter(
      (leave) =>
        leave.status === "Approved" && String(leave.start_date) >= todayKey,
    )
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
    .slice(0, 6);

  const lowCreditEmployees = leaveCredits.filter(
    (credit) => Number(credit.remaining_credits || 0) <= 2,
  );

  const aiNotifications = [
    ...(pendingCount > 0
      ? [{ type: "warning", text: `${pendingCount} leave request(s) pending approval.` }]
      : []),
    ...(pendingOlderThan3Days.length > 0
      ? [{ type: "danger", text: `${pendingOlderThan3Days.length} pending request(s) are waiting for 3+ days.` }]
      : []),
    ...(employeesOnLeaveToday.length > 0
      ? [{ type: "info", text: `${employeesOnLeaveToday.length} employee(s) are on approved leave today.` }]
      : []),
    ...(lowCreditEmployees.length > 0
      ? [{ type: "warning", text: `${lowCreditEmployees.length} leave credit record(s) are low or nearly exhausted.` }]
      : []),
  ].slice(0, 5);

  const selectedEmployeeCredits = leaveCredits.filter(
    (credit) => String(credit.employee_no) === String(employeeNo),
  );

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="HR / LEAVE MANAGEMENT" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                HR Operations
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Leave Management
              </h1>
              <p className="mt-1 max-w-4xl text-sm font-medium text-slate-500">
                File requests, review leave status, monitor credits, and manage
                approved leave cancellation requests.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportLeaveReport}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                <Download size={16} /> Export
              </button>
              <a
                href="#new-leave-request"
                className="inline-flex h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
              >
                New Leave Request
              </a>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Pending" value={pendingCount} helper="Awaiting Approval Center review" tone={pendingCount > 0 ? "warning" : "neutral"} icon={<AlertTriangle size={18} />} />
            <KpiCard label="On Leave Today" value={employeesOnLeaveToday.length} helper="Approved active leaves today" tone={employeesOnLeaveToday.length > 0 ? "info" : "neutral"} icon={<CalendarDays size={18} />} />
            <KpiCard label="Approved MTD" value={approvedThisMonth} helper={`${leaveDaysThisMonth} approved leave day(s)`} tone="success" icon={<CheckCircle2 size={18} />} />
            <KpiCard label="Low Credits" value={lowCreditEmployees.length} helper="Remaining credits at 2 or below" tone={lowCreditEmployees.length > 0 ? "danger" : "neutral"} icon={<Bell size={18} />} />
          </section>

          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee, leave type, or reason..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-9 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Queue
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Leave Request Queue
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {filteredLeaveRequests.length} request{filteredLeaveRequests.length === 1 ? "" : "s"} shown.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Pending", "Approved", "All"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      {status === "All" ? "Clear" : status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Leave Type</th>
                      <th className="px-6 py-4">Date Range</th>
                      <th className="px-6 py-4">Days</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Reason</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {filteredLeaveRequests.map((leave) => (
                      <tr key={leave.id} className="transition-all duration-200 hover:bg-slate-50">
                        <td className="px-6 py-4 align-top">
                          <p className="font-black text-slate-950">
                            {getEmployeeName(leave.employee_id)}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Requested by {leave.requested_by || "-"}
                          </p>
                        </td>
                        <td className="px-6 py-4 align-top">{leave.leave_type || "-"}</td>
                        <td className="px-6 py-4 align-top">
                          <p>{leave.start_date || "-"}</p>
                          <p className="text-xs font-bold text-slate-500">to {leave.end_date || "-"}</p>
                        </td>
                        <td className="px-6 py-4 align-top font-black text-slate-950">
                          {leave.days || leave.total_days || 0}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(leave.status)}`}>
                            {leave.status || "Pending"}
                          </span>
                        </td>
                        <td className="max-w-[260px] px-6 py-4 align-top text-slate-600">
                          <p className="line-clamp-2">{leave.reason || "-"}</p>
                        </td>
                        <td className="px-6 py-4 align-top text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => setSelectedLeave(leave)}
                              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                            >
                              <Eye size={14} /> View
                            </button>

                            {leave.status === "Approved" &&
                              (isLeaveCancellationPending(leave.id) ? (
                                <span className="inline-flex h-10 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-700">
                                  Cancellation Pending
                                </span>
                              ) : (
                                <button
                                  onClick={() => requestLeaveCancellation(leave)}
                                  className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                                >
                                  Request Cancellation
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredLeaveRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <p className="font-black text-slate-950">No leave requests found.</p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            Try clearing filters or submit a new leave request.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="space-y-5">
              <section id="new-leave-request" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Request Form
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    New Leave Request
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Routed to Manager Approval Center.
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  <Field label="Employee">
                    <select value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                      <option value="">Select employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Leave Type">
                    <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                      {leaveSettings.length === 0 && <option value="">No enabled leave types</option>}
                      {leaveSettings.map((leave) => (
                        <option key={leave.id} value={leave.leave_type}>
                          {leave.leave_type}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Start Date">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                    </Field>

                    <Field label="End Date">
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                    </Field>
                  </div>

                  <Field label="Reason">
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Enter reason..." className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                  </Field>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <MiniStat title="Days" value={calculateDays()} />
                      <button onClick={submitLeave} className="h-11 self-end rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]">
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Credits</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Selected Employee Credits</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Select an employee in the request form to review credits.</p>

                <div className="mt-4 space-y-3">
                  {selectedEmployeeCredits.length > 0 ? (
                    selectedEmployeeCredits.map((credit) => (
                      <div key={credit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-slate-950">{credit.leave_type}</p>
                          <p className={Number(credit.remaining_credits || 0) <= 2 ? "font-black text-red-700" : "font-black text-slate-950"}>
                            {credit.remaining_credits || 0} left
                          </p>
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          Used: {credit.used_credits || 0} â€¢ Total: {credit.total_credits || credit.credits || "-"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      No employee selected.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Schedule</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Upcoming Approved Leaves</h2>

                <div className="mt-4 space-y-3">
                  {upcomingLeaves.length > 0 ? (
                    upcomingLeaves.map((leave) => (
                      <button key={leave.id} onClick={() => setSelectedLeave(leave)} className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                        <p className="font-black text-slate-950">{getEmployeeName(leave.employee_id)}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {leave.leave_type || "Leave"} â€¢ {leave.start_date} to {leave.end_date}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      No upcoming approved leaves.
                    </p>
                  )}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>

      <OpscoreAssistant reminders={aiNotifications} />

      {selectedLeave && (
        <LeaveDetailsDrawer
          leave={selectedLeave}
          onClose={() => setSelectedLeave(null)}
          getEmployeeName={getEmployeeName}
          getStatusBadgeClass={getStatusBadgeClass}
          isLeaveCancellationPending={isLeaveCancellationPending}
          requestLeaveCancellation={requestLeaveCancellation}
        />
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, helper, tone }: any) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "info"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-xl border p-3 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <h3 className="mt-1 text-lg font-black text-slate-950">{value}</h3>
    </div>
  );
}



function LeaveDetailsDrawer({
  leave,
  onClose,
  getEmployeeName,
  getStatusBadgeClass,
  isLeaveCancellationPending,
  requestLeaveCancellation,
}: any) {
  const days = Number(leave.days || leave.total_days || 0);

  return (
    <div className="fixed right-0 top-16 z-50 flex h-[calc(100vh-64px)] w-full justify-end bg-slate-950/35">
      <aside className="flex h-full w-full max-w-[820px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Leave Details
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {getEmployeeName(leave.employee_id)}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {leave.leave_type || "Leave"}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(leave.status)}`}>
                  {leave.status || "Pending"}
                </span>
              </div>
            </div>

            <button onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <section className="mb-5 grid grid-cols-3 gap-4">
            <DetailCard label="Start Date" value={leave.start_date || "-"} />
            <DetailCard label="End Date" value={leave.end_date || "-"} />
            <DetailCard label="Total Days" value={days} />
          </section>

          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Summary</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Request Summary</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Employee" value={getEmployeeName(leave.employee_id)} />
              <InfoRow label="Leave Type" value={leave.leave_type || "-"} />
              <InfoRow label="Requested By" value={leave.requested_by || "-"} />
              <InfoRow label="Requested At" value={leave.requested_at || leave.created_at || "-"} />
            </div>
          </section>

          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Reason</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Employee Reason</h3>
            <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
              {leave.reason || "No reason saved."}
            </p>
          </section>

          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Approval</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Approval Status</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Status" value={leave.status || "Pending"} />
              <InfoRow label="Approved By" value={leave.approved_by || "-"} />
              <InfoRow label="Approved At" value={leave.approved_at || "-"} />
              <InfoRow label="Rejected By" value={leave.rejected_by || "-"} />
              <InfoRow label="Rejected At" value={leave.rejected_at || "-"} />
              <InfoRow label="Rejection Reason" value={leave.rejection_reason || "-"} />
              <InfoRow label="Cancellation Reason" value={leave.cancellation_reason || "-"} />
            </div>
          </section>
        </div>

        {leave.status === "Approved" && (
          <div className="shrink-0 border-t border-slate-100 bg-white/95 p-6">
            {isLeaveCancellationPending(leave.id) ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                Cancellation request is already pending in Approval Center.
              </div>
            ) : (
              <button onClick={() => requestLeaveCancellation(leave)} className="h-11 w-full rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]">
                Request Leave Cancellation
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function DetailCard({ label, value }: any) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <h3 className="mt-2 break-words text-lg font-black text-slate-950">{value}</h3>
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="mt-1 block break-all font-semibold text-slate-800">{value}</span>
    </div>
  );
}





