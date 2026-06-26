"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  Download,
  FileText,
  History,
  MessageSquarePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
type Employee = {
  id: string;
  employee_no?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  position?: string | null;
  employment_status?: string | null;
};

type AttendanceEntry = {
  id?: string;
  employee_id: string;
  attendance_date: string;
  scheduled_shift?: string | null;
  time_in?: string | null;
  time_out?: string | null;
  late_minutes?: number | null;
  undertime_minutes?: number | null;
  ot_minutes?: number | null;
  status?: string | null;
  remarks?: string | null;
};

type Schedule = {
  id?: string | number;
  employee_id: string;
  day: string;
  shift?: string | null;
};

type LeaveRequest = {
  id?: string | number;
  employee_id: string;
  leave_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  status?: string | null;
};

type KpiSetting = {
  id?: string;
  metric_key: string;
  metric_label: string;
  category: string;
  deduction_points: number;
  weight_percent: number;
  applies_to_department: string;
  is_enabled: boolean;
};

type PerformanceHistory = {
  id: string;
  employee_id: string;
  score: number;
  period_start?: string | null;
  period_end?: string | null;
  breakdown?: any;
  created_at?: string | null;
};

type CoachingLog = {
  id: string;
  employee_id: string;
  coach_name?: string | null;
  reason?: string | null;
  action_plan?: string | null;
  followup_date?: string | null;
  created_at?: string | null;
};

type ScoreBreakdown = {
  metricKey: string;
  metricLabel: string;
  category: string;
  count: number;
  deductionPoints: number;
  totalDeduction: number;
  weightPercent: number;
};

type EmployeeScore = {
  employee: Employee;
  score: number;
  label: string;
  department: string;
  totalDeduction: number;
  breakdown: ScoreBreakdown[];
  lateCount: number;
  undertimeCount: number;
  absentCount: number;
  missingTimeoutCount: number;
  noScheduleCount: number;
  reviewFlagCount: number;
  approvedLeaveDays: number;
  attendanceRows: number;
  latestHistoryScore: number | null;
  previousHistoryScore: number | null;
  trendDelta: number;
  coachingLogs: CoachingLog[];
  history: PerformanceHistory[];
};

type CoachingForm = {
  coach_name: string;
  reason: string;
  action_plan: string;
  followup_date: string;
};

const emptyCoachingForm: CoachingForm = {
  coach_name: "",
  reason: "",
  action_plan: "",
  followup_date: "",
};

