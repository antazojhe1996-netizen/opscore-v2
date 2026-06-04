"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
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
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [importStatus, setImportStatus] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lockedPayrollPeriods, setLockedPayrollPeriods] = useState<any[]>([]);

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
        parsed.d
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
        "0"
      )}`;
    }

    const text = String(value).trim();
    if (!text) return "";

    if (/^\d{1,2}:\d{2}/.test(text)) {
      const date = new Date(`2000-01-01 ${text}`);

      if (!isNaN(date.getTime())) {
        return `${String(date.getHours()).padStart(2, "0")}:${String(
          date.getMinutes()
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
    const cleanEmployeeNo = String(employeeNo || "").trim().toLowerCase();
    const cleanName = normalizeName(name);

    if (cleanEmployeeNo) {
      const idMatch = employees.find(
        (emp) =>
          String(emp.employee_no || "").trim().toLowerCase() === cleanEmployeeNo
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
        String(entry.attendance_date) === String(date)
    );

  const getSchedule = (employeeId: string, date: string) =>
    schedules.find(
      (item) =>
        String(item.employee_id) === String(employeeId) &&
        String(item.day) === String(date)
    );

  const getShiftTemplate = (shiftName?: string | null) =>
    shiftTemplates.find((shift) => shift.shift_name === shiftName);

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

  const computeEntry = (
    employee: Employee,
    date: string,
    entry?: AttendanceEntry
  ) => {
    const schedule = getSchedule(employee.id, date);
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
      };
    }

    if (shiftName === "OFF" || !schedule) {
      return {
        scheduled_shift: "OFF",
        scheduled_in: null,
        scheduled_out: null,
        late_minutes: 0,
        undertime_minutes: 0,
        ot_minutes: 0,
        status: "RD",
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
      };
    }

    const lateRaw = timeIn && scheduledIn ? diffMinutes(scheduledIn, timeIn) : 0;
    const lateMinutes = lateRaw > lateGrace ? lateRaw : 0;

    const undertimeRaw =
      timeOut && scheduledOut ? diffMinutes(timeOut, scheduledOut) : 0;
    const undertimeMinutes = undertimeRaw > undertimeGrace ? undertimeRaw : 0;

    const otRaw = timeOut && scheduledOut ? diffMinutes(scheduledOut, timeOut) : 0;
    const otMinutes = otRaw > 0 ? otRaw : 0;

    let status = "Present";
    if (lateMinutes > 0) status = "Late";
    if (undertimeMinutes > 0) status = "Undertime";

    return {
      scheduled_shift: shiftName,
      scheduled_in: scheduledIn,
      scheduled_out: scheduledOut,
      late_minutes: lateMinutes,
      undertime_minutes: undertimeMinutes,
      ot_minutes: otMinutes,
      status,
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
      console.log("MARK PAYROLL NEEDS REGENERATION ERROR:", updateError.message);
    }
  };

  /// ACTIONS
  const updateLocalEntry = (
    employee: Employee,
    date: string,
    field: string,
    value: string
  ) => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`
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
          String(entry.attendance_date) === String(date)
      );

      if (exists) {
        return prev.map((entry) =>
          String(entry.employee_id) === String(employee.id) &&
          String(entry.attendance_date) === String(date)
            ? finalEntry
            : entry
        );
      }

      return [...prev, finalEntry];
    });
  };

  const previewBiometrics = async (file: File) => {
    if (attendanceLocked) {
      alert(
        `Attendance import is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`
      );
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const parseReportRange = (value: any) => {
      const text = String(value || "");
      const match = text.match(
        /(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/
      );

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

        const employee = findEmployeeByEmployeeNoOrName(employeeNo, employeeName);

        dayRow.slice(0, 7).forEach((dayNumber, dayIndex) => {
          const attendanceDate = buildDateFromDayNumber(
            dayNumber,
            reportRange.start
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

        const employee = findEmployeeByEmployeeNoOrName(employeeNo, employeeName);

        const rawTimes = [row[4], row[5], row[6], row[7]]
          .map((value) => parseExcelTime(value))
          .filter(Boolean);

        const timeIn = rawTimes[0] || null;
        const timeOut = rawTimes.length > 1 ? rawTimes[rawTimes.length - 1] : null;

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
        workbook.Sheets["Time Entries"] || workbook.Sheets[workbook.SheetNames[0]];

      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const previewRows: ImportPreviewRow[] = [];

      rows.forEach((row) => {
        const name = String(
          getValue(row, ["Name", "Employee", "Employee Name"])
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
          ])
        ).trim();

        const employee = findEmployeeByEmployeeNoOrName(employeeNo, name);

        const timeIn = parseExcelTime(getValue(row, ["Time In", "In"]));
        const timeOut = parseExcelTime(getValue(row, ["Time Out", "Out"]));

        const lateMinutes = parseMinutes(
          getValue(row, ["Late Min", "Late Minutes", "Late"])
        );

        const undertimeMinutes = parseMinutes(
          getValue(row, ["Undertime", "Undertime Min", "UT"])
        );

        const otMinutes = parseOtMinutes(
          getValue(row, ["OT Hrs", "OT Hours", "OT"])
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
      `Preview loaded. Rows: ${preview.length}. Matched: ${matched}. Missing: ${missing}.`
    );
  };

  const confirmImportPreview = () => {
    if (attendanceLocked) {
      alert(
        `Attendance import is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`
      );
      return;
    }

    const matchedRows = importPreview.filter(
      (row) => row.matched && row.employee_id
    );

    const imported: AttendanceEntry[] = matchedRows.map((row) => ({
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
    }));

    setEntries((prev) => {
      const merged = [...prev];

      imported.forEach((item) => {
        const index = merged.findIndex(
          (entry) =>
            entry.employee_id === item.employee_id &&
            entry.attendance_date === item.attendance_date
        );

        if (index >= 0) {
          merged[index] = {
            ...merged[index],
            ...item,
          };
        } else {
          merged.push(item);
        }
      });

      return merged;
    });

    setImportStatus(`Confirmed ${imported.length} imported row(s).`);
    setImportPreview([]);
  };

  const clearImportPreview = () => {
    setImportPreview([]);
    setImportStatus("");
  };

  const markMissingAsAbsent = () => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}`
      );
      return;
    }

    if (!selectedEmployee) return;

    missingEntryRows.forEach((row) => {
      updateLocalEntry(
        row.employee,
        row.date,
        "remarks",
        "Marked absent - no biometrics entry"
      );
    });

    alert(`Marked ${missingEntryRows.length} missing row(s) for review.`);
  };

  const saveAttendance = async () => {
    if (attendanceLocked) {
      alert(
        `Attendance is locked for this cutoff because payroll was already sent for approval.\n\nLocked period(s): ${lockedPeriodNames}\n\nReopen payroll first before editing attendance.`
      );
      return;
    }

    const sourceRows =
      selectedEmployee && attendanceRows.length > 0
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
          }));

    if (sourceRows.length === 0) {
      alert("No attendance rows to save.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("attendance_entries").upsert(sourceRows, {
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
      `Saved ${sourceRows.length} attendance row(s). Payroll periods covering the saved dates were marked for regeneration.`
    );
    getAttendanceEntries();
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getShiftTemplates();
    getSettings();
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

  const attendanceRows = useMemo(() => {
    if (!selectedEmployee) return [];

    return getDateRange().map((date) => {
      const entry = getEntry(selectedEmployee.id, date);
      const computed = computeEntry(selectedEmployee, date, entry);

      return {
        key: `${selectedEmployee.id}-${date}`,
        employee: selectedEmployee,
        date,
        entry,
        ...computed,
      };
    });
  }, [
    selectedEmployee,
    entries,
    schedules,
    approvedLeaves,
    settings,
    startDate,
    endDate,
  ]);

  const presentCount = attendanceRows.filter((row) =>
    ["Present", "Late", "Undertime"].includes(row.status)
  ).length;

  const lateCount = attendanceRows.filter(
    (row) => Number(row.late_minutes || 0) > 0
  ).length;

  const absentCount = attendanceRows.filter((row) => row.status === "Absent").length;

  const totalOtMinutes = attendanceRows.reduce(
    (sum, row) => sum + Number(row.ot_minutes || 0),
    0
  );

  const payrollIssueRows = attendanceRows.filter((row) => {
    const isWorkingDay =
      row.scheduled_shift !== "OFF" &&
      row.scheduled_shift !== "RD" &&
      row.scheduled_shift !== "Leave";

    const missingTime =
      isWorkingDay && !row.entry?.time_in && !row.entry?.time_out;

    const missingOut = isWorkingDay && row.entry?.time_in && !row.entry?.time_out;

    const noSchedule =
      row.scheduled_shift === "OFF" && !getSchedule(row.employee.id, row.date);

    return missingTime || missingOut || noSchedule;
  });

  const missingEntryRows = payrollIssueRows.filter((row) => {
    const isWorkingDay =
      row.scheduled_shift !== "OFF" &&
      row.scheduled_shift !== "RD" &&
      row.scheduled_shift !== "Leave";

    return isWorkingDay && !row.entry?.time_in && !row.entry?.time_out;
  });

  const missingOutRows = payrollIssueRows.filter((row) => {
    const isWorkingDay =
      row.scheduled_shift !== "OFF" &&
      row.scheduled_shift !== "RD" &&
      row.scheduled_shift !== "Leave";

    return isWorkingDay && row.entry?.time_in && !row.entry?.time_out;
  });

  const noScheduleRows = attendanceRows.filter((row) => {
    return row.scheduled_shift === "OFF" && !getSchedule(row.employee.id, row.date);
  });

  const payrollReady =
    !!selectedEmployee && attendanceRows.length > 0 && payrollIssueRows.length === 0;

  const attendanceLocked = lockedPayrollPeriods.length > 0;

  const lockedPeriodNames =
    lockedPayrollPeriods.map((period) => period.period_name).join(", ") ||
    "Locked payroll period";

  const matchedPreviewCount = importPreview.filter((row) => row.matched).length;
  const missingPreviewCount = importPreview.filter((row) => !row.matched).length;

  /// UI
  return (
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
              Employee-based attendance review with biometrics preview and payroll issue checks.
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
            <p className="font-black">Attendance is locked for this cutoff.</p>
            <p className="mt-1 text-sm text-yellow-100/80">
              Payroll was already sent for approval for: {lockedPeriodNames}. Reopen payroll first before editing or importing attendance.
            </p>
          </section>
        )}

        <section className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-200">
          <p className="font-black">Payroll Safety</p>
          <p className="mt-1 text-sm text-blue-100/80">
            Any saved attendance change automatically marks the affected payroll cutoff as outdated. Open Payroll Register and click Generate Payroll again before release.
          </p>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Days" value={attendanceRows.length} />
          <SummaryCard title="Present" value={presentCount} color="text-emerald-400" />
          <SummaryCard title="Late" value={lateCount} color="text-amber-400" />
          <SummaryCard title="Absent" value={absentCount} color="text-red-400" />
          <SummaryCard title="Missing" value={missingEntryRows.length} color="text-red-400" />
          <SummaryCard title="Missing Out" value={missingOutRows.length} color="text-orange-400" />
          <SummaryCard title="No Schedule" value={noScheduleRows.length} color="text-purple-400" />
          <SummaryCard title="OT Hours" value={(totalOtMinutes / 60).toFixed(2)} color="text-blue-400" />
        </section>

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-black">Payroll Cutoff Filters</h2>
            <p className="mt-1 text-sm text-slate-400">
              Select one employee and review attendance by payroll cutoff range.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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

              {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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

        {selectedEmployee && (
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
                  Missing Entries: {missingEntryRows.length} • Missing Time Out:{" "}
                  {missingOutRows.length} • No Schedule: {noScheduleRows.length}
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
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Issue</th>
                      <th className="px-4 py-3">Schedule</th>
                      <th className="px-4 py-3">Time In</th>
                      <th className="px-4 py-3">Time Out</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payrollIssueRows.map((row) => {
                      const isWorkingDay =
                        row.scheduled_shift !== "OFF" &&
                        row.scheduled_shift !== "RD" &&
                        row.scheduled_shift !== "Leave";

                      let issue = "Needs Review";

                      if (
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
                      } else if (
                        row.scheduled_shift === "OFF" &&
                        !getSchedule(row.employee.id, row.date)
                      ) {
                        issue = "No Schedule Found";
                      }

                      return (
                        <tr key={`issue-${row.key}`} className="border-t border-slate-800">
                          <td className="px-4 py-3 font-bold">{row.date}</td>
                          <td className="px-4 py-3 font-black text-red-300">
                            {issue}
                          </td>
                          <td className="px-4 py-3">{row.scheduled_shift}</td>
                          <td className="px-4 py-3">{row.entry?.time_in || "--:--"}</td>
                          <td className="px-4 py-3">{row.entry?.time_out || "--:--"}</td>
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
                  Rows: {importPreview.length} • Matched: {matchedPreviewCount} • Missing:{" "}
                  {missingPreviewCount}
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
                    <th className="px-4 py-3">Excel Name</th>
                    <th className="px-4 py-3">Matched Employee</th>
                    <th className="px-4 py-3">Employee No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time In</th>
                    <th className="px-4 py-3">Time Out</th>
                    <th className="px-4 py-3 text-right">Late</th>
                    <th className="px-4 py-3 text-right">UT</th>
                    <th className="px-4 py-3 text-right">OT</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Match</th>
                  </tr>
                </thead>

                <tbody>
                  {importPreview.map((row, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-bold">{row.employee_name}</td>
                      <td className="px-4 py-3 font-bold text-emerald-300">
                        {row.matched_employee_name || "-"}
                      </td>
                      <td className="px-4 py-3">{row.matched_employee_no || "-"}</td>
                      <td className="px-4 py-3">{row.attendance_date}</td>
                      <td className="px-4 py-3">{row.time_in || "--:--"}</td>
                      <td className="px-4 py-3">{row.time_out || "--:--"}</td>
                      <td className="px-4 py-3 text-right text-amber-400">
                        {row.late_minutes}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {row.undertime_minutes}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-400">
                        {row.ot_minutes}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
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
              {selectedEmployee
                ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                : "Attendance Review"}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {selectedEmployee
                ? `${selectedEmployee.department} • ${selectedEmployee.position || "-"}`
                : "Select an employee to review attendance."}
            </p>
          </div>

          <div className="max-h-[720px] overflow-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1250px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Time In</th>
                  <th className="px-4 py-3">Time Out</th>
                  <th className="px-4 py-3 text-right">Late</th>
                  <th className="px-4 py-3 text-right">Undertime</th>
                  <th className="px-4 py-3 text-right">OT</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>

              <tbody>
                {attendanceRows.map((row) => (
                  <tr
                    key={row.key}
                    className={`border-t border-slate-800 hover:bg-slate-800/40 ${
                      payrollIssueRows.some((issue) => issue.key === row.key)
                        ? "bg-red-500/5"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-bold">{row.date}</td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-amber-400">
                        {row.scheduled_shift}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.scheduled_in || "--:--"} - {" "}
                        {row.scheduled_out || "--:--"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={row.entry?.time_in || ""}
                        disabled={attendanceLocked}
                        onChange={(e) =>
                          updateLocalEntry(
                            row.employee,
                            row.date,
                            "time_in",
                            e.target.value
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={row.entry?.time_out || ""}
                        disabled={attendanceLocked}
                        onChange={(e) =>
                          updateLocalEntry(
                            row.employee,
                            row.date,
                            "time_out",
                            e.target.value
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                      />
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-amber-400">
                      {row.late_minutes}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-red-400">
                      {row.undertime_minutes}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-blue-400">
                      {row.ot_minutes}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={row.entry?.remarks || ""}
                        disabled={attendanceLocked}
                        onChange={(e) =>
                          updateLocalEntry(
                            row.employee,
                            row.date,
                            "remarks",
                            e.target.value
                          )
                        }
                        className="w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                      />
                    </td>
                  </tr>
                ))}

                {attendanceRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-slate-500">
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

function StatusBadge({ status }: any) {
  const style =
    status === "Present"
      ? "bg-emerald-500/10 text-emerald-400"
      : status === "Late"
      ? "bg-amber-500/10 text-amber-400"
      : status === "Undertime" || status === "Absent"
      ? "bg-red-500/10 text-red-400"
      : status === "Leave"
      ? "bg-blue-500/10 text-blue-400"
      : status === "RD"
      ? "bg-slate-700 text-slate-300"
      : "bg-slate-700 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {status}
    </span>
  );
}
