"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import * as XLSX from "xlsx";

type Employee = {
  id: string;
  employee_no?: string;
  first_name: string;
  last_name: string;
  department: string;
  position?: string;
  employment_status?: string;
  portal_enabled?: boolean;
  attendance_source_preference?:
    | "Biometrics"
    | "Employee Portal"
    | "Manual Review"
    | string
    | null;
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
  remarks?: string;
  attendance_source?:
    | "Biometrics"
    | "Employee Portal"
    | "Manual Entry"
    | "Mixed"
    | string
    | null;
};

type ImportPreviewRow = {
  employee_name: string;
  employee_id?: string;
  attendance_date: string;
  time_in: string | null;
  time_out: string | null;
  late_minutes: number;
  undertime_minutes: number;
  ot_minutes: number;
  status: string;
  matched: boolean;
  remarks: string;
  matched_employee_name?: string;
  matched_employee_no?: string;
};

const parseFriendlyTimeInput = (value: any) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";

  let text = raw.replace(/\s+/g, "").replace(/\./g, ":").replace(/：/g, ":");

  const isPm = /(pm|p)$/i.test(text);
  const isAm = /(am|a)$/i.test(text);
  text = text.replace(/(am|pm|a|p)$/i, "");

  let hours = 0;
  let minutes = 0;

  if (/^\d{1,2}:\d{1,2}$/.test(text)) {
    const [h, m] = text.split(":").map(Number);
    hours = Number(h) || 0;
    minutes = Number(m) || 0;
  } else if (/^\d{3,4}$/.test(text)) {
    const padded = text.padStart(4, "0");
    hours = Number(padded.slice(0, 2));
    minutes = Number(padded.slice(2, 4));
  } else if (/^\d{1,2}$/.test(text)) {
    hours = Number(text);
    minutes = 0;
  } else {
    return null;
  }

  if (isPm && hours < 12) hours += 12;
  if (isAm && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export default function AttendancePage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);

  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [importStatus, setImportStatus] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lockedPayrollPeriods, setLockedPayrollPeriods] = useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [selectedCutoffId, setSelectedCutoffId] = useState("CUSTOM");

  /// HELPERS
  const normalizeName = (name: string) =>
    String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const getDateRange = () => {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const getValue = (row: any, keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
        return row[key];
      }
    }

    return "";
  };

  const parseExcelDate = (value: any) => {
    if (!value) return "";

    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return "";

      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
        parsed.d,
      ).padStart(2, "0")}`;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return "";

    return date.toISOString().split("T")[0];
  };

  const parseExcelTime = (value: any) => {
    if (!value && value !== 0) return "";

    if (typeof value === "number") {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;

      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0",
      )}`;
    }

    const text = String(value).trim();
    if (!text) return "";

    if (/^\d{1,2}:\d{2}/.test(text)) {
      const date = new Date(`2000-01-01 ${text}`);

      if (!isNaN(date.getTime())) {
        return `${String(date.getHours()).padStart(2, "0")}:${String(
          date.getMinutes(),
        ).padStart(2, "0")}`;
      }

      return text.slice(0, 5);
    }

    return "";
  };

  const parseMinutes = (value: any) => {
    if (!value) return 0;

    if (typeof value === "number") return Math.round(value);

    const text = String(value).trim();

    if (text.includes(":")) {
      const [h, m] = text.split(":").map(Number);
      return (Number(h) || 0) * 60 + (Number(m) || 0);
    }

    return Number(text) || 0;
  };

  const parseOtMinutes = (value: any) => {
    if (!value) return 0;

    if (typeof value === "number") return Math.round(value * 60);

    const text = String(value).trim();

    if (text.includes(":")) {
      const [h, m] = text.split(":").map(Number);
      return (Number(h) || 0) * 60 + (Number(m) || 0);
    }

    return Math.round((Number(text) || 0) * 60);
  };

  const timeToMinutes = (time?: string | null) => {
    if (!time) return 0;

    const [h, m] = time.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };

  const diffMinutes = (start?: string | null, end?: string | null) => {
    if (!start || !end) return 0;

    let startMin = timeToMinutes(start);
    let endMin = timeToMinutes(end);

    if (endMin < startMin) endMin += 24 * 60;

    return endMin - startMin;
  };

  const findEmployeeByEmployeeNoOrName = (employeeNo: string, name: string) => {
    const cleanEmployeeNo = String(employeeNo || "")
      .trim()
      .toLowerCase();
    const cleanName = normalizeName(name);

    if (cleanEmployeeNo) {
      const idMatch = employees.find(
        (emp) =>
          String(emp.employee_no || "")
            .trim()
            .toLowerCase() === cleanEmployeeNo,
      );

      if (idMatch) return idMatch;
    }

    if (!cleanName) return null;

    const exactNameMatch = employees.find((emp) => {
      const full = normalizeName(`${emp.first_name} ${emp.last_name}`);
      const first = normalizeName(emp.first_name);
      const last = normalizeName(emp.last_name);

      return full === cleanName || first === cleanName || last === cleanName;
    });

    if (exactNameMatch) return exactNameMatch;

    const partialMatches = employees.filter((emp) => {
      const full = normalizeName(`${emp.first_name} ${emp.last_name}`);

      return full.includes(cleanName) || cleanName.includes(full);
    });

    if (partialMatches.length === 1) return partialMatches[0];

    return null;
  };

  const getEntry = (employeeId: string, date: string) =>
    entries.find(
      (entry) =>
        String(entry.employee_id) === String(employeeId) &&
        String(entry.attendance_date) === String(date),
    );

  const getSchedule = (employeeId: string, date: string) =>
    schedules.find(
      (item) =>
        String(item.employee_id) === String(employeeId) &&
        String(item.day) === String(date),
    );

  const getShiftTemplate = (shiftName?: string | null) =>
    shiftTemplates.find((shift) => shift.shift_name === shiftName);

  const normalizeColor = (color?: string | null) => {
    const cleanColor = String(color || "")
      .toLowerCase()
      .trim();

    if (!cleanColor) return "slate";
    if (cleanColor.includes("sky")) return "sky";
    if (cleanColor.includes("cyan")) return "cyan";
    if (cleanColor.includes("teal")) return "teal";
    if (cleanColor.includes("emerald")) return "emerald";
    if (cleanColor.includes("green")) return "green";
    if (cleanColor.includes("lime")) return "lime";
    if (cleanColor.includes("yellow")) return "yellow";
    if (cleanColor.includes("amber")) return "amber";
    if (cleanColor.includes("orange")) return "orange";
    if (cleanColor.includes("rose")) return "rose";
    if (cleanColor.includes("pink")) return "pink";
    if (cleanColor.includes("purple")) return "purple";
    if (cleanColor.includes("violet")) return "violet";
    if (cleanColor.includes("indigo")) return "indigo";
    if (cleanColor.includes("red")) return "red";
    if (cleanColor.includes("slate")) return "slate";
    if (cleanColor.includes("gray")) return "gray";
    if (cleanColor.includes("blue")) return "blue";

    return "slate";
  };

  const getColorClasses = (color?: string | null) => {
    const normalized = normalizeColor(color);

    if (normalized === "blue")
      return "border-blue-500/40 bg-blue-500/15 text-blue-300";
    if (normalized === "sky")
      return "border-sky-500/40 bg-sky-500/15 text-sky-300";
    if (normalized === "cyan")
      return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300";
    if (normalized === "teal")
      return "border-teal-500/40 bg-teal-500/15 text-teal-300";
    if (normalized === "green")
      return "border-green-500/40 bg-green-500/15 text-green-300";
    if (normalized === "emerald")
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    if (normalized === "lime")
      return "border-lime-500/40 bg-lime-500/15 text-lime-300";
    if (normalized === "yellow")
      return "border-yellow-500/40 bg-yellow-500/15 text-yellow-300";
    if (normalized === "amber")
      return "border-amber-500/40 bg-amber-500/15 text-amber-300";
    if (normalized === "orange")
      return "border-orange-500/40 bg-orange-500/15 text-orange-300";
    if (normalized === "red")
      return "border-red-500/40 bg-red-500/15 text-red-300";
    if (normalized === "rose")
      return "border-rose-500/40 bg-rose-500/15 text-rose-300";
    if (normalized === "pink")
      return "border-pink-500/40 bg-pink-500/15 text-pink-300";
    if (normalized === "purple")
      return "border-purple-500/40 bg-purple-500/15 text-purple-300";
    if (normalized === "violet")
      return "border-violet-500/40 bg-violet-500/15 text-violet-300";
    if (normalized === "indigo")
      return "border-indigo-500/40 bg-indigo-500/15 text-indigo-300";
    if (normalized === "gray")
      return "border-gray-500/40 bg-gray-500/15 text-gray-300";

    return "border-slate-500/40 bg-slate-500/15 text-slate-300";
  };

  const getShiftColorClass = (shiftName?: string | null) => {
    if (isLeaveShift(shiftName)) {
      return "border-rose-500/40 bg-rose-500/15 text-rose-300";
    }

    const shift = getShiftTemplate(shiftName);
    return getColorClasses(shift?.color);
  };

  const isUnscheduledShift = (shiftName?: string | null) => shiftName === "OFF";
  const isRestDayShift = (shiftName?: string | null) => shiftName === "RD";
  const isLeaveShift = (shiftName?: string | null) =>
    shiftName === "Leave" || shiftName === "LEAVE";
  const isWorkingShift = (shiftName?: string | null) =>
    !!shiftName &&
    !isUnscheduledShift(shiftName) &&
    !isRestDayShift(shiftName) &&
    !isLeaveShift(shiftName);

  const getShiftTimeLabel = (shiftName?: string | null) => {
    if (!shiftName) return "OFF";
    if (shiftName === "OFF") return "OFF";
    if (shiftName === "RD") return "RD";
    if (shiftName === "Leave" || shiftName === "LEAVE") return "LEAVE";

    const shift = getShiftTemplate(shiftName);
    const start = shift?.start_time ? String(shift.start_time).slice(0, 5) : "";
    const end = shift?.end_time ? String(shift.end_time).slice(0, 5) : "";

    if (start && end) return `${start} - ${end}`;

    return shiftName;
  };

  const getScheduleLabel = (shiftName?: string | null) => {
    return getShiftTimeLabel(shiftName);
  };

  const isOnLeave = (employee: Employee, date: string) => {
    const keys = [
      String(employee.id || "").toLowerCase(),
      String(employee.employee_no || "").toLowerCase(),
      normalizeName(`${employee.first_name} ${employee.last_name}`),
    ];

    return approvedLeaves.some((leave) => {
      const leaveEmployeeId = String(leave.employee_id || "").toLowerCase();

      return (
        keys.includes(leaveEmployeeId) &&
        date >= String(leave.start_date) &&
        date <= String(leave.end_date)
      );
    });
  };

  const getAttendanceSourcePreference = (employee?: Employee | null) => {
    return String(
      employee?.attendance_source_preference ||
        (employee?.portal_enabled ? "Employee Portal" : "Biometrics"),
    );
  };

  const getExistingSource = (entry?: AttendanceEntry | null) => {
    const source = String(entry?.attendance_source || "").trim();
    if (source) return source;

    const remarks = String(entry?.remarks || "").toLowerCase();

    if (remarks.includes("employee portal")) return "Employee Portal";
    if (remarks.includes("biometrics")) return "Biometrics";
    if (remarks.includes("manual")) return "Manual Entry";

    return "";
  };

  const hasTimeConflict = (
    existing?: AttendanceEntry | null,
    incoming?: Pick<AttendanceEntry, "time_in" | "time_out"> | null,
  ) => {
    if (!existing || !incoming) return false;

    const existingTimeIn = existing.time_in || "";
    const existingTimeOut = existing.time_out || "";
    const incomingTimeIn = incoming.time_in || "";
    const incomingTimeOut = incoming.time_out || "";

    const timeInConflict =
      !!existingTimeIn && !!incomingTimeIn && existingTimeIn !== incomingTimeIn;

    const timeOutConflict =
      !!existingTimeOut &&
      !!incomingTimeOut &&
      existingTimeOut !== incomingTimeOut;

    return timeInConflict || timeOutConflict;
  };

  const buildSourceConflictRemarks = (
    existingSource: string,
    incomingSource: string,
  ) => {
    return `Review Required: ${incomingSource} conflicted with existing ${existingSource} attendance.`;
  };

  const computeTimeMetrics = ({
    scheduledIn,
    scheduledOut,
    timeIn,
    timeOut,
    lateGrace,
    undertimeGrace,
  }: {
    scheduledIn?: string | null;
    scheduledOut?: string | null;
    timeIn?: string | null;
    timeOut?: string | null;
    lateGrace: number;
    undertimeGrace: number;
  }) => {
    let lateMinutes = 0;
    let undertimeMinutes = 0;
    let otMinutes = 0;

    const scheduledInMin = timeToMinutes(scheduledIn);
    const scheduledOutMinRaw = timeToMinutes(scheduledOut);

    const isOvernightShift =
      !!scheduledIn && !!scheduledOut && scheduledOutMinRaw <= scheduledInMin;

    const allowsNextDayOut = !!scheduledOut && scheduledOutMinRaw >= 22 * 60;

    if (timeIn && scheduledIn) {
      let actualInMin = timeToMinutes(timeIn);

      if (
        isOvernightShift &&
        actualInMin < scheduledInMin &&
        actualInMin <= scheduledOutMinRaw
      ) {
        actualInMin += 1440;
      }

      const lateRaw = actualInMin - scheduledInMin;
      lateMinutes = lateRaw > lateGrace ? lateRaw : 0;
    }

    if (timeOut && scheduledOut) {
      let targetOutMin = scheduledOutMinRaw;
      let actualOutMin = timeToMinutes(timeOut);

      if (isOvernightShift) {
        targetOutMin += 1440;

        if (actualOutMin < scheduledInMin) {
          actualOutMin += 1440;
        }
      }

      if (
        !isOvernightShift &&
        allowsNextDayOut &&
        actualOutMin < scheduledInMin
      ) {
        actualOutMin += 1440;
      }

      const difference = actualOutMin - targetOutMin;

      if (difference < 0) {
        const rawUndertime = Math.abs(difference);
        undertimeMinutes = rawUndertime > undertimeGrace ? rawUndertime : 0;
      }

      if (difference > 0) {
        otMinutes = difference;
      }
    }

    return {
      late_minutes: lateMinutes,
      undertime_minutes: undertimeMinutes,
      ot_minutes: otMinutes,
    };
  };

  const getAttendanceReviewReason = ({
    scheduledIn,
    scheduledOut,
    timeIn,
    timeOut,
    shiftName,
  }: {
    scheduledIn?: string | null;
    scheduledOut?: string | null;
    timeIn?: string | null;
    timeOut?: string | null;
    shiftName?: string | null;
  }) => {
    if (!scheduledIn || !scheduledOut) return "Missing schedule time template.";
    if (timeIn && !timeOut) return "Missing time out.";
    if (!timeIn && timeOut) return "Missing time in.";
    if (!timeIn && !timeOut) return "";

    const scheduledInMin = timeToMinutes(scheduledIn);
    const scheduledOutMin = timeToMinutes(scheduledOut);
    const timeInMin = timeToMinutes(timeIn);
    const timeOutMin = timeToMinutes(timeOut);

    const isOvernightShift = scheduledOutMin <= scheduledInMin;
    const allowsNextDayOut = scheduledOutMin >= 22 * 60;

    if (isOvernightShift) {
      const isTimeInDuringDeadZone =
        timeInMin > scheduledOutMin && timeInMin < scheduledInMin;

      if (isTimeInDuringDeadZone) {
        return "Invalid overnight punch: time in is outside the GY window.";
      }

      const isTimeOutDuringDeadZone =
        timeOutMin > scheduledOutMin + 240 && timeOutMin < scheduledInMin;

      if (isTimeOutDuringDeadZone) {
        return "Invalid overnight punch: time out is outside the GY window.";
      }

      return "";
    }

    if (!allowsNextDayOut && timeOutMin < timeInMin) {
      return "Invalid punch: time out is earlier than time in for a non-overnight shift.";
    }

    if (timeInMin > scheduledOutMin && !allowsNextDayOut) {
      return "Time in is far outside the scheduled shift.";
    }

    return "";
  };

  const computeEntry = (
    employee: Employee,
    date: string,
    entry?: AttendanceEntry,
  ) => {
    const schedule = getSchedule(employee.id, date);
    const hasScheduleOverride = !!entry?.scheduled_shift;
    const shiftName = entry?.scheduled_shift || schedule?.shift || "OFF";
    const shift = getShiftTemplate(shiftName);

    const scheduledIn = entry?.scheduled_in || shift?.start_time || null;
    const scheduledOut = entry?.scheduled_out || shift?.end_time || null;

    const timeIn = entry?.time_in || "";
    const timeOut = entry?.time_out || "";

    const lateGrace = Number(settings.late_grace_minutes || 15);
    const undertimeGrace = Number(settings.undertime_grace_minutes || 0);

    if (isOnLeave(employee, date)) {
      return {
        scheduled_shift: "Leave",
        scheduled_in: null,
        scheduled_out: null,
        late_minutes: 0,
        undertime_minutes: 0,
        ot_minutes: 0,
        status: "Leave",
        review_reason: "",
      };
    }

    if (!schedule && !hasScheduleOverride) {
      return {
        scheduled_shift: "OFF",
        scheduled_in: null,
        scheduled_out: null,
        late_minutes: 0,
        undertime_minutes: 0,
        ot_minutes: 0,
        status: "Unscheduled",
        review_reason: "No schedule assigned.",
      };
    }

    if (shiftName === "OFF") {
      return {
        scheduled_shift: "OFF",
        scheduled_in: null,
        scheduled_out: null,
        late_minutes: 0,
        undertime_minutes: 0,
        ot_minutes: 0,
        status: "Unscheduled",
        review_reason: "No schedule assigned.",
      };
    }

    if (shiftName === "RD") {
      return {
        scheduled_shift: "RD",
        scheduled_in: null,
        scheduled_out: null,
        late_minutes: 0,
        undertime_minutes: 0,
        ot_minutes: 0,
        status: "RD",
        review_reason: "",
      };
    }

    if (!timeIn && !timeOut) {
      return {
        scheduled_shift: shiftName,
        scheduled_in: scheduledIn,
        scheduled_out: scheduledOut,
        late_minutes: 0,
        undertime_minutes: 0,
        ot_minutes: 0,
        status: "Absent",
        review_reason: "",
      };
    }

    const reviewReason = getAttendanceReviewReason({
      scheduledIn,
      scheduledOut,
      timeIn,
      timeOut,
      shiftName,
    });

    if (reviewReason) {
      return {
        scheduled_shift: shiftName,
        scheduled_in: scheduledIn,
        scheduled_out: scheduledOut,
        late_minutes: 0,
        undertime_minutes: 0,
        ot_minutes: 0,
        status: "Review Required",
        review_reason: reviewReason,
      };
    }

    const computed = computeTimeMetrics({
      scheduledIn,
      scheduledOut,
      timeIn,
      timeOut,
      lateGrace,
      undertimeGrace,
    });

    let status = "Present";
    if (computed.ot_minutes > 0) status = "Overtime";
    if (computed.late_minutes > 0) status = "Late";
    if (computed.undertime_minutes > 0) status = "Undertime";

    return {
      scheduled_shift: shiftName,
      scheduled_in: scheduledIn,
      scheduled_out: scheduledOut,
      late_minutes: computed.late_minutes,
      undertime_minutes: computed.undertime_minutes,
      ot_minutes: computed.ot_minutes,
      status,
      review_reason: "",
    };
  };

  /// LOADERS
  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("payroll_active", true)
      .order("department")
      .order("first_name");

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
      return;
    }

    const active = (data || []).filter((emp) => {
      const status = String(emp.employment_status || "").toLowerCase();
      return (
        status !== "resigned" &&
        status !== "terminated" &&
        status !== "inactive"
      );
    });

    setEmployees(active);
  };

  const getSchedules = async () => {
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .gte("day", startDate)
      .lte("day", endDate);

    setSchedules(data || []);
  };

  const getShiftTemplates = async () => {
    const { data } = await supabase
      .from("shift_templates")
      .select("*")
      .order("id");

    setShiftTemplates(data || []);
  };

  const getApprovedLeaves = async () => {
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .ilike("status", "approved")
      .lte("start_date", endDate)
      .gte("end_date", startDate);

    setApprovedLeaves(data || []);
  };

  const getSettings = async () => {
    const { data } = await supabase.from("payroll_settings").select("*");

    const mapped: Record<string, string> = {};

    (data || []).forEach((item) => {
      mapped[item.setting_key] = item.setting_value;
    });

    setSettings(mapped);
  };

  const getAttendanceEntries = async () => {
    const { data } = await supabase
      .from("attendance_entries")
      .select("*")
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate);

    setEntries(data || []);
  };

  const getLockedPayrollPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("attendance_locked", true)
      .lte("start_date", endDate)
      .gte("end_date", startDate);

    if (error) {
      console.log("GET LOCKED PAYROLL PERIODS ERROR:", error.message);
      setLockedPayrollPeriods([]);
      return;
    }

    setLockedPayrollPeriods(data || []);
  };

  const getPayrollPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select(
        "id, period_name, start_date, end_date, status, attendance_locked",
      )
      .order("start_date", { ascending: false })
      .limit(30);

    if (error) {
      console.log("GET PAYROLL PERIODS ERROR:", error.message);
      setPayrollPeriods([]);
      return;
    }

    setPayrollPeriods(data || []);
  };

  const applyPayrollCutoff = (periodId: string) => {
    setSelectedCutoffId(periodId);

    if (periodId === "CUSTOM") return;

    const period = payrollPeriods.find(
      (item) => String(item.id) === String(periodId),
    );
    if (!period) return;

    setStartDate(String(period.start_date || "").slice(0, 10));
    setEndDate(String(period.end_date || "").slice(0, 10));
  };

  const markPayrollPeriodsForRegeneration = async (rows: any[]) => {
    const affectedDates = rows
      .map((row) => String(row.attendance_date || "").slice(0, 10))
      .filter(Boolean)
      .sort();

    if (affectedDates.length === 0) return;

    const minDate = affectedDates[0];
    const maxDate = affectedDates[affectedDates.length - 1];

    const { data: affectedPeriods, error } = await supabase
      .from("payroll_periods")
      .select("id, period_name, status")
      .lte("start_date", maxDate)
      .gte("end_date", minDate)
      .in("status", ["Draft", "Reopened", "For Approval", "Approved"]);

    if (error) {
      console.log("MARK PAYROLL PERIODS QUERY ERROR:", error.message);
      return;
    }

    const periodIds = (affectedPeriods || []).map((period) => period.id);

    if (periodIds.length === 0) return;

    const { error: updateError } = await supabase
      .from("payroll_periods")
      .update({ needs_regeneration: true })
      .in("id", periodIds);

    if (updateError) {
      console.log(
        "MARK PAYROLL NEEDS REGENERATION ERROR:",
        updateError.message,
      );
    }
  };

  /// ACTIONS
  const updateLocalEntry = (
    employee: Employee,
    date: string,
    field: string,
    value: string,
  ) => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`,
      );
      return;
    }

    const existing = getEntry(employee.id, date);

    const baseEntry: AttendanceEntry = existing || {
      employee_id: employee.id,
      attendance_date: date,
      time_in: "",
      time_out: "",
      remarks: "",
      attendance_source: "Manual Entry",
    };

    const updated: AttendanceEntry = {
      ...baseEntry,
      [field]: value,
    };

    const computed = computeEntry(employee, date, updated);

    const finalEntry = {
      ...updated,
      ...computed,
    };

    setEntries((prev) => {
      const exists = prev.some(
        (entry) =>
          String(entry.employee_id) === String(employee.id) &&
          String(entry.attendance_date) === String(date),
      );

      if (exists) {
        return prev.map((entry) =>
          String(entry.employee_id) === String(employee.id) &&
          String(entry.attendance_date) === String(date)
            ? finalEntry
            : entry,
        );
      }

      return [...prev, finalEntry];
    });
  };

  const updateScheduleOverride = (
    employee: Employee,
    date: string,
    shiftName: string,
  ) => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`,
      );
      return;
    }

    const selectedShift = getShiftTemplate(shiftName);
    const existing = getEntry(employee.id, date);

    const baseEntry: AttendanceEntry = existing || {
      employee_id: employee.id,
      attendance_date: date,
      time_in: "",
      time_out: "",
      remarks: "",
      attendance_source: "Manual Entry",
    };

    const updated: AttendanceEntry = {
      ...baseEntry,
      scheduled_shift: shiftName,
      scheduled_in: selectedShift?.start_time || null,
      scheduled_out: selectedShift?.end_time || null,
      remarks:
        baseEntry.remarks ||
        `Schedule override from attendance entries: ${shiftName}`,
    };

    const computed = computeEntry(employee, date, updated);

    const finalEntry = {
      ...updated,
      ...computed,
    };

    setEntries((prev) => {
      const exists = prev.some(
        (entry) =>
          String(entry.employee_id) === String(employee.id) &&
          String(entry.attendance_date) === String(date),
      );

      if (exists) {
        return prev.map((entry) =>
          String(entry.employee_id) === String(employee.id) &&
          String(entry.attendance_date) === String(date)
            ? finalEntry
            : entry,
        );
      }

      return [...prev, finalEntry];
    });
  };

  const previewBiometrics = async (file: File) => {
    if (attendanceLocked) {
      alert(
        `Attendance import is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`,
      );
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const parseReportRange = (value: any) => {
      const text = String(value || "");
      const match = text.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);

      if (!match) return null;

      return {
        start: match[1],
        end: match[2],
      };
    };

    const buildDateFromDayNumber = (dayNumber: any, reportStart: string) => {
      const day = Number(dayNumber);
      if (!day || !reportStart) return "";

      const start = new Date(`${reportStart}T00:00:00`);
      const year = start.getFullYear();
      const startMonth = start.getMonth();

      let month = startMonth;

      if (day < start.getDate()) {
        month = startMonth + 1;
      }

      const built = new Date(year, month, day);
      return built.toISOString().slice(0, 10);
    };

    const normalizeTimeList = (value: any) => {
      const text = String(value || "").trim();
      if (!text) return [];

      return text
        .split(/\s+/)
        .map((item) => parseExcelTime(item))
        .filter(Boolean);
    };

    const buildPreviewFromAttendLogs = () => {
      const sheet = workbook.Sheets["Attend. Logs"];
      if (!sheet) return [];

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });

      const reportRange =
        parseReportRange(rows?.[1]?.[2]) ||
        parseReportRange(rows?.[1]?.[1]) ||
        parseReportRange(rows?.[1]?.[0]);

      if (!reportRange?.start) return [];

      const previewRows: ImportPreviewRow[] = [];

      for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 4) {
        const idRow = rows[rowIndex] || [];
        const dayRow = rows[rowIndex + 1] || [];
        const logRow = rows[rowIndex + 3] || [];

        const employeeNo = String(idRow[2] || "").trim();
        const employeeName = String(idRow[11] || "").trim();

        if (!employeeNo && !employeeName) continue;

        const employee = findEmployeeByEmployeeNoOrName(
          employeeNo,
          employeeName,
        );

        dayRow.slice(0, 7).forEach((dayNumber, dayIndex) => {
          const attendanceDate = buildDateFromDayNumber(
            dayNumber,
            reportRange.start,
          );

          if (!attendanceDate) return;
          if (attendanceDate < startDate || attendanceDate > endDate) return;

          const times = normalizeTimeList(logRow[dayIndex]);
          if (times.length === 0) return;

          const timeIn = times[0] || null;
          const timeOut = times.length > 1 ? times[times.length - 1] : null;

          let status = "Present";
          if (!timeIn && !timeOut) status = "Absent";

          previewRows.push({
            employee_name: employeeName,
            employee_id: employee?.id,
            matched_employee_name: employee
              ? `${employee.first_name} ${employee.last_name}`
              : "",
            matched_employee_no: employee?.employee_no || employeeNo,
            attendance_date: attendanceDate,
            time_in: timeIn,
            time_out: timeOut,
            late_minutes: 0,
            undertime_minutes: 0,
            ot_minutes: 0,
            status,
            matched: !!employee,
            remarks: employee ? "Ready to import" : "Employee not found",
          });
        });
      }

      return previewRows;
    };

    const buildPreviewFromAbnormalSheet = () => {
      const sheet = workbook.Sheets["Abnormal"];
      if (!sheet) return [];

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });

      const previewRows: ImportPreviewRow[] = [];

      rows.slice(4).forEach((row) => {
        const employeeNo = String(row[0] || "").trim();
        const employeeName = String(row[1] || "").trim();
        const date = parseExcelDate(row[3]);

        if (!employeeName || !date) return;
        if (date < startDate || date > endDate) return;

        const employee = findEmployeeByEmployeeNoOrName(
          employeeNo,
          employeeName,
        );

        const rawTimes = [row[4], row[5], row[6], row[7]]
          .map((value) => parseExcelTime(value))
          .filter(Boolean);

        const timeIn = rawTimes[0] || null;
        const timeOut =
          rawTimes.length > 1 ? rawTimes[rawTimes.length - 1] : null;

        if (!timeIn && !timeOut) return;

        const lateMinutes = parseMinutes(row[8]);
        const undertimeMinutes = parseMinutes(row[9]);

        let status = "Present";
        if (lateMinutes > 0) status = "Late";
        if (undertimeMinutes > 0) status = "Undertime";

        previewRows.push({
          employee_name: employeeName,
          employee_id: employee?.id,
          matched_employee_name: employee
            ? `${employee.first_name} ${employee.last_name}`
            : "",
          matched_employee_no: employee?.employee_no || employeeNo,
          attendance_date: date,
          time_in: timeIn,
          time_out: timeOut,
          late_minutes: lateMinutes,
          undertime_minutes: undertimeMinutes,
          ot_minutes: 0,
          status,
          matched: !!employee,
          remarks: employee ? "Ready to import" : "Employee not found",
        });
      });

      return previewRows;
    };

    const buildPreviewFromSimpleSheet = () => {
      const worksheet =
        workbook.Sheets["Time Entries"] ||
        workbook.Sheets[workbook.SheetNames[0]];

      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const previewRows: ImportPreviewRow[] = [];

      rows.forEach((row) => {
        const name = String(
          getValue(row, ["Name", "Employee", "Employee Name"]),
        ).trim();

        const date = parseExcelDate(getValue(row, ["Date", "Attendance Date"]));

        if (!name || !date) return;
        if (date < startDate || date > endDate) return;

        const employeeNo = String(
          getValue(row, [
            "Employee No",
            "Employee ID",
            "Biometrics ID",
            "Enroll No",
            "User ID",
            "PIN",
            "ID",
          ]),
        ).trim();

        const employee = findEmployeeByEmployeeNoOrName(employeeNo, name);

        const timeIn = parseExcelTime(getValue(row, ["Time In", "In"]));
        const timeOut = parseExcelTime(getValue(row, ["Time Out", "Out"]));

        const lateMinutes = parseMinutes(
          getValue(row, ["Late Min", "Late Minutes", "Late"]),
        );

        const undertimeMinutes = parseMinutes(
          getValue(row, ["Undertime", "Undertime Min", "UT"]),
        );

        const otMinutes = parseOtMinutes(
          getValue(row, ["OT Hrs", "OT Hours", "OT"]),
        );

        let status = "Present";
        if (!timeIn && !timeOut) status = "Absent";
        if (lateMinutes > 0) status = "Late";
        if (undertimeMinutes > 0) status = "Undertime";

        previewRows.push({
          employee_name: name,
          employee_id: employee?.id,
          matched_employee_name: employee
            ? `${employee.first_name} ${employee.last_name}`
            : "",
          matched_employee_no: employee?.employee_no || "",
          attendance_date: date,
          time_in: timeIn || null,
          time_out: timeOut || null,
          late_minutes: lateMinutes,
          undertime_minutes: undertimeMinutes,
          ot_minutes: otMinutes,
          status,
          matched: !!employee,
          remarks: employee ? "Ready to import" : "Employee not found",
        });
      });

      return previewRows;
    };

    let preview = buildPreviewFromAttendLogs();

    if (preview.length === 0) preview = buildPreviewFromAbnormalSheet();
    if (preview.length === 0) preview = buildPreviewFromSimpleSheet();

    setImportPreview(preview);

    const matched = preview.filter((row) => row.matched).length;
    const missing = preview.filter((row) => !row.matched).length;

    setImportStatus(
      `Preview loaded. Rows: ${preview.length}. Matched: ${matched}. Missing: ${missing}.`,
    );
  };

  const confirmImportPreview = () => {
    if (attendanceLocked) {
      alert(
        `Attendance import is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`,
      );
      return;
    }

    const matchedRows = importPreview.filter(
      (row) => row.matched && row.employee_id,
    );

    let conflictCount = 0;
    let skippedPortalCount = 0;

    setEntries((prev) => {
      const merged = [...prev];

      matchedRows.forEach((row) => {
        const employee = employees.find(
          (emp) => String(emp.id) === String(row.employee_id),
        );

        const preference = getAttendanceSourcePreference(employee);
        const incomingSource = "Biometrics";

        const incoming: AttendanceEntry = {
          employee_id: row.employee_id!,
          attendance_date: row.attendance_date,
          scheduled_shift: null,
          scheduled_in: null,
          scheduled_out: null,
          time_in: row.time_in,
          time_out: row.time_out,
          late_minutes: row.late_minutes,
          undertime_minutes: row.undertime_minutes,
          ot_minutes: row.ot_minutes,
          status: row.status,
          remarks: "Imported from biometrics",
          attendance_source: incomingSource,
        };

        const index = merged.findIndex(
          (entry) =>
            entry.employee_id === incoming.employee_id &&
            entry.attendance_date === incoming.attendance_date,
        );

        if (index < 0) {
          merged.push(incoming);
          return;
        }

        const existing = merged[index];
        const existingSource = getExistingSource(existing);
        const conflict = hasTimeConflict(existing, incoming);

        if (
          preference === "Employee Portal" &&
          existingSource === "Employee Portal" &&
          conflict
        ) {
          conflictCount += 1;
          skippedPortalCount += 1;

          merged[index] = {
            ...existing,
            status: "Review Required",
            remarks: buildSourceConflictRemarks(existingSource, incomingSource),
            attendance_source: "Mixed",
          };

          return;
        }

        if (preference === "Manual Review" && conflict) {
          conflictCount += 1;

          merged[index] = {
            ...existing,
            status: "Review Required",
            remarks: buildSourceConflictRemarks(
              existingSource || "existing",
              incomingSource,
            ),
            attendance_source: "Mixed",
          };

          return;
        }

        if (
          preference === "Employee Portal" &&
          existingSource === "Employee Portal"
        ) {
          skippedPortalCount += 1;
          return;
        }

        merged[index] = {
          ...existing,
          ...incoming,
          remarks:
            existing.remarks && existing.remarks.includes("Schedule override")
              ? `${existing.remarks} | Imported from biometrics`
              : "Imported from biometrics",
          attendance_source: incomingSource,
        };
      });

      return merged;
    });

    const statusMessageParts = [
      `Confirmed ${matchedRows.length} imported row(s).`,
    ];

    if (skippedPortalCount > 0) {
      statusMessageParts.push(
        `${skippedPortalCount} portal-controlled row(s) were protected from biometrics overwrite.`,
      );
    }

    if (conflictCount > 0) {
      statusMessageParts.push(
        `${conflictCount} source conflict(s) marked as Review Required.`,
      );
    }

    setImportStatus(statusMessageParts.join(" "));
    setImportPreview([]);
  };

  const clearImportPreview = () => {
    setImportPreview([]);
    setImportStatus("");
  };

  const markMissingAsAbsent = () => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`,
      );
      return;
    }

    if (missingEntryRows.length === 0) return;

    missingEntryRows.forEach((row) => {
      updateLocalEntry(
        row.employee,
        row.date,
        "remarks",
        "Marked absent - no biometrics entry",
      );
    });

    alert(`Marked ${missingEntryRows.length} missing row(s) for review.`);
  };

  const saveAttendance = async () => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}\n\nReopen payroll first before editing attendance.`,
      );
      return;
    }

    const sourceRows =
      reviewEmployees.length > 0 && attendanceRows.length > 0
        ? attendanceRows.map((row) => ({
            employee_id: row.employee.id,
            attendance_date: row.date,
            scheduled_shift: row.scheduled_shift,
            scheduled_in: row.scheduled_in,
            scheduled_out: row.scheduled_out,
            time_in: row.entry?.time_in || null,
            time_out: row.entry?.time_out || null,
            late_minutes: row.late_minutes,
            undertime_minutes: row.undertime_minutes,
            ot_minutes: row.ot_minutes,
            status: row.status,
            remarks: row.entry?.remarks || "",
            attendance_source:
              row.entry?.attendance_source ||
              getExistingSource(row.entry) ||
              "Manual Entry",
          }))
        : entries.map((entry) => ({
            employee_id: entry.employee_id,
            attendance_date: entry.attendance_date,
            scheduled_shift: entry.scheduled_shift,
            scheduled_in: entry.scheduled_in,
            scheduled_out: entry.scheduled_out,
            time_in: entry.time_in || null,
            time_out: entry.time_out || null,
            late_minutes: entry.late_minutes || 0,
            undertime_minutes: entry.undertime_minutes || 0,
            ot_minutes: entry.ot_minutes || 0,
            status: entry.status || "Present",
            remarks: entry.remarks || "",
            attendance_source:
              entry.attendance_source ||
              getExistingSource(entry) ||
              "Manual Entry",
          }));

    if (sourceRows.length === 0) {
      alert("No attendance rows to save.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("attendance_entries")
      .upsert(sourceRows, {
        onConflict: "employee_id,attendance_date",
      });

    if (error) {
      setIsSaving(false);
      console.log("SAVE ATTENDANCE ERROR:", error);
      alert(error.message);
      return;
    }

    await markPayrollPeriodsForRegeneration(sourceRows);

    setIsSaving(false);

    alert(
      `Saved ${sourceRows.length} attendance row(s). Payroll periods covering the saved dates were marked for regeneration.`,
    );
    getAttendanceEntries();
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getShiftTemplates();
    getSettings();
    getPayrollPeriods();
  }, []);

  useEffect(() => {
    getSchedules();
    getApprovedLeaves();
    getAttendanceEntries();
    getLockedPayrollPeriods();
  }, [startDate, endDate]);

  /// CALCULATIONS
  const departments = useMemo(() => {
    const list = employees
      .map((emp) => String(emp.department || "").trim())
      .filter((dept) => dept.length > 0);

    return Array.from(new Set(list)).sort();
  }, [employees]);

  const employeeOptions = useMemo(() => {
    return employees.filter((employee) => {
      return (
        departmentFilter === "ALL" ||
        employee.department?.toLowerCase() === departmentFilter.toLowerCase()
      );
    });
  }, [employees, departmentFilter]);

  const selectedEmployee = useMemo(() => {
    return employees.find((emp) => emp.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  const reviewEmployees = useMemo(() => {
    if (selectedEmployeeId === "ALL_EMPLOYEES") return employeeOptions;
    if (selectedEmployee) return [selectedEmployee];
    return [];
  }, [selectedEmployeeId, selectedEmployee, employeeOptions]);

  const attendanceRows = useMemo(() => {
    if (reviewEmployees.length === 0) return [];

    return reviewEmployees.flatMap((employee) =>
      getDateRange().map((date) => {
        const entry = getEntry(employee.id, date);
        const computed = computeEntry(employee, date, entry);

        return {
          key: `${employee.id}-${date}`,
          employee,
          date,
          entry,
          ...computed,
        };
      }),
    );
  }, [
    reviewEmployees,
    entries,
    schedules,
    approvedLeaves,
    settings,
    startDate,
    endDate,
  ]);

  const presentCount = attendanceRows.filter((row) =>
    ["Present", "Late", "Undertime", "Overtime"].includes(row.status),
  ).length;

  const lateCount = attendanceRows.filter(
    (row) => Number(row.late_minutes || 0) > 0,
  ).length;

  const absentCount = attendanceRows.filter(
    (row) => row.status === "Absent",
  ).length;

  const totalOtMinutes = attendanceRows.reduce(
    (sum, row) => sum + Number(row.ot_minutes || 0),
    0,
  );

  const payrollIssueRows = attendanceRows.filter((row) => {
    const isWorkingDay = isWorkingShift(row.scheduled_shift);

    const missingTime =
      isWorkingDay && !row.entry?.time_in && !row.entry?.time_out;

    const missingOut =
      isWorkingDay && row.entry?.time_in && !row.entry?.time_out;

    const noSchedule = isUnscheduledShift(row.scheduled_shift);

    const reviewRequired = row.status === "Review Required";

    return missingTime || missingOut || noSchedule || reviewRequired;
  });

  const missingEntryRows = payrollIssueRows.filter((row) => {
    const isWorkingDay = isWorkingShift(row.scheduled_shift);

    return isWorkingDay && !row.entry?.time_in && !row.entry?.time_out;
  });

  const missingOutRows = payrollIssueRows.filter((row) => {
    const isWorkingDay = isWorkingShift(row.scheduled_shift);

    return isWorkingDay && row.entry?.time_in && !row.entry?.time_out;
  });

  const noScheduleRows = attendanceRows.filter((row) =>
    isUnscheduledShift(row.scheduled_shift),
  );

  const restDayRows = attendanceRows.filter((row) =>
    isRestDayShift(row.scheduled_shift),
  );

  const reviewRequiredRows = attendanceRows.filter(
    (row) => row.status === "Review Required",
  );

  const payrollReady =
    reviewEmployees.length > 0 &&
    attendanceRows.length > 0 &&
    payrollIssueRows.length === 0;

  const attendanceLocked = lockedPayrollPeriods.length > 0;

  const lockedPeriodNames =
    lockedPayrollPeriods.map((period) => period.period_name).join(", ") ||
    "Locked payroll period";

  const matchedPreviewCount = importPreview.filter((row) => row.matched).length;
  const missingPreviewCount = importPreview.filter(
    (row) => !row.matched,
  ).length;

  /// UI
  return (
    <PageGuard moduleKey="attendance">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
                Payroll
              </p>

              <h1 className="mt-2 text-4xl font-black">Attendance Entries</h1>

              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                Employee-based attendance review with biometrics preview and
                payroll issue checks.
              </p>
            </div>

            <button
              onClick={saveAttendance}
              disabled={isSaving || attendanceLocked}
              className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              {attendanceLocked
                ? "Attendance Locked"
                : isSaving
                  ? "Saving..."
                  : payrollReady
                    ? "Save Payroll-Ready Attendance"
                    : "Save with Issues"}
            </button>
          </section>

          {attendanceLocked && (
            <section className="mb-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
              <p className="font-black">
                Attendance is locked for this cutoff.
              </p>
              <p className="mt-1 text-sm text-yellow-100/80">
                Payroll was already sent for approval for: {lockedPeriodNames}.
                Reopen payroll first before editing or importing attendance.
              </p>
            </section>
          )}

          <section className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-200">
            <p className="font-black">Payroll Safety</p>
            <p className="mt-1 text-sm text-blue-100/80">
              Any saved attendance change automatically marks the affected
              payroll cutoff as outdated. Open Payroll Register and click
              Generate Payroll again before release.
            </p>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Days" value={attendanceRows.length} />
            <SummaryCard
              title="Present"
              value={presentCount}
              color="text-emerald-400"
            />
            <SummaryCard
              title="Late"
              value={lateCount}
              color="text-amber-400"
            />
            <SummaryCard
              title="Absent"
              value={absentCount}
              color="text-red-400"
            />
            <SummaryCard
              title="Missing"
              value={missingEntryRows.length}
              color="text-red-400"
            />
            <SummaryCard
              title="Missing Out"
              value={missingOutRows.length}
              color="text-orange-400"
            />
            <SummaryCard
              title="No Schedule"
              value={noScheduleRows.length}
              color="text-red-400"
            />
            <SummaryCard
              title="Rest Day"
              value={restDayRows.length}
              color="text-lime-400"
            />
            <SummaryCard
              title="Review Required"
              value={reviewRequiredRows.length}
              color="text-orange-400"
            />
            <SummaryCard
              title="OT Hours"
              value={(totalOtMinutes / 60).toFixed(2)}
              color="text-blue-400"
            />
          </section>

          <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-black">Payroll Cutoff Filters</h2>
              <p className="mt-1 text-sm text-slate-400">
                Select one employee or all employees and review attendance by
                payroll cutoff range. Time fields accept copy-paste formats like
                0800, 8:00, 8am, 1730, or 5:30pm.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <select
                value={selectedCutoffId}
                onChange={(e) => applyPayrollCutoff(e.target.value)}
                className="rounded-xl border border-amber-400/30 bg-slate-950 px-4 py-2 text-sm font-bold text-amber-300 outline-none"
              >
                <option value="CUSTOM">Custom Date Range</option>
                {payrollPeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.period_name} •{" "}
                    {String(period.start_date).slice(0, 10)} to{" "}
                    {String(period.end_date).slice(0, 10)}
                  </option>
                ))}
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setSelectedEmployeeId("");
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              >
                <option value="ALL">All Departments</option>

                {departments.map((dept: any) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              >
                <option value="">Select Employee</option>
                <option value="ALL_EMPLOYEES">All Employees</option>

                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setSelectedCutoffId("CUSTOM");
                  setStartDate(e.target.value);
                }}
                style={{ colorScheme: "dark" }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setSelectedCutoffId("CUSTOM");
                  setEndDate(e.target.value);
                }}
                style={{ colorScheme: "dark" }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              />

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={attendanceLocked}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) previewBiometrics(file);
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm"
              />
            </div>
          </section>

          {importStatus && (
            <section className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-300">
              {importStatus}
            </section>
          )}

          {reviewEmployees.length > 0 && (
            <section
              className={`mb-8 rounded-3xl border p-6 ${
                payrollReady
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-red-500/30 bg-red-500/10"
              }`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2
                    className={`text-2xl font-black ${
                      payrollReady ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {payrollReady ? "Payroll Ready" : "Payroll Review Needed"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-300">
                    Missing Entries: {missingEntryRows.length} • Missing Time
                    Out: {missingOutRows.length} • Unscheduled:{" "}
                    {noScheduleRows.length} • Review Required:{" "}
                    {reviewRequiredRows.length}
                  </p>
                </div>

                {missingEntryRows.length > 0 && (
                  <button
                    onClick={markMissingAsAbsent}
                    disabled={attendanceLocked}
                    className="rounded-xl bg-red-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-red-300 disabled:opacity-50"
                  >
                    Mark Missing as Absent
                  </button>
                )}
              </div>

              {payrollIssueRows.length > 0 && (
                <div className="mt-5 max-h-64 overflow-auto rounded-2xl border border-red-500/20 bg-slate-950/60">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                      <tr>
                        <th className="px-4 py-3 align-middle">Employee</th>
                        <th className="px-4 py-3 align-middle">Date</th>
                        <th className="px-4 py-3 align-middle">Issue</th>
                        <th className="px-4 py-3 align-middle">Schedule</th>
                        <th className="px-4 py-3 align-middle">Time In</th>
                        <th className="px-4 py-3 align-middle">Time Out</th>
                      </tr>
                    </thead>

                    <tbody>
                      {payrollIssueRows.map((row) => {
                        const isWorkingDay =
                          row.scheduled_shift !== "OFF" &&
                          row.scheduled_shift !== "RD" &&
                          row.scheduled_shift !== "Leave";

                        let issue = "Needs Review";

                        if (row.status === "Review Required") {
                          issue = row.review_reason || "Review Required";
                        } else if (
                          isWorkingDay &&
                          !row.entry?.time_in &&
                          !row.entry?.time_out
                        ) {
                          issue = "Missing Time In / Out";
                        } else if (
                          isWorkingDay &&
                          row.entry?.time_in &&
                          !row.entry?.time_out
                        ) {
                          issue = "Missing Time Out";
                        } else if (isUnscheduledShift(row.scheduled_shift)) {
                          issue = "Unscheduled Employee";
                        }

                        return (
                          <tr
                            key={`issue-${row.key}`}
                            className="border-t border-slate-800"
                          >
                            <td className="px-4 py-3 align-middle">
                              <p className="font-black">
                                {row.employee.first_name}{" "}
                                {row.employee.last_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {row.employee.employee_no || "-"}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-middle font-bold">
                              {row.date}
                            </td>
                            <td className="px-4 py-3 align-middle font-black text-red-300">
                              {issue}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getShiftColorClass(row.scheduled_shift)}`}
                              >
                                {getScheduleLabel(row.scheduled_shift)}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {row.entry?.time_in || "--:--"}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {row.entry?.time_out || "--:--"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {importPreview.length > 0 && (
            <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Import Preview</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Rows: {importPreview.length} • Matched:{" "}
                    {matchedPreviewCount} • Missing: {missingPreviewCount}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={clearImportPreview}
                    className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Clear Preview
                  </button>

                  <button
                    onClick={confirmImportPreview}
                    disabled={attendanceLocked}
                    className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                  >
                    Confirm Import
                  </button>
                </div>
              </div>

              <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-800">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-3 align-middle">Excel Name</th>
                      <th className="px-4 py-3 align-middle">
                        Matched Employee
                      </th>
                      <th className="px-4 py-3 align-middle">Employee No</th>
                      <th className="px-4 py-3 align-middle">Date</th>
                      <th className="px-4 py-3 align-middle">Time In</th>
                      <th className="px-4 py-3 align-middle">Time Out</th>
                      <th className="px-4 py-3 text-right">Late</th>
                      <th className="px-4 py-3 text-right">UT</th>
                      <th className="px-4 py-3 text-right">OT</th>
                      <th className="px-4 py-3 align-middle">Status</th>
                      <th className="px-4 py-3 align-middle">Match</th>
                    </tr>
                  </thead>

                  <tbody>
                    {importPreview.map((row, index) => (
                      <tr key={index} className="border-t border-slate-800">
                        <td className="px-4 py-3 align-middle font-bold">
                          {row.employee_name}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-300">
                          {row.matched_employee_name || "-"}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {row.matched_employee_no || "-"}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {row.attendance_date}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {row.time_in || "--:--"}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {row.time_out || "--:--"}
                        </td>
                        <td className="px-4 py-3 align-middle text-right text-amber-400">
                          {row.late_minutes}
                        </td>
                        <td className="px-4 py-3 align-middle text-right text-red-400">
                          {row.undertime_minutes}
                        </td>
                        <td className="px-4 py-3 align-middle text-right text-blue-400">
                          {row.ot_minutes}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              row.matched
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {row.matched ? "Matched" : "Missing"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black">
                {selectedEmployeeId === "ALL_EMPLOYEES"
                  ? "All Employees Attendance Review"
                  : selectedEmployee
                    ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                    : "Attendance Review"}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {selectedEmployeeId === "ALL_EMPLOYEES"
                  ? `${reviewEmployees.length} employee(s) selected • ${getDateRange().length} day(s)`
                  : selectedEmployee
                    ? `${selectedEmployee.department} • ${selectedEmployee.position || "-"}`
                    : "Select an employee or All Employees to review attendance."}
              </p>
            </div>

            <div className="max-h-[720px] overflow-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[1450px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3 align-middle">Employee</th>
                    <th className="px-4 py-3 align-middle">Date</th>
                    <th className="px-4 py-3 align-middle">Schedule</th>
                    <th className="px-4 py-3 align-middle">Time In</th>
                    <th className="px-4 py-3 align-middle">Time Out</th>
                    <th className="px-4 py-3 text-right">Late</th>
                    <th className="px-4 py-3 text-right">Undertime</th>
                    <th className="px-4 py-3 text-right">OT</th>
                    <th className="px-4 py-3 align-middle">Status</th>
                    <th className="px-4 py-3 align-middle">Source</th>
                    <th className="px-4 py-3 align-middle">Remarks</th>
                    <th className="w-16 px-4 py-3 text-center align-middle">
                      ⚠
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {attendanceRows.map((row) => {
                    const rowIsApprovedLeave =
                      row.status === "Leave" ||
                      isLeaveShift(row.scheduled_shift);

                    return (
                      <tr
                        key={row.key}
                        className={`border-t border-slate-800 align-middle hover:bg-slate-800/40 ${
                          payrollIssueRows.some(
                            (issue) => issue.key === row.key,
                          )
                            ? "bg-red-500/5"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3 align-middle">
                          <p className="font-black">
                            {row.employee.first_name} {row.employee.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.employee.employee_no || "-"} •{" "}
                            {row.employee.department || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-middle font-bold">
                          {row.date}
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center">
                            <select
                              value={row.scheduled_shift}
                              disabled={attendanceLocked || rowIsApprovedLeave}
                              onChange={(e) =>
                                updateScheduleOverride(
                                  row.employee,
                                  row.date,
                                  e.target.value,
                                )
                              }
                              className={`w-44 rounded-lg border px-3 py-2 text-center text-sm font-black outline-none disabled:opacity-50 ${getShiftColorClass(row.scheduled_shift)}`}
                            >
                              {!shiftTemplates.some(
                                (shift) => shift.shift_name === "OFF",
                              ) && <option value="OFF">OFF</option>}

                              {shiftTemplates.map((shift) => (
                                <option
                                  key={shift.id}
                                  value={shift.shift_name}
                                  className="bg-slate-900 text-white"
                                >
                                  {getShiftTimeLabel(shift.shift_name)}
                                </option>
                              ))}

                              {!shiftTemplates.some(
                                (shift) => shift.shift_name === "RD",
                              ) && <option value="RD">RD</option>}

                              {!shiftTemplates.some(
                                (shift) =>
                                  shift.shift_name === "Leave" ||
                                  shift.shift_name === "LEAVE",
                              ) && <option value="Leave">LEAVE</option>}
                            </select>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center">
                            <FriendlyTimeInput
                              value={row.entry?.time_in || ""}
                              disabled={attendanceLocked || rowIsApprovedLeave}
                              placeholder="0800 / 8am"
                              onCommit={(value: string) =>
                                updateLocalEntry(
                                  row.employee,
                                  row.date,
                                  "time_in",
                                  value,
                                )
                              }
                            />
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center">
                            <FriendlyTimeInput
                              value={row.entry?.time_out || ""}
                              disabled={attendanceLocked || rowIsApprovedLeave}
                              placeholder="1700 / 5pm"
                              onCommit={(value: string) =>
                                updateLocalEntry(
                                  row.employee,
                                  row.date,
                                  "time_out",
                                  value,
                                )
                              }
                            />
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle text-right font-bold text-amber-400">
                          {row.late_minutes}
                        </td>

                        <td className="px-4 py-3 align-middle text-right font-bold text-red-400">
                          {row.undertime_minutes}
                        </td>

                        <td className="px-4 py-3 align-middle text-right font-bold text-blue-400">
                          {row.ot_minutes}
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <StatusBadge status={row.status} />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <SourceBadge
                            source={
                              row.entry?.attendance_source ||
                              getExistingSource(row.entry) ||
                              "-"
                            }
                          />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <input
                            value={row.entry?.remarks || ""}
                            disabled={attendanceLocked || rowIsApprovedLeave}
                            onChange={(e) =>
                              updateLocalEntry(
                                row.employee,
                                row.date,
                                "remarks",
                                e.target.value,
                              )
                            }
                            className="w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                          />
                        </td>

                        <td className="w-16 px-4 py-3 text-center align-middle">
                          {row.review_reason ||
                          isUnscheduledShift(row.scheduled_shift) ? (
                            <span
                              title={
                                row.review_reason || "No schedule assigned"
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-black text-red-400"
                            >
                              ⚠
                            </span>
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center text-slate-700">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {attendanceRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-4 py-14 text-center text-slate-500"
                      >
                        Select an employee to review attendance by date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function FriendlyTimeInput({
  value,
  disabled,
  placeholder,
  onCommit,
}: {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const commit = () => {
    const parsed = parseFriendlyTimeInput(draft);

    if (parsed === null) {
      alert("Invalid time format. Use 0800, 8:00, 8am, 1730, or 5:30pm.");
      setDraft(value || "");
      return;
    }

    setDraft(parsed);
    onCommit(parsed);
  };

  return (
    <input
      type="text"
      inputMode="text"
      value={draft}
      disabled={disabled}
      placeholder={placeholder || "0800 / 8am"}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
      className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 disabled:opacity-50"
    />
  );
}

function SummaryCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 text-3xl font-black ${color}`}>{value}</h2>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const normalized = String(source || "-");

  const style =
    normalized === "Employee Portal"
      ? "bg-blue-500/10 text-blue-400"
      : normalized === "Biometrics"
        ? "bg-emerald-500/10 text-emerald-400"
        : normalized === "Mixed"
          ? "bg-orange-500/10 text-orange-400"
          : normalized === "Manual Entry"
            ? "bg-purple-500/10 text-purple-400"
            : "bg-slate-700 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {normalized}
    </span>
  );
}

function StatusBadge({ status }: any) {
  const style =
    status === "Present"
      ? "bg-emerald-500/10 text-emerald-400"
      : status === "Late"
        ? "bg-amber-500/10 text-amber-400"
        : status === "Undertime" || status === "Absent"
          ? "bg-red-500/10 text-red-400"
          : status === "Overtime"
            ? "bg-blue-500/10 text-blue-400"
            : status === "Review Required"
              ? "bg-orange-500/10 text-orange-400"
              : status === "Leave"
                ? "bg-blue-500/10 text-blue-400"
                : status === "RD"
                  ? "bg-lime-500/10 text-lime-400"
                  : status === "Unscheduled"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-slate-700 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {status}
    </span>
  );
}