export default function PerformanceMonitoringPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceEntry[]>(
    [],
  );
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [kpiSettings, setKpiSettings] = useState<KpiSetting[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<
    PerformanceHistory[]
  >([]);
  const [coachingLogs, setCoachingLogs] = useState<CoachingLog[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(() => getDefaultStartDate());
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [savingCoaching, setSavingCoaching] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [coachingForm, setCoachingForm] =
    useState<CoachingForm>(emptyCoachingForm);

  /// HELPERS
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  }

  const normalizeText = (value?: string | null) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const normalizeMetricKey = (value?: string | null) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const getEmployeeName = (employee: Employee) =>
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    "Unnamed Employee";

  const isActiveEmployee = (employee: Employee) => {
    const status = normalizeText(employee.employment_status);
    return !["resigned", "terminated", "inactive", "awol"].includes(status);
  };

  const isSameEmployee = (a: any, b: any) =>
    String(a || "") === String(b || "");

  const isNoScheduleShift = (shift?: string | null) => {
    const normalized = String(shift || "").toUpperCase();
    return !normalized || normalized === "OFF";
  };

  const isRestDayShift = (shift?: string | null) =>
    String(shift || "").toUpperCase() === "RD";

  const getScoreLabel = (score: number) => {
    if (score >= 95) return "Excellent";
    if (score >= 90) return "Very Good";
    if (score >= 80) return "Good";
    if (score >= 75) return "Fair";
    return "Needs Coaching";
  };

  const getScoreClass = (score: number) => {
    if (score >= 95) return "text-emerald-400";
    if (score >= 90) return "text-blue-400";
    if (score >= 80) return "text-cyan-400";
    if (score >= 75) return "text-yellow-400";
    return "text-red-400";
  };

  const getBadgeClass = (score: number) => {
    if (score >= 95) return "bg-emerald-500/10 text-emerald-400";
    if (score >= 90) return "bg-blue-500/10 text-blue-400";
    if (score >= 80) return "bg-cyan-500/10 text-cyan-400";
    if (score >= 75) return "bg-yellow-500/10 text-yellow-400";
    return "bg-red-500/10 text-red-400";
  };

  const getTrendClass = (delta: number) => {
    if (delta > 0) return "text-emerald-400";
    if (delta < 0) return "text-red-400";
    return "text-slate-400";
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "No date";
    return new Date(value).toLocaleDateString("en-PH", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getApplicableKpiRules = (department: string) => {
    const enabled = kpiSettings.filter((row) => row.is_enabled);
    const rulesByKey = new Map<string, KpiSetting>();

    enabled.forEach((row) => {
      const key = normalizeMetricKey(row.metric_key);
      const appliesTo = row.applies_to_department || "ALL";
      if (!key) return;
      if (appliesTo !== "ALL" && appliesTo !== department) return;

      const existing = rulesByKey.get(key);
      const isDepartmentOverride = appliesTo === department;
      const existingIsOverride = existing?.applies_to_department === department;

      if (!existing || (isDepartmentOverride && !existingIsOverride)) {
        rulesByKey.set(key, { ...row, metric_key: key });
      }
    });

    return Array.from(rulesByKey.values()).sort((a, b) => {
      const categoryCompare = String(a.category || "").localeCompare(
        String(b.category || ""),
      );
      if (categoryCompare !== 0) return categoryCompare;
      return String(a.metric_label || "").localeCompare(
        String(b.metric_label || ""),
      );
    });
  };

  const getMetricCount = (key: string, counts: Record<string, number>) => {
    const normalized = normalizeMetricKey(key);
    if (counts[normalized] !== undefined) return counts[normalized];

    if (normalized.includes("late")) return counts.late;
    if (normalized.includes("undertime") || normalized.includes("under_time"))
      return counts.undertime;
    if (normalized.includes("absent")) return counts.absent;
    if (
      normalized.includes("missing") ||
      normalized.includes("timeout") ||
      normalized.includes("time_out")
    )
      return counts.missing_timeout;
    if (
      normalized.includes("no_schedule") ||
      normalized.includes("off") ||
      normalized.includes("schedule")
    )
      return counts.no_schedule;
    if (normalized.includes("review") || normalized.includes("flag"))
      return counts.review_flag;
    if (normalized.includes("leave")) return counts.approved_leave;
    if (normalized.includes("attendance")) return counts.attendance_rows;

    return 0;
  };

  /// LOADERS
  const loadPerformanceData = async () => {
    setLoading(true);

    const [
      employeeResult,
      attendanceResult,
      scheduleResult,
      leaveResult,
      kpiResult,
      historyResult,
      coachingResult,
    ] = await Promise.all([
      supabase
        .from("employees")
        .select("*")
        .order("department")
        .order("first_name"),
      supabase
        .from("attendance_entries")
        .select("*")
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate),
      supabase
        .from("schedules")
        .select("*")
        .gte("day", startDate)
        .lte("day", endDate),
      supabase
        .from("leave_requests")
        .select("*")
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("performance_kpi_settings")
        .select("*")
        .order("category", { ascending: true })
        .order("metric_label", { ascending: true }),
      supabase
        .from("performance_history")
        .select("*")
        .order("period_end", { ascending: false })
        .limit(2000),
      supabase
        .from("employee_coaching_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    if (employeeResult.error)
      console.log("PERFORMANCE EMPLOYEES ERROR:", employeeResult.error.message);
    if (attendanceResult.error)
      console.log(
        "PERFORMANCE ATTENDANCE ERROR:",
        attendanceResult.error.message,
      );
    if (scheduleResult.error)
      console.log("PERFORMANCE SCHEDULE ERROR:", scheduleResult.error.message);
    if (leaveResult.error)
      console.log("PERFORMANCE LEAVE ERROR:", leaveResult.error.message);
    if (kpiResult.error)
      console.log("PERFORMANCE KPI SETTINGS ERROR:", kpiResult.error.message);
    if (historyResult.error)
      console.log("PERFORMANCE HISTORY ERROR:", historyResult.error.message);
    if (coachingResult.error)
      console.log("PERFORMANCE COACHING ERROR:", coachingResult.error.message);

    setEmployees(employeeResult.data || []);
    setAttendanceEntries(attendanceResult.data || []);
    setSchedules(scheduleResult.data || []);
    setLeaveRequests(leaveResult.data || []);
    setKpiSettings(kpiResult.data || []);
    setPerformanceHistory(historyResult.data || []);
    setCoachingLogs(coachingResult.data || []);
    setLoading(false);
  };

  /// EFFECTS
  useEffect(() => {
    loadPerformanceData();
  }, [startDate, endDate]);

  /// CALCULATIONS
  const activeEmployees = useMemo(
    () => employees.filter(isActiveEmployee),
    [employees],
  );

  const departments = useMemo(() => {
    const list = activeEmployees
      .map((employee) => String(employee.department || "Unassigned").trim())
      .filter(Boolean);

    return Array.from(new Set(list)).sort();
  }, [activeEmployees]);

  const selectedRules = useMemo(() => {
    if (selectedDepartment === "ALL")
      return kpiSettings.filter(
        (row) => row.is_enabled && row.applies_to_department === "ALL",
      );
    return getApplicableKpiRules(selectedDepartment);
  }, [kpiSettings, selectedDepartment]);

  const activeRulesCount = selectedRules.length;
  const activeWeight = selectedRules.reduce(
    (sum, row) => sum + Number(row.weight_percent || 0),
    0,
  );
  const departmentOverrideCount = kpiSettings.filter(
    (row) => row.applies_to_department !== "ALL",
  ).length;
  const disabledRulesCount = kpiSettings.filter(
    (row) => !row.is_enabled,
  ).length;

  const employeeScores: EmployeeScore[] = useMemo(() => {
    return activeEmployees.map((employee) => {
      const employeeId = String(employee.id);
      const employeeNo = String(employee.employee_no || "");
      const department = employee.department || "Unassigned";

      const employeeAttendance = attendanceEntries.filter((entry) =>
        isSameEmployee(entry.employee_id, employeeId),
      );
      const employeeSchedules = schedules.filter((schedule) =>
        isSameEmployee(schedule.employee_id, employeeId),
      );
      const employeeLeaves = leaveRequests.filter(
        (leave) =>
          isSameEmployee(leave.employee_id, employeeId) ||
          isSameEmployee(leave.employee_id, employeeNo),
      );
      const employeeHistory = performanceHistory
        .filter((row) => isSameEmployee(row.employee_id, employeeId))
        .sort((a, b) =>
          String(b.period_end || b.created_at || "").localeCompare(
            String(a.period_end || a.created_at || ""),
          ),
        );
      const employeeCoaching = coachingLogs.filter((row) =>
        isSameEmployee(row.employee_id, employeeId),
      );

      const lateCount = employeeAttendance.filter(
        (entry) => Number(entry.late_minutes || 0) > 0,
      ).length;
      const undertimeCount = employeeAttendance.filter(
        (entry) => Number(entry.undertime_minutes || 0) > 0,
      ).length;
      const absentCount = employeeAttendance.filter(
        (entry) => normalizeText(entry.status) === "absent",
      ).length;
      const missingTimeoutCount = employeeAttendance.filter(
        (entry) => !!entry.time_in && !entry.time_out,
      ).length;
      const noScheduleCount = employeeSchedules.filter((schedule) => {
        if (isRestDayShift(schedule.shift)) return false;
        return isNoScheduleShift(schedule.shift);
      }).length;
      const reviewFlagCount = employeeAttendance.filter((entry) => {
        const status = normalizeText(entry.status);
        const remarks = normalizeText(entry.remarks);
        return (
          status.includes("review") ||
          status.includes("pending") ||
          remarks.includes("review") ||
          remarks.includes("issue")
        );
      }).length;
      const approvedLeaveDays = employeeLeaves
        .filter((leave) => normalizeText(leave.status) === "approved")
        .reduce((sum, leave) => sum + Number(leave.days || 0), 0);

      const metricCounts: Record<string, number> = {
        late: lateCount,
        late_occurrence: lateCount,
        undertime: undertimeCount,
        undertime_occurrence: undertimeCount,
        absent: absentCount,
        absent_occurrence: absentCount,
        missing_timeout: missingTimeoutCount,
        missing_timeout_occurrence: missingTimeoutCount,
        no_schedule: noScheduleCount,
        no_schedule_off: noScheduleCount,
        review_flag: reviewFlagCount,
        payroll_attendance_review_flag: reviewFlagCount,
        approved_leave: approvedLeaveDays,
        attendance_rows: employeeAttendance.length,
      };

      const rules = getApplicableKpiRules(department);
      const breakdown = rules.map((rule) => {
        const key = normalizeMetricKey(rule.metric_key);
        const count = Number(getMetricCount(key, metricCounts) || 0);
        const deductionPoints = Number(rule.deduction_points || 0);
        const totalDeduction = count * deductionPoints;

        return {
          metricKey: key,
          metricLabel: rule.metric_label || key,
          category: rule.category || "Custom",
          count,
          deductionPoints,
          totalDeduction,
          weightPercent: Number(rule.weight_percent || 0),
        };
      });

      const totalDeduction = breakdown.reduce(
        (sum, item) => sum + item.totalDeduction,
        0,
      );
      const score = Math.max(
        0,
        Math.min(100, Math.round(100 - totalDeduction)),
      );
      const latestHistoryScore = employeeHistory[0]
        ? Number(employeeHistory[0].score || 0)
        : null;
      const previousHistoryScore = employeeHistory[1]
        ? Number(employeeHistory[1].score || 0)
        : null;
      const trendBase = latestHistoryScore ?? score;
      const trendDelta =
        previousHistoryScore === null ? 0 : trendBase - previousHistoryScore;

      return {
        employee,
        department,
        score,
        label: getScoreLabel(score),
        totalDeduction,
        breakdown,
        lateCount,
        undertimeCount,
        absentCount,
        missingTimeoutCount,
        noScheduleCount,
        reviewFlagCount,
        approvedLeaveDays,
        attendanceRows: employeeAttendance.length,
        latestHistoryScore,
        previousHistoryScore,
        trendDelta,
        coachingLogs: employeeCoaching,
        history: employeeHistory,
      };
    });
  }, [
    activeEmployees,
    attendanceEntries,
    schedules,
    leaveRequests,
    kpiSettings,
    performanceHistory,
    coachingLogs,
  ]);

  const filteredScores = useMemo(() => {
    return employeeScores.filter((item) => {
      const searchable =
        `${item.employee.employee_no || ""} ${getEmployeeName(item.employee)} ${item.department} ${item.employee.position || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesDepartment =
        selectedDepartment === "ALL" || item.department === selectedDepartment;
      return searchable && matchesDepartment;
    });
  }, [employeeScores, searchTerm, selectedDepartment]);

  const selectedEmployeeScore = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return (
      employeeScores.find((item) => item.employee.id === selectedEmployeeId) ||
      null
    );
  }, [employeeScores, selectedEmployeeId]);

  const sortedByScore = [...filteredScores].sort((a, b) => b.score - a.score);
  const topPerformers = sortedByScore.slice(0, 5);
  const needsCoaching = [...filteredScores]
    .filter((item) => item.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const overallScore =
    filteredScores.length > 0
      ? Math.round(
          filteredScores.reduce((sum, item) => sum + item.score, 0) /
            filteredScores.length,
        )
      : 0;

  const excellentCount = filteredScores.filter(
    (item) => item.score >= 95,
  ).length;
  const coachingCount = filteredScores.filter((item) => item.score < 75).length;
  const totalLate = filteredScores.reduce(
    (sum, item) => sum + item.lateCount,
    0,
  );
  const totalUndertime = filteredScores.reduce(
    (sum, item) => sum + item.undertimeCount,
    0,
  );
  const totalAbsent = filteredScores.reduce(
    (sum, item) => sum + item.absentCount,
    0,
  );
  const totalMissingTimeout = filteredScores.reduce(
    (sum, item) => sum + item.missingTimeoutCount,
    0,
  );

  const departmentScores = departments
    .map((department) => {
      const items = employeeScores.filter(
        (item) => item.department === department,
      );
      const average =
        items.length > 0
          ? Math.round(
              items.reduce((sum, item) => sum + item.score, 0) / items.length,
            )
          : 0;

      return {
        department,
        average,
        employees: items.length,
        coaching: items.filter((item) => item.score < 75).length,
        late: items.reduce((sum, item) => sum + item.lateCount, 0),
        absent: items.reduce((sum, item) => sum + item.absentCount, 0),
      };
    })
    .sort((a, b) => b.average - a.average);

  const departmentChampion = departmentScores[0] || null;
  const lowestScoreEmployee =
    [...filteredScores].sort((a, b) => a.score - b.score)[0] || null;
  const mostImprovedEmployee =
    [...filteredScores].sort((a, b) => b.trendDelta - a.trendDelta)[0] || null;

  const deductionTotals = useMemo(() => {
    const totals = new Map<string, number>();
    filteredScores.forEach((employee) => {
      employee.breakdown.forEach((row) => {
        totals.set(
          row.metricLabel,
          (totals.get(row.metricLabel) || 0) + row.totalDeduction,
        );
      });
    });
    return Array.from(totals.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredScores]);

  const highestDeductionType = deductionTotals[0] || null;

  /// ACTIONS
  const savePerformanceSnapshot = async () => {
    if (filteredScores.length === 0) {
      alert("No employees to snapshot.");
      return;
    }

    const confirmSave = window.confirm(
      `Save performance snapshot for ${filteredScores.length} employee(s)?`,
    );
    if (!confirmSave) return;

    setSavingSnapshot(true);

    const payload = filteredScores.map((item) => ({
      employee_id: item.employee.id,
      score: item.score,
      period_start: startDate,
      period_end: endDate,
      breakdown: {
        label: item.label,
        totalDeduction: item.totalDeduction,
        lateCount: item.lateCount,
        undertimeCount: item.undertimeCount,
        absentCount: item.absentCount,
        missingTimeoutCount: item.missingTimeoutCount,
        noScheduleCount: item.noScheduleCount,
        reviewFlagCount: item.reviewFlagCount,
        rules: item.breakdown,
      },
    }));

    const { error } = await supabase
      .from("performance_history")
      .insert(payload);

    if (error) {
      console.log("SAVE PERFORMANCE SNAPSHOT ERROR:", error.message);
      alert(error.message);
      setSavingSnapshot(false);
      return;
    }

    setSavingSnapshot(false);
    await loadPerformanceData();
    alert("Performance snapshot saved.");
  };

  const saveCoachingLog = async () => {
    if (!selectedEmployeeScore) return;
    if (!coachingForm.reason.trim() || !coachingForm.action_plan.trim()) {
      alert("Please add reason and action plan.");
      return;
    }

    setSavingCoaching(true);

    const { error } = await supabase.from("employee_coaching_logs").insert({
      employee_id: selectedEmployeeScore.employee.id,
      coach_name: coachingForm.coach_name.trim() || null,
      reason: coachingForm.reason.trim(),
      action_plan: coachingForm.action_plan.trim(),
      followup_date: coachingForm.followup_date || null,
    });

    if (error) {
      console.log("SAVE COACHING LOG ERROR:", error.message);
      alert(error.message);
      setSavingCoaching(false);
      return;
    }

    setCoachingForm(emptyCoachingForm);
    setSavingCoaching(false);
    await loadPerformanceData();
  };

  const exportEmployeeReport = (item: EmployeeScore) => {
    const rows = item.breakdown
      .map(
        (row) => `
          <tr>
            <td>${row.metricLabel}</td>
            <td>${row.category}</td>
            <td>${row.count}</td>
            <td>${row.deductionPoints}</td>
            <td>${row.totalDeduction}</td>
          </tr>`,
      )
      .join("");

    const historyRows = item.history
      .slice(0, 10)
      .map(
        (row) => `
          <tr>
            <td>${formatDate(row.period_start)}</td>
            <td>${formatDate(row.period_end)}</td>
            <td>${row.score}</td>
          </tr>`,
      )
      .join("");

    const coachingRows = item.coachingLogs
      .map(
        (row) => `
          <tr>
            <td>${formatDate(row.created_at)}</td>
            <td>${row.coach_name || "-"}</td>
            <td>${row.reason || "-"}</td>
            <td>${row.action_plan || "-"}</td>
            <td>${formatDate(row.followup_date)}</td>
          </tr>`,
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Performance Report - ${getEmployeeName(item.employee)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
            h1, h2 { margin-bottom: 6px; }
            .muted { color: #64748b; }
            .score { font-size: 42px; font-weight: 900; margin: 16px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
            .line { border-top: 1px solid #0f172a; width: 220px; padding-top: 8px; text-align: center; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print / Save as PDF</button>
          <h1>Employee Performance Report</h1>
          <p class="muted">Period: ${formatDate(startDate)} to ${formatDate(endDate)}</p>
          <h2>${getEmployeeName(item.employee)}</h2>
          <p class="muted">${item.employee.employee_no || "No employee no"} Ã¢â‚¬Â¢ ${item.department} Ã¢â‚¬Â¢ ${item.employee.position || "No position"}</p>
          <div class="score">${item.score} / 100 - ${item.label}</div>
          <div class="grid">
            <div class="card"><b>Late</b><br>${item.lateCount}</div>
            <div class="card"><b>Undertime</b><br>${item.undertimeCount}</div>
            <div class="card"><b>Absent</b><br>${item.absentCount}</div>
            <div class="card"><b>Missing Timeout</b><br>${item.missingTimeoutCount}</div>
            <div class="card"><b>No Schedule / OFF</b><br>${item.noScheduleCount}</div>
            <div class="card"><b>Review Flags</b><br>${item.reviewFlagCount}</div>
          </div>
          <h2>Deduction Breakdown</h2>
          <table>
            <thead><tr><th>KPI Rule</th><th>Category</th><th>Count</th><th>Deduct</th><th>Total</th></tr></thead>
            <tbody>${rows || "<tr><td colspan='5'>No KPI rules.</td></tr>"}</tbody>
          </table>
          <h2>Performance History</h2>
          <table>
            <thead><tr><th>Start</th><th>End</th><th>Score</th></tr></thead>
            <tbody>${historyRows || "<tr><td colspan='3'>No saved history.</td></tr>"}</tbody>
          </table>
          <h2>Coaching Logs</h2>
          <table>
            <thead><tr><th>Date</th><th>Coach</th><th>Reason</th><th>Action Plan</th><th>Follow Up</th></tr></thead>
            <tbody>${coachingRows || "<tr><td colspan='5'>No coaching logs.</td></tr>"}</tbody>
          </table>
          <div class="signature">
            <div class="line">Employee Signature</div>
            <div class="line">Manager Signature</div>
          </div>
        </body>
      </html>`;

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return;
    reportWindow.document.write(html);
    reportWindow.document.close();
  };

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
<main className="min-w-0 flex-1 overflow-x-hidden p-6 xl:p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Operations Intelligence
            </p>
            <h1 className="mt-2 text-4xl font-black">
              Performance Monitoring V3
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Dynamic scoring, KPI profile, employee breakdown, performance
              history, coaching logs, PDF report, and snapshot tracking.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={savePerformanceSnapshot}
              disabled={savingSnapshot || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
            >
              <History size={18} />
              {savingSnapshot ? "Saving..." : "Save Snapshot"}
            </button>
            <button
              onClick={loadPerformanceData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <RefreshCw size={18} />
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<BarChart3 size={22} />}
            title="Overall Score"
            value={overallScore}
            helper={getScoreLabel(overallScore)}
            score={overallScore}
          />
          <MetricCard
            icon={<Users size={22} />}
            title="Employees Scored"
            value={filteredScores.length}
            helper="active employees"
          />
          <MetricCard
            icon={<Award size={22} />}
            title="Excellent"
            value={excellentCount}
            helper="95 and above"
            success
          />
          <MetricCard
            icon={<AlertTriangle size={22} />}
            title="Needs Coaching"
            value={coachingCount}
            helper="below 75 only"
            danger={coachingCount > 0}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            icon={<TrendingUp size={20} />}
            title="Most Improved"
            value={
              mostImprovedEmployee
                ? getEmployeeName(mostImprovedEmployee.employee)
                : "No data"
            }
            helper={
              mostImprovedEmployee
                ? `${mostImprovedEmployee.trendDelta >= 0 ? "+" : ""}${mostImprovedEmployee.trendDelta} pts from last snapshot`
                : "save snapshots first"
            }
          />
          <InsightCard
            icon={<TrendingDown size={20} />}
            title="Lowest Score"
            value={
              lowestScoreEmployee
                ? getEmployeeName(lowestScoreEmployee.employee)
                : "No data"
            }
            helper={
              lowestScoreEmployee
                ? `${lowestScoreEmployee.score} Ã¢â‚¬Â¢ ${lowestScoreEmployee.department}`
                : "no records"
            }
            danger={!!lowestScoreEmployee && lowestScoreEmployee.score < 75}
          />
          <InsightCard
            icon={<Target size={20} />}
            title="Highest Deduction"
            value={
              highestDeductionType
                ? highestDeductionType.label
                : "No deductions"
            }
            helper={
              highestDeductionType
                ? `${highestDeductionType.total} total points`
                : "all clean"
            }
          />
          <InsightCard
            icon={<Trophy size={20} />}
            title="Department Champion"
            value={
              departmentChampion ? departmentChampion.department : "No data"
            }
            helper={
              departmentChampion
                ? `${departmentChampion.average} average score`
                : "no departments"
            }
            success
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black">KPI Profile</h2>
                <p className="text-sm text-slate-400">
                  Active database rules used for the selected department.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-blue-500/10 px-3 py-2 text-blue-300">
                  Active Rules: {activeRulesCount}
                </span>
                <span
                  className={`rounded-full px-3 py-2 ${activeWeight === 100 ? "bg-emerald-500/10 text-emerald-300" : "bg-yellow-500/10 text-yellow-300"}`}
                >
                  Weight: {activeWeight}%
                </span>
                <span className="rounded-full bg-purple-500/10 px-3 py-2 text-purple-300">
                  Overrides: {departmentOverrideCount}
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-2 text-slate-300">
                  Disabled: {disabledRulesCount}
                </span>
              </div>
            </div>

            {selectedRules.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectedRules.map((rule) => (
                  <div
                    key={`${rule.metric_key}-${rule.applies_to_department}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {rule.category}
                    </p>
                    <h3 className="mt-1 text-sm font-black text-white">
                      {rule.metric_label}
                    </h3>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>
                        Deduct {Number(rule.deduction_points || 0)} pts
                      </span>
                      <span>{Number(rule.weight_percent || 0)}% weight</span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {rule.applies_to_department || "ALL"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                No active KPI rules found. Go to Performance KPI Settings and
                enable at least one rule.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <Database className="text-amber-400" size={24} />
              <div>
                <h2 className="text-xl font-black">Scoring Source</h2>
                <p className="text-sm text-slate-400">Database connected</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <SourceRow
                label="KPI Rules"
                value="performance_kpi_settings"
                good
              />
              <SourceRow label="Attendance" value="attendance_entries" good />
              <SourceRow label="Schedules" value="schedules" good />
              <SourceRow label="Leaves" value="leave_requests" good />
              <SourceRow label="History" value="performance_history" good />
              <SourceRow label="Coaching" value="employee_coaching_logs" good />
              <SourceRow
                label="Payroll Snapshots"
                value="removed from scoring"
              />
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<TrendingDown size={22} />}
            title="Late"
            value={totalLate}
            helper="occurrences"
          />
          <MetricCard
            icon={<TrendingDown size={22} />}
            title="Undertime"
            value={totalUndertime}
            helper="occurrences"
          />
          <MetricCard
            icon={<AlertTriangle size={22} />}
            title="Absent"
            value={totalAbsent}
            helper="occurrences"
            danger={totalAbsent > 0}
          />
          <MetricCard
            icon={<AlertTriangle size={22} />}
            title="Missing Timeout"
            value={totalMissingTimeout}
            helper="records"
            danger={totalMissingTimeout > 0}
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Search Employee
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                <Search size={18} className="text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search name, employee no, department..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Start
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  End
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <RankingCard
            title="Top Performers"
            icon={<TrendingUp size={20} />}
            items={topPerformers}
            empty="No employee scores found."
            onOpen={setSelectedEmployeeId}
          />
          <RankingCard
            title="Needs Coaching"
            icon={<AlertTriangle size={20} />}
            items={needsCoaching}
            empty="No employee below 75."
            onOpen={setSelectedEmployeeId}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <Building2 className="text-amber-400" size={24} />
              <div>
                <h2 className="text-xl font-black">Department Ranking</h2>
                <p className="text-sm text-slate-400">
                  Average score by department.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {departmentScores.map((item, index) => (
                <div
                  key={item.department}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-amber-400">
                        #{index + 1}
                      </p>
                      <h3 className="font-black">{item.department}</h3>
                      <p className="text-xs text-slate-500">
                        {item.employees} employee(s)
                      </p>
                    </div>
                    <span
                      className={`text-2xl font-black ${getScoreClass(item.average)}`}
                    >
                      {item.average}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <MiniStat
                      label="Coaching"
                      value={item.coaching}
                      danger={item.coaching > 0}
                    />
                    <MiniStat label="Late" value={item.late} />
                    <MiniStat
                      label="Absent"
                      value={item.absent}
                      danger={item.absent > 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 className="text-amber-400" size={24} />
              <div>
                <h2 className="text-xl font-black">Deduction Ranking</h2>
                <p className="text-sm text-slate-400">
                  Highest KPI deduction sources.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {deductionTotals.slice(0, 8).map((item, index) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-slate-950/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">#{index + 1}</p>
                      <p className="font-black">{item.label}</p>
                    </div>
                    <p
                      className={
                        item.total > 0
                          ? "text-xl font-black text-red-300"
                          : "text-xl font-black text-slate-500"
                      }
                    >
                      -{item.total}
                    </p>
                  </div>
                </div>
              ))}
              {deductionTotals.length === 0 && (
                <EmptyBox text="No deduction data." />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Employee Score Breakdown</h2>
              <p className="text-sm text-slate-400">
                Every deduction below is calculated from active KPI database
                rules.
              </p>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-slate-400">
              {filteredScores.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">Rating</th>
                  <th className="px-4 py-3 text-center">Trend</th>
                  <th className="px-4 py-3 text-center">Late</th>
                  <th className="px-4 py-3 text-center">UT</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Missing TO</th>
                  <th className="px-4 py-3 text-center">No Sched</th>
                  <th className="px-4 py-3 text-center">Review</th>
                  <th className="px-4 py-3 text-center">Logs</th>
                  <th className="px-4 py-3">Breakdown</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredScores.map((item) => (
                  <tr
                    key={item.employee.id}
                    className="border-b border-slate-800/70 align-top hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-4">
                      <p className="font-black text-white">
                        {getEmployeeName(item.employee)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.employee.employee_no || "No employee no"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.employee.position || "No position"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {item.department}
                    </td>
                    <td
                      className={`px-4 py-4 text-center text-2xl font-black ${getScoreClass(item.score)}`}
                    >
                      {item.score}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${getBadgeClass(item.score)}`}
                      >
                        {item.label}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-4 text-center font-black ${getTrendClass(item.trendDelta)}`}
                    >
                      {item.previousHistoryScore === null
                        ? "Ã¢â‚¬â€"
                        : `${item.trendDelta >= 0 ? "+" : ""}${item.trendDelta}`}
                    </td>
                    <td className="px-4 py-4 text-center">{item.lateCount}</td>
                    <td className="px-4 py-4 text-center">
                      {item.undertimeCount}
                    </td>
                    <td className="px-4 py-4 text-center text-red-300">
                      {item.absentCount}
                    </td>
                    <td className="px-4 py-4 text-center text-yellow-300">
                      {item.missingTimeoutCount}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {item.noScheduleCount}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {item.reviewFlagCount}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {item.coachingLogs.length}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        {item.breakdown.slice(0, 6).map((row) => (
                          <div
                            key={row.metricKey}
                            className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/70 px-3 py-2 text-xs"
                          >
                            <span className="text-slate-300">
                              {row.metricLabel}
                            </span>
                            <span
                              className={
                                row.totalDeduction > 0
                                  ? "font-black text-red-300"
                                  : "text-slate-500"
                              }
                            >
                              {row.count} Ãƒâ€” {row.deductionPoints} = -
                              {row.totalDeduction}
                            </span>
                          </div>
                        ))}
                        {item.breakdown.length > 6 && (
                          <p className="text-xs text-slate-500">
                            +{item.breakdown.length - 6} more rules
                          </p>
                        )}
                        {item.breakdown.length === 0 && (
                          <p className="text-xs text-slate-500">
                            No active KPI rules.
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => setSelectedEmployeeId(item.employee.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
                      >
                        Open
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredScores.length === 0 && (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-4 py-14 text-center text-slate-500"
                    >
                      No performance records found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selectedEmployeeScore && (
        <EmployeeDrawer
          item={selectedEmployeeScore}
          startDate={startDate}
          endDate={endDate}
          coachingForm={coachingForm}
          setCoachingForm={setCoachingForm}
          savingCoaching={savingCoaching}
          onSaveCoaching={saveCoachingLog}
          onClose={() => setSelectedEmployeeId(null)}
          onExport={() => exportEmployeeReport(selectedEmployeeScore)}
          getEmployeeName={getEmployeeName}
          getScoreClass={getScoreClass}
          getBadgeClass={getBadgeClass}
          getTrendClass={getTrendClass}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  helper,
  score,
  success,
  danger,
}: {
  icon: ReactNode;
  title: string;
  value: string | number;
  helper: string;
  score?: number;
  success?: boolean;
  danger?: boolean;
}) {
  const valueClass = danger
    ? "text-red-400"
    : success
      ? "text-emerald-400"
      : typeof score === "number" && score < 75
        ? "text-red-400"
        : "text-white";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl bg-slate-950 p-3 text-amber-400">{icon}</div>
        {success && <CheckCircle2 size={20} className="text-emerald-400" />}
        {danger && <AlertTriangle size={20} className="text-red-400" />}
      </div>
      <p className="mt-4 text-sm text-slate-400">{title}</p>
      <h3 className={`mt-1 text-3xl font-black ${valueClass}`}>{value}</h3>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  value,
  helper,
  success,
  danger,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  helper: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl bg-slate-950 p-3 text-amber-400">{icon}</div>
        {success && <ShieldCheck size={20} className="text-emerald-400" />}
        {danger && <AlertTriangle size={20} className="text-red-400" />}
      </div>
      <p className="mt-4 text-sm text-slate-400">{title}</p>
      <h3 className="mt-1 truncate text-lg font-black text-white">{value}</h3>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function SourceRow({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/70 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span
        className={`text-right text-xs font-black ${good ? "text-emerald-300" : "text-yellow-300"}`}
      >
        {value}
      </span>
    </div>
  );
}

function RankingCard({
  title,
  icon,
  items,
  empty,
  onOpen,
}: {
  title: string;
  icon: ReactNode;
  items: EmployeeScore[];
  empty: string;
  onOpen: (employeeId: string) => void;
}) {
  const getScoreClass = (score: number) => {
    if (score >= 95) return "text-emerald-400";
    if (score >= 90) return "text-blue-400";
    if (score >= 80) return "text-cyan-400";
    if (score >= 75) return "text-yellow-400";
    return "text-red-400";
  };

  const getEmployeeName = (employee: Employee) =>
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    "Unnamed Employee";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="text-amber-400">{icon}</div>
        <h2 className="text-xl font-black">{title}</h2>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.employee.id}
            onClick={() => onOpen(item.employee.id)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-950/70 p-4 text-left hover:bg-slate-800/60"
          >
            <div>
              <p className="font-black">{getEmployeeName(item.employee)}</p>
              <p className="text-xs text-slate-500">{item.department}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black ${getScoreClass(item.score)}`}>
                {item.score}
              </p>
              <p className="text-xs text-slate-500">
                -{item.totalDeduction} pts
              </p>
            </div>
          </button>
        ))}

        {items.length === 0 && <EmptyBox text={empty} />}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-900 p-2">
      <p className={`font-black ${danger ? "text-red-300" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-slate-950/70 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function TrendMiniChart({ history }: { history: PerformanceHistory[] }) {
  const rows = [...history]
    .slice(0, 8)
    .reverse()
    .map((row) => Number(row.score || 0));

  if (rows.length === 0)
    return (
      <EmptyBox text="No saved history yet. Click Save Snapshot to build trend data." />
    );

  const points = rows.map((score, index) => {
    const x = rows.length === 1 ? 100 : (index / (rows.length - 1)) * 100;
    const y = 100 - Math.max(0, Math.min(100, score));
    return `${x},${y}`;
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <svg viewBox="0 0 100 100" className="h-36 w-full overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          points={points.join(" ")}
          className="text-amber-400"
        />
        {points.map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              className="fill-emerald-400"
            />
          );
        })}
      </svg>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        {history.slice(0, 4).map((row) => (
          <div key={row.id} className="rounded-lg bg-slate-900 p-2">
            <p className="font-black text-white">{row.score}</p>
            <p className="text-[10px] text-slate-500">
              {row.period_end
                ? new Date(row.period_end).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "2-digit",
                  })
                : "Saved"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeDrawer({
  item,
  startDate,
  endDate,
  coachingForm,
  setCoachingForm,
  savingCoaching,
  onSaveCoaching,
  onClose,
  onExport,
  getEmployeeName,
  getScoreClass,
  getBadgeClass,
  formatDate,
}: {
  item: EmployeeScore;
  startDate: string;
  endDate: string;
  coachingForm: CoachingForm;
  setCoachingForm: (form: CoachingForm) => void;
  savingCoaching: boolean;
  onSaveCoaching: () => void;
  onClose: () => void;
  onExport: () => void;
  getEmployeeName: (employee: Employee) => string;
  getScoreClass: (score: number) => string;
  getBadgeClass: (score: number) => string;
  getTrendClass: (delta: number) => string;
  formatDate: (value?: string | null) => string;
}) {
  const visibleSummary = [
    { label: "Late", value: item.lateCount, danger: item.lateCount > 0 },
    {
      label: "Undertime",
      value: item.undertimeCount,
      danger: item.undertimeCount > 0,
    },
    { label: "Absent", value: item.absentCount, danger: item.absentCount > 0 },
    {
      label: "Missing Timeout",
      value: item.missingTimeoutCount,
      danger: item.missingTimeoutCount > 0,
    },
  ];

  const optionalSummary = [
    { label: "No Schedule", value: item.noScheduleCount },
    { label: "Review Flags", value: item.reviewFlagCount },
    { label: "Approved Leave", value: item.approvedLeaveDays },
  ].filter((row) => Number(row.value || 0) > 0);

  const groupedBreakdown = item.breakdown.reduce<
    Record<string, ScoreBreakdown[]>
  >((groups, row) => {
    const category = row.category || "Other";
    if (!groups[category]) groups[category] = [];
    groups[category].push(row);
    return groups;
  }, {});

  const latestCoaching = item.coachingLogs[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-4xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        <div className="border-b border-slate-800 bg-slate-950/95 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
                Employee Performance Review
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                {getEmployeeName(item.employee)}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {item.employee.employee_no || "No employee no"} Ã¢â‚¬Â¢{" "}
                {item.department} Ã¢â‚¬Â¢ {item.employee.position || "No position"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Review period: {formatDate(startDate)} to {formatDate(endDate)}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Current Score
                </p>
                <p
                  className={`mt-1 text-4xl font-black ${getScoreClass(item.score)}`}
                >
                  {item.score}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${getBadgeClass(item.score)}`}
                >
                  {item.label}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-900 p-3 text-slate-400 hover:text-white"
              >
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-28">
          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Total Deduction</p>
              <h3 className="mt-2 text-4xl font-black text-red-300">
                -{item.totalDeduction}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                based on active KPI rules
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Coaching Records</p>
              <h3 className="mt-2 text-4xl font-black text-white">
                {item.coachingLogs.length}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                paperless coaching notes
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Latest Coaching</p>
              <h3 className="mt-2 truncate text-lg font-black text-white">
                {latestCoaching
                  ? formatDate(latestCoaching.created_at)
                  : "None"}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                {latestCoaching?.reason || "No coaching record saved yet."}
              </p>
            </div>
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 size={22} className="text-amber-400" />
              <div>
                <h3 className="text-lg font-black">Attendance Summary</h3>
                <p className="text-sm text-slate-400">
                  Main attendance issues affecting the score.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {visibleSummary.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-center"
                >
                  <p
                    className={`text-3xl font-black ${row.danger ? "text-red-300" : "text-white"}`}
                  >
                    {row.value}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {row.label}
                  </p>
                </div>
              ))}
            </div>

            {optionalSummary.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {optionalSummary.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-xl bg-slate-950/70 px-4 py-3 text-sm"
                  >
                    <span className="text-slate-400">{row.label}</span>
                    <span className="font-black text-yellow-300">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ClipboardList size={22} className="text-amber-400" />
                <div>
                  <h3 className="text-lg font-black">KPI Breakdown</h3>
                  <p className="text-sm text-slate-400">
                    Grouped deductions from Performance KPI Settings.
                  </p>
                </div>
              </div>
              <button
                onClick={onExport}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedBreakdown).map(([category, rows]) => (
                <div
                  key={category}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="font-black text-white">{category}</h4>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400">
                      -{rows.reduce((sum, row) => sum + row.totalDeduction, 0)}{" "}
                      pts
                    </span>
                  </div>

                  <div className="space-y-2">
                    {rows.map((row) => (
                      <div
                        key={row.metricKey}
                        className="grid grid-cols-1 gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm md:grid-cols-[1fr_auto] md:items-center"
                      >
                        <div>
                          <p className="font-black text-white">
                            {row.metricLabel}
                          </p>
                          <p className="text-xs text-slate-500">
                            Count: {row.count} Ã¢â‚¬Â¢ Deduction:{" "}
                            {row.deductionPoints} point(s) each Ã¢â‚¬Â¢ Weight:{" "}
                            {row.weightPercent}%
                          </p>
                        </div>
                        <p
                          className={
                            row.totalDeduction > 0
                              ? "font-black text-red-300"
                              : "font-black text-slate-500"
                          }
                        >
                          {row.count} Ãƒâ€” {row.deductionPoints} = -
                          {row.totalDeduction}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {item.breakdown.length === 0 && (
                <EmptyBox text="No active KPI rules for this employee." />
              )}
            </div>
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <MessageSquarePlus size={22} className="text-amber-400" />
              <div>
                <h3 className="text-lg font-black">Paperless Coaching Note</h3>
                <p className="text-sm text-slate-400">
                  Use this for reminders, performance issues, warnings, or
                  follow-up action plans.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Coach / Supervisor
                </label>
                <input
                  value={coachingForm.coach_name}
                  onChange={(event) =>
                    setCoachingForm({
                      ...coachingForm,
                      coach_name: event.target.value,
                    })
                  }
                  placeholder="Manager / Supervisor"
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={coachingForm.followup_date}
                  onChange={(event) =>
                    setCoachingForm({
                      ...coachingForm,
                      followup_date: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Issue / Reason
                </label>
                <textarea
                  value={coachingForm.reason}
                  onChange={(event) =>
                    setCoachingForm({
                      ...coachingForm,
                      reason: event.target.value,
                    })
                  }
                  placeholder="Example: Repeated missing timeout / score below target / written warning discussion"
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Coaching Action Plan
                </label>
                <textarea
                  value={coachingForm.action_plan}
                  onChange={(event) =>
                    setCoachingForm({
                      ...coachingForm,
                      action_plan: event.target.value,
                    })
                  }
                  placeholder="Example: Employee was reminded to complete timeout before leaving shift. Supervisor will monitor next cutoff."
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <FileText size={22} className="text-amber-400" />
              <div>
                <h3 className="text-lg font-black">Coaching History</h3>
                <p className="text-sm text-slate-400">
                  Saved paperless coaching and warning follow-up records.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {item.coachingLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-400">
                        {formatDate(log.created_at)}
                      </p>
                      <h4 className="mt-1 font-black text-white">
                        {log.reason || "Coaching record"}
                      </h4>
                    </div>
                    <div className="text-left text-xs text-slate-500 md:text-right">
                      <p>Coach: {log.coach_name || "Not set"}</p>
                      <p>Follow-up: {formatDate(log.followup_date)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action Plan
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">
                      {log.action_plan || "No action plan saved."}
                    </p>
                  </div>
                </div>
              ))}
              {item.coachingLogs.length === 0 && (
                <EmptyBox text="No coaching notes yet. Add one above if this employee needs paperless follow-up." />
              )}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-500">
              Coaching notes are saved to employee_coaching_logs. PDF can be
              printed or saved for signed documentation.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onSaveCoaching}
                disabled={savingCoaching}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
              >
                <MessageSquarePlus size={18} />
                {savingCoaching ? "Saving..." : "Save Coaching Note"}
              </button>
              <button
                onClick={onExport}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
              >
                <Download size={18} />
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-black text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






