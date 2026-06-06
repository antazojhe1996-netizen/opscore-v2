"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  Database,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

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
};

export default function PerformanceMonitoringPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceEntry[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [kpiSettings, setKpiSettings] = useState<KpiSetting[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(() => getDefaultStartDate());
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  /// HELPERS
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  }

  function getEmployeeName(employee: Employee) {
    return `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unnamed Employee";
  }

  const normalizeText = (value?: string | null) => String(value || "").trim().toLowerCase();

  const normalizeMetricKey = (value?: string | null) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const isActiveEmployee = (employee: Employee) => {
    const status = normalizeText(employee.employment_status);
    return !["resigned", "terminated", "inactive", "awol"].includes(status);
  };

  const isSameEmployee = (a: any, b: any) => String(a || "") === String(b || "");

  const isNoScheduleShift = (shift?: string | null) => {
    const normalized = String(shift || "").toUpperCase();
    return !normalized || normalized === "OFF";
  };

  const isRestDayShift = (shift?: string | null) => String(shift || "").toUpperCase() === "RD";

  const getScoreLabel = (score: number) => {
    if (score >= 95) return "Excellent";
    if (score >= 85) return "Good";
    if (score >= 75) return "Satisfactory";
    return "Needs Coaching";
  };

  const getScoreClass = (score: number) => {
    if (score >= 95) return "text-emerald-400";
    if (score >= 85) return "text-blue-400";
    if (score >= 75) return "text-yellow-400";
    return "text-red-400";
  };

  const getBadgeClass = (score: number) => {
    if (score >= 95) return "bg-emerald-500/10 text-emerald-400";
    if (score >= 85) return "bg-blue-500/10 text-blue-400";
    if (score >= 75) return "bg-yellow-500/10 text-yellow-400";
    return "bg-red-500/10 text-red-400";
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
      const categoryCompare = String(a.category || "").localeCompare(String(b.category || ""));
      if (categoryCompare !== 0) return categoryCompare;
      return String(a.metric_label || "").localeCompare(String(b.metric_label || ""));
    });
  };

  /// LOADERS
  const loadPerformanceData = async () => {
    setLoading(true);

    const [employeeResult, attendanceResult, scheduleResult, leaveResult, kpiResult] = await Promise.all([
      supabase.from("employees").select("*").order("department").order("first_name"),
      supabase
        .from("attendance_entries")
        .select("*")
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate),
      supabase.from("schedules").select("*").gte("day", startDate).lte("day", endDate),
      supabase.from("leave_requests").select("*").lte("start_date", endDate).gte("end_date", startDate),
      supabase
        .from("performance_kpi_settings")
        .select("*")
        .order("category", { ascending: true })
        .order("metric_label", { ascending: true }),
    ]);

    if (employeeResult.error) console.log("PERFORMANCE EMPLOYEES ERROR:", employeeResult.error.message);
    if (attendanceResult.error) console.log("PERFORMANCE ATTENDANCE ERROR:", attendanceResult.error.message);
    if (scheduleResult.error) console.log("PERFORMANCE SCHEDULE ERROR:", scheduleResult.error.message);
    if (leaveResult.error) console.log("PERFORMANCE LEAVE ERROR:", leaveResult.error.message);
    if (kpiResult.error) console.log("PERFORMANCE KPI SETTINGS ERROR:", kpiResult.error.message);

    setEmployees(employeeResult.data || []);
    setAttendanceEntries(attendanceResult.data || []);
    setSchedules(scheduleResult.data || []);
    setLeaveRequests(leaveResult.data || []);
    setKpiSettings(kpiResult.data || []);
    setLoading(false);
  };

  /// EFFECTS
  useEffect(() => {
    loadPerformanceData();
  }, [startDate, endDate]);

  /// CALCULATIONS
  const activeEmployees = useMemo(() => employees.filter(isActiveEmployee), [employees]);

  const departments = useMemo(() => {
    const list = activeEmployees
      .map((employee) => String(employee.department || "Unassigned").trim())
      .filter(Boolean);

    return Array.from(new Set(list)).sort();
  }, [activeEmployees]);

  const selectedRules = useMemo(() => {
    if (selectedDepartment === "ALL") return kpiSettings.filter((row) => row.is_enabled && row.applies_to_department === "ALL");
    return getApplicableKpiRules(selectedDepartment);
  }, [kpiSettings, selectedDepartment]);

  const activeRulesCount = selectedRules.length;
  const activeWeight = selectedRules.reduce((sum, row) => sum + Number(row.weight_percent || 0), 0);
  const departmentOverrideCount = kpiSettings.filter((row) => row.applies_to_department !== "ALL").length;
  const disabledRulesCount = kpiSettings.filter((row) => !row.is_enabled).length;

  const employeeScores: EmployeeScore[] = useMemo(() => {
    return activeEmployees.map((employee) => {
      const employeeId = String(employee.id);
      const employeeNo = String(employee.employee_no || "");
      const department = employee.department || "Unassigned";

      const employeeAttendance = attendanceEntries.filter((entry) => isSameEmployee(entry.employee_id, employeeId));
      const employeeSchedules = schedules.filter((schedule) => isSameEmployee(schedule.employee_id, employeeId));
      const employeeLeaves = leaveRequests.filter(
        (leave) => isSameEmployee(leave.employee_id, employeeId) || isSameEmployee(leave.employee_id, employeeNo)
      );

      const lateCount = employeeAttendance.filter((entry) => Number(entry.late_minutes || 0) > 0).length;
      const undertimeCount = employeeAttendance.filter((entry) => Number(entry.undertime_minutes || 0) > 0).length;
      const absentCount = employeeAttendance.filter((entry) => normalizeText(entry.status) === "absent").length;
      const missingTimeoutCount = employeeAttendance.filter((entry) => !!entry.time_in && !entry.time_out).length;
      const noScheduleCount = employeeSchedules.filter((schedule) => {
        if (isRestDayShift(schedule.shift)) return false;
        return isNoScheduleShift(schedule.shift);
      }).length;
      const reviewFlagCount = employeeAttendance.filter((entry) => {
        const status = normalizeText(entry.status);
        const remarks = normalizeText(entry.remarks);
        return status.includes("review") || status.includes("pending") || remarks.includes("review") || remarks.includes("issue");
      }).length;
      const approvedLeaveDays = employeeLeaves
        .filter((leave) => normalizeText(leave.status) === "approved")
        .reduce((sum, leave) => sum + Number(leave.days || 0), 0);

      const metricCounts: Record<string, number> = {
        late: lateCount,
        undertime: undertimeCount,
        absent: absentCount,
        missing_timeout: missingTimeoutCount,
        no_schedule: noScheduleCount,
        review_flag: reviewFlagCount,
        approved_leave: approvedLeaveDays,
        attendance_rows: employeeAttendance.length,
      };

      const rules = getApplicableKpiRules(department);
      const breakdown = rules.map((rule) => {
        const key = normalizeMetricKey(rule.metric_key);
        const count = Number(metricCounts[key] || 0);
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

      const totalDeduction = breakdown.reduce((sum, item) => sum + item.totalDeduction, 0);
      const score = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));

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
      };
    });
  }, [activeEmployees, attendanceEntries, schedules, leaveRequests, kpiSettings]);

  const filteredScores = useMemo(() => {
    return employeeScores.filter((item) => {
      const searchable = `${item.employee.employee_no || ""} ${getEmployeeName(item.employee)} ${item.department} ${item.employee.position || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesDepartment = selectedDepartment === "ALL" || item.department === selectedDepartment;
      return searchable && matchesDepartment;
    });
  }, [employeeScores, searchTerm, selectedDepartment]);

  const sortedByScore = [...filteredScores].sort((a, b) => b.score - a.score);
  const topPerformers = sortedByScore.slice(0, 5);
  const needsCoaching = [...filteredScores]
    .filter((item) => item.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const overallScore =
    filteredScores.length > 0
      ? Math.round(filteredScores.reduce((sum, item) => sum + item.score, 0) / filteredScores.length)
      : 0;

  const excellentCount = filteredScores.filter((item) => item.score >= 95).length;
  const coachingCount = filteredScores.filter((item) => item.score < 75).length;
  const totalLate = filteredScores.reduce((sum, item) => sum + item.lateCount, 0);
  const totalUndertime = filteredScores.reduce((sum, item) => sum + item.undertimeCount, 0);
  const totalAbsent = filteredScores.reduce((sum, item) => sum + item.absentCount, 0);
  const totalMissingTimeout = filteredScores.reduce((sum, item) => sum + item.missingTimeoutCount, 0);

  const departmentScores = departments
    .map((department) => {
      const items = employeeScores.filter((item) => item.department === department);
      const average = items.length > 0 ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0;

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

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6 xl:p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">Operations Intelligence</p>
            <h1 className="mt-2 text-4xl font-black">Performance Monitoring</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Dynamic employee scoring using Performance KPI Settings. Deductions now come from database rules, not hardcoded scoring.
            </p>
          </div>

          <button
            onClick={loadPerformanceData}
            disabled={loading}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<BarChart3 size={22} />} title="Overall Score" value={overallScore} helper={getScoreLabel(overallScore)} score={overallScore} />
          <MetricCard icon={<Users size={22} />} title="Employees Scored" value={filteredScores.length} helper="active employees" />
          <MetricCard icon={<Award size={22} />} title="Excellent" value={excellentCount} helper="95 and above" success />
          <MetricCard icon={<AlertTriangle size={22} />} title="Needs Coaching" value={coachingCount} helper="below 75 only" danger={coachingCount > 0} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black">KPI Profile</h2>
                <p className="text-sm text-slate-400">Active database rules used for the selected department.</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-blue-500/10 px-3 py-2 text-blue-300">Active Rules: {activeRulesCount}</span>
                <span className={`rounded-full px-3 py-2 ${activeWeight === 100 ? "bg-emerald-500/10 text-emerald-300" : "bg-yellow-500/10 text-yellow-300"}`}>
                  Weight: {activeWeight}%
                </span>
                <span className="rounded-full bg-purple-500/10 px-3 py-2 text-purple-300">Overrides: {departmentOverrideCount}</span>
                <span className="rounded-full bg-slate-800 px-3 py-2 text-slate-300">Disabled: {disabledRulesCount}</span>
              </div>
            </div>

            {selectedRules.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectedRules.map((rule) => (
                  <div key={`${rule.metric_key}-${rule.applies_to_department}`} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{rule.category}</p>
                    <h3 className="mt-1 text-sm font-black text-white">{rule.metric_label}</h3>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>Deduct {Number(rule.deduction_points || 0)} pts</span>
                      <span>{Number(rule.weight_percent || 0)}% weight</span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{rule.applies_to_department || "ALL"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                No active KPI rules found. Go to Performance KPI Settings and enable at least one rule.
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
              <SourceRow label="KPI Rules" value="performance_kpi_settings" good />
              <SourceRow label="Attendance" value="attendance_entries" good />
              <SourceRow label="Schedules" value="schedules" good />
              <SourceRow label="Leaves" value="leave_requests" good />
              <SourceRow label="Payroll Snapshots" value="removed from scoring" />
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<TrendingDown size={22} />} title="Late" value={totalLate} helper="occurrences" />
          <MetricCard icon={<TrendingDown size={22} />} title="Undertime" value={totalUndertime} helper="occurrences" />
          <MetricCard icon={<AlertTriangle size={22} />} title="Absent" value={totalAbsent} helper="occurrences" danger={totalAbsent > 0} />
          <MetricCard icon={<AlertTriangle size={22} />} title="Missing Timeout" value={totalMissingTimeout} helper="records" danger={totalMissingTimeout > 0} />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Search Employee</label>
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
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Department</label>
              <select
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">End</label>
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
          <RankingCard title="Top Performers" icon={<TrendingUp size={20} />} items={topPerformers} empty="No employee scores found." />
          <RankingCard title="Needs Coaching" icon={<AlertTriangle size={20} />} items={needsCoaching} empty="No employee below 75." />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Building2 className="text-amber-400" size={24} />
            <div>
              <h2 className="text-xl font-black">Department Performance</h2>
              <p className="text-sm text-slate-400">Average score by department.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {departmentScores.map((item) => (
              <div key={item.department} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{item.department}</h3>
                    <p className="text-xs text-slate-500">{item.employees} employee(s)</p>
                  </div>
                  <span className={`text-2xl font-black ${getScoreClass(item.average)}`}>{item.average}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <MiniStat label="Coaching" value={item.coaching} danger={item.coaching > 0} />
                  <MiniStat label="Late" value={item.late} />
                  <MiniStat label="Absent" value={item.absent} danger={item.absent > 0} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Employee Score Breakdown</h2>
              <p className="text-sm text-slate-400">Every deduction below is calculated from active KPI database rules.</p>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-slate-400">{filteredScores.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Late</th>
                  <th className="px-4 py-3 text-center">UT</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Missing TO</th>
                  <th className="px-4 py-3 text-center">No Sched</th>
                  <th className="px-4 py-3 text-center">Review</th>
                  <th className="px-4 py-3">Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {filteredScores.map((item) => (
                  <tr key={item.employee.id} className="border-b border-slate-800/70 align-top hover:bg-slate-800/30">
                    <td className="px-4 py-4">
                      <p className="font-black text-white">{getEmployeeName(item.employee)}</p>
                      <p className="text-xs text-slate-500">{item.employee.employee_no || "No employee no"}</p>
                      <p className="text-xs text-slate-500">{item.employee.position || "No position"}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{item.department}</td>
                    <td className={`px-4 py-4 text-center text-2xl font-black ${getScoreClass(item.score)}`}>{item.score}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${getBadgeClass(item.score)}`}>{item.label}</span>
                    </td>
                    <td className="px-4 py-4 text-center">{item.lateCount}</td>
                    <td className="px-4 py-4 text-center">{item.undertimeCount}</td>
                    <td className="px-4 py-4 text-center text-red-300">{item.absentCount}</td>
                    <td className="px-4 py-4 text-center text-yellow-300">{item.missingTimeoutCount}</td>
                    <td className="px-4 py-4 text-center">{item.noScheduleCount}</td>
                    <td className="px-4 py-4 text-center">{item.reviewFlagCount}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        {item.breakdown.map((row) => (
                          <div key={row.metricKey} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/70 px-3 py-2 text-xs">
                            <span className="text-slate-300">{row.metricLabel}</span>
                            <span className={row.totalDeduction > 0 ? "font-black text-red-300" : "text-slate-500"}>
                              {row.count} × {row.deductionPoints} = -{row.totalDeduction}
                            </span>
                          </div>
                        ))}
                        {item.breakdown.length === 0 && <p className="text-xs text-slate-500">No active KPI rules.</p>}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredScores.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center text-slate-500">
                      No performance records found for this filter.
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

function MetricCard({
  icon,
  title,
  value,
  helper,
  score,
  success,
  danger,
}: {
  icon: React.ReactNode;
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

function SourceRow({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/70 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right text-xs font-black ${good ? "text-emerald-300" : "text-yellow-300"}`}>{value}</span>
    </div>
  );
}

function RankingCard({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: EmployeeScore[];
  empty: string;
}) {
  const getScoreClass = (score: number) => {
    if (score >= 95) return "text-emerald-400";
    if (score >= 85) return "text-blue-400";
    if (score >= 75) return "text-yellow-400";
    return "text-red-400";
  };

  const getEmployeeName = (employee: Employee) => `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unnamed Employee";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="text-amber-400">{icon}</div>
        <h2 className="text-xl font-black">{title}</h2>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.employee.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/70 p-4">
            <div>
              <p className="font-black">{getEmployeeName(item.employee)}</p>
              <p className="text-xs text-slate-500">{item.department}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black ${getScoreClass(item.score)}`}>{item.score}</p>
              <p className="text-xs text-slate-500">-{item.totalDeduction} pts</p>
            </div>
          </div>
        ))}

        {items.length === 0 && <div className="rounded-xl bg-slate-950/70 p-6 text-center text-sm text-slate-500">{empty}</div>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-900 p-2">
      <p className={`font-black ${danger ? "text-red-300" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
