"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  LogIn,
  LogOut,
  User,
} from "lucide-react";

type AuditSeverity = "info" | "warning" | "critical";

const MODULE_NAME = "Employee Portal";

export default function EmployeePortalPage() {
  /// STATES
  const [employee, setEmployee] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [leaveType, setLeaveType] = useState("Vacation Leave");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);

  /// CALCULATIONS
  const currentEmployeeId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_employee_id")
      : null;

  const employeeName = useMemo(() => {
    if (!employee) return "-";
    return `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
  }, [employee]);

  const isTimedIn = Boolean(todayAttendance?.time_in);
  const isTimedOut = Boolean(todayAttendance?.time_out);

  /// FUNCTIONS
  const createAuditLog = async ({
    action,
    description,
    severity = "info",
    recordId = null,
    oldValue = null,
    newValue = null,
  }: {
    action: string;
    description: string;
    severity?: AuditSeverity;
    recordId?: string | null;
    oldValue?: any;
    newValue?: any;
  }) => {
    const { error } = await supabase.from("audit_logs").insert({
      user_id: employee?.id || currentEmployeeId,
      user_name: employeeName || "Employee Portal User",
      module: MODULE_NAME,
      action,
      description,
      severity,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.log("EMPLOYEE PORTAL AUDIT ERROR:", error.message);
    }
  };

  const loadEmployeePortal = async () => {
    if (!currentEmployeeId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", currentEmployeeId)
      .maybeSingle();

    if (employeeError) {
      console.log("EMPLOYEE LOAD ERROR:", employeeError.message);
    }

    setEmployee(employeeData || null);

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", currentEmployeeId)
      .eq("attendance_date", todayKey)
      .maybeSingle();

    if (attendanceError) {
      console.log("ATTENDANCE LOAD ERROR:", attendanceError.message);
    }

    setTodayAttendance(attendanceData || null);

    const { data: scheduleData, error: scheduleError } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", currentEmployeeId)
      .eq("day", todayKey)
      .order("created_at", { ascending: false });

    if (scheduleError) {
      console.log("SCHEDULE LOAD ERROR:", scheduleError.message);
    }

    setTodaySchedules(scheduleData || []);

    const { data: leaveData, error: leaveError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", currentEmployeeId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (leaveError) {
      console.log("LEAVE REQUEST LOAD ERROR:", leaveError.message);
    }

    setLeaveRequests(leaveData || []);
    setLoading(false);
  };

  const timeIn = async () => {
    if (!currentEmployeeId || !employee) return;

    if (isTimedIn) {
      alert("You already timed in today.");
      return;
    }

    setSaving(true);

    const payload = {
      employee_id: currentEmployeeId,
      employee_name: employeeName,
      attendance_date: todayKey,
      time_in: new Date().toISOString(),
      status: "Present",
      source: "Employee Portal",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("attendance_entries")
      .insert(payload)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.log("TIME IN ERROR:", error.message);
      alert("Unable to time in. Check attendance table columns.");
      return;
    }

    await createAuditLog({
      action: "EMPLOYEE_TIME_IN",
      description: `${employeeName} timed in via Employee Portal.`,
      severity: "info",
      recordId: data?.id || null,
      oldValue: null,
      newValue: data,
    });

    await loadEmployeePortal();
  };

  const timeOut = async () => {
    if (!currentEmployeeId || !employee || !todayAttendance?.id) return;

    if (!isTimedIn) {
      alert("You need to time in first.");
      return;
    }

    if (isTimedOut) {
      alert("You already timed out today.");
      return;
    }

    setSaving(true);

    const oldValue = todayAttendance;

    const { data, error } = await supabase
      .from("attendance_entries")
      .update({
        time_out: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", todayAttendance.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.log("TIME OUT ERROR:", error.message);
      alert("Unable to time out. Check attendance table columns.");
      return;
    }

    await createAuditLog({
      action: "EMPLOYEE_TIME_OUT",
      description: `${employeeName} timed out via Employee Portal.`,
      severity: "info",
      recordId: data?.id || null,
      oldValue,
      newValue: data,
    });

    await loadEmployeePortal();
  };

  const fileLeaveRequest = async () => {
    if (!currentEmployeeId || !employee) return;

    if (!leaveStartDate || !leaveEndDate) {
      alert("Please select leave start and end date.");
      return;
    }

    if (leaveStartDate > leaveEndDate) {
      alert("Start date cannot be later than end date.");
      return;
    }

    setSaving(true);

    const payload = {
      employee_id: currentEmployeeId,
      employee_name: employeeName,
      leave_type: leaveType,
      start_date: leaveStartDate,
      end_date: leaveEndDate,
      reason: leaveReason.trim() || null,
      status: "Pending",
      source: "Employee Portal",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("leave_requests")
      .insert(payload)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.log("FILE LEAVE ERROR:", error.message);
      alert("Unable to file leave. Check leave_requests table columns.");
      return;
    }

    await createAuditLog({
      action: "EMPLOYEE_FILE_LEAVE",
      description: `${employeeName} filed ${leaveType} from ${leaveStartDate} to ${leaveEndDate}.`,
      severity: "warning",
      recordId: data?.id || null,
      oldValue: null,
      newValue: data,
    });

    setLeaveStartDate("");
    setLeaveEndDate("");
    setLeaveReason("");

    await loadEmployeePortal();
  };

  useEffect(() => {
    loadEmployeePortal();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Employee Self-Service
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Employee Portal
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Time in/out, view schedule, and file leave requests.
            </p>
          </div>

          <button
            onClick={loadEmployeePortal}
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Refresh
          </button>
        </section>

        {!currentEmployeeId ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
            No current user selected. Please login or select current user first.
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading employee portal...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <PortalCard className="xl:col-span-1">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-amber-400/10 p-4 text-amber-300">
                    <User size={26} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      Logged In As
                    </p>
                    <h2 className="mt-2 text-2xl font-black">{employeeName}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {employee?.department || "-"} • {employee?.position || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Employee No: {employee?.employee_no || "-"}
                    </p>
                  </div>
                </div>
              </PortalCard>

              <PortalCard className="xl:col-span-2">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <StatusBox
                    icon={<Clock size={22} />}
                    label="Today"
                    value={todayKey}
                    tone="neutral"
                  />
                  <StatusBox
                    icon={<LogIn size={22} />}
                    label="Time In"
                    value={
                      todayAttendance?.time_in
                        ? new Date(todayAttendance.time_in).toLocaleTimeString()
                        : "Not yet"
                    }
                    tone={isTimedIn ? "good" : "watch"}
                  />
                  <StatusBox
                    icon={<LogOut size={22} />}
                    label="Time Out"
                    value={
                      todayAttendance?.time_out
                        ? new Date(todayAttendance.time_out).toLocaleTimeString()
                        : "Not yet"
                    }
                    tone={isTimedOut ? "good" : "watch"}
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    onClick={timeIn}
                    disabled={saving || isTimedIn}
                    className="rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Time In
                  </button>
                  <button
                    onClick={timeOut}
                    disabled={saving || !isTimedIn || isTimedOut}
                    className="rounded-2xl bg-sky-500 px-5 py-4 text-sm font-black text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Time Out
                  </button>
                </div>
              </PortalCard>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <PortalCard>
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-400/10 p-3 text-blue-300">
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Today Schedule</h2>
                    <p className="text-sm text-slate-400">
                      Based on published scheduling data.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {todaySchedules.length > 0 ? (
                    todaySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                      >
                        <p className="font-black">
                          {schedule.shift_name ||
                            schedule.shift ||
                            schedule.schedule_type ||
                            "Scheduled Shift"}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {schedule.start_time || "-"} to {schedule.end_time || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Department: {schedule.department || employee?.department || "-"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-500">
                      No schedule found for today.
                    </div>
                  )}
                </div>
              </PortalCard>

              <PortalCard>
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-400/10 p-3 text-violet-300">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">File Leave Request</h2>
                    <p className="text-sm text-slate-400">
                      Manager approval will be handled in Leave Management.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                  >
                    <option>Vacation Leave</option>
                    <option>Sick Leave</option>
                    <option>Emergency Leave</option>
                    <option>Unpaid Leave</option>
                  </select>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      type="date"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none [color-scheme:dark]"
                    />
                    <input
                      type="date"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none [color-scheme:dark]"
                    />
                  </div>

                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Reason / remarks"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                  />

                  <button
                    onClick={fileLeaveRequest}
                    disabled={saving}
                    className="w-full rounded-2xl bg-violet-500 px-5 py-4 text-sm font-black text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Submit Leave Request
                  </button>
                </div>
              </PortalCard>
            </section>

            <PortalCard>
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black">My Leave Requests</h2>
                  <p className="text-sm text-slate-400">
                    Latest 10 leave filings.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((leave) => (
                    <div
                      key={leave.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">
                            {leave.leave_type || "Leave Request"}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {leave.start_date} to {leave.end_date}
                          </p>
                        </div>

                        <span
                          className={
                            String(leave.status || "").toLowerCase() ===
                            "approved"
                              ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300"
                              : String(leave.status || "").toLowerCase() ===
                                  "rejected"
                                ? "rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300"
                                : "rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300"
                          }
                        >
                          {leave.status || "Pending"}
                        </span>
                      </div>

                      {leave.reason && (
                        <p className="mt-3 text-sm text-slate-500">
                          {leave.reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-500">
                    No leave requests found.
                  </div>
                )}
              </div>
            </PortalCard>
          </div>
        )}
      </main>
    </div>
  );
}

function PortalCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20 ${className}`}
    >
      {children}
    </section>
  );
}

function StatusBox({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "good" | "watch" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : tone === "watch"
        ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
        : tone === "bad"
          ? "border-red-500/20 bg-red-500/10 text-red-300"
          : "border-slate-800 bg-slate-950 text-slate-300";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mb-3">{icon}</div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}
