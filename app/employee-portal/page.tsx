"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type PortalSchedule = {
  day: string;
  shift: string;
  scheduled_in: string | null;
  scheduled_out: string | null;
};

type AttendanceEntry = {
  id?: string;
  employee_id: string;
  attendance_date: string;
  scheduled_shift?: string | null;
  scheduled_in?: string | null;
  scheduled_out?: string | null;
  time_in?: string | null;
  time_out?: string | null;
  late_minutes?: number;
  undertime_minutes?: number;
  ot_minutes?: number;
  status?: string;
  remarks?: string | null;
};

type LeaveRequest = {
  id?: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  approved_by?: string | null;
  created_at?: string | null;
};

export default function EmployeePortalPage() {
  /// STATES
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [weeklySchedules, setWeeklySchedules] = useState<PortalSchedule[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntry[]>(
    []
  );
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const [leaveType, setLeaveType] = useState("Vacation Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  /// DATA
  const today = new Date().toISOString().split("T")[0];

  const fallbackShifts: any = {
    "AM Shift": {
      scheduled_shift: "AM Shift",
      scheduled_in: "07:00",
      scheduled_out: "16:00",
    },
    "PM Shift": {
      scheduled_shift: "PM Shift",
      scheduled_in: "14:00",
      scheduled_out: "23:00",
    },
    "Mid Shift": {
      scheduled_shift: "Mid Shift",
      scheduled_in: "11:00",
      scheduled_out: "20:00",
    },
    "GY Shift": {
      scheduled_shift: "GY Shift",
      scheduled_in: "23:00",
      scheduled_out: "08:00",
    },
  };

  /// CALCULATIONS
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) return 0;

    return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  };

  const leaveDays = calculateDays();

  const employeeName = currentUser
    ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
    : "No employee loaded";

  const employeeDepartment =
    currentUser?.department || currentUser?.position || "Employee Portal";

  const employeeNumber =
    currentUser?.employee_no ||
    currentUser?.employee_number ||
    currentUser?.id ||
    "-";

  const getMinutes = (time: string | null) => {
    if (!time) return 0;

    const cleanTime = String(time).slice(0, 5);
    const [hours, minutes] = cleanTime.split(":").map(Number);

    return hours * 60 + minutes;
  };

  const getCurrentTime = () => {
    return new Date().toTimeString().slice(0, 5);
  };

  const formatTime = (time?: string | null) => {
    if (!time) return "-";

    const cleanTime = String(time).slice(0, 5);
    const [hours, minutes] = cleanTime.split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return cleanTime;

    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;

    return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
  };

  const formatDate = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  };

  const formatWeekday = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString("en-PH", {
      weekday: "short",
    });
  };

  const getWeekDates = () => {
    const current = new Date(`${today}T00:00:00`);
    const day = current.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date.toISOString().split("T")[0];
    });
  };

  const getLast30DaysStart = () => {
    const date = new Date(`${today}T00:00:00`);
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  };

  const computeLateMinutes = (scheduledIn: string | null, timeIn: string) => {
    if (!scheduledIn) return 0;
    return Math.max(0, getMinutes(timeIn) - getMinutes(scheduledIn));
  };

  const computeUndertimeMinutes = (
    scheduledOut: string | null,
    timeOut: string
  ) => {
    if (!scheduledOut) return 0;
    return Math.max(0, getMinutes(scheduledOut) - getMinutes(timeOut));
  };

  const computeOTMinutes = (scheduledOut: string | null, timeOut: string) => {
    if (!scheduledOut) return 0;
    return Math.max(0, getMinutes(timeOut) - getMinutes(scheduledOut));
  };

  const attendanceScore = useMemo(() => {
    if (attendanceHistory.length === 0) return 100;

    const lateCount = attendanceHistory.filter(
      (entry) => Number(entry.late_minutes || 0) > 0
    ).length;

    const undertimeCount = attendanceHistory.filter(
      (entry) => Number(entry.undertime_minutes || 0) > 0
    ).length;

    const absentCount = attendanceHistory.filter(
      (entry) => String(entry.status || "").toLowerCase() === "absent"
    ).length;

    const missingCount = attendanceHistory.filter(
      (entry) => entry.time_in && !entry.time_out
    ).length;

    const score =
      100 - lateCount * 2 - undertimeCount * 3 - absentCount * 8 - missingCount * 5;

    return Math.max(0, score);
  }, [attendanceHistory]);

  const attendanceScoreLabel =
    attendanceScore >= 95
      ? "Excellent"
      : attendanceScore >= 85
      ? "Good"
      : attendanceScore >= 75
      ? "Needs Coaching"
      : "Critical";

  /// FUNCTIONS
  const loadCurrentUser = () => {
    const storedUser = localStorage.getItem("opscore_current_employee");

    if (!storedUser) {
      alert("No employee logged in.");
      window.location.href = "/login";
      return;
    }

    setCurrentUser(JSON.parse(storedUser));
  };

  const logout = () => {
    localStorage.removeItem("opscore_current_employee");
    localStorage.removeItem("opscore_current_employee_id");
    localStorage.removeItem("opscore_current_employee_name");

    window.location.href = "/login";
  };

  const getShiftDetails = async (shiftName: string | null) => {
    if (!shiftName || shiftName === "OFF") return null;

    const { data: shiftTemplate, error } = await supabase
      .from("shift_templates")
      .select("*")
      .eq("shift_name", shiftName)
      .maybeSingle();

    if (error) {
      console.log("SHIFT TEMPLATE ERROR:", error.message);
    }

    if (shiftTemplate) {
      return {
        scheduled_shift: shiftTemplate.shift_name,
        scheduled_in: shiftTemplate.start_time,
        scheduled_out: shiftTemplate.end_time,
      };
    }

    return fallbackShifts[shiftName] || null;
  };

  const getTodayAttendance = async (employeeId: string) => {
    const { data, error } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("attendance_date", today)
      .maybeSingle();

    if (error) {
      console.log("TODAY ATTENDANCE ERROR:", error.message);
      return;
    }

    setTodayAttendance(data);
  };

  const getTodaySchedule = async (employeeId: string) => {
    const { data: scheduleRow, error: scheduleError } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("day", today)
      .maybeSingle();

    if (scheduleError) {
      console.log("SCHEDULE ERROR:", scheduleError.message);
      setSchedule(null);
      return;
    }

    if (!scheduleRow || scheduleRow.shift === "OFF") {
      setSchedule(null);
      return;
    }

    const shiftDetails = await getShiftDetails(scheduleRow.shift);
    setSchedule(shiftDetails);
  };

  const getWeeklySchedules = async (employeeId: string) => {
    const weekDates = getWeekDates();
    const weekStart = weekDates[0];
    const weekEnd = weekDates[weekDates.length - 1];

    const { data: scheduleRows, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("day", weekStart)
      .lte("day", weekEnd);

    if (error) {
      console.log("WEEKLY SCHEDULE ERROR:", error.message);
      setWeeklySchedules([]);
      return;
    }

    const { data: templates } = await supabase.from("shift_templates").select("*");

    const mapped = weekDates.map((date) => {
      const row = (scheduleRows || []).find(
        (item) => String(item.day) === String(date)
      );

      if (!row || row.shift === "OFF") {
        return {
          day: date,
          shift: "OFF",
          scheduled_in: null,
          scheduled_out: null,
        };
      }

      const template = (templates || []).find(
        (item) => item.shift_name === row.shift
      );

      const fallback = fallbackShifts[row.shift];

      return {
        day: date,
        shift: row.shift,
        scheduled_in: template?.start_time || fallback?.scheduled_in || null,
        scheduled_out: template?.end_time || fallback?.scheduled_out || null,
      };
    });

    setWeeklySchedules(mapped);
  };

  const getAttendanceHistory = async (employeeId: string) => {
    const { data, error } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("attendance_date", getLast30DaysStart())
      .lte("attendance_date", today)
      .order("attendance_date", { ascending: false })
      .limit(30);

    if (error) {
      console.log("ATTENDANCE HISTORY ERROR:", error.message);
      setAttendanceHistory([]);
      return;
    }

    setAttendanceHistory(data || []);
  };

  const getLeaveHistory = async (employeeId: string) => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.log("LEAVE HISTORY ERROR:", error.message);
      setLeaveHistory([]);
      return;
    }

    setLeaveHistory(data || []);
  };

  const reloadEmployeeData = async (employeeId: string) => {
    await Promise.all([
      getTodayAttendance(employeeId),
      getTodaySchedule(employeeId),
      getWeeklySchedules(employeeId),
      getAttendanceHistory(employeeId),
      getLeaveHistory(employeeId),
    ]);
  };

  const handleTimeIn = async () => {
    if (!currentUser) return;

    setLoading(true);

    const timeIn = getCurrentTime();
    const lateMinutes = computeLateMinutes(schedule?.scheduled_in, timeIn);

    const { error } = await supabase.from("attendance_entries").insert({
      employee_id: currentUser.id,
      attendance_date: today,
      scheduled_shift: schedule?.scheduled_shift || null,
      scheduled_in: schedule?.scheduled_in || null,
      scheduled_out: schedule?.scheduled_out || null,
      time_in: timeIn,
      time_out: null,
      late_minutes: lateMinutes,
      undertime_minutes: 0,
      ot_minutes: 0,
      status: lateMinutes > 0 ? "Late" : "Present",
      remarks: null,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadEmployeeData(currentUser.id);
    setLoading(false);
  };

  const handleTimeOut = async () => {
    if (!currentUser || !todayAttendance) return;

    setLoading(true);

    const timeOut = getCurrentTime();
    const scheduledOut =
      todayAttendance.scheduled_out || schedule?.scheduled_out || null;

    const undertimeMinutes = computeUndertimeMinutes(scheduledOut, timeOut);
    const otMinutes = computeOTMinutes(scheduledOut, timeOut);

    const { error } = await supabase
      .from("attendance_entries")
      .update({
        time_out: timeOut,
        undertime_minutes: undertimeMinutes,
        ot_minutes: otMinutes,
        status: "Completed",
      })
      .eq("id", todayAttendance.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadEmployeeData(currentUser.id);
    setLoading(false);
  };

  const submitLeaveRequest = async () => {
    if (!currentUser) return;

    if (!startDate || !endDate || !reason.trim()) {
      alert("Please complete leave request details.");
      return;
    }

    if (leaveDays <= 0) {
      alert("Invalid leave date range.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("leave_requests").insert({
      employee_id: currentUser.id,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days: leaveDays,
      reason: reason.trim(),
      status: "Pending",
      approved_by: null,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setStartDate("");
    setEndDate("");
    setReason("");
    await getLeaveHistory(currentUser.id);
    alert("Leave request submitted.");
    setLoading(false);
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    reloadEmployeeData(currentUser.id);
  }, [currentUser]);

  /// UI
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
                OPSCORE Employee Portal
              </p>

              <h1 className="mt-3 text-2xl font-black sm:text-3xl">
                {employeeName}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-slate-300">
                  {employeeDepartment}
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-slate-300">
                  Employee #{employeeNumber}
                </span>

                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                  Active Session
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 hover:bg-red-500/20"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Today&apos;s Schedule</p>
              <h2 className="text-2xl font-black">
                {schedule?.scheduled_shift || "No schedule"}
              </h2>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm text-slate-400">Shift Time</p>
              <p className="text-lg font-black text-amber-400">
                {formatTime(schedule?.scheduled_in)} -{" "}
                {formatTime(schedule?.scheduled_out)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-black">This Week</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {weeklySchedules.map((item) => {
              const isToday = item.day === today;

              return (
                <div
                  key={item.day}
                  className={`rounded-2xl border p-4 ${
                    isToday
                      ? "border-amber-400/50 bg-amber-400/10"
                      : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    {formatWeekday(item.day)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-300">
                    {formatDate(item.day)}
                  </p>
                  <p
                    className={`mt-3 text-lg font-black ${
                      item.shift === "OFF" ? "text-slate-500" : "text-amber-400"
                    }`}
                  >
                    {item.shift}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatTime(item.scheduled_in)} -{" "}
                    {formatTime(item.scheduled_out)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-black">Attendance</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Info label="Time In" value={formatTime(todayAttendance?.time_in)} />
            <Info
              label="Time Out"
              value={formatTime(todayAttendance?.time_out)}
            />
            <Info
              label="Status"
              value={todayAttendance?.status || "Not timed in"}
            />
            <Info
              label="Late Minutes"
              value={todayAttendance?.late_minutes ?? 0}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={handleTimeIn}
              disabled={loading || !!todayAttendance?.time_in || !currentUser}
              className="rounded-xl bg-emerald-500 px-5 py-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Time In
            </button>

            <button
              onClick={handleTimeOut}
              disabled={
                loading ||
                !todayAttendance?.time_in ||
                !!todayAttendance?.time_out
              }
              className="rounded-xl bg-amber-400 px-5 py-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Time Out
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Attendance Performance</h2>
              <p className="text-sm text-slate-400">
                Based on your last 30 attendance records.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Score
              </p>
              <p className="text-3xl font-black text-amber-400">
                {attendanceScore}
              </p>
              <p className="text-xs font-bold text-slate-400">
                {attendanceScoreLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-black">Attendance History</h2>

          <div className="mt-4 max-h-80 overflow-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Time In</th>
                  <th className="px-4 py-3">Time Out</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {attendanceHistory.map((entry) => (
                  <tr key={entry.id || entry.attendance_date} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-bold">
                      {formatDate(entry.attendance_date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-amber-400">
                        {entry.scheduled_shift || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTime(entry.scheduled_in)} -{" "}
                        {formatTime(entry.scheduled_out)}
                      </p>
                    </td>
                    <td className="px-4 py-3">{formatTime(entry.time_in)}</td>
                    <td className="px-4 py-3">{formatTime(entry.time_out)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status || "Pending"} />
                    </td>
                  </tr>
                ))}

                {attendanceHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      No attendance history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-black">Leave Request</h2>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 p-3"
            >
              <option>Vacation Leave</option>
              <option>Sick Leave</option>
              <option>Emergency Leave</option>
              <option>Unpaid Leave</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="rounded-xl border border-slate-700 bg-slate-950 p-3"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="rounded-xl border border-slate-700 bg-slate-950 p-3"
            />

            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm">
              Days:{" "}
              <span className="font-bold text-amber-400">{leaveDays}</span>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason"
              className="min-h-28 rounded-xl border border-slate-700 bg-slate-950 p-3"
            />

            <button
              onClick={submitLeaveRequest}
              disabled={loading || !currentUser}
              className="rounded-xl bg-amber-400 px-5 py-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit Leave Request
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-black">My Leave Requests</h2>

          <div className="mt-4 space-y-3">
            {leaveHistory.map((leave) => (
              <div
                key={leave.id || `${leave.start_date}-${leave.end_date}`}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-white">{leave.leave_type}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)} •{" "}
                      {leave.days} day(s)
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {leave.reason}
                    </p>
                  </div>

                  <StatusBadge status={leave.status} />
                </div>
              </div>
            ))}

            {leaveHistory.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
                No leave requests yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const style =
    normalized === "approved" ||
    normalized === "present" ||
    normalized === "completed"
      ? "bg-emerald-500/10 text-emerald-400"
      : normalized === "pending"
      ? "bg-amber-500/10 text-amber-400"
      : normalized === "late"
      ? "bg-orange-500/10 text-orange-400"
      : normalized === "undertime" ||
        normalized === "absent" ||
        normalized === "rejected"
      ? "bg-red-500/10 text-red-400"
      : "bg-slate-700 text-slate-300";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {status}
    </span>
  );
}
