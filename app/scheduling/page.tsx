import { supabase } from '@/lib/supabase';
"use client";


/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
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
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";
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

type ScheduleOverride = {
  id: string | number;
  employee_id: string;
  schedule_date: string;
  original_shift: string | null;
  override_start: string;
  override_end: string;
  reason: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
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
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([]);
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

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideEmployeeId, setOverrideEmployeeId] = useState("");
  const [overrideDay, setOverrideDay] = useState("");
  const [overrideOriginalShift, setOverrideOriginalShift] = useState("");
  const [overrideStart, setOverrideStart] = useState("");
  const [overrideEnd, setOverrideEnd] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  const todayColumnRef = useRef<HTMLDivElement | null>(null);
  const scheduleFileRef = useRef<HTMLInputElement | null>(null);

  // Internal marker only. This is used when no schedule row exists in the database.
  // OFF and RD are valid assigned rest-day statuses.
  const UNSCHEDULED_SHIFT = "__UNSCHEDULED__";

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

    if (!clean) return UNSCHEDULED_SHIFT;
    if (clean === "off") return "OFF";
    if (clean === "rd" || clean === "rest day" || clean === "day off") return "RD";
    if (clean === "am" || clean.includes("am")) return "AM Shift";
    if (clean === "pm" || clean.includes("pm")) return "PM Shift";
    if (clean === "mid" || clean.includes("mid")) return "Mid Shift";
    if (clean === "gy" || clean.includes("grave") || clean.includes("night")) return "GY Shift";

    return String(value || "OFF").trim();
  };

  const isTimeRangeShift = (value: string) =>
    /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(String(value || "").trim());

  const parseTimeRangeShift = (value: string) => {
    const clean = String(value || "").trim();
    const match = clean.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);

    if (!match) {
      return { start: "", end: "" };
    }

    return {
      start: match[1].padStart(5, "0"),
      end: match[2].padStart(5, "0"),
    };
  };

  const formatOverrideShift = (start: string, end: string) =>
    `${String(start || "").slice(0, 5)} - ${String(end || "").slice(0, 5)}`;

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

  const getScheduleOverrides = async () => {
    const { data, error } = await supabase
      .from("schedule_overrides")
      .select("*");

    if (error) {
      console.log("SCHEDULE OVERRIDE ERROR:", error.message);
      setScheduleOverrides([]);
      return;
    }

    setScheduleOverrides(data || []);
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

  const getRuleHeadcount = (rules: Record<string, unknown> | null | undefined) => {
    if (!rules) return 0;

    if (selectedDepartment !== "ALL") {
      return Number(rules[selectedDepartment] || 0);
    }

    const visibleDepartments = Array.from(
      new Set(
        filteredEmployees
          .map((employee) => String(employee.department || "").trim())
          .filter(Boolean)
      )
    );

    return visibleDepartments.reduce(
      (sum, department) => sum + Number(rules[department] || 0),
      0
    );
  };

  const getRequiredHC = (dayKey: string) => {
    if (!hcRules) return 0;

    const occupancyRule = hcRules.occupancyRules?.find((rule: any) => {
      return roomsSold >= Number(rule.min || 0) && roomsSold <= Number(rule.max || 999999);
    });

    const baseHC = getRuleHeadcount(occupancyRule?.rules);

    const dayName = new Date(dayKey).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const peakRule = hcRules.peakRules?.find((rule: any) => rule.day === dayName);
    const peakHC = getRuleHeadcount(peakRule?.rules);

    const eventToday = eventAddons.find(
      (event) => String(event.event_date) === String(dayKey)
    );

    const eventPax = Number(eventToday?.expected_pax || 0);

    const eventRule = hcRules.eventRules?.find((rule: any) => {
      return eventPax >= Number(rule.min || 0) && eventPax <= Number(rule.max || 999999);
    });

    const eventHC = getRuleHeadcount(eventRule?.rules);

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

    return found?.shift || UNSCHEDULED_SHIFT;
  };

  const getScheduleOverride = (employeeId: string, day: string) =>
    scheduleOverrides.find(
      (item) =>
        String(item.employee_id) === String(employeeId) &&
        String(item.schedule_date).slice(0, 10) === String(day).slice(0, 10)
    ) || null;

  const getEffectiveShift = (employeeId: string, day: string) => {
    const override = getScheduleOverride(employeeId, day);

    if (override?.override_start && override?.override_end) {
      return formatOverrideShift(override.override_start, override.override_end);
    }

    return getShift(employeeId, day);
  };

  const isUnscheduledShift = (shiftName: string) => shiftName === UNSCHEDULED_SHIFT;
  const isRestDayShift = (shiftName: string) => shiftName === "RD" || shiftName === "OFF";
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

    if (employee && isEmployeeOnLeave(employee, day) && shift !== "OFF" && shift !== "RD") {
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

  const openOverrideModal = (employeeId: string, day: string) => {
    if (publishedSchedule) {
      alert("This schedule is already published. Unpublish first before overriding.");
      return;
    }

    const baseShift = getShift(employeeId, day);
    const existingOverride = getScheduleOverride(employeeId, day);
    const parsedBase = isTimeRangeShift(baseShift)
      ? parseTimeRangeShift(baseShift)
      : { start: "", end: "" };

    setOverrideEmployeeId(employeeId);
    setOverrideDay(day);
    setOverrideOriginalShift(baseShift === UNSCHEDULED_SHIFT ? "OFF" : baseShift);
    setOverrideStart(existingOverride?.override_start?.slice(0, 5) || parsedBase.start || "");
    setOverrideEnd(existingOverride?.override_end?.slice(0, 5) || parsedBase.end || "");
    setOverrideReason(existingOverride?.reason || "");
    setOverrideModalOpen(true);
  };

  const closeOverrideModal = () => {
    setOverrideModalOpen(false);
    setOverrideEmployeeId("");
    setOverrideDay("");
    setOverrideOriginalShift("");
    setOverrideStart("");
    setOverrideEnd("");
    setOverrideReason("");
  };

  const saveScheduleOverride = async () => {
    if (publishedSchedule) {
      alert("This schedule is already published. Unpublish first before overriding.");
      return;
    }

    if (!overrideEmployeeId || !overrideDay) {
      alert("Missing employee or schedule date.");
      return;
    }

    if (!overrideStart || !overrideEnd) {
      alert("Override start and end time are required.");
      return;
    }

    if (!overrideReason.trim()) {
      alert("Override reason is required for audit trail.");
      return;
    }

    const employee = employees.find((emp) => String(emp.id) === String(overrideEmployeeId));

    if (employee && isEmployeeOnLeave(employee, overrideDay)) {
      alert("This employee has an approved leave on this date.");
      return;
    }

    setSavingOverride(true);
    setSaveStatus("saving");

    const currentUser = await getCurrentUser();
    const existingOverride = getScheduleOverride(overrideEmployeeId, overrideDay);
    const payload = {
      employee_id: overrideEmployeeId,
      schedule_date: overrideDay,
      original_shift: overrideOriginalShift || getShift(overrideEmployeeId, overrideDay),
      override_start: overrideStart,
      override_end: overrideEnd,
      reason: overrideReason.trim(),
      approved_by: currentUser.name,
      approved_at: new Date().toISOString(),
    };

    const { data, error } = existingOverride
      ? await supabase
          .from("schedule_overrides")
          .update(payload)
          .eq("id", existingOverride.id)
          .select()
          .single()
      : await supabase
          .from("schedule_overrides")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select()
          .single();

    setSavingOverride(false);

    if (error) {
      console.log("SAVE SCHEDULE OVERRIDE ERROR:", error.message);
      alert(error.message);
      setSaveStatus("idle");
      return;
    }

    setScheduleOverrides((prev) => {
      if (existingOverride) {
        return prev.map((item) => (String(item.id) === String(existingOverride.id) ? data : item));
      }

      return [...prev, data];
    });

    await createAuditLog(
      existingOverride ? "UPDATE_SCHEDULE_OVERRIDE" : "CREATE_SCHEDULE_OVERRIDE",
      `${existingOverride ? "Updated" : "Created"} schedule override for ${getEmployeeDisplayName(overrideEmployeeId)} on ${overrideDay}`,
      "warning",
      existingOverride || null,
      data,
      data?.id || null
    );

    closeOverrideModal();
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1300);
  };

  const clearScheduleOverride = async (employeeId: string, day: string) => {
    if (publishedSchedule) {
      alert("This schedule is already published. Unpublish first before clearing override.");
      return;
    }

    const existingOverride = getScheduleOverride(employeeId, day);

    if (!existingOverride?.id) {
      return;
    }

    const confirmed = confirm("Remove this schedule override and use the original assigned shift?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("schedule_overrides")
      .delete()
      .eq("id", existingOverride.id);

    if (error) {
      console.log("CLEAR SCHEDULE OVERRIDE ERROR:", error.message);
      alert(error.message);
      return;
    }

    setScheduleOverrides((prev) =>
      prev.filter((item) => String(item.id) !== String(existingOverride.id))
    );

    await createAuditLog(
      "CLEAR_SCHEDULE_OVERRIDE",
      `Cleared schedule override for ${getEmployeeDisplayName(employeeId)} on ${day}`,
      "warning",
      existingOverride,
      null,
      existingOverride.id
    );
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
          shift !== UNSCHEDULED_SHIFT &&
          (shift === "OFF" ||
            shift === "RD" ||
            isTimeRangeShift(shift) ||
            shifts.some((item) => item.shift_name === shift));

        const blockedByLeave =
          !!employee &&
          !!day &&
          shift !== UNSCHEDULED_SHIFT &&
          shift !== "OFF" &&
          shift !== "RD" &&
          hasApprovedLeaveOnDate(employee, day);

        let remarks = "Ready";
        if (!employee) remarks = "Employee not found";
        else if (!day) remarks = "Missing date";
        else if (shift === UNSCHEDULED_SHIFT) remarks = "Missing shift";
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

  const shiftColorClassMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    green: "border-green-200 bg-green-50 text-green-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    lime: "border-lime-200 bg-lime-50 text-lime-700",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    pink: "border-pink-200 bg-pink-50 text-pink-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
    gray: "border-gray-200 bg-gray-100 text-gray-700",
  };

  const getShiftTemplateByName = (shiftName: string) => {
    const normalizedShiftName = normalizeShiftName(shiftName);

    return (
      shifts.find((item) => String(item.shift_name || "") === String(shiftName || "")) ||
      shifts.find((item) => String(item.shift_name || "") === normalizedShiftName) ||
      defaultShifts.find((item) => String(item.shift_name || "") === normalizedShiftName) ||
      null
    );
  };

  const getShiftColorClass = (shiftName: string) => {
    if (shiftName === UNSCHEDULED_SHIFT) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (isTimeRangeShift(shiftName)) {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    const shiftTemplate = getShiftTemplateByName(shiftName);
    const colorKey = normalizeColor(shiftTemplate?.color || "");

    return shiftColorClassMap[colorKey] || shiftColorClassMap.blue;
  };

  const getShortShiftLabel = (shiftName: string) => {
    const shift = shifts.find((item) => item.shift_name === shiftName);

    if (shiftName === "OFF") return "OFF";
    if (shiftName === "RD") return "RD";
    if (isTimeRangeShift(shiftName)) return shiftName;

    if (!shift?.start_time || !shift?.end_time) {
      return shiftName;
    }

    return `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`;
  };

  /// EFFECTS
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getEmployees();
      void getSchedules();
      void getScheduleOverrides();
      void getApprovedLeaves();
      void getShiftTemplates();
      void loadHCRules();
      void getEventAddons();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("scheduling-shift-template-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_templates" },
        () => {
          getShiftTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("scheduling-overrides-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_overrides" },
        () => {
          getScheduleOverrides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getPublishedSchedule();
    }, 0);

    return () => window.clearTimeout(timer);
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
  const departments = Array.from(
    new Set(
      employees
        .map((employee) => employee.department?.trim())
        .filter((department): department is string => Boolean(department))
    )
  ).sort();

  const filteredEmployees = employees.filter((employee) => {
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

  const currentHC = visibleDays.map((day) =>
    filteredEmployees.filter(
      (employee) =>
        isWorkingShift(getEffectiveShift(employee.id, day.key)) &&
        !isEmployeeOnLeave(employee, day.key)
    ).length
  );

  const requiredHC = visibleDays.map((day) => getRequiredHC(day.key));
  const coverageGap = currentHC.map((count, index) => count - requiredHC[index]);

  const recommendationText = coverageGap.map((gap) => {
    if (gap < 0) return `Add ${Math.abs(gap)} staff`;
    if (gap > 0) return `Reduce ${gap} staff`;
    return "Good";
  });

  const workingCells = currentHC.reduce((sum, count) => sum + count, 0);

  const leaveCells = visibleDays.reduce((sum, day) => {
    return sum + filteredEmployees.filter((employee) => isEmployeeOnLeave(employee, day.key)).length;
  }, 0);

  const restDayCells = visibleDays.reduce((sum, day) => {
    return (
      sum +
      filteredEmployees.filter(
        (employee) =>
          isRestDayShift(getEffectiveShift(employee.id, day.key)) &&
          !isEmployeeOnLeave(employee, day.key)
      ).length
    );
  }, 0);

  const unscheduledCells = visibleDays.reduce((sum, day) => {
    return (
      sum +
      filteredEmployees.filter(
        (employee) =>
          isUnscheduledShift(getEffectiveShift(employee.id, day.key)) &&
          !isEmployeeOnLeave(employee, day.key)
      ).length
    );
  }, 0);


  const unscheduledRows = filteredEmployees.flatMap((employee) =>
    visibleDays
      .filter(
        (day) =>
          isUnscheduledShift(getEffectiveShift(employee.id, day.key)) &&
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


  const opscoreReminders = [
    ...(publishedSchedule
      ? [{ tone: "warning", text: "Schedule is published and editing is locked." }]
      : [{ tone: "info", text: "Schedule is editable. Publish when final." }]),
    ...(unscheduledCells > 0
      ? [{ tone: "danger", text: `${unscheduledCells} schedule cell(s) still need assignment.` }]
      : []),
    ...(understaffedDays > 0
      ? [{ tone: "warning", text: `${understaffedDays} day(s) are below required headcount.` }]
      : []),
    ...(importIssueCount > 0
      ? [{ tone: "warning", text: `${importIssueCount} import row(s) need review before confirming.` }]
      : []),
    ...(leaveCells > 0
      ? [{ tone: "info", text: `${leaveCells} approved leave cell(s) visible in this period.` }]
      : []),
  ].slice(0, 5);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="OPERATIONS / SCHEDULING" />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
        <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              OPERATIONS
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                Scheduling Workbench
              </h1>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                  publishedSchedule
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {publishedSchedule ? <Lock size={14} /> : <Unlock size={14} />}
                {publishedSchedule
                  ? "Published / Locked"
                  : saveStatus === "saving"
                    ? "Saving"
                    : saveStatus === "saved"
                      ? "Saved"
                      : "Editable"}
              </span>
            </div>
            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              Build schedules, assign shifts, import Excel files, validate coverage, and publish final locked schedules.
            </p>
          </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => moveDate("prev")}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                â€¹
              </button>

              <button
                onClick={goToToday}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                Today
              </button>

              <button
                onClick={() => moveDate("next")}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                â€º
              </button>

              <div className="flex h-11 rounded-xl border border-slate-300 bg-white p-1">
                <button
                  onClick={() => setViewMode("weekly")}
                  className={
                    viewMode === "weekly"
                      ? "rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white"
                      : "rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  }
                >
                  Weekly
                </button>

                <button
                  onClick={() => setViewMode("monthly")}
                  className={
                    viewMode === "monthly"
                      ? "rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white"
                      : "rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  }
                >
                  Yearly
                </button>
              </div>
            </div>
        </section>

        <section className="sticky top-16 z-40 mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[150px_220px_minmax(180px,1fr)_auto] xl:items-center">
            <input
              type="number"
              value={roomsSold}
              onChange={(e) => setRoomsSold(Number(e.target.value || 0))}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Rooms sold"
            />

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="ALL">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff name, employee no, or position..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-9 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => scheduleFileRef.current?.click()}
                disabled={!!publishedSchedule}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet size={15} />
                Import
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy size={15} />
                {copyingSchedule ? "Copying" : "Copy Week"}
              </button>

              {publishedSchedule ? (
                <button
                  onClick={unpublishSchedule}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                >
                  <Unlock size={15} />
                  Unpublish
                </button>
              ) : (
                <button
                  onClick={publishSchedule}
                  disabled={viewMode !== "weekly"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Lock size={15} />
                  Publish
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1">
              {selectedDepartment === "ALL" ? "All Departments" : selectedDepartment}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1">
              {getDateRangeLabel()}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1">
              {filteredEmployees.length} visible staff
            </span>
            {publishedSchedule && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                Editing locked
              </span>
            )}
          </div>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard
            icon={<Users size={18} />}
            title="Visible Staff"
            value={filteredEmployees.length}
          />

          <KpiCard
            icon={<CheckCircle2 size={18} />}
            title="Working Cells"
            value={workingCells}
            success
          />

          <KpiCard
            icon={<CalendarDays size={18} />}
            title="Rest / OFF"
            value={restDayCells}
          />

          <KpiCard
            icon={<AlertTriangle size={18} />}
            title="Unscheduled"
            value={unscheduledCells}
            danger={unscheduledCells > 0}
          />
        </section>

        {unscheduledRows.length > 0 && (
          <section className="mb-4 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 text-red-700" size={18} />
                <div>
                  <p className="text-sm font-black text-red-700">
                    {unscheduledRows.length} missing schedule cell(s) across {unscheduledEmployees} employee(s).
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    OFF and RD are valid rest-day statuses. Blank rows need review.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-red-500/20 px-3 py-1 font-black text-red-700">
                  Understaffed: {understaffedDays}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-bold text-slate-700">
                  Overstaffed: {overstaffedDays}
                </span>
              </div>
            </div>
          </section>
        )}

        {scheduleImportStatus && (
          <section className="mb-4 rounded-3xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700 shadow-sm">
            {scheduleImportStatus}
          </section>
        )}

        {scheduleImportPreview.length > 0 && (
          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-black">Import Preview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Rows: {scheduleImportPreview.length} â€¢ Ready: {importReadyCount} â€¢ Issues: {importIssueCount}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearScheduleImportPreview}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>

                <button
                  onClick={confirmScheduleImport}
                  disabled={importingSchedule || !!publishedSchedule}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importingSchedule ? "Importing" : "Confirm Import"}
                </button>
              </div>
            </div>

            <div className="max-h-[300px] overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="sticky top-0 bg-slate-950 text-left text-slate-500">
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
                    <tr key={index} className="border-t border-slate-100 transition-all duration-200 hover:bg-slate-50">
                      <td className="px-4 py-3">{row.employee_no || "-"}</td>
                      <td className="px-4 py-3 font-bold">{row.excel_name || "-"}</td>
                      <td className="px-4 py-3 font-bold text-slate-950">
                        {row.matched_employee_name || "-"}
                      </td>
                      <td className="px-4 py-3">{row.day || "-"}</td>
                      <td className="px-4 py-3">{row.shift}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            row.matched
                              ? "border border-blue-200 bg-blue-50 text-blue-700"
                              : "border border-red-200 bg-red-50 text-red-700"
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

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Schedule Board</h2>
              <p className="mt-1 text-sm text-slate-500">
                {publishedSchedule ? "Published schedule is locked." : "Editable schedule grid."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                Working: {workingCells}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                Leave: {leaveCells}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                Rest/OFF: {restDayCells}
              </span>
              {publishedSchedule && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  Locked
                </span>
              )}
            </div>
          </div>

          <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200">
            <div className="w-full overflow-x-auto overflow-y-auto">
              <div className={viewMode === "weekly" ? "min-w-[1180px]" : "w-max"}>
                <div
                  className="grid bg-slate-50 text-sm font-black text-slate-700"
                  style={{ gridTemplateColumns: tableGridColumns }}
                >
                  <div className="sticky left-0 z-30 border-r border-slate-200 bg-slate-50 px-4 py-4">
                    Staff Name
                  </div>

                  {visibleDays.map((day) => {
                    const isToday = day.key === formatDateKey(new Date());

                    return (
                      <div
                        key={day.key}
                        ref={isToday ? todayColumnRef : null}
                        className={`border-r border-slate-200 px-4 py-4 text-center last:border-r-0 ${
                          isToday ? "border border-blue-200 bg-blue-50 text-blue-700" : ""
                        }`}
                      >
                        <div>{day.dayName}</div>
                        <div className="mt-1 text-xs font-normal text-slate-500">
                          {day.dateLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="grid border-t border-slate-100 text-sm transition-all duration-200 hover:bg-slate-50"
                    style={{ gridTemplateColumns: tableGridColumns }}
                  >
                    <div className="sticky left-0 z-20 border-r border-slate-200 bg-white px-4 py-3">
                      <p className="font-black">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {employee.position || "-"} â€¢ {employee.employee_no || "-"}
                      </p>
                    </div>

                    {visibleDays.map((day) => {
                      const currentShift = getShift(employee.id, day.key);
                      const override = getScheduleOverride(employee.id, day.key);
                      const effectiveShift = getEffectiveShift(employee.id, day.key);
                      const selectShiftValue =
                        currentShift === UNSCHEDULED_SHIFT ? "OFF" : currentShift;
                      const onLeave = isEmployeeOnLeave(employee, day.key);

                      return (
                        <div
                          key={`${employee.id}-${day.key}`}
                          className="border-r border-slate-100 px-2 py-2 last:border-r-0"
                        >
                          {onLeave ? (
                            <div className="rounded-xl border border-red-500/40 bg-red-500/15 px-2 py-2 text-center text-xs font-black text-red-700">
                              LEAVE
                              <div className="mt-1 text-[10px] font-normal text-red-700">
                                {getLeaveType(employee, day.key)}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <select
                                value={selectShiftValue}
                                disabled={!!publishedSchedule}
                                onChange={(e) =>
                                  updateSchedule(employee.id, day.key, e.target.value)
                                }
                                className={`block rounded-xl border px-2 py-2 text-center text-xs font-black outline-none disabled:cursor-not-allowed disabled:opacity-70 ${
                                  viewMode === "weekly" ? "w-full" : "w-[88px]"
                                } ${getShiftColorClass(selectShiftValue)}`}
                              >
                                {shifts.map((shift) => (
                                  <option
                                    key={shift.shift_name}
                                    value={shift.shift_name}
                                    className="bg-white text-slate-900"
                                  >
                                    {getShortShiftLabel(shift.shift_name)}
                                  </option>
                                ))}

                                {isTimeRangeShift(selectShiftValue) &&
                                  !shifts.some((shift) => shift.shift_name === selectShiftValue) && (
                                    <option value={selectShiftValue} className="bg-white text-slate-900">
                                      {selectShiftValue}
                                    </option>
                                  )}

                                {!shifts.some((shift) => shift.shift_name === "OFF") && (
                                  <option value="OFF">OFF</option>
                                )}

                                {!shifts.some((shift) => shift.shift_name === "RD") && (
                                  <option value="RD">RD</option>
                                )}
                              </select>

                              <button
                                type="button"
                                disabled={!!publishedSchedule}
                                onClick={() => openOverrideModal(employee.id, day.key)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-600 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Override
                              </button>

                              {override && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-center">
                                  <p className="text-[10px] font-black text-amber-700">
                                    {effectiveShift} â€¢ Override
                                  </p>
                                  <p className="mt-0.5 truncate text-[9px] font-semibold text-amber-700" title={override.reason}>
                                    {override.reason}
                                  </p>
                                  {!publishedSchedule && (
                                    <button
                                      type="button"
                                      onClick={() => clearScheduleOverride(employee.id, day.key)}
                                      className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-700 hover:underline"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              )}

                              {currentShift === UNSCHEDULED_SHIFT && (
                                <p className="text-center text-[10px] font-bold text-red-700">
                                  Unscheduled
                                </p>
                              )}

                              {currentShift === "OFF" && (
                                <p className="text-center text-[10px] font-bold text-slate-500">
                                  OFF / Rest day
                                </p>
                              )}

                              {currentShift === "RD" && (
                                <p className="text-center text-[10px] font-bold text-slate-500">
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
                  color="text-blue-300"
                />

                <SummaryRow
                  label="Required HC"
                  values={requiredHC}
                  tableGridColumns={tableGridColumns}
                  color="text-slate-200"
                />

                <SummaryRow
                  label="Coverage Gap"
                  values={coverageGap.map((gap) =>
                    gap > 0 ? `+${gap}` : String(gap)
                  )}
                  tableGridColumns={tableGridColumns}
                  color="text-slate-200"
                />

                <SummaryRow
                  label="Recommendation"
                  values={recommendationText}
                  tableGridColumns={tableGridColumns}
                  color="text-slate-300"
                />
              </div>
            </div>
          </div>
        </section>

        {unscheduledRows.length > 0 && (
          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Unscheduled Review</h2>
                <p className="mt-1 text-sm text-slate-500">
                  First 80 blank schedule cells that need assignment or intentional OFF/RD.
                </p>
              </div>
            </div>

            <div className="max-h-56 overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 bg-slate-950 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Issue</th>
                  </tr>
                </thead>

                <tbody>
                  {unscheduledRows.slice(0, 80).map((row) => (
                    <tr key={row.key} className="border-t border-slate-100 transition-all duration-200 hover:bg-slate-50">
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
                        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                          Missing Schedule Row
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}


        {overrideModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
            <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Schedule Override
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Override Shift
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Original shift is preserved. Payroll should use this approved override when present.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeOverrideModal}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Employee
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    {getEmployeeDisplayName(overrideEmployeeId)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Date
                  </p>
                  <p className="mt-1 font-black text-slate-950">{overrideDay || "-"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Original Assigned Shift
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    {overrideOriginalShift || "No schedule row"}
                  </p>
                </div>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Override Start
                  </span>
                  <input
                    type="time"
                    value={overrideStart}
                    onChange={(event) => setOverrideStart(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Override End
                  </span>
                  <input
                    type="time"
                    value={overrideEnd}
                    onChange={(event) => setOverrideEnd(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Reason / Approval Note
                  </span>
                  <textarea
                    value={overrideReason}
                    onChange={(event) => setOverrideReason(event.target.value)}
                    rows={3}
                    placeholder="Example: Approved late start by manager."
                    className="mt-2 min-h-[96px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeOverrideModal}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveScheduleOverride}
                  disabled={savingOverride}
                  className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingOverride ? "Saving..." : "Save Override"}
                </button>
              </div>
            </section>
          </div>
        )}

      </main>
      <OpscoreAssistant reminders={opscoreReminders} />
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
          {icon}
        </div>
        <span
          className={[
            "rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
            danger
              ? "border-red-200 bg-red-50 text-red-700"
              : success
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {danger ? "Review" : success ? "Good" : "Neutral"}
        </span>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2
        className={[
          "mt-2 text-3xl font-black tracking-tight",
          danger ? "text-red-700" : "text-slate-950",
        ].join(" ")}
      >
        {value}
      </h2>

      {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
    </div>
  );
}

function SummaryRow({ label, values, tableGridColumns }: any) {
  return (
    <div
      className="grid border-t border-slate-100 bg-slate-50 text-sm font-black"
      style={{ gridTemplateColumns: tableGridColumns }}
    >
      <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-50 px-4 py-4 text-slate-700">
        {label}
      </div>

      {values.map((value: any, index: number) => (
        <div
          key={`${label}-${index}`}
          className="border-r border-slate-200 px-4 py-4 text-center text-slate-700 last:border-r-0"
        >
          {value}
        </div>
      ))}
    </div>
  );
}





