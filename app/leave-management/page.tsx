"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CalendarDays,
  CheckCircle2,
  Download,
  Search,
  UserRound,
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
  const [pendingCancellationLeaveIds, setPendingCancellationLeaveIds] = useState<string[]>([]);

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
        .filter(Boolean)
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
        String(emp.employee_no) === String(employeeId)
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

    const leavePayload = {
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
        employee_id: employeeNo,
        employee_name: employeeName,
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
      console.log("CREATE LEAVE APPROVAL REQUEST ERROR:", approvalError.message);

      await supabase
        .from("leave_requests")
        .update({
          status: "Draft",
          reason: `${reason.trim()} | Approval request failed: ${approvalError.message}`,
        })
        .eq("id", leaveData.id);

      alert("Leave was saved, but approval request failed. Check approval_requests columns.");
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
        (setting) => setting.leave_type === leaveRequest.leave_type
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
            `Insufficient leave credits.\n\nRemaining: ${remainingCredits}\nRequested: ${leaveDays}`
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
      "Cancel this approved leave? If credits were deducted, they will be restored."
    );

    if (!confirmed) return;

    const leavePolicy = leaveSettings.find(
      (setting) => setting.leave_type === leave.leave_type
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

    const cancellationReason = prompt("Reason for cancelling this approved leave?");

    if (!cancellationReason?.trim()) {
      alert("Cancellation reason is required.");
      return;
    }

    const employee = getEmployee(leave.employee_id);
    const employeeName = leave.employee_name || getEmployeeName(leave.employee_id);
    const days = Number(leave.days || leave.total_days || 0);

    const confirmed = confirm(
      `Submit cancellation request?\n\n${employeeName}\n${leave.leave_type || "Leave"}\n${leave.start_date} to ${leave.end_date}\nReason: ${cancellationReason.trim()}`
    );

    if (!confirmed) return;

    const payload = {
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

    const { error } = await supabase.from("leave_requests").delete().eq("id", id);

    if (error) {
      console.log("DELETE LEAVE ERROR:", error);
      return;
    }

    getLeaveRequests();
  };

  const statusStyle = (status: string) => {
    if (status === "Approved") return "bg-green-500/20 text-green-400 border-green-500/30";
    if (status === "Rejected") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (status === "Cancelled") return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
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
        String(leave.leave_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(leave.reason || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [leaveRequests, statusFilter, searchTerm, employees]);

  const pendingCount = leaveRequests.filter(
    (leave) => leave.status === "Pending"
  ).length;

  const approvedThisMonth = leaveRequests.filter(
    (leave) =>
      leave.status === "Approved" &&
      String(leave.start_date || "").startsWith(currentMonthKey)
  ).length;

  const employeesOnLeaveToday = leaveRequests.filter(
    (leave) =>
      leave.status === "Approved" &&
      todayKey >= String(leave.start_date) &&
      todayKey <= String(leave.end_date)
  );

  const leaveDaysThisMonth = leaveRequests
    .filter(
      (leave) =>
        leave.status === "Approved" &&
        String(leave.start_date || "").startsWith(currentMonthKey)
    )
    .reduce((sum, leave) => sum + Number(leave.days || 0), 0);

  const pendingOlderThan3Days = leaveRequests.filter((leave) => {
    if (leave.status !== "Pending" || !leave.created_at) return false;

    const created = new Date(leave.created_at);
    const today = new Date(todayKey);
    const diff = Math.floor(
      (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );

    return diff >= 3;
  });

  const upcomingLeaves = leaveRequests
    .filter(
      (leave) =>
        leave.status === "Approved" &&
        String(leave.start_date) >= todayKey
    )
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
    .slice(0, 6);

  const lowCreditEmployees = leaveCredits.filter(
    (credit) => Number(credit.remaining_credits || 0) <= 2
  );

  const aiNotifications = [
    ...(pendingCount > 0
      ? [`${pendingCount} leave request(s) pending approval.`]
      : []),
    ...(pendingOlderThan3Days.length > 0
      ? [`${pendingOlderThan3Days.length} pending request(s) are waiting for 3+ days.`]
      : []),
    ...(employeesOnLeaveToday.length > 0
      ? [`${employeesOnLeaveToday.length} employee(s) are on approved leave today.`]
      : []),
    ...(lowCreditEmployees.length > 0
      ? [`${lowCreditEmployees.length} leave credit record(s) are low or nearly exhausted.`]
      : []),
  ];

  const selectedEmployeeCredits = leaveCredits.filter(
    (credit) => String(credit.employee_no) === String(employeeNo)
  );

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leave Management</h1>
            <p className="mt-2 text-slate-400">
              Submit leave requests, monitor approvals, track credits, and sync approved leaves with scheduling.
            </p>
          </div>

          <button
            onClick={exportLeaveReport}
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-yellow-300"
          >
            <Download size={16} /> Export Leave Report
          </button>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<AlertTriangle size={22} />} title="Pending Requests" value={pendingCount} danger={pendingCount > 0} />
          <KpiCard icon={<CheckCircle2 size={22} />} title="Approved This Month" value={approvedThisMonth} success />
          <KpiCard icon={<UserRound size={22} />} title="On Leave Today" value={employeesOnLeaveToday.length} danger={employeesOnLeaveToday.length > 0} />
          <KpiCard icon={<CalendarDays size={22} />} title="Leave Days This Month" value={leaveDaysThisMonth} />
        </section>

        <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-yellow-300">
            <Brain size={22} /> AI Leave Notifications
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {aiNotifications.length > 0 ? (
              aiNotifications.map((note, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-yellow-500/20 bg-slate-950/70 p-4 text-sm text-yellow-200"
                >
                  ⚠ {note}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                ✅ No leave alerts. Leave operations are currently healthy.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <h2 className="text-xl font-bold">Submit Leave Request</h2>
            <p className="mt-1 text-sm text-slate-400">
              Approved leave will automatically block scheduling.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Employee">
                <select
                  value={employeeNo}
                  onChange={(e) => setEmployeeNo(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
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

              <Field label="Start Date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />
              </Field>

              <Field label="End Date">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Reason">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason..."
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <MiniStat title="Total Days" value={calculateDays()} />
              <button
                onClick={submitLeave}
                className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-yellow-300"
              >
                Submit Leave
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="text-xl font-bold">Leave Credits Summary</h2>
            <p className="mt-1 text-sm text-slate-400">
              Shows selected employee credits when available.
            </p>

            <div className="mt-5 space-y-3">
              {selectedEmployeeCredits.length > 0 ? (
                selectedEmployeeCredits.map((credit) => (
                  <div
                    key={credit.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold">{credit.leave_type}</p>
                      <p
                        className={
                          Number(credit.remaining_credits || 0) <= 2
                            ? "font-black text-red-400"
                            : "font-black text-green-400"
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
                  Select an employee to view leave credits.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold">Leave Requests</h2>
              <p className="mt-1 text-sm text-slate-400">
                Approval is handled in Manager Approval Center. This page is for submission, monitoring, and leave history.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search leave..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date Range</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeaveRequests.map((leave) => (
                  <tr
                    key={leave.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-bold">
                      {getEmployeeName(leave.employee_id)}
                    </td>
                    <td className="px-4 py-3">{leave.leave_type}</td>
                    <td className="px-4 py-3">
                      {leave.start_date} to {leave.end_date}
                    </td>
                    <td className="px-4 py-3">{leave.days}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {leave.reason || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(
                          leave.status
                        )}`}
                      >
                        {leave.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {leave.status === "Pending" && (
                        <span className="rounded-lg bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300">
                          Awaiting Manager Approval
                        </span>
                      )}

                      {leave.status === "Approved" && (
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-lg bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                            Approved via Approval Center
                          </span>

                          {isLeaveCancellationPending(leave.id) ? (
                            <span className="rounded-lg bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300">
                              Cancellation Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => requestLeaveCancellation(leave)}
                              className="rounded-lg bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300 hover:bg-orange-500/20"
                            >
                              Request Cancellation
                            </button>
                          )}
                        </div>
                      )}

                      {leave.status === "Rejected" && (
                        <span className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
                          Rejected via Approval Center
                        </span>
                      )}

                      {leave.status === "Cancelled" && (
                        <span className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                          Leave Cancelled
                        </span>
                      )}

                      {leave.status === "Draft" && (
                        <span className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                          Approval request failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredLeaveRequests.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No leave requests found.
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
        <div className="rounded-full bg-slate-800 p-3 text-yellow-400">
          {icon}
        </div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
      <h2 className="text-2xl font-bold">{value}</h2>
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

function MiniStat({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <h3 className="mt-1 text-2xl font-black text-white">{value}</h3>
    </div>
  );
}