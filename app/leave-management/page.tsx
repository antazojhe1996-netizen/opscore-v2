"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../lib/supabase";
import { createAuditLog } from "../lib/audit";
import * as XLSX from "xlsx";

export default function LeaveManagementPage() {
  /// STATES
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

  /// DATA
  const todayKey = new Date().toISOString().slice(0, 10);
  const currentMonthKey = todayKey.slice(0, 7);

  /// FUNCTIONS
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

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error);
      return;
    }

    const activeEmployees = (data || []).filter((emp) => {
      const status = String(emp.employment_status || "").toLowerCase();
      return (
        status !== "resigned" &&
        status !== "terminated" &&
        status !== "inactive" &&
        status !== "awol"
      );
    });

    setEmployees(activeEmployees);
  };

  const getLeaveRequests = async () => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET LEAVE REQUESTS ERROR:", error);
      return;
    }

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
      (data || [])
        .map((request) => String(request.reference_id || ""))
        .filter(Boolean),
    );
  };

  const getLeaveSettings = async () => {
    const { data, error } = await supabase
      .from("leave_settings")
      .select("*")
      .eq("is_enabled", true)
      .order("id", { ascending: true });

    if (error) {
      console.log("GET LEAVE SETTINGS ERROR:", error);
      return;
    }

    setLeaveSettings(data || []);

    if (data && data.length > 0 && !leaveType) {
      setLeaveType(data[0].leave_type);
    }
  };

  const getLeaveCredits = async () => {
    const { data, error } = await supabase
      .from("employee_leave_credits")
      .select("*");

    if (error) {
      console.log("GET LEAVE CREDITS ERROR:", error);
      return;
    }

    setLeaveCredits(data || []);
  };

  const getEmployee = (employeeId: any) => {
    return employees.find(
      (emp) =>
        String(emp.id) === String(employeeId) ||
        String(emp.employee_no) === String(employeeId),
    );
  };

  const getEmployeeName = (employeeId: any) => {
    const employee = getEmployee(employeeId);
    if (!employee) return "Unknown Employee";
    return `${employee.first_name} ${employee.last_name}`;
  };

  const getCurrentUserName = () =>
    localStorage.getItem("opscore_current_employee_name") ||
    localStorage.getItem("opscore_current_user_name") ||
    localStorage.getItem("opscore_username") ||
    "OPSCORE USER";

  const isLeaveCancellationPending = (leaveId: any) => {
    return pendingCancellationLeaveIds.includes(String(leaveId));
  };

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
        reason: reason.trim(),
        status: "Pending",
        requested_by: getCurrentUserName(),
        requested_at: new Date().toISOString(),
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
      console.log(
        "CREATE LEAVE APPROVAL REQUEST ERROR:",
        approvalError.message,
      );

      await supabase
        .from("leave_requests")
        .update({
          status: "Draft",
          reason: `${reason.trim()} | Approval request failed: ${approvalError.message}`,
        })
        .eq("id", leaveData.id);

      alert(
        "Leave was saved, but approval request failed. Check approval_requests columns.",
      );
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
      newValue: {
        leaveRequest: leaveData,
        approvalPayload: leavePayload,
      },
    });

    setEmployeeNo("");
    setStartDate("");
    setEndDate("");
    setReason("");

    await getLeaveRequests();
    alert("Leave request submitted to Manager Approval Center.");
  };

  const updateStatus = async (id: number, status: string) => {
    const leaveRequest = leaveRequests.find((leave) => leave.id === id);

    if (!leaveRequest) {
      alert("Leave request not found.");
      return;
    }

    if (status === "Approved") {
      const leavePolicy = leaveSettings.find(
        (setting) => setting.leave_type === leaveRequest.leave_type,
      );

      const shouldDeductCredits = leavePolicy?.requires_credits === true;

      if (shouldDeductCredits) {
        const { data: creditData, error: creditError } = await supabase
          .from("employee_leave_credits")
          .select("*")
          .eq("employee_no", leaveRequest.employee_id)
          .eq("leave_type", leaveRequest.leave_type)
          .single();

        if (creditError || !creditData) {
          alert("No leave credits found for this employee and leave type.");
          return;
        }

        const leaveDays = Number(leaveRequest.days || 0);
        const remainingCredits = Number(creditData.remaining_credits || 0);
        const usedCredits = Number(creditData.used_credits || 0);

        if (remainingCredits < leaveDays) {
          alert(
            `Insufficient leave credits.\n\nRemaining: ${remainingCredits}\nRequested: ${leaveDays}`,
          );
          return;
        }

        const { error: deductError } = await supabase
          .from("employee_leave_credits")
          .update({
            used_credits: usedCredits + leaveDays,
            remaining_credits: remainingCredits - leaveDays,
          })
          .eq("id", creditData.id);

        if (deductError) {
          console.log("DEDUCT CREDIT ERROR:", deductError);
          alert("Failed to deduct leave credits.");
          return;
        }
      }
    }

    const { error } = await supabase
      .from("leave_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.log("UPDATE STATUS ERROR:", error);
      alert("Failed to update leave status.");
      return;
    }

    getLeaveRequests();
    getLeaveCredits();
  };

  const cancelApproval = async (leave: any) => {
    const confirmed = confirm(
      "Cancel this approved leave? If credits were deducted, they will be restored.",
    );

    if (!confirmed) return;

    const leavePolicy = leaveSettings.find(
      (setting) => setting.leave_type === leave.leave_type,
    );

    const shouldRestoreCredits = leavePolicy?.requires_credits === true;

    if (shouldRestoreCredits) {
      const { data: creditData, error: creditError } = await supabase
        .from("employee_leave_credits")
        .select("*")
        .eq("employee_no", leave.employee_id)
        .eq("leave_type", leave.leave_type)
        .single();

      if (!creditError && creditData) {
        const leaveDays = Number(leave.days || 0);
        const remainingCredits = Number(creditData.remaining_credits || 0);
        const usedCredits = Number(creditData.used_credits || 0);

        await supabase
          .from("employee_leave_credits")
          .update({
            used_credits: Math.max(usedCredits - leaveDays, 0),
            remaining_credits: remainingCredits + leaveDays,
          })
          .eq("id", creditData.id);
      }
    }

    const { error } = await supabase
      .from("leave_requests")
      .update({ status: "Pending" })
      .eq("id", leave.id);

    if (error) {
      console.log("CANCEL APPROVAL ERROR:", error);
      alert("Failed to cancel approval.");
      return;
    }

    getLeaveRequests();
    getLeaveCredits();
  };

  const requestLeaveCancellation = async (leave: any) => {
    if (!leave?.id) {
      alert("Leave request not found.");
      return;
    }

    if (String(leave.status || "") !== "Approved") {
      alert("Only approved leaves can be requested for cancellation.");
      return;
    }

    if (isLeaveCancellationPending(leave.id)) {
      alert("A cancellation request is already pending for this leave.");
      return;
    }

    const cancellationReason = prompt(
      "Reason for cancelling this approved leave?",
    );

    if (!cancellationReason?.trim()) {
      alert("Cancellation reason is required.");
      return;
    }

    const employee = getEmployee(leave.employee_id);
    const employeeName =
      leave.employee_name || getEmployeeName(leave.employee_id);
    const days = Number(leave.days || leave.total_days || 0);
    const companyId =
      leave.company_id ||
      employee?.company_id ||
      localStorage.getItem("opscore_company_id") ||
      "default";

    const confirmed = confirm(
      `Submit cancellation request?\n\n${employeeName}\n${leave.leave_type || "Leave"}\n${leave.start_date} to ${leave.end_date}\nReason: ${cancellationReason.trim()}`,
    );

    if (!confirmed) return;

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
      description: `${employeeName} requested cancellation of approved leave. Reason: ${cancellationReason.trim()}`,
      severity: "warning",
      recordId: String(leave.id),
      oldValue: leave,
      newValue: payload,
    });

    await getPendingCancellationRequests();
    alert("Leave cancellation request submitted to Manager Approval Center.");
  };

  const deleteLeave = async (id: number) => {
    const confirmDelete = confirm("Delete this leave request?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE LEAVE ERROR:", error);
      return;
    }

    getLeaveRequests();
  };

  const statusStyle = (status: string) => {
    if (status === "Approved")
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (status === "Rejected")
      return "bg-red-500/10 text-red-300 border-red-500/20";
    if (status === "Cancelled")
      return "bg-slate-700 text-slate-300 border-slate-600";
    if (status === "Draft")
      return "bg-slate-700 text-slate-300 border-slate-600";
    return "bg-amber-500/10 text-amber-300 border-amber-500/20";
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

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getLeaveRequests();
    getLeaveSettings();
    getLeaveCredits();
    getPendingCancellationRequests();
  }, []);

  /// CALCULATIONS
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((leave) => {
      const employeeName = getEmployeeName(leave.employee_id).toLowerCase();

      const matchesStatus =
        statusFilter === "All" || leave.status === statusFilter;

      const matchesSearch =
        employeeName.includes(searchTerm.toLowerCase()) ||
        String(leave.leave_type || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        String(leave.reason || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [leaveRequests, statusFilter, searchTerm, employees]);

  const pendingCount = leaveRequests.filter(
    (leave) => leave.status === "Pending",
  ).length;

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
      ? [`${pendingCount} leave request(s) pending approval.`]
      : []),
    ...(pendingOlderThan3Days.length > 0
      ? [
          `${pendingOlderThan3Days.length} pending request(s) are waiting for 3+ days.`,
        ]
      : []),
    ...(employeesOnLeaveToday.length > 0
      ? [
          `${employeesOnLeaveToday.length} employee(s) are on approved leave today.`,
        ]
      : []),
    ...(lowCreditEmployees.length > 0
      ? [
          `${lowCreditEmployees.length} leave credit record(s) are low or nearly exhausted.`,
        ]
      : []),
  ];

  const selectedEmployeeCredits = leaveCredits.filter(
    (credit) => String(credit.employee_no) === String(employeeNo),
  );

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <section className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              HR Operations
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              Leave Management
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              File requests, review leave status, monitor credits, and manage
              approved leave cancellations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportLeaveReport}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              <Download size={15} /> Export
            </button>
            <a
              href="#new-leave-request"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500"
            >
              New Leave Request
            </a>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 shadow-xl shadow-black/20 backdrop-blur">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(240px,1fr)_180px]">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-slate-500"
                />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee, leave type, or reason..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-9 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CompactMetric
                label="Pending"
                value={pendingCount}
                danger={pendingCount > 0}
              />
              <CompactMetric
                label="On Leave Today"
                value={employeesOnLeaveToday.length}
                danger={employeesOnLeaveToday.length > 0}
              />
              <CompactMetric label="Approved MTD" value={approvedThisMonth} />
              <CompactMetric
                label="Low Credits"
                value={lowCreditEmployees.length}
                danger={lowCreditEmployees.length > 0}
              />
            </div>
          </div>
        </section>

        {aiNotifications.length > 0 && (
          <section className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <p className="font-bold text-amber-200">
                {aiNotifications.length} operational alert
                {aiNotifications.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-100/80">
                {aiNotifications.slice(0, 4).map((note, index) => (
                  <span key={index}>• {note}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-800 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">
                  Leave Request Queue
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {filteredLeaveRequests.length} request
                  {filteredLeaveRequests.length === 1 ? "" : "s"} shown.
                  Approval actions continue in Manager Approval Center.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  onClick={() => setStatusFilter("Pending")}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter("Approved")}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Approved
                </button>
                <button
                  onClick={() => setStatusFilter("All")}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-950 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Date Range</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLeaveRequests.map((leave) => (
                    <tr
                      key={leave.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="font-bold text-white">
                          {getEmployeeName(leave.employee_id)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Requested by {leave.requested_by || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-300">
                        {leave.leave_type || "-"}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-300">
                        <p>{leave.start_date || "-"}</p>
                        <p className="text-xs text-slate-500">
                          to {leave.end_date || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top font-bold text-white">
                        {leave.days || leave.total_days || 0}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(
                            leave.status,
                          )}`}
                        >
                          {leave.status || "Pending"}
                        </span>
                      </td>
                      <td className="max-w-[260px] px-4 py-3 align-top text-slate-400">
                        <p className="line-clamp-2">{leave.reason || "-"}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => setSelectedLeave(leave)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                          >
                            <Eye size={13} /> View
                          </button>

                          {leave.status === "Approved" &&
                            (isLeaveCancellationPending(leave.id) ? (
                              <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                                Cancellation Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => requestLeaveCancellation(leave)}
                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20"
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
                      <td
                        colSpan={7}
                        className="px-4 py-14 text-center text-slate-500"
                      >
                        No leave requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-5">
            <section
              id="new-leave-request"
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">New Leave Request</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Routed to Manager Approval Center.
                  </p>
                </div>
                <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                  Approval Required
                </span>
              </div>

              <div className="space-y-3">
                <Field label="Employee">
                  <select
                    value={employeeNo}
                    onChange={(e) => setEmployeeNo(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Leave Type">
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {leaveSettings.length === 0 && (
                      <option value="">No enabled leave types</option>
                    )}

                    {leaveSettings.map((leave) => (
                      <option key={leave.id} value={leave.leave_type}>
                        {leave.leave_type}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </Field>

                  <Field label="End Date">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </Field>
                </div>

                <Field label="Reason">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason..."
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </Field>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <MiniStat title="Days" value={calculateDays()} />
                  <button
                    onClick={submitLeave}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-black">Selected Employee Credits</h2>
              <p className="mt-1 text-xs text-slate-500">
                Select an employee in the request form to review credits.
              </p>

              <div className="mt-4 space-y-3">
                {selectedEmployeeCredits.length > 0 ? (
                  selectedEmployeeCredits.map((credit) => (
                    <div
                      key={credit.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-white">
                          {credit.leave_type}
                        </p>
                        <p
                          className={
                            Number(credit.remaining_credits || 0) <= 2
                              ? "font-black text-red-300"
                              : "font-black text-slate-200"
                          }
                        >
                          {credit.remaining_credits || 0} left
                        </p>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Used: {credit.used_credits || 0} • Total:{" "}
                        {credit.total_credits || credit.credits || "-"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                    No employee selected.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-black">Upcoming Approved Leaves</h2>
              <div className="mt-4 space-y-3">
                {upcomingLeaves.length > 0 ? (
                  upcomingLeaves.map((leave) => (
                    <button
                      key={leave.id}
                      onClick={() => setSelectedLeave(leave)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-left hover:bg-slate-800/60"
                    >
                      <p className="font-bold text-white">
                        {getEmployeeName(leave.employee_id)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {leave.leave_type || "Leave"} • {leave.start_date} to{" "}
                        {leave.end_date}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
                    No upcoming approved leaves.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </main>

      {selectedLeave && (
        <LeaveDetailsDrawer
          leave={selectedLeave}
          onClose={() => setSelectedLeave(null)}
          getEmployeeName={getEmployeeName}
          statusStyle={statusStyle}
          isLeaveCancellationPending={isLeaveCancellationPending}
          requestLeaveCancellation={requestLeaveCancellation}
        />
      )}
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
    <div
      className={`rounded-xl border px-3 py-2 ${danger ? "border-red-500/20 bg-red-500/10" : "border-slate-800 bg-slate-900"}`}
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
  const cardStyle = danger
    ? "border-red-500/20 bg-slate-900"
    : success
      ? "border-emerald-500/20 bg-slate-900"
      : "border-slate-800 bg-slate-900";

  const iconStyle = danger
    ? "bg-red-500/10 text-red-300"
    : success
      ? "bg-emerald-500/10 text-emerald-300"
      : "bg-slate-950 text-slate-300";

  return (
    <div className={`rounded-2xl border p-5 ${cardStyle}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`rounded-xl p-3 ${iconStyle}`}>{icon}</div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
      <h2 className="break-words text-2xl font-black text-white">{value}</h2>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <h3 className="mt-1 text-2xl font-black text-white">{value}</h3>
    </div>
  );
}

function LeaveDetailsDrawer({
  leave,
  onClose,
  getEmployeeName,
  statusStyle,
  isLeaveCancellationPending,
  requestLeaveCancellation,
}: any) {
  const days = Number(leave.days || leave.total_days || 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                Leave Details
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {getEmployeeName(leave.employee_id)}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                  {leave.leave_type || "Leave"}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(
                    leave.status,
                  )}`}
                >
                  {leave.status || "Pending"}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-slate-900 p-3 text-slate-400 hover:text-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <DetailCard label="Start Date" value={leave.start_date || "-"} />
            <DetailCard label="End Date" value={leave.end_date || "-"} />
            <DetailCard label="Total Days" value={days} highlight />
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black">Request Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <InfoRow
                label="Employee"
                value={getEmployeeName(leave.employee_id)}
              />
              <InfoRow label="Leave Type" value={leave.leave_type || "-"} />
              <InfoRow label="Requested By" value={leave.requested_by || "-"} />
              <InfoRow
                label="Requested At"
                value={leave.requested_at || leave.created_at || "-"}
              />
            </div>
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black">Reason</h3>
            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">
              {leave.reason || "No reason saved."}
            </p>
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black">Approval Status</h3>
            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Status" value={leave.status || "Pending"} />
              <InfoRow label="Approved By" value={leave.approved_by || "-"} />
              <InfoRow label="Approved At" value={leave.approved_at || "-"} />
              <InfoRow label="Rejected By" value={leave.rejected_by || "-"} />
              <InfoRow label="Rejected At" value={leave.rejected_at || "-"} />
              <InfoRow
                label="Rejection Reason"
                value={leave.rejection_reason || "-"}
              />
              <InfoRow
                label="Cancellation Reason"
                value={leave.cancellation_reason || "-"}
              />
            </div>
          </section>

          {leave.status === "Approved" && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-lg font-black">Available Action</h3>
              {isLeaveCancellationPending(leave.id) ? (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-300">
                  Cancellation request is already pending in Approval Center.
                </div>
              ) : (
                <button
                  onClick={() => requestLeaveCancellation(leave)}
                  className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20"
                >
                  Request Leave Cancellation
                </button>
              )}
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailCard({ label, value, highlight }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <h3
        className={`mt-2 break-words text-xl font-black ${
          highlight ? "text-blue-300" : "text-white"
        }`}
      >
        {value}
      </h3>
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="grid grid-cols-[145px_1fr] gap-3 rounded-xl bg-slate-950 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="break-all font-semibold text-slate-200">{value}</span>
    </div>
  );
}
