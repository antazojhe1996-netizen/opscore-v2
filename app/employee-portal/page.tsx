"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function EmployeePortalPage() {
  /// STATES
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [leaveType, setLeaveType] = useState("Vacation Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  /// DATA
  const today = new Date().toISOString().split("T")[0];

  /// CALCULATIONS
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) return 0;

    return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  };

  const leaveDays = calculateDays();

  const getMinutes = (time: string | null) => {
    if (!time) return 0;

    const cleanTime = String(time).slice(0, 5);
    const [hours, minutes] = cleanTime.split(":").map(Number);

    return hours * 60 + minutes;
  };

  const getCurrentTime = () => {
    return new Date().toTimeString().slice(0, 5);
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

  /// FUNCTIONS
  const loadCurrentUser = () => {
    const storedUser = localStorage.getItem("opscore_current_employee");

    if (!storedUser) {
      alert("No employee logged in.");
      return;
    }

    setCurrentUser(JSON.parse(storedUser));
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

    const { data: shiftTemplate, error: shiftError } = await supabase
      .from("shift_templates")
      .select("*")
      .eq("shift_name", scheduleRow.shift)
      .maybeSingle();

    if (shiftError) {
      console.log("SHIFT TEMPLATE ERROR:", shiftError.message);
    }

    if (shiftTemplate) {
      setSchedule({
        scheduled_shift: shiftTemplate.shift_name,
        scheduled_in: shiftTemplate.start_time,
        scheduled_out: shiftTemplate.end_time,
      });

      return;
    }

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

    setSchedule(fallbackShifts[scheduleRow.shift] || null);
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

    await getTodayAttendance(currentUser.id);
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

    await getTodayAttendance(currentUser.id);
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
    alert("Leave request submitted.");
    setLoading(false);
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    getTodayAttendance(currentUser.id);
    getTodaySchedule(currentUser.id);
  }, [currentUser]);

  /// UI
  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
          OPSCORE Employee Portal
        </p>

        <h1 className="mt-2 text-3xl font-black">My Portal</h1>

        <p className="mt-1 text-sm text-slate-400">
          Time in, time out, and leave request.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Logged in as</p>
          <h2 className="text-xl font-bold">
            {currentUser
              ? `${currentUser.first_name || ""} ${
                  currentUser.last_name || ""
                }`
              : "No employee loaded"}
          </h2>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Today&apos;s Schedule</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Info
              label="Shift"
              value={schedule?.scheduled_shift || "No schedule"}
            />
            <Info label="Scheduled In" value={schedule?.scheduled_in || "-"} />
            <Info
              label="Scheduled Out"
              value={schedule?.scheduled_out || "-"}
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Attendance</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info label="Time In" value={todayAttendance?.time_in || "-"} />
            <Info label="Time Out" value={todayAttendance?.time_out || "-"} />
            <Info
              label="Status"
              value={todayAttendance?.status || "Not timed in"}
            />
            <Info
              label="Late Minutes"
              value={todayAttendance?.late_minutes ?? 0}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleTimeIn}
              disabled={loading || !!todayAttendance?.time_in || !currentUser}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Time Out
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Leave Request</h2>

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
              className="rounded-xl border border-slate-700 bg-slate-950 p-3"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
              className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit Leave Request
            </button>
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