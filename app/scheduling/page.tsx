"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Lock,
  Search,
  Unlock,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../lib/supabase";
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

type Schedule = {
  id: number;
  employee_id: string;
  day: string;
  shift: string;
};

type ShiftTemplate = {
  id: string | number;
  shift_name: string;
  start_time: string | null;
  end_time: string | null;
  time_label?: string | null;
  color: string | null;
};

type ScheduleImportPreviewRow = {
  employee_no: string;
  excel_name: string;
  matched_employee_id?: string;
  matched_employee_name: string;
  day: string;
  shift: string;
  matched: boolean;
  valid_shift: boolean;
  blocked_by_leave?: boolean;
  remarks: string;
};

export default function SchedulingPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [copyingSchedule, setCopyingSchedule] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hcRules, setHcRules] = useState<any>(null);
  const [roomsSold, setRoomsSold] = useState(1);
  const [eventAddons, setEventAddons] = useState<any[]>([]);
  const [publishedSchedule, setPublishedSchedule] = useState<any>(null);

  const [scheduleImportPreview, setScheduleImportPreview] = useState<ScheduleImportPreviewRow[]>([]);
  const [scheduleImportStatus, setScheduleImportStatus] = useState("");
  const [importingSchedule, setImportingSchedule] = useState(false);

  const todayColumnRef = useRef<HTMLDivElement | null>(null);
  const scheduleFileRef = useRef<HTMLInputElement | null>(null);

  /// DATA
  const defaultShifts: ShiftTemplate[] = [
    { id: 1, shift_name: "AM Shift", start_time: "07:00", end_time: "16:00", color: "yellow" },
    { id: 2, shift_name: "PM Shift", start_time: "14:00", end_time: "23:59", color: "green" },
    { id: 3, shift_name: "Mid Shift", start_time: "11:00", end_time: "20:00", color: "purple" },
    { id: 4, shift_name: "GY Shift", start_time: "23:00", end_time: "08:00", color: "blue" },
    { id: 5, shift_name: "OFF", start_time: null, end_time: null, color: "red" },
    { id: 6, shift_name: "RD", start_time: null, end_time: null, color: "lime" },
  ];

  /// HELPERS
  const normalizeName = (name: string) =>
    String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const normalizeShiftName = (value: string) => {
    const clean = String(value || "").trim().toLowerCase();

    if (!clean || clean === "off") return "OFF";
    if (clean === "rd" || clean === "rest day" || clean === "day off") return "RD";
    if (clean === "am" || clean.includes("am")) return "AM Shift";
    if (clean === "pm" || clean.includes("pm")) return "PM Shift";
    if (clean === "mid" || clean.includes("mid")) return "Mid Shift";
    if (clean === "gy" || clean.includes("grave") || clean.includes("night")) return "GY Shift";

    return String(value || "OFF").trim();
  };

  const parseExcelDate = (value: any) => {
    if (!value) return "";

    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return "";
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value).trim();

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getCellValue = (row: any, keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
        return row[key];
      }
    }

    return "";
  };

  const hasApprovedLeaveOnDate = (employee: Employee, dayKey: string) => {
    if (!employee || !dayKey) return false;

    const keys = getEmployeeKeys(employee);

    return approvedLeaves.some((leave) => {
      const leaveEmployeeId = String(leave.employee_id || "").trim().toLowerCase();
      const startDate = String(leave.start_date || leave.date || "").slice(0, 10);
      const endDate = String(leave.end_date || leave.date || "").slice(0, 10);

      return keys.includes(leaveEmployeeId) && dayKey >= startDate && dayKey <= endDate;
    });
  };

  const findEmployeeForImport = (employeeNo: string, excelName: string) => {
    const cleanEmployeeNo = String(employeeNo || "").trim().toLowerCase();
    const cleanName = normalizeName(excelName);

    if (cleanEmployeeNo) {
      const idMatch = employees.find(
        (emp) => String(emp.employee_no || "").trim().toLowerCase() === cleanEmployeeNo
      );

      if (idMatch) return idMatch;
    }

    if (!cleanName) return null;

    const exactMatch = employees.find((emp) => {
      const full = normalizeName(`${emp.first_name} ${emp.last_name}`);
      const first = normalizeName(emp.first_name);
      return full === cleanName || first === cleanName;
    });

    if (exactMatch) return exactMatch;

    const partialMatches = employees.filter((emp) => {
      const full = normalizeName(`${emp.first_name} ${emp.last_name}`);
      return full.includes(cleanName) || cleanName.includes(full);
    });

    if (partialMatches.length === 1) return partialMatches[0];

    return null;
  };

  /// FUNCTIONS
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const getWeekStart = (date: Date) => {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    newDate.setDate(newDate.getDate() + diff);
    return newDate;
  };

  const visibleDays = useMemo(() => {
    if (viewMode === "weekly") {
      const start = getWeekStart(currentDate);

      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);

        return {
          key: formatDateKey(date),
          dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
          dateLabel: formatShortDate(date),
        };
      });
    }

    const year = currentDate.getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const days = [];
    const date = new Date(startDate);

    while (date <= endDate) {
      days.push({
        key: formatDateKey(date),
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dateLabel: formatShortDate(date),
      });

      date.setDate(date.getDate() + 1);
    }

    return days;
  }, [currentDate, viewMode]);

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("department", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.log("EMPLOYEE ERROR:", error.message);
      return;
    }

    const activeEmployees = (data || []).filter((employee) => {
      const status = String(employee.employment_status || "").trim().toLowerCase();
      return status !== "resigned" && status !== "terminated" && status !== "inactive" && status !== "awol";
    });

    setEmployees(activeEmployees);
  };

  const getSchedules = async () => {
    const { data, error } = await supabase.from("schedules").select("*");

    if (error) {
      console.log("SCHEDULE ERROR:", error.message);
      return;
    }

    setSchedules(data || []);
  };

  const getApprovedLeaves = async () => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .ilike("status", "approved");

    if (error) {
      console.log("LEAVE ERROR:", error.message);
      return;
    }

    setApprovedLeaves(data || []);
  };

  const getShiftTemplates = async () => {
    const { data, error } = await supabase
      .from("shift_templates")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.log("SHIFT TEMPLATE ERROR:", error.message);
      setShifts(defaultShifts);
      return;
    }

    setShifts(data && data.length > 0 ? data : defaultShifts);
  };

  const loadHCRules = async () => {
    const { data, error } = await supabase
      .from("hc_rule_settings")
      .select("*")
      .eq("setting_name", "hc_rules")
      .single();

    if (error) {
      console.log("HC RULES ERROR:", error.message);
      return;
    }

    setHcRules(data.setting_data);
  };

  const getEventAddons = async () => {
    const { data, error } = await supabase.from("event_addons").select("*");

    if (error) {
      console.log("EVENT ADDONS ERROR:", error.message);
      return;
    }

    setEventAddons(data || []);
  };

  const getPublishedSchedule = async () => {
    if (!visibleDays[0] || !visibleDays[visibleDays.length - 1]) return;

    const { data, error } = await supabase
      .from("schedule_publications")
      .select("*")
      .eq("period_start", visibleDays[0].key)
      .eq("period_end", visibleDays[visibleDays.length - 1].key)
      .eq("department", selectedDepartment)
      .maybeSingle();

    if (error) {
      console.log("PUBLISH STATUS ERROR:", error.message);
      setPublishedSchedule(null);
      return;
    }

    setPublishedSchedule(data || null);
  };

  const publishSchedule = async () => {
    if (viewMode !== "weekly") {
      alert("Publish is only available in weekly view.");
      await createAuditLog(
        "PUBLISH_SCHEDULE_BLOCKED",
        "Attempted to publish schedule outside weekly view",
        "warning",
        null,
        { viewMode, department: selectedDepartment }
      );
      return;
    }

    const confirmed = confirm("Publish this weekly schedule? This will lock editing.");
    if (!confirmed) return;

    const { data: existingPublication, error: existingPublicationError } =
      await supabase
        .from("schedule_publications")
        .select("*")
        .eq("period_start", visibleDays[0].key)
        .eq("period_end", visibleDays[visibleDays.length - 1].key)
        .eq("department", selectedDepartment)
        .maybeSingle();

    if (existingPublicationError) {
      console.log("CHECK PUBLISH STATUS ERROR:", existingPublicationError.message);
      alert("Failed to check publish status.");
      await createAuditLog(
        "PUBLISH_SCHEDULE_FAILED",
        "Failed to check existing schedule publication before publishing",
        "warning",
        null,
        {
          department: selectedDepartment,
          periodStart: visibleDays[0].key,
          periodEnd: visibleDays[visibleDays.length - 1].key,
          error: existingPublicationError.message,
        }
      );
      return;
    }

    if (existingPublication) {
      alert("This schedule is already published.");
      await createAuditLog(
        "PUBLISH_SCHEDULE_BLOCKED",
        "Attempted to publish an already published schedule",
        "warning",
        existingPublication,
        {
          department: selectedDepartment,
          periodStart: visibleDays[0].key,
          periodEnd: visibleDays[visibleDays.length - 1].key,
        },
        existingPublication.id
      );
      await getPublishedSchedule();
      return;
    }

    const { data: publicationData, error } = await supabase
      .from("schedule_publications")
      .insert({
        period_start: visibleDays[0].key,
        period_end: visibleDays[visibleDays.length - 1].key,
        department: selectedDepartment,
        status: "Published",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.log("PUBLISH ERROR:", error.message);
      alert("Failed to publish schedule.");
      await createAuditLog(
        "PUBLISH_SCHEDULE_FAILED",
        "Failed to publish schedule",
        "warning",
        null,
        {
          department: selectedDepartment,
          periodStart: visibleDays[0].key,
          periodEnd: visibleDays[visibleDays.length - 1].key,
          error: error.message,
        }
      );
      return;
    }

    await createAuditLog(
      "PUBLISH_SCHEDULE",
      `Published ${selectedDepartment} schedule (${visibleDays[0].key} to ${visibleDays[visibleDays.length - 1].key})`,
      "info",
      null,
      {
        publication: publicationData,
        department: selectedDepartment,
        periodStart: visibleDays[0].key,
        periodEnd: visibleDays[visibleDays.length - 1].key,
        viewMode,
        visibleStaff: filteredEmployees.length,
        scheduleRows: schedules.filter(
          (schedule) =>
            schedule.day >= visibleDays[0].key &&
            schedule.day <= visibleDays[visibleDays.length - 1].key
        ).length,
      },
      publicationData?.id || null
    );

    await getPublishedSchedule();
  };

  const unpublishSchedule = async () => {
    const confirmed = confirm("Unpublish this schedule and allow editing again?");
    if (!confirmed || !publishedSchedule?.id) return;

    const { error } = await supabase
      .from("schedule_publications")
      .delete()
      .eq("id", publishedSchedule.id);

    if (error) {
      console.log("UNPUBLISH ERROR:", error.message);
      alert("Failed to unpublish schedule.");
      await createAuditLog(
        "UNPUBLISH_SCHEDULE_FAILED",
        "Failed to unpublish schedule",
        "warning",
        publishedSchedule,
        { error: error.message },
        publishedSchedule.id
      );
      return;
    }

    await createAuditLog(
      "UNPUBLISH_SCHEDULE",
      `Unpublished ${selectedDepartment} schedule (${publishedSchedule.period_start || visibleDays[0]?.key} to ${publishedSchedule.period_end || visibleDays[visibleDays.length - 1]?.key})`,
      "warning",
      publishedSchedule,
      null,
      publishedSchedule.id
    );

    setPublishedSchedule(null);
  };

  const getRequiredHC = (dayKey: string) => {
    if (!hcRules || selectedDepartment === "ALL") return 0;

    const occupancyRule = hcRules.occupancyRules?.find((rule: any) => {
      return roomsSold >= Number(rule.min || 0) && roomsSold <= Number(rule.max || 999999);
    });

    const baseHC = Number(occupancyRule?.rules?.[selectedDepartment] || 0);

    const dayName = new Date(dayKey).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const peakRule = hcRules.peakRules?.find((rule: any) => rule.day === dayName);
    const peakHC = Number(peakRule?.rules?.[selectedDepartment] || 0);

    const eventToday = eventAddons.find(
      (event) => String(event.event_date) === String(dayKey)
    );

    const eventPax = Number(eventToday?.expected_pax || 0);

    const eventRule = hcRules.eventRules?.find((rule: any) => {
      return eventPax >= Number(rule.min || 0) && eventPax <= Number(rule.max || 999999);
    });

    const eventHC = Number(eventRule?.rules?.[selectedDepartment] || 0);

    return baseHC + peakHC + eventHC;
  };

  const getEmployeeKeys = (employee: Employee) => {
    return [
      String(employee.id || "").trim(),
      String(employee.employee_no || "").trim(),
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
    ]
      .filter(Boolean)
      .map((item) => item.toLowerCase());
  };

  const isEmployeeOnLeave = (employee: Employee, dayKey: string) => {
    const keys = getEmployeeKeys(employee);

    return approvedLeaves.some((leave) => {
      const leaveEmployeeId = String(leave.employee_id || "").trim().toLowerCase();

      return (
        keys.includes(leaveEmployeeId) &&
        dayKey >= String(leave.start_date) &&
        dayKey <= String(leave.end_date)
      );
    });
  };

  const getLeaveType = (employee: Employee, dayKey: string) => {
    const keys = getEmployeeKeys(employee);

    const found = approvedLeaves.find((leave) => {
      const leaveEmployeeId = String(leave.employee_id || "").trim().toLowerCase();

      return (
        keys.includes(leaveEmployeeId) &&
        dayKey >= String(leave.start_date) &&
        dayKey <= String(leave.end_date)
      );
    });

    return found?.leave_type || "Approved Leave";
  };

  const getShift = (employeeId: string, day: string) => {
    const found = schedules.find(
      (schedule) =>
        String(schedule.employee_id) === String(employeeId) &&
        String(schedule.day) === String(day)
    );

    return found?.shift || "OFF";
  };

  const isUnscheduledShift = (shiftName: string) => shiftName === "OFF";
  const isRestDayShift = (shiftName: string) => shiftName === "RD";
  const isWorkingShift = (shiftName: string) =>
    !isUnscheduledShift(shiftName) && !isRestDayShift(shiftName);

  const getCurrentUser = async () => {
    const localUser =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_user")
        : null;

    if (localUser) {
      try {
        const parsedUser = JSON.parse(localUser);

        return {
          id: parsedUser?.id || null,
          name:
            parsedUser?.name ||
            parsedUser?.full_name ||
            parsedUser?.user_name ||
            parsedUser?.email ||
            "Unknown User",
          email: parsedUser?.email || null,
        };
      } catch {
        // Continue to Supabase auth fallback.
      }
    }

    const { data } = await supabase.auth.getUser();

    return {
      id: data?.user?.id || null,
      name:
        data?.user?.user_metadata?.full_name ||
        data?.user?.email ||
        "Unknown User",
      email: data?.user?.email || null,
    };
  };

  const createAuditLog = async (
    action: string,
    description: string,
    severity: "info" | "warning" | "critical" = "info",
    oldValue: any = null,
    newValue: any = null,
    recordId: string | number | null = null
  ) => {
    const currentUser = await getCurrentUser();

    const { error } = await supabase.from("audit_logs").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      module: "Schedule Publishing",
      action,
      description,
      severity,
      record_id: recordId ? String(recordId) : null,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.log("SCHEDULE PUBLISHING AUDIT ERROR:", error.message);
    }
  };

  const getEmployeeDisplayName = (employeeId: string) => {
    const employee = employees.find((emp) => String(emp.id) === String(employeeId));
    if (!employee) return "Unknown Employee";
    return `${employee.first_name} ${employee.last_name}`.trim();
  };

  const updateSchedule = async (employeeId: string, day: string, shift: string) => {
    if (publishedSchedule) {
      alert("This schedule is already published. Unpublish first before editing.");
      await createAuditLog(
        "UPDATE_SCHEDULE_BLOCKED",
        "Attempted to edit a published schedule",
        "warning",
        { publishedSchedule },
        { employeeId, day, shift }
      );
      return;
    }

    const employee = employees.find((emp) => String(emp.id) === String(employeeId));

    if (employee && isEmployeeOnLeave(employee, day) && shift !== "OFF") {
      alert("This employee has an approved leave on this date.");
      await createAuditLog(
        "UPDATE_SCHEDULE_BLOCKED",
        `Attempted to schedule ${employee.first_name} ${employee.last_name} while on approved leave`,
        "warning",
        { leaveType: getLeaveType(employee, day), day },
        { employeeId, employeeName: `${employee.first_name} ${employee.last_name}`, shift }
      );
      return;
    }

    setSaveStatus("saving");

    const existing = schedules.find(
      (schedule) =>
        String(schedule.employee_id) === String(employeeId) &&
        String(schedule.day) === String(day)
    );

    if (existing) {
      const { error } = await supabase
        .from("schedules")
        .update({ shift })
        .eq("id", existing.id);

      if (error) {
        console.log("UPDATE SCHEDULE ERROR:", error.message);
        setSaveStatus("idle");
        return;
      }

      setSchedules((prev) =>
        prev.map((item) => (item.id === existing.id ? { ...item, shift } : item))
      );

      await createAuditLog(
        "UPDATE_SCHEDULE",
        `Updated schedule for ${getEmployeeDisplayName(employeeId)} on ${day}`,
        "info",
        { employeeId, day, shift: existing.shift },
        { employeeId, day, shift },
        existing.id
      );

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1300);
      return;
    }

    const { data, error } = await supabase
      .from("schedules")
      .insert({
        employee_id: employeeId,
        day,
        shift,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.log("INSERT SCHEDULE ERROR:", error.message);
      setSaveStatus("idle");
      return;
    }

    setSchedules((prev) => [
      ...prev,
      {
        id: data?.id || Date.now(),
        employee_id: employeeId,
        day,
        shift,
      },
    ]);

    await createAuditLog(
      "CREATE_SCHEDULE",
      `Created schedule for ${getEmployeeDisplayName(employeeId)} on ${day}`,
      "info",
      null,
      { employeeId, day, shift },
      data?.id || null
    );

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1300);
  };

  const previewScheduleImport = async (file: File) => {
    if (publishedSchedule) {
      alert("This schedule is already published. Unpublish first before importing.");
      await createAuditLog(
        "IMPORT_SCHEDULE_BLOCKED",
        "Attempted to import into a published schedule",
        "warning",
        { publishedSchedule },
        { rows: scheduleImportPreview.length, department: selectedDepartment }
      );
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    });

    const preview: ScheduleImportPreviewRow[] = rows
      .map((row) => {
        const employeeNo = String(
          getCellValue(row, ["Employee No", "Employee ID", "Biometrics ID", "Enroll No", "ID"])
        ).trim();

        const excelName = String(
          getCellValue(row, ["Employee Name", "Name", "Employee"])
        ).trim();

        const day = parseExcelDate(
          getCellValue(row, ["Date", "Day", "Schedule Date"])
        );

        const rawShift = String(
          getCellValue(row, ["Shift", "Schedule", "Shift Name"])
        ).trim();

        const shift = normalizeShiftName(rawShift);
        const employee = findEmployeeForImport(employeeNo, excelName);

        const validShift =
          shift === "OFF" ||
          shift === "RD" ||
          shifts.some((item) => item.shift_name === shift);

        const blockedByLeave =
          !!employee &&
          !!day &&
          shift !== "OFF" &&
          shift !== "RD" &&
          hasApprovedLeaveOnDate(employee, day);

        let remarks = "Ready";
        if (!employee) remarks = "Employee not found";
        else if (!day) remarks = "Missing date";
        else if (!validShift) remarks = "Shift not found";
        else if (blockedByLeave) remarks = "Blocked: approved leave on this date";

        return {
          employee_no: employeeNo,
          excel_name: excelName,
          matched_employee_id: employee?.id,
          matched_employee_name: employee
            ? `${employee.first_name} ${employee.last_name}`
            : "",
          day,
          shift,
          matched: !!employee && !!day && validShift && !blockedByLeave,
          valid_shift: validShift,
          blocked_by_leave: blockedByLeave,
          remarks,
        };
      })
      .filter((row) => row.employee_no || row.excel_name || row.day || row.shift);

    setScheduleImportPreview(preview);

    const matched = preview.filter((row) => row.matched).length;
    const missing = preview.length - matched;

    setScheduleImportStatus(
      `Preview loaded. Rows: ${preview.length}. Ready: ${matched}. Issues: ${missing}.`
    );

    if (missing > 0) {
      await createAuditLog(
        "IMPORT_SCHEDULE_VALIDATION_WARNING",
        `Schedule import preview has ${missing} issue row(s)`,
        "warning",
        null,
        {
          rows: preview.length,
          ready: matched,
          issues: missing,
          sampleIssues: preview.filter((row) => !row.matched).slice(0, 10),
        }
      );
    }
  };

  const confirmScheduleImport = async () => {
    if (publishedSchedule) {
      alert("This schedule is already published. Unpublish first before importing.");
      await createAuditLog(
        "IMPORT_SCHEDULE_BLOCKED",
        "Attempted to import into a published schedule",
        "warning",
        { publishedSchedule },
        { rows: scheduleImportPreview.length, department: selectedDepartment }
      );
      return;
    }

    const readyRows = scheduleImportPreview.filter(
      (row) => row.matched && row.matched_employee_id
    );

    if (readyRows.length === 0) {
      alert("No valid schedule rows to import.");
      await createAuditLog(
        "IMPORT_SCHEDULE_VALIDATION_FAILED",
        "No valid schedule rows to import",
        "warning",
        null,
        {
          rows: scheduleImportPreview.length,
          issues: scheduleImportPreview.filter((row) => !row.matched).slice(0, 20),
        }
      );
      return;
    }

    const confirmImport = confirm(`Import ${readyRows.length} schedule rows?`);
    if (!confirmImport) return;

    setImportingSchedule(true);
    setSaveStatus("saving");

    const rowsToSave = readyRows.map((row) => ({
      employee_id: row.matched_employee_id!,
      day: row.day,
      shift: row.shift,
    }));

    const { error } = await supabase.from("schedules").upsert(rowsToSave, {
      onConflict: "employee_id,day",
    });

    setImportingSchedule(false);

    if (error) {
      console.log("IMPORT SCHEDULE ERROR:", error);
      alert(error.message);
      await createAuditLog(
        "IMPORT_SCHEDULE_FAILED",
        "Failed to import schedule rows",
        "warning",
        null,
        { rows: rowsToSave.length, error: error.message }
      );
      setSaveStatus("idle");
      return;
    }

    await createAuditLog(
      "IMPORT_SCHEDULE",
      `Imported ${rowsToSave.length} schedule row(s)`,
      "info",
      null,
      {
        rows: rowsToSave.length,
        previewRows: scheduleImportPreview.length,
        issues: scheduleImportPreview.length - rowsToSave.length,
        department: selectedDepartment,
        periodStart: visibleDays[0]?.key || null,
        periodEnd: visibleDays[visibleDays.length - 1]?.key || null,
      }
    );

    await getSchedules();

    setScheduleImportStatus(`Imported ${rowsToSave.length} schedule row(s).`);
    setScheduleImportPreview([]);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1300);
  };

  const clearScheduleImportPreview = () => {
    setScheduleImportPreview([]);
    setScheduleImportStatus("");
  };

  const moveDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);

    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setFullYear(newDate.getFullYear() + (direction === "next" ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getDateRangeLabel = () => {
    const first = visibleDays[0];
    const last = visibleDays[visibleDays.length - 1];

    if (!first || !last) return "";

    if (viewMode === "weekly") {
      return `${first.dateLabel} - ${last.dateLabel}, ${currentDate.getFullYear()}`;
    }

    return `Full Year ${currentDate.getFullYear()}`;
  };

  const copyLastWeekSchedule = async () => {
    if (publishedSchedule) {
      alert("This schedule is already published. Unpublish first before copying.");
      await createAuditLog(
        "COPY_LAST_WEEK_BLOCKED",
        "Attempted to copy last week into a published schedule",
        "warning",
        { publishedSchedule },
        { department: selectedDepartment, periodStart: visibleDays[0]?.key, periodEnd: visibleDays[visibleDays.length - 1]?.key }
      );
      return;
    }

    if (viewMode !== "weekly") {
      alert("Copy Last Week is only available in weekly view.");
      await createAuditLog(
        "COPY_LAST_WEEK_BLOCKED",
        "Attempted to copy last week outside weekly view",
        "warning",
        null,
        { viewMode, department: selectedDepartment }
      );
      return;
    }

    const confirmCopy = confirm("Copy last week's schedule into this week?");
    if (!confirmCopy) return;

    setCopyingSchedule(true);

    const currentWeekStart = new Date(visibleDays[0].key);
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

    const startKey = formatDateKey(lastWeekStart);
    const endKey = formatDateKey(lastWeekEnd);

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .gte("day", startKey)
      .lte("day", endKey);

    if (error) {
      console.log("COPY LAST WEEK ERROR:", error.message);
      await createAuditLog(
        "COPY_LAST_WEEK_FAILED",
        "Failed to load last week's schedule",
        "warning",
        null,
        { startKey, endKey, error: error.message }
      );
      setCopyingSchedule(false);
      return;
    }

    const newSchedules =
      data?.map((schedule) => {
        const oldDate = new Date(schedule.day);
        const newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + 7);

        return {
          employee_id: schedule.employee_id,
          day: formatDateKey(newDate),
          shift: schedule.shift,
        };
      }) || [];

    if (newSchedules.length === 0) {
      alert("No schedule found from last week.");
      await createAuditLog(
        "COPY_LAST_WEEK_EMPTY",
        "No previous week schedule found to copy",
        "warning",
        null,
        { startKey, endKey, department: selectedDepartment }
      );
      setCopyingSchedule(false);
      return;
    }

    const currentWeekKeys = visibleDays.map((day) => day.key);
    const visibleEmployeeIds = filteredEmployees.map((employee) => employee.id);

    await supabase
      .from("schedules")
      .delete()
      .in("day", currentWeekKeys)
      .in("employee_id", visibleEmployeeIds);

    const { error: insertError } = await supabase.from("schedules").upsert(newSchedules, {
      onConflict: "employee_id,day",
    });

    if (insertError) {
      console.log("COPY INSERT ERROR:", insertError.message);
      await createAuditLog(
        "COPY_LAST_WEEK_FAILED",
        "Failed to copy last week's schedule",
        "warning",
        null,
        {
          sourceStart: startKey,
          sourceEnd: endKey,
          targetStart: visibleDays[0]?.key || null,
          targetEnd: visibleDays[visibleDays.length - 1]?.key || null,
          rows: newSchedules.length,
          error: insertError.message,
        }
      );
      setCopyingSchedule(false);
      return;
    }

    await createAuditLog(
      "COPY_LAST_WEEK",
      `Copied ${newSchedules.length} schedule row(s) from previous week`,
      "warning",
      { sourceStart: startKey, sourceEnd: endKey, rows: data?.length || 0 },
      {
        targetStart: visibleDays[0]?.key || null,
        targetEnd: visibleDays[visibleDays.length - 1]?.key || null,
        rows: newSchedules.length,
        department: selectedDepartment,
      }
    );

    await getSchedules();
    setCopyingSchedule(false);
    alert("Schedule copied successfully.");
  };

  const normalizeColor = (color?: string | null) => {
    const cleanColor = String(color || "").toLowerCase().trim();

    if (!cleanColor) return "blue";
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

    return "blue";
  };

  const getShiftColorClass = (shiftName: string) => {
    const shift = shifts.find((item) => item.shift_name === shiftName);
    const color = normalizeColor(shift?.color);

    if (color === "blue") return "border-blue-500/40 bg-blue-500/15 text-blue-300";
    if (color === "sky") return "border-sky-500/40 bg-sky-500/15 text-sky-300";
    if (color === "cyan") return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300";
    if (color === "teal") return "border-teal-500/40 bg-teal-500/15 text-teal-300";
    if (color === "green") return "border-green-500/40 bg-green-500/15 text-green-300";
    if (color === "emerald") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    if (color === "lime") return "border-lime-500/40 bg-lime-500/15 text-lime-300";
    if (color === "yellow") return "border-yellow-500/40 bg-yellow-500/15 text-yellow-300";
    if (color === "amber") return "border-amber-500/40 bg-amber-500/15 text-amber-300";
    if (color === "orange") return "border-orange-500/40 bg-orange-500/15 text-orange-300";
    if (color === "red") return "border-red-500/40 bg-red-500/15 text-red-300";
    if (color === "rose") return "border-rose-500/40 bg-rose-500/15 text-rose-300";
    if (color === "pink") return "border-pink-500/40 bg-pink-500/15 text-pink-300";
    if (color === "purple") return "border-purple-500/40 bg-purple-500/15 text-purple-300";
    if (color === "violet") return "border-violet-500/40 bg-violet-500/15 text-violet-300";
    if (color === "indigo") return "border-indigo-500/40 bg-indigo-500/15 text-indigo-300";
    if (color === "slate" || color === "gray") return "border-slate-500/40 bg-slate-500/15 text-slate-300";

    return "border-slate-700 bg-slate-800 text-slate-400";
  };

  const getShortShiftLabel = (shiftName: string) => {
    const shift = shifts.find((item) => item.shift_name === shiftName);

    if (shiftName === "OFF") return "OFF";
    if (shiftName === "RD") return "RD";
    if (shift?.time_label && !shift?.start_time && !shift?.end_time) return shift.shift_name;

    const shortName = shiftName.includes("AM")
      ? "AM"
      : shiftName.includes("PM")
      ? "PM"
      : shiftName.includes("Mid")
      ? "MID"
      : shiftName.includes("GY")
      ? "GY"
      : shiftName;

    if (!shift?.start_time || !shift?.end_time) return shortName;

    return `${shortName} ${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`;
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getSchedules();
    getApprovedLeaves();
    getShiftTemplates();
    loadHCRules();
    getEventAddons();
  }, []);

  useEffect(() => {
    getPublishedSchedule();
  }, [selectedDepartment, viewMode, currentDate, visibleDays.length]);

  useEffect(() => {
    if (viewMode === "monthly" && todayColumnRef.current) {
      setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }, 120);
    }
  }, [viewMode, currentDate]);

  /// CALCULATIONS
  const departments = useMemo(() => {
    const list = employees
      .map((employee) => employee.department?.trim())
      .filter((department): department is string => Boolean(department));

    return Array.from(new Set(list)).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();

      const matchesDepartment =
        selectedDepartment === "ALL" ||
        employee.department?.trim().toLowerCase() === selectedDepartment.trim().toLowerCase();

      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        String(employee.employee_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(employee.position || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDepartment && matchesSearch;
    });
  }, [employees, selectedDepartment, searchTerm]);

  const currentHC = visibleDays.map((day) =>
    filteredEmployees.filter(
      (employee) =>
        isWorkingShift(getShift(employee.id, day.key)) &&
        !isEmployeeOnLeave(employee, day.key)
    ).length
  );

  const requiredHC = visibleDays.map((day) => getRequiredHC(day.key));
  const coverageGap = currentHC.map((count, index) => count - requiredHC[index]);

  const recommendationText = coverageGap.map((gap) => {
    if (selectedDepartment === "ALL") return "Select dept";
    if (gap < 0) return `Add ${Math.abs(gap)} staff`;
    if (gap > 0) return `Reduce ${gap} staff`;
    return "Good";
  });

  const totalScheduledCells = visibleDays.length * filteredEmployees.length;
  const workingCells = currentHC.reduce((sum, count) => sum + count, 0);

  const leaveCells = visibleDays.reduce((sum, day) => {
    return sum + filteredEmployees.filter((employee) => isEmployeeOnLeave(employee, day.key)).length;
  }, 0);

  const restDayCells = visibleDays.reduce((sum, day) => {
    return (
      sum +
      filteredEmployees.filter(
        (employee) =>
          isRestDayShift(getShift(employee.id, day.key)) &&
          !isEmployeeOnLeave(employee, day.key)
      ).length
    );
  }, 0);

  const unscheduledCells = visibleDays.reduce((sum, day) => {
    return (
      sum +
      filteredEmployees.filter(
        (employee) =>
          isUnscheduledShift(getShift(employee.id, day.key)) &&
          !isEmployeeOnLeave(employee, day.key)
      ).length
    );
  }, 0);

  const offCells = unscheduledCells;

  const unscheduledRows = filteredEmployees.flatMap((employee) =>
    visibleDays
      .filter(
        (day) =>
          isUnscheduledShift(getShift(employee.id, day.key)) &&
          !isEmployeeOnLeave(employee, day.key)
      )
      .map((day) => ({
        key: `${employee.id}-${day.key}`,
        employee,
        day,
      }))
  );

  const unscheduledEmployees = new Set(
    unscheduledRows.map((row) => row.employee.id)
  ).size;

  const understaffedDays = coverageGap.filter((gap) => selectedDepartment !== "ALL" && gap < 0).length;
  const overstaffedDays = coverageGap.filter((gap) => selectedDepartment !== "ALL" && gap > 0).length;

  const importReadyCount = scheduleImportPreview.filter((row) => row.matched).length;
  const importIssueCount = scheduleImportPreview.length - importReadyCount;

  const tableGridColumns =
    viewMode === "weekly"
      ? `260px repeat(${visibleDays.length}, minmax(135px, 1fr))`
     : `220px repeat(${visibleDays.length}, 96px)`;

  const tableWidthClass =
  viewMode === "weekly"
    ? "w-full min-w-[1180px]"
    : "w-max";

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scheduling</h1>
            <p className="mt-2 text-slate-400">
              Build weekly schedules, import Excel schedules, monitor staffing coverage, and publish locked schedules.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-5 py-4 ${
              publishedSchedule
                ? "border-yellow-500/30 bg-yellow-500/10"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-[0.18em] ${
                publishedSchedule ? "text-yellow-300" : "text-emerald-300"
              }`}
            >
              Schedule Status
            </p>
            <h2
              className={`mt-1 flex items-center gap-2 text-xl font-black ${
                publishedSchedule ? "text-yellow-400" : "text-emerald-400"
              }`}
            >
              {publishedSchedule ? <Lock size={18} /> : <Unlock size={18} />}
              {publishedSchedule ? "Published / Locked" : saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Editable"}
            </h2>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard icon={<Users size={22} />} title="Visible Staff" value={filteredEmployees.length} />
          <KpiCard icon={<CheckCircle2 size={22} />} title="Working Cells" value={workingCells} success />
          <KpiCard icon={<CalendarDays size={22} />} title="Rest Day" value={restDayCells} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Understaffed" value={understaffedDays} danger={understaffedDays > 0} />
          <KpiCard icon={<Users size={22} />} title="Overstaffed" value={overstaffedDays} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Unscheduled" value={unscheduledCells} danger={unscheduledCells > 0} />
        </section>

        {unscheduledRows.length > 0 && (
          <section className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-red-300">
                  <AlertTriangle size={20} />
                  Scheduling Issues: Unscheduled Employees
                </h2>
                <p className="mt-1 text-sm text-red-100/80">
                  OFF means no schedule assigned. RD is treated as a valid rest day and is not included in this warning.
                </p>
              </div>

              <span className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-black text-red-200">
                {unscheduledRows.length} issue cell(s)
              </span>
            </div>

            <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-red-500/20 bg-slate-950/70">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 bg-slate-950 text-left text-red-200">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Issue</th>
                  </tr>
                </thead>

                <tbody>
                  {unscheduledRows.slice(0, 80).map((row) => (
                    <tr key={row.key} className="border-t border-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-black">
                          {row.employee.first_name} {row.employee.last_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.employee.employee_no || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{row.employee.department || "-"}</td>
                      <td className="px-4 py-3 font-bold">{row.day.key}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-black text-red-300">
                          OFF / No Schedule Assigned
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedDepartment === "ALL" ? "All Departments" : selectedDepartment}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{getDateRangeLabel()}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => moveDate("prev")} className="rounded-xl bg-slate-800 px-4 py-2 font-black hover:bg-slate-700">
                  ‹
                </button>

                <button onClick={goToToday} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700">
                  Today
                </button>

                <button onClick={() => moveDate("next")} className="rounded-xl bg-slate-800 px-4 py-2 font-black hover:bg-slate-700">
                  ›
                </button>

                <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
                  <button
                    onClick={() => setViewMode("weekly")}
                    className={
                      viewMode === "weekly"
                        ? "rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950"
                        : "rounded-lg px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800"
                    }
                  >
                    Weekly
                  </button>

                  <button
                    onClick={() => setViewMode("monthly")}
                    className={
                      viewMode === "monthly"
                        ? "rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950"
                        : "rounded-lg px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800"
                    }
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                type="number"
                value={roomsSold}
                onChange={(e) => setRoomsSold(Number(e.target.value || 0))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                placeholder="Rooms sold"
              />

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none"
                />
              </div>

              {publishedSchedule ? (
                <button
                  onClick={unpublishSchedule}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black hover:bg-red-500"
                >
                  Unpublish
                </button>
              ) : (
                <button
                  onClick={publishSchedule}
                  disabled={viewMode !== "weekly"}
                  className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
                >
                  Publish
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <FileSpreadsheet size={22} /> Schedule Controls
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Import schedules, copy last week, and review upload issues before saving.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <button
                onClick={() => scheduleFileRef.current?.click()}
                disabled={!!publishedSchedule}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black hover:bg-emerald-500 disabled:opacity-50"
              >
                Import Schedule
              </button>

              <input
                ref={scheduleFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) previewScheduleImport(file);
                  e.target.value = "";
                }}
                className="hidden"
              />

              <button
                onClick={copyLastWeekSchedule}
                disabled={copyingSchedule || viewMode !== "weekly" || !!publishedSchedule}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black hover:bg-blue-500 disabled:opacity-50"
              >
                <Copy size={16} />
                {copyingSchedule ? "Copying..." : "Copy Last Week"}
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-slate-300">
                Publish Rule
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Published schedules are locked. To edit, import, or copy schedules, unpublish first. Publish and unpublish actions are recorded in Audit Trail.
              </p>
            </div>
          </div>
        </section>

        {scheduleImportStatus && (
          <section className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-300">
            {scheduleImportStatus}
          </section>
        )}

        {scheduleImportPreview.length > 0 && (
          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">Schedule Import Preview</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Rows: {scheduleImportPreview.length} • Ready: {importReadyCount} • Issues: {importIssueCount}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={clearScheduleImportPreview}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Clear Preview
                </button>

                <button
                  onClick={confirmScheduleImport}
                  disabled={importingSchedule || !!publishedSchedule}
                  className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                >
                  {importingSchedule ? "Importing..." : "Confirm Import"}
                </button>
              </div>
            </div>

            <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Employee No</th>
                    <th className="px-4 py-3">Excel Name</th>
                    <th className="px-4 py-3">Matched Employee</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Shift</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {scheduleImportPreview.map((row, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      <td className="px-4 py-3">{row.employee_no || "-"}</td>
                      <td className="px-4 py-3 font-bold">{row.excel_name || "-"}</td>
                      <td className="px-4 py-3 font-bold text-emerald-300">
                        {row.matched_employee_name || "-"}
                      </td>
                      <td className="px-4 py-3">{row.day || "-"}</td>
                      <td className="px-4 py-3">{row.shift}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            row.matched
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {row.matched ? "Ready" : "Issue"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
  <div className="mb-5 flex items-center justify-between">
    <div>
      <h2 className="text-xl font-bold">Schedule Board</h2>
      <p className="mt-1 text-sm text-slate-400">
        {publishedSchedule ? "Schedule is locked." : "Editable schedule grid."}
      </p>
    </div>

    {publishedSchedule && (
      <span className="rounded-full bg-yellow-500/10 px-4 py-2 text-xs font-black text-yellow-400">
        Published / Locked
      </span>
    )}
  </div>

  <div className="max-w-full overflow-hidden rounded-2xl border border-slate-800">
    <div className="w-full overflow-x-auto overflow-y-auto">
      <div
        className={viewMode === "weekly" ? "min-w-[1180px]" : "w-max"}
      >
        <div
          className="grid bg-slate-950 text-sm font-black text-slate-300"
          style={{ gridTemplateColumns: tableGridColumns }}
        >
          <div className="sticky left-0 z-30 border-r border-slate-800 bg-slate-950 px-4 py-4">
            Staff Name
          </div>

          {visibleDays.map((day) => {
            const isToday = day.key === formatDateKey(new Date());

            return (
              <div
                key={day.key}
                ref={isToday ? todayColumnRef : null}
                className={`border-r border-slate-800 px-4 py-4 text-center last:border-r-0 ${
                  isToday ? "bg-yellow-400/10 text-yellow-300" : ""
                }`}
              >
                <div>{day.dayName}</div>
                <div className="mt-1 text-xs font-normal text-slate-400">
                  {day.dateLabel}
                </div>
              </div>
            );
          })}
        </div>

        {filteredEmployees.map((employee) => (
          <div
            key={employee.id}
            className="grid border-t border-slate-800 text-sm hover:bg-slate-800/40"
            style={{ gridTemplateColumns: tableGridColumns }}
          >
            <div className="sticky left-0 z-20 border-r border-slate-800 bg-slate-900 px-4 py-3">
              <p className="font-black">
                {employee.first_name} {employee.last_name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {employee.position || "-"} • {employee.employee_no || "-"}
              </p>
            </div>

            {visibleDays.map((day) => {
              const currentShift = getShift(employee.id, day.key);
              const onLeave = isEmployeeOnLeave(employee, day.key);

              return (
                <div
                  key={`${employee.id}-${day.key}`}
                  className="border-r border-slate-800 px-2 py-2 last:border-r-0"
                >
                  {onLeave ? (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/15 px-2 py-2 text-center text-xs font-black text-red-300">
                      LEAVE
                      <div className="mt-1 text-[10px] font-normal text-red-200">
                        {getLeaveType(employee, day.key)}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <select
                        value={currentShift}
                        disabled={!!publishedSchedule}
                        onChange={(e) =>
                          updateSchedule(employee.id, day.key, e.target.value)
                        }
                        className={`block rounded-xl border px-2 py-2 text-center text-xs font-black outline-none disabled:cursor-not-allowed disabled:opacity-70 ${
                          viewMode === "weekly" ? "w-full" : "w-[88px]"
                        } ${getShiftColorClass(currentShift)}`}
                      >
                        {shifts.map((shift) => (
                          <option
                            key={shift.shift_name}
                            value={shift.shift_name}
                            className="bg-slate-900 text-white"
                          >
                            {getShortShiftLabel(shift.shift_name)}
                          </option>
                        ))}

                        {!shifts.some((shift) => shift.shift_name === "OFF") && (
                          <option value="OFF">OFF</option>
                        )}

                        {!shifts.some((shift) => shift.shift_name === "RD") && (
                          <option value="RD">RD</option>
                        )}
                      </select>

                      {currentShift === "OFF" && (
                        <p className="text-center text-[10px] font-bold text-red-300">
                          No schedule
                        </p>
                      )}

                      {currentShift === "RD" && (
                        <p className="text-center text-[10px] font-bold text-slate-400">
                          Rest day
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <SummaryRow
          label="Current HC"
          values={currentHC}
          tableGridColumns={tableGridColumns}
          color="text-blue-400"
        />

        <SummaryRow
          label="Required HC"
          values={requiredHC}
          tableGridColumns={tableGridColumns}
          color="text-emerald-400"
        />

        <SummaryRow
          label="Coverage Gap"
          values={coverageGap.map((gap) =>
            selectedDepartment === "ALL"
              ? "-"
              : gap > 0
              ? `+${gap}`
              : String(gap)
          )}
          tableGridColumns={tableGridColumns}
          color="text-yellow-400"
        />

        <SummaryRow
          label="Recommendation"
          values={recommendationText}
          tableGridColumns={tableGridColumns}
          color="text-slate-200"
        />
      </div>
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
  subtitle,
  success,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  subtitle?: string;
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

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function SummaryRow({ label, values, tableGridColumns, color }: any) {
  return (
    <div
      className="grid border-t border-slate-700 bg-slate-950/80 text-sm font-black"
      style={{ gridTemplateColumns: tableGridColumns }}
    >
      <div className="sticky left-0 z-20 border-r border-slate-700 bg-slate-950 px-4 py-4">
        {label}
      </div>

      {values.map((value: any, index: number) => (
        <div
          key={`${label}-${index}`}
          className={`border-r border-slate-700 px-4 py-4 text-center last:border-r-0 ${color}`}
        >
          {value}
        </div>
      ))}
    </div>
  );
}