import { supabase } from '@/lib/supabase';
"use client";


"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import PageGuard from "@/components/PageGuard";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";

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

type BiometricMapping = {
  id?: string;
  employee_id: string;
  biometric_employee_no?: string | null;
  biometric_name?: string | null;
  created_at?: string;
};

type ScheduleOverride = {
  id?: string | number;
  employee_id: string;
  schedule_date: string;
  original_shift?: string | null;
  override_start?: string | null;
  override_end?: string | null;
  reason?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
};

type EffectiveSchedule = {
  shiftName: string;
  scheduledIn: string | null;
  scheduledOut: string | null;
  source: "Attendance Override" | "Schedule Override" | "Scheduling" | "None";
  override?: ScheduleOverride | null;
};

type ImportPreviewRow = {
  employee_name: string;
  employee_id?: string;
  biometric_employee_no?: string;
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

  let text = raw.replace(/\s+/g, "").replace(/\./g, ":").replace(/ï¼š/g, ":");

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
  const [biometricMappings, setBiometricMappings] = useState<BiometricMapping[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([]);
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

  const normalizeEmployeeNo = (value: any) => {
    const clean = String(value || "").trim().toLowerCase();
    if (!clean) return "";

    // Common biometric exports use 1, 2, 3 while payroll master uses 001, 002, 003.
    // Keep the original value for exact matching, but also support numeric padded matching.
    const numericOnly = clean.replace(/\D/g, "");
    if (numericOnly && /^\d+$/.test(numericOnly)) {
      return String(Number(numericOnly));
    }

    return clean;
  };

  const employeeNoVariants = (value: any) => {
    const clean = String(value || "").trim();
    const normalized = normalizeEmployeeNo(clean);

    const variants = new Set<string>();
    if (clean) variants.add(clean.toLowerCase());
    if (normalized) variants.add(normalized);

    const numericOnly = clean.replace(/\D/g, "");
    if (numericOnly) {
      variants.add(String(Number(numericOnly)));
      variants.add(numericOnly.padStart(3, "0").toLowerCase());
      variants.add(numericOnly.padStart(4, "0").toLowerCase());
    }

    return Array.from(variants).filter(Boolean);
  };

  const getEmployeeById = (employeeId?: string | null) =>
    employees.find((emp) => String(emp.id) === String(employeeId));

  const findEmployeeByBiometricMapping = (employeeNo: string, name: string) => {
    const noVariants = employeeNoVariants(employeeNo);
    const cleanName = normalizeName(name);

    const mapping = biometricMappings.find((item) => {
      const mappingNoVariants = employeeNoVariants(item.biometric_employee_no || "");
      const noMatch =
        noVariants.length > 0 &&
        mappingNoVariants.some((value) => noVariants.includes(value));

      const mappingName = normalizeName(item.biometric_name || "");
      const nameMatch =
        !!cleanName &&
        !!mappingName &&
        (mappingName === cleanName ||
          mappingName.includes(cleanName) ||
          cleanName.includes(mappingName));

      return noMatch || nameMatch;
    });

    return mapping ? getEmployeeById(mapping.employee_id) || null : null;
  };

  const findEmployeeByEmployeeNoOrName = (employeeNo: string, name: string) => {
    const mappedEmployee = findEmployeeByBiometricMapping(employeeNo, name);
    if (mappedEmployee) return mappedEmployee;

    const cleanEmployeeNo = String(employeeNo || "")
      .trim()
      .toLowerCase();
    const cleanName = normalizeName(name);

    const incomingNoVariants = employeeNoVariants(cleanEmployeeNo);

    if (incomingNoVariants.length > 0) {
      const idMatch = employees.find((emp) => {
        const empVariants = employeeNoVariants(emp.employee_no || "");
        return empVariants.some((value) => incomingNoVariants.includes(value));
      });

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

  const isTimeRangeShift = (value?: string | null) =>
    /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(
      String(value || "").trim(),
    );

  const parseTimeRangeShift = (value?: string | null) => {
    const clean = String(value || "").trim();
    const match = clean.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);

    if (!match) {
      return { start: null as string | null, end: null as string | null };
    }

    return {
      start: match[1].padStart(5, "0"),
      end: match[2].padStart(5, "0"),
    };
  };

  const formatTimeRange = (start?: string | null, end?: string | null) =>
    `${String(start || "").slice(0, 5)} - ${String(end || "").slice(0, 5)}`;

  const getScheduleOverride = (employeeId: string, date: string) =>
    scheduleOverrides.find(
      (item) =>
        String(item.employee_id) === String(employeeId) &&
        String(item.schedule_date).slice(0, 10) === String(date).slice(0, 10),
    ) || null;

  const getEffectiveSchedule = (
    employee: Employee,
    date: string,
    entry?: AttendanceEntry,
  ): EffectiveSchedule => {
    if (entry?.scheduled_shift) {
      return {
        shiftName: entry.scheduled_shift,
        scheduledIn: entry.scheduled_in || null,
        scheduledOut: entry.scheduled_out || null,
        source: "Attendance Override",
      };
    }

    const override = getScheduleOverride(employee.id, date);

    if (override?.override_start && override?.override_end) {
      return {
        shiftName: formatTimeRange(override.override_start, override.override_end),
        scheduledIn: String(override.override_start).slice(0, 5),
        scheduledOut: String(override.override_end).slice(0, 5),
        source: "Schedule Override",
        override,
      };
    }

    const schedule = getSchedule(employee.id, date);

    if (schedule?.shift) {
      const shift = getShiftTemplate(schedule.shift);
      const parsedRange = parseTimeRangeShift(schedule.shift);

      return {
        shiftName: schedule.shift,
        scheduledIn: shift?.start_time || parsedRange.start || null,
        scheduledOut: shift?.end_time || parsedRange.end || null,
        source: "Scheduling",
      };
    }

    return {
      shiftName: "OFF",
      scheduledIn: null,
      scheduledOut: null,
      source: "None",
    };
  };

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

    if (isTimeRangeShift(shiftName)) {
      return "border-blue-500/40 bg-blue-500/15 text-blue-300";
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
    if (isTimeRangeShift(shiftName)) return String(shiftName).trim();

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
    const effectiveSchedule = getEffectiveSchedule(employee, date, entry);
    const shiftName = effectiveSchedule.shiftName || "OFF";
    const scheduledIn = effectiveSchedule.scheduledIn || null;
    const scheduledOut = effectiveSchedule.scheduledOut || null;
    const hasSchedule = effectiveSchedule.source !== "None";

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

    if (!hasSchedule) {
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

  const getBiometricMappings = async () => {
    const { data, error } = await supabase
      .from("biometric_mappings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET BIOMETRIC MAPPINGS ERROR:", error.message);
      setBiometricMappings([]);
      return;
    }

    setBiometricMappings(data || []);
  };

  const getSchedules = async () => {
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .gte("day", startDate)
      .lte("day", endDate);

    setSchedules(data || []);
  };

  const getScheduleOverrides = async () => {
    const { data, error } = await supabase
      .from("schedule_overrides")
      .select("*")
      .gte("schedule_date", startDate)
      .lte("schedule_date", endDate);

    if (error) {
      console.log("GET SCHEDULE OVERRIDES ERROR:", error.message);
      setScheduleOverrides([]);
      return;
    }

    setScheduleOverrides(data || []);
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

  const saveBiometricMapping = async ({
    employeeId,
    biometricEmployeeNo,
    biometricName,
  }: {
    employeeId: string;
    biometricEmployeeNo?: string;
    biometricName?: string;
  }) => {
    const cleanEmployeeNo = String(biometricEmployeeNo || "").trim();
    const cleanName = String(biometricName || "").trim();

    if (!employeeId || (!cleanEmployeeNo && !cleanName)) return;

    const payload = {
      employee_id: employeeId,
      biometric_employee_no: cleanEmployeeNo || null,
      biometric_name: cleanName || null,
    };

    const { data, error } = await supabase
      .from("biometric_mappings")
      .upsert(payload, {
        onConflict: "employee_id,biometric_employee_no,biometric_name",
      })
      .select();

    if (error) {
      console.log("SAVE BIOMETRIC MAPPING ERROR:", error.message);
      alert(
        "Unable to save biometric mapping. Make sure biometric_mappings table and unique constraint exist.",
      );
      return;
    }

    setBiometricMappings((prev) => {
      const merged = [...prev];

      (data || []).forEach((item) => {
        const existingIndex = merged.findIndex(
          (current) =>
            String(current.employee_id) === String(item.employee_id) &&
            String(current.biometric_employee_no || "") ===
              String(item.biometric_employee_no || "") &&
            normalizeName(current.biometric_name || "") ===
              normalizeName(item.biometric_name || ""),
        );

        if (existingIndex >= 0) {
          merged[existingIndex] = item;
        } else {
          merged.unshift(item);
        }
      });

      return merged;
    });
  };

  const applyManualBiometricMatch = async (
    rowIndex: number,
    employeeId: string,
  ) => {
    const selectedEmployee = employees.find(
      (emp) => String(emp.id) === String(employeeId),
    );

    if (!selectedEmployee) return;

    const targetRow = importPreview[rowIndex];
    if (!targetRow) return;

    await saveBiometricMapping({
      employeeId,
      biometricEmployeeNo: targetRow.biometric_employee_no,
      biometricName: targetRow.employee_name,
    });

    const selectedName = `${selectedEmployee.first_name} ${selectedEmployee.last_name}`.trim();
    const biometricNo = String(targetRow.biometric_employee_no || "").trim();
    const biometricName = normalizeName(targetRow.employee_name || "");

    setImportPreview((prev) =>
      prev.map((row, index) => {
        const sameBiometricNo =
          !!biometricNo &&
          String(row.biometric_employee_no || "").trim() === biometricNo;

        const sameBiometricName =
          !!biometricName &&
          normalizeName(row.employee_name || "") === biometricName;

        if (index === rowIndex || sameBiometricNo || sameBiometricName) {
          return {
            ...row,
            employee_id: selectedEmployee.id,
            matched_employee_name: selectedName,
            matched_employee_no: selectedEmployee.employee_no || "",
            matched: true,
            remarks: "Matched by manual biometric mapping",
          };
        }

        return row;
      }),
    );
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
            biometric_employee_no: employeeNo,
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


  /// EFFECTS + CALCULATIONS
  const loadAttendanceWorkbench = async () => {
    await Promise.all([
      getEmployees(),
      getBiometricMappings(),
      getShiftTemplates(),
      getSettings(),
      getPayrollPeriods(),
    ]);
  };

  useEffect(() => {
    loadAttendanceWorkbench();
  }, []);

  useEffect(() => {
    Promise.all([
      getSchedules(),
      getScheduleOverrides(),
      getApprovedLeaves(),
      getAttendanceEntries(),
      getLockedPayrollPeriods(),
    ]);
  }, [startDate, endDate]);

  const attendanceLocked = lockedPayrollPeriods.length > 0;

  const lockedPeriodNames =
    lockedPayrollPeriods
      .map(
        (period) =>
          period.period_name || period.name || "Locked Payroll Period",
      )
      .join(", ") || "Locked Payroll Period";

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map((employee) => String(employee.department || "Unassigned").trim())
          .filter(Boolean),
      ),
    ).sort();
  }, [employees]);

  const employeeOptions = useMemo(() => {
    return employees
      .filter((employee) => {
        if (departmentFilter === "ALL") return true;
        return String(employee.department || "Unassigned") === departmentFilter;
      })
      .sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(
          `${b.first_name} ${b.last_name}`,
        ),
      );
  }, [employees, departmentFilter]);

  const reviewEmployees = useMemo(() => {
    if (
      selectedEmployeeId &&
      selectedEmployeeId !== "ALL_EMPLOYEES"
    ) {
      return employeeOptions.filter(
        (employee) => String(employee.id) === String(selectedEmployeeId),
      );
    }

    return employeeOptions;
  }, [employeeOptions, selectedEmployeeId]);

  const attendanceRows = useMemo(() => {
    const dates = getDateRange();

    return reviewEmployees.flatMap((employee) =>
      dates.map((date) => {
        const entry = getEntry(employee.id, date);
        const computed = computeEntry(employee, date, entry);

        const sourcePreference = getAttendanceSourcePreference(employee);

        return {
          key: `${employee.id}-${date}`,
          employee,
          date,
          entry,
          sourcePreference,
          ...computed,
        };
      }),
    );
  }, [
    reviewEmployees,
    entries,
    schedules,
    scheduleOverrides,
    shiftTemplates,
    approvedLeaves,
    settings,
    startDate,
    endDate,
  ]);

  const payrollIssueRows = useMemo(() => {
    return attendanceRows.filter((row) => {
      const isWork = isWorkingShift(row.scheduled_shift);
      const hasTimeIn = !!row.entry?.time_in;
      const hasTimeOut = !!row.entry?.time_out;

      return (
        row.status === "Review Required" ||
        row.status === "Unscheduled" ||
        (isWork && (!hasTimeIn || !hasTimeOut))
      );
    });
  }, [attendanceRows]);

  const missingEntryRows = useMemo(() => {
    return payrollIssueRows.filter((row) => {
      const isWork = isWorkingShift(row.scheduled_shift);
      return isWork && !row.entry?.time_in && !row.entry?.time_out;
    });
  }, [payrollIssueRows]);

  const missingOutRows = useMemo(() => {
    return payrollIssueRows.filter((row) => {
      const isWork = isWorkingShift(row.scheduled_shift);
      return isWork && !!row.entry?.time_in && !row.entry?.time_out;
    });
  }, [payrollIssueRows]);

  const noScheduleRows = useMemo(() => {
    return payrollIssueRows.filter((row) => row.status === "Unscheduled");
  }, [payrollIssueRows]);

  const reviewRequiredRows = useMemo(() => {
    return payrollIssueRows.filter((row) => row.status === "Review Required");
  }, [payrollIssueRows]);

  const restDayRows = useMemo(
    () =>
      attendanceRows.filter(
        (row) =>
          isRestDayShift(row.scheduled_shift) ||
          isUnscheduledShift(row.scheduled_shift),
      ),
    [attendanceRows],
  );

  const presentCount = attendanceRows.filter((row) =>
    ["Present", "Late", "Undertime", "Overtime"].includes(String(row.status)),
  ).length;

  const absentCount = attendanceRows.filter(
    (row) => String(row.status) === "Absent",
  ).length;

  const lateCount = attendanceRows.filter(
    (row) => Number(row.late_minutes || 0) > 0,
  ).length;

  const otHours =
    attendanceRows.reduce(
      (sum, row) => sum + Number(row.ot_minutes || 0),
      0,
    ) / 60;

  const payrollReady =
    reviewEmployees.length > 0 &&
    attendanceRows.length > 0 &&
    payrollIssueRows.length === 0 &&
    !attendanceLocked;

  const matchedPreviewCount = importPreview.filter((row) => row.matched).length;
  const missingPreviewCount = importPreview.filter((row) => !row.matched).length;

  const limitedAssistantReminders = [
    ...(attendanceLocked
      ? [
          {
            status: "warning" as const,
            text: `Attendance is locked for ${lockedPeriodNames}.`,
          },
        ]
      : []),
    ...(payrollIssueRows.length > 0
      ? [
          {
            status: "critical" as const,
            text: `${payrollIssueRows.length} attendance row(s) need payroll review.`,
          },
        ]
      : []),
    ...(missingEntryRows.length > 0
      ? [
          {
            status: "warning" as const,
            text: `${missingEntryRows.length} missing time in/out row(s) detected.`,
          },
        ]
      : []),
    ...(missingPreviewCount > 0
      ? [
          {
            status: "warning" as const,
            text: `${missingPreviewCount} biometric import row(s) need manual matching.`,
          },
        ]
      : []),
    ...(payrollReady
      ? [
          {
            status: "success" as const,
            text: "Attendance is payroll-ready for the selected cutoff.",
          },
        ]
      : []),
  ].slice(0, 5);

  const clearImportPreview = () => {
    setImportPreview([]);
    setImportStatus("");
  };

  const confirmImportPreview = () => {
    if (attendanceLocked) {
      alert(
        `Attendance import is locked for this cutoff.\n\nLocked period(s): ${lockedPeriodNames}`,
      );
      return;
    }

    const matchedRows = importPreview.filter((row) => row.matched && row.employee_id);

    if (matchedRows.length === 0) {
      alert("No matched biometric rows to import.");
      return;
    }

    matchedRows.forEach((row) => {
      const employee = employees.find(
        (item) => String(item.id) === String(row.employee_id),
      );

      if (!employee) return;

      const existing = getEntry(employee.id, row.attendance_date);
      const incomingSource = "Biometrics";
      const existingSource = getExistingSource(existing);

      const conflict = hasTimeConflict(existing, {
        time_in: row.time_in,
        time_out: row.time_out,
      });

      const baseEntry: AttendanceEntry = existing || {
        employee_id: employee.id,
        attendance_date: row.attendance_date,
        remarks: "",
        attendance_source: incomingSource,
      };

      const updated: AttendanceEntry = {
        ...baseEntry,
        time_in: row.time_in || baseEntry.time_in || "",
        time_out: row.time_out || baseEntry.time_out || "",
        attendance_source:
          existingSource && existingSource !== incomingSource
            ? "Mixed"
            : incomingSource,
        remarks: conflict
          ? buildSourceConflictRemarks(existingSource || "existing", incomingSource)
          : baseEntry.remarks || row.remarks || "Imported from biometrics.",
      };

      const computed = computeEntry(employee, row.attendance_date, updated);
      const finalEntry = {
        ...updated,
        ...computed,
      };

      setEntries((prev) => {
        const exists = prev.some(
          (entry) =>
            String(entry.employee_id) === String(employee.id) &&
            String(entry.attendance_date) === String(row.attendance_date),
        );

        if (exists) {
          return prev.map((entry) =>
            String(entry.employee_id) === String(employee.id) &&
            String(entry.attendance_date) === String(row.attendance_date)
              ? finalEntry
              : entry,
          );
        }

        return [...prev, finalEntry];
      });
    });

    setImportStatus(
      `Imported ${matchedRows.length} matched row(s) into attendance review. Click Save Attendance to persist.`,
    );
    setImportPreview([]);
  };

  const markMissingAsAbsent = () => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff.\n\nLocked period(s): ${lockedPeriodNames}`,
      );
      return;
    }

    if (missingEntryRows.length === 0) return;

    missingEntryRows.forEach((row) => {
      const baseEntry: AttendanceEntry = row.entry || {
        employee_id: row.employee.id,
        attendance_date: row.date,
        time_in: "",
        time_out: "",
        remarks: "",
        attendance_source: "Manual Entry",
      };

      const finalEntry: AttendanceEntry = {
        ...baseEntry,
        scheduled_shift: row.scheduled_shift,
        scheduled_in: row.scheduled_in,
        scheduled_out: row.scheduled_out,
        time_in: "",
        time_out: "",
        late_minutes: 0,
        undertime_minutes: 0,
        ot_minutes: 0,
        status: "Absent",
        remarks: baseEntry.remarks || "Marked absent from attendance workbench.",
        attendance_source: baseEntry.attendance_source || "Manual Entry",
      };

      setEntries((prev) => {
        const exists = prev.some(
          (entry) =>
            String(entry.employee_id) === String(row.employee.id) &&
            String(entry.attendance_date) === String(row.date),
        );

        if (exists) {
          return prev.map((entry) =>
            String(entry.employee_id) === String(row.employee.id) &&
            String(entry.attendance_date) === String(row.date)
              ? finalEntry
              : entry,
          );
        }

        return [...prev, finalEntry];
      });
    });
  };

  const saveAttendance = async () => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff.\n\nLocked period(s): ${lockedPeriodNames}`,
      );
      return;
    }

    if (reviewEmployees.length === 0) {
      alert("Select at least one employee before saving attendance.");
      return;
    }

    const payload = attendanceRows.map((row) => ({
      employee_id: row.employee.id,
      attendance_date: row.date,
      scheduled_shift: row.scheduled_shift || null,
      scheduled_in: row.scheduled_in || null,
      scheduled_out: row.scheduled_out || null,
      time_in: row.entry?.time_in || null,
      time_out: row.entry?.time_out || null,
      late_minutes: Number(row.late_minutes || 0),
      undertime_minutes: Number(row.undertime_minutes || 0),
      ot_minutes: Number(row.ot_minutes || 0),
      status: row.status || "Unreviewed",
      remarks: row.entry?.remarks || row.review_reason || null,
      attendance_source: row.entry?.attendance_source || "Manual Entry",
    }));

    setIsSaving(true);

    const { error } = await supabase
      .from("attendance_entries")
      .upsert(payload, {
        onConflict: "employee_id,attendance_date",
      });

    if (error) {
      console.log("SAVE ATTENDANCE ERROR:", error.message);
      alert(`Failed to save attendance.\n\n${error.message}`);
      setIsSaving(false);
      return;
    }

    await markPayrollPeriodsForRegeneration(payload);
    await getAttendanceEntries();

    setIsSaving(false);
    alert("Attendance rows saved.");
  };


    /// UI
  return (
    <PageGuard moduleKey="attendance">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="PAYROLL / ATTENDANCE ENTRIES" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Payroll
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-950">
                      Attendance Workbench
                    </h1>
                    <StatusPill
                      tone={
                        attendanceLocked
                          ? "warning"
                          : payrollReady
                            ? "success"
                            : payrollIssueRows.length > 0
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {attendanceLocked
                        ? "Locked"
                        : payrollReady
                          ? "Payroll Ready"
                          : payrollIssueRows.length > 0
                            ? "Review Required"
                            : "Review Mode"}
                    </StatusPill>
                  </div>
                  <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                    Import biometrics, review payroll blockers, and encode attendance
                    rows for the selected cutoff.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={markMissingAsAbsent}
                    disabled={
                      attendanceLocked ||
                      missingEntryRows.length === 0 ||
                      reviewEmployees.length === 0
                    }
                    className="h-11 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition-all duration-200 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Missing as Absent
                  </button>

                  <button
                    onClick={saveAttendance}
                    disabled={isSaving || attendanceLocked || reviewEmployees.length === 0}
                    className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {attendanceLocked
                      ? "Attendance Locked"
                      : isSaving
                        ? "Saving..."
                        : payrollIssueRows.length > 0
                          ? "Save with Issues"
                          : "Save Attendance"}
                  </button>
                </div>
              </div>
            </section>

            <section className="mb-5 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Attendance Controls
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      Cutoff, Filters, and Import
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Select payroll cutoff, department, employee, date range, then import or encode.
                    </p>
                  </div>

                  {importStatus && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-700">
                      {importStatus}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1.15fr_0.9fr_0.9fr_auto]">
                  <select
                    value={selectedCutoffId}
                    onChange={(e) => applyPayrollCutoff(e.target.value)}
                    className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="CUSTOM">Custom Date Range</option>
                    {payrollPeriods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.period_name} {period.attendance_locked ? "(Locked)" : ""}
                      </option>
                    ))}
                  </select>

                  <select
                    value={departmentFilter}
                    onChange={(e) => {
                      setDepartmentFilter(e.target.value);
                      setSelectedEmployeeId("ALL_EMPLOYEES");
                    }}
                    className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedEmployeeId || "ALL_EMPLOYEES"}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="ALL_EMPLOYEES">All Active Employees</option>
                    {employeeOptions.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
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
                    className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setSelectedCutoffId("CUSTOM");
                      setEndDate(e.target.value);
                    }}
                    className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                    Import File
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      disabled={attendanceLocked}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) previewBiometrics(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill tone="info">
                    {reviewEmployees.length} employee(s)
                  </StatusPill>
                  <StatusPill tone="neutral">
                    {attendanceRows.length} row(s)
                  </StatusPill>
                  <StatusPill tone={attendanceLocked ? "warning" : "success"}>
                    {attendanceLocked ? `Locked: ${lockedPeriodNames}` : "Editable cutoff"}
                  </StatusPill>
                </div>
              </div>
            </section>

            <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Employees Included"
                value={reviewEmployees.length}
                helper={`${employeeOptions.length} available under filter`}
                tone="neutral"
              />
              <KpiCard
                label="Attendance Rows"
                value={attendanceRows.length}
                helper={`${presentCount} present / worked row(s)`}
                tone={attendanceRows.length > 0 ? "success" : "neutral"}
              />
              <KpiCard
                label="Payroll Issues"
                value={payrollIssueRows.length}
                helper={`${missingEntryRows.length} missing â€¢ ${missingOutRows.length} missing out`}
                tone={payrollIssueRows.length > 0 ? "danger" : "success"}
              />
              <KpiCard
                label="Payroll Ready"
                value={payrollReady ? "Yes" : "No"}
                helper={`${lateCount} late â€¢ ${otHours.toFixed(2)} OT hour(s)`}
                tone={payrollReady ? "success" : payrollIssueRows.length > 0 ? "warning" : "neutral"}
              />
            </section>

            {attendanceLocked && (
              <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                  Attendance Locked
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  This cutoff is locked by payroll approval.
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
                  Locked period(s): {lockedPeriodNames}. Reopen payroll first before editing attendance rows.
                </p>
              </section>
            )}

            {payrollIssueRows.length > 0 && (
              <section className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
                      Payroll Blocking Issues
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      {payrollIssueRows.length} row(s) need review before payroll.
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-red-700">
                      Missing: {missingEntryRows.length} â€¢ Missing out: {missingOutRows.length} â€¢
                      No schedule: {noScheduleRows.length} â€¢ Review: {reviewRequiredRows.length}
                    </p>
                  </div>

                  <button
                    onClick={markMissingAsAbsent}
                    disabled={attendanceLocked || missingEntryRows.length === 0}
                    className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Missing as Absent
                  </button>
                </div>

                <div className="mt-4 overflow-auto rounded-2xl border border-red-200 bg-white">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Employee</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Issue</th>
                        <th className="px-5 py-3">Schedule</th>
                        <th className="px-5 py-3">Time In</th>
                        <th className="px-5 py-3">Time Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                      {payrollIssueRows.slice(0, 8).map((row) => (
                        <tr key={`issue-${row.key}`} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-950">
                              {row.employee.first_name} {row.employee.last_name}
                            </p>
                            <p className="text-xs font-medium text-slate-500">
                              {row.employee.employee_no || "-"} â€¢ {row.employee.department}
                            </p>
                          </td>
                          <td className="px-5 py-4 font-black text-slate-950">
                            {row.date}
                          </td>
                          <td className="px-5 py-4 font-black text-red-700">
                            {row.status === "Review Required"
                              ? row.review_reason || "Review Required"
                              : isUnscheduledShift(row.scheduled_shift)
                                ? "No Schedule"
                                : row.entry?.time_in && !row.entry?.time_out
                                  ? "Missing Time Out"
                                  : "Missing Time In / Out"}
                          </td>
                          <td className="px-5 py-4">
                            <SchedulePill label={getScheduleLabel(row.scheduled_shift)} />
                          </td>
                          <td className="px-5 py-4">{row.entry?.time_in || "--:--"}</td>
                          <td className="px-5 py-4">{row.entry?.time_out || "--:--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {importPreview.length > 0 && (
              <section className="mb-5 rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Biometric Import
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      Import Preview
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Rows: {importPreview.length} â€¢ Matched: {matchedPreviewCount} â€¢ Missing: {missingPreviewCount}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={clearImportPreview}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      Clear Preview
                    </button>
                    <button
                      onClick={confirmImportPreview}
                      disabled={attendanceLocked || matchedPreviewCount === 0}
                      className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirm Import
                    </button>
                  </div>
                </div>

                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full min-w-[1180px] text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Biometric ID</th>
                        <th className="px-6 py-4">Excel Name</th>
                        <th className="px-6 py-4">Matched Employee</th>
                        <th className="px-6 py-4">Manual Match</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                      {importPreview.map((row, index) => (
                        <tr key={`${row.biometric_employee_no}-${row.attendance_date}-${index}`} className="hover:bg-slate-50">
                          <td className="px-6 py-4">{row.biometric_employee_no || "-"}</td>
                          <td className="px-6 py-4 font-black text-slate-950">{row.employee_name || "-"}</td>
                          <td className="px-6 py-4">
                            <p className={row.matched ? "font-black text-emerald-700" : "font-black text-red-700"}>
                              {row.matched_employee_name || "Not matched"}
                            </p>
                            <p className="text-xs font-medium text-slate-500">{row.matched_employee_no || "-"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={row.employee_id || ""}
                              onChange={(e) => applyManualBiometricMatch(index, e.target.value)}
                              className="h-11 w-full min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            >
                              <option value="">Select match</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.employee_no ? `${emp.employee_no} â€¢ ` : ""}
                                  {emp.first_name} {emp.last_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4">{row.attendance_date}</td>
                          <td className="px-6 py-4">{row.time_in || "--:--"} - {row.time_out || "--:--"}</td>
                          <td className="px-6 py-4"><AttendanceStatusBadge status={row.status} /></td>
                          <td className="px-6 py-4">{row.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Attendance Queue
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Payroll-Ready Attendance Rows
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Encode time in/out and schedule override. Use all employees for batch encoding.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="neutral">RD/OFF: {restDayRows.length}</StatusPill>
                  <StatusPill tone="danger">Absent: {absentCount}</StatusPill>
                  <StatusPill tone="warning">Late: {lateCount}</StatusPill>
                  <StatusPill tone="info">OT: {otHours.toFixed(2)}h</StatusPill>
                </div>
              </div>

              {reviewEmployees.length === 0 ? (
                <div className="px-6 py-14 text-center text-sm font-medium text-slate-500">
                  Select All Active Employees or a specific employee to start encoding attendance.
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full min-w-[1320px] text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Schedule</th>
                        <th className="px-6 py-4">Time In</th>
                        <th className="px-6 py-4">Time Out</th>
                        <th className="px-6 py-4">Late</th>
                        <th className="px-6 py-4">UT</th>
                        <th className="px-6 py-4">OT</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Source</th>
                        <th className="px-6 py-4">Remarks</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                      {attendanceRows.map((row) => (
                        <tr key={row.key} className="transition-all duration-200 hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-950">
                              {row.employee.first_name} {row.employee.last_name}
                            </p>
                            <p className="text-xs font-medium text-slate-500">
                              {row.employee.department} â€¢ {row.employee.employee_no || "-"}
                            </p>
                          </td>
                          <td className="px-6 py-4 font-black text-slate-950">{row.date}</td>
                          <td className="px-6 py-4">
                            <select
                              value={row.scheduled_shift || "OFF"}
                              disabled={attendanceLocked}
                              onChange={(e) => updateScheduleOverride(row.employee, row.date, e.target.value)}
                              className="h-11 min-w-[170px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="OFF">OFF</option>
                              <option value="RD">RD</option>
                              <option value="Leave">LEAVE</option>
                              {row.scheduled_shift &&
                                !["OFF", "RD", "Leave", "LEAVE"].includes(String(row.scheduled_shift)) &&
                                !shiftTemplates.some((shift) => shift.shift_name === row.scheduled_shift) && (
                                  <option value={row.scheduled_shift}>
                                    {getShiftTimeLabel(row.scheduled_shift)} â€¢ From Scheduling
                                  </option>
                                )}
                              {shiftTemplates.map((shift) => (
                                <option key={shift.id || shift.shift_name} value={shift.shift_name}>
                                  {shift.shift_name} â€¢ {getShiftTimeLabel(shift.shift_name)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <TimeInput
                              value={row.entry?.time_in || ""}
                              disabled={attendanceLocked || !isWorkingShift(row.scheduled_shift)}
                              onChange={(value) => updateLocalEntry(row.employee, row.date, "time_in", value)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <TimeInput
                              value={row.entry?.time_out || ""}
                              disabled={attendanceLocked || !isWorkingShift(row.scheduled_shift)}
                              onChange={(value) => updateLocalEntry(row.employee, row.date, "time_out", value)}
                            />
                          </td>
                          <td className="px-6 py-4 font-black text-slate-950">{row.late_minutes || 0}</td>
                          <td className="px-6 py-4 font-black text-slate-950">{row.undertime_minutes || 0}</td>
                          <td className="px-6 py-4 font-black text-slate-950">
                            {(Number(row.ot_minutes || 0) / 60).toFixed(2)}
                          </td>
                          <td className="px-6 py-4"><AttendanceStatusBadge status={row.status} /></td>
                          <td className="px-6 py-4"><SourceBadge source={row.entry?.attendance_source} /></td>
                          <td className="px-6 py-4">
                            <input
                              value={row.entry?.remarks || ""}
                              disabled={attendanceLocked}
                              onChange={(e) => updateLocalEntry(row.employee, row.date, "remarks", e.target.value)}
                              placeholder="Remarks"
                              className="h-11 min-w-[240px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            {row.review_reason && (
                              <p className="mt-1 text-xs font-bold text-red-700">
                                {row.review_reason}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>

        <OpscoreAssistant reminders={limitedAssistantReminders} />
      </div>
    </PageGuard>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: any;
  helper: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <StatusPill tone={tone}>
          {tone === "danger"
            ? "Review"
            : tone === "success"
              ? "Ready"
              : tone === "warning"
                ? "Watch"
                : tone === "info"
                  ? "Info"
                  : "Normal"}
        </StatusPill>
      </div>

      <h2 className="text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
      <p className="mt-1 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function TimeInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value || "");

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  return (
    <input
      type="text"
      value={localValue}
      disabled={disabled}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        const parsed = parseFriendlyTimeInput(localValue);
        if (parsed === null) {
          alert("Invalid time format. Use 09:00, 9am, 530pm, or 17:30.");
          setLocalValue(value || "");
          return;
        }

        onChange(parsed || "");
      }}
      className="h-11 w-[110px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      placeholder="--:--"
    />
  );
}

function SchedulePill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {label}
    </span>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  children: React.ReactNode;
}) {
  const style =
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
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
      {children}
    </span>
  );
}

function AttendanceStatusBadge({ status }: { status: any }) {
  const normalized = String(status || "Unreviewed");

  const tone =
    normalized === "Present" || normalized === "Overtime"
      ? "success"
      : normalized === "Late"
        ? "warning"
        : normalized === "Undertime" ||
            normalized === "Absent" ||
            normalized === "Unscheduled" ||
            normalized === "Review Required"
          ? "danger"
          : normalized === "Leave"
            ? "info"
            : "neutral";

  return <StatusPill tone={tone}>{normalized}</StatusPill>;
}

function SourceBadge({ source }: { source: any }) {
  const normalized = String(source || "Manual Entry");

  const tone =
    normalized === "Employee Portal"
      ? "info"
      : normalized === "Biometrics"
        ? "success"
        : normalized === "Mixed"
          ? "warning"
          : "neutral";

  return <StatusPill tone={tone}>{normalized}</StatusPill>;
}





