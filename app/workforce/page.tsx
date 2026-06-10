"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function WorkforcePage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [hcRules, setHcRules] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [publishedSchedules, setPublishedSchedules] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  /// DATA
  const todayKey = new Date().toISOString().slice(0, 10);

  const getEmployeeName = (emp: any) =>
    `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
    emp.name ||
    emp.employee_name ||
    "Unnamed Employee";

  const getDateValue = (row: any) =>
    String(
      row.day ||
        row.date ||
        row.schedule_date ||
        row.business_date ||
        row.created_at ||
        "",
    ).slice(0, 10);

  const isActiveEmployee = (emp: any) => {
    const status = String(
      emp.employment_status || emp.status || "",
    ).toLowerCase();
    return (
      status !== "resigned" &&
      status !== "inactive" &&
      status !== "terminated" &&
      status !== "awol"
    );
  };

  const isSameEmployee = (a: any, b: any) => String(a) === String(b);

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
    const shift = getShiftTemplate(shiftName);
    return getColorClasses(shift?.color);
  };

  const isUnscheduledShift = (shiftName?: string | null) => !shiftName;

  const isRestDayShift = (shiftName?: string | null) => {
    const shift = String(shiftName || "").toUpperCase();
    return shift === "RD" || shift === "OFF";
  };

  const isLeaveShift = (shiftName?: string | null) =>
    String(shiftName || "").toLowerCase() === "leave";

  const isWorkingShift = (shiftName?: string | null) =>
    !!shiftName &&
    !isUnscheduledShift(shiftName) &&
    !isRestDayShift(shiftName) &&
    !isLeaveShift(shiftName);

  const getShiftTimeLabel = (shiftName?: string | null) => {
    if (!shiftName) return "OFF";

    const normalized = String(shiftName).toUpperCase();

    if (normalized === "OFF") return "OFF";
    if (normalized === "RD") return "RD";
    if (String(shiftName).toLowerCase() === "leave") return "Leave";

    const shift = getShiftTemplate(shiftName);
    const start = shift?.start_time ? String(shift.start_time).slice(0, 5) : "";
    const end = shift?.end_time ? String(shift.end_time).slice(0, 5) : "";

    if (start && end) return `${start} - ${end}`;

    return shiftName;
  };

  /// FUNCTIONS
  const loadWorkforceData = async () => {
    const { data: employeeData } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: scheduleData } = await supabase.from("schedules").select("*");

    const { data: shiftData } = await supabase
      .from("shift_templates")
      .select("*")
      .order("id");

    const { data: leaveData } = await supabase
      .from("leave_requests")
      .select("*");

    const { data: occupancy } = await supabase
      .from("occupancy_data")
      .select("*")
      .order("business_date", { ascending: true });

    const { data: hcData } = await supabase
      .from("hc_rule_settings")
      .select("setting_data")
      .eq("setting_name", "hc_rules")
      .maybeSingle();

    const { data: publishedData } = await supabase
      .from("schedule_publications")
      .select("*")
      .lte("period_start", todayKey)
      .gte("period_end", todayKey)
      .eq("status", "Published");

    setEmployees(employeeData || []);
    setSchedules(scheduleData || []);
    setShiftTemplates(shiftData || []);
    setLeaveRequests(leaveData || []);
    setOccupancyData(occupancy || []);
    setHcRules(hcData?.setting_data || null);
    setPublishedSchedules(publishedData || []);
  };

  const getRequiredHC = () => {
    const latestOccupancy =
      occupancyData.find((row) => String(row.business_date) === todayKey) ||
      occupancyData[occupancyData.length - 1];

    // HC Rules Settings is the only source of truth.
    // If rules or occupancy are missing, do not create fake shortages.
    if (!hcRules || !latestOccupancy) return {};

    const roomsSold = Number(latestOccupancy.rooms_sold || 0);

    const occupancyRule = hcRules?.occupancyRules?.find((rule: any) => {
      return (
        roomsSold >= Number(rule.min || 0) &&
        roomsSold <= Number(rule.max || 999999)
      );
    });

    return occupancyRule?.rules || {};
  };

  const departmentHasPublishedSchedule = (department: string) => {
    return publishedSchedules.some((pub) => {
      const pubDept = String(pub.department || "").toLowerCase();
      return pubDept === "all" || pubDept === department.toLowerCase();
    });
  };

  /// EFFECTS
  useEffect(() => {
    loadWorkforceData();
  }, []);

  /// CALCULATIONS
  const activeEmployees = employees.filter(isActiveEmployee);
  const inactiveEmployees = employees.filter((emp) => !isActiveEmployee(emp));

  const requiredHC = getRequiredHC();
  const hasPublishedSchedule = publishedSchedules.length > 0;

  const allTodaySchedules = schedules.filter((schedule) => {
    const date = getDateValue(schedule);
    return date === todayKey;
  });

  const visibleTodaySchedules = allTodaySchedules.filter((schedule) => {
    if (!hasPublishedSchedule) return true;

    const employee = employees.find((emp) =>
      isSameEmployee(emp.id, schedule.employee_id),
    );

    const dept = String(employee?.department || "Unassigned");

    return departmentHasPublishedSchedule(dept);
  });

  const todaySchedules = visibleTodaySchedules.filter((schedule) =>
    isWorkingShift(schedule.shift),
  );

  const restDayTodaySchedules = visibleTodaySchedules.filter((schedule) =>
    isRestDayShift(schedule.shift),
  );

  const unscheduledTodaySchedules = visibleTodaySchedules.filter((schedule) =>
    isUnscheduledShift(schedule.shift),
  );

  const approvedLeavesToday = leaveRequests.filter((leave) => {
    const status = String(leave.status || "").toLowerCase();
    const start = String(leave.start_date || leave.date || "").slice(0, 10);
    const end = String(leave.end_date || leave.date || "").slice(0, 10);

    return status === "approved" && start <= todayKey && end >= todayKey;
  });

  const pendingLeaves = leaveRequests.filter(
    (leave) => String(leave.status || "").toLowerCase() === "pending",
  );

  const scheduledEmployeeIds = todaySchedules.map((row) => row.employee_id);
  const restDayEmployeeIds = restDayTodaySchedules.map(
    (row) => row.employee_id,
  );
  const leaveEmployeeIds = approvedLeavesToday.map((row) => row.employee_id);

  const noScheduleEmployees = activeEmployees.filter((emp) => {
    return (
      !scheduledEmployeeIds.some((id) => isSameEmployee(id, emp.id)) &&
      !restDayEmployeeIds.some((id) => isSameEmployee(id, emp.id)) &&
      !leaveEmployeeIds.some((id) => isSameEmployee(id, emp.id))
    );
  });

  const departments = Object.keys(requiredHC).filter(Boolean);

  const departmentSummary = departments.map((department) => {
    const departmentEmployees = activeEmployees.filter(
      (emp) => String(emp.department || "Unassigned") === department,
    );

    const scheduled = todaySchedules.filter((schedule) => {
      const employee = employees.find((emp) =>
        isSameEmployee(emp.id, schedule.employee_id),
      );

      return String(employee?.department || "Unassigned") === department;
    });

    const onLeave = approvedLeavesToday.filter((leave) => {
      const employee = employees.find((emp) =>
        isSameEmployee(emp.id, leave.employee_id),
      );

      return String(employee?.department || "Unassigned") === department;
    });

    const restDayToday = restDayTodaySchedules.filter((schedule) => {
      const employee = employees.find((emp) =>
        isSameEmployee(emp.id, schedule.employee_id),
      );

      return String(employee?.department || "Unassigned") === department;
    });

    const required = Number(requiredHC[department] || 0);
    const totalEmployees = departmentEmployees.length;
    const noSchedule = departmentEmployees.filter((emp) => {
      return (
        !scheduledEmployeeIds.some((id) => isSameEmployee(id, emp.id)) &&
        !restDayEmployeeIds.some((id) => isSameEmployee(id, emp.id)) &&
        !leaveEmployeeIds.some((id) => isSameEmployee(id, emp.id))
      );
    });

    const shiftBreakdown = visibleTodaySchedules
      .filter((schedule) => {
        const employee = employees.find((emp) =>
          isSameEmployee(emp.id, schedule.employee_id),
        );

        return String(employee?.department || "Unassigned") === department;
      })
      .reduce((acc: any[], schedule) => {
        const shiftName = schedule.shift || "OFF";
        const existing = acc.find((item) => item.shiftName === shiftName);

        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ shiftName, count: 1 });
        }

        return acc;
      }, []);

    const available = Math.max(
      totalEmployees - onLeave.length - restDayToday.length,
      0,
    );
    const scheduledCount = scheduled.length;
    const gap = scheduledCount - required;

    return {
      department,
      required,
      available,
      scheduled: scheduledCount,
      onLeave: onLeave.length,
      restDayToday: restDayToday.length,
      noSchedule: noSchedule.length,
      shiftBreakdown,
      totalEmployees,
      gap,
      coverage:
        required > 0
          ? Math.min(100, Math.round((scheduledCount / required) * 100))
          : 100,
      status: gap < 0 ? "LOW STAFF" : gap > 0 ? "OVER STAFF" : "NORMAL",
      priority:
        gap <= -3
          ? "High"
          : gap < 0
            ? "Medium"
            : gap > 0 || noSchedule.length > 0
              ? "Review"
              : "Normal",
      action:
        gap < 0
          ? `Need ${Math.abs(gap)} more staff`
          : gap > 0
            ? `Possible excess ${gap} staff`
            : noSchedule.length > 0
              ? `Review ${noSchedule.length} no schedule alert(s)`
              : "Coverage is balanced",
      published: departmentHasPublishedSchedule(department),
    };
  });

  const filteredDepartmentSummary =
    selectedDepartment === "All"
      ? departmentSummary
      : departmentSummary.filter(
          (dept) => dept.department === selectedDepartment,
        );

  const lowStaffDepartments = departmentSummary.filter((dept) => dept.gap < 0);
  const overStaffDepartments = departmentSummary.filter((dept) => dept.gap > 0);

  const totalRequired = departmentSummary.reduce(
    (sum, dept) => sum + dept.required,
    0,
  );
  const totalScheduled = departmentSummary.reduce(
    (sum, dept) => sum + dept.scheduled,
    0,
  );

  const missingStaff = lowStaffDepartments.reduce(
    (sum, dept) => sum + Math.abs(dept.gap),
    0,
  );

  const possibleFloaters = noScheduleEmployees.slice(0, 8);

  const needsAttention = departmentSummary
    .filter(
      (dept) =>
        dept.gap < 0 ||
        dept.gap > 0 ||
        dept.onLeave > 0 ||
        dept.noSchedule > 0 ||
        (!dept.published && hasPublishedSchedule),
    )
    .sort((a, b) => {
      const priorityScore: Record<string, number> = {
        High: 1,
        Medium: 2,
        Review: 3,
        Normal: 4,
      };

      return priorityScore[a.priority] - priorityScore[b.priority];
    });

  const aiNotes = [
    ...lowStaffDepartments.map(
      (dept) => `${dept.department}: short by ${Math.abs(dept.gap)} staff.`,
    ),
    ...(approvedLeavesToday.length > 0
      ? [
          `${approvedLeavesToday.length} approved leave(s) affecting manpower today.`,
        ]
      : []),
    ...(pendingLeaves.length > 0
      ? [`${pendingLeaves.length} leave request(s) still pending.`]
      : []),
    ...(noScheduleEmployees.length > 0
      ? [
          `${noScheduleEmployees.length} active employee(s) have no saved schedule row today. OFF and RD are treated as valid rest days.`,
        ]
      : []),
    ...(overStaffDepartments.length > 0
      ? [`${overStaffDepartments.length} department(s) may be overstaffed.`]
      : []),
    ...(!hasPublishedSchedule
      ? [
          "No published schedule found for today. Workforce is using draft schedule data.",
        ]
      : []),
  ];

  const aiActions = [
    ...lowStaffDepartments.map((dept) => {
      const floater = possibleFloaters.find(
        (emp) => String(emp.department || "") !== dept.department,
      );

      return floater
        ? `Consider assigning ${getEmployeeName(floater)} to ${dept.department}.`
        : `Call extra manpower for ${dept.department}.`;
    }),
    ...(pendingLeaves.length > 0
      ? ["Review pending leave requests before final schedule release."]
      : []),
    ...(noScheduleEmployees.length > 0
      ? [
          `${noScheduleEmployees.length} active employee(s) have no saved schedule row today. OFF and RD are treated as valid rest days.`,
        ]
      : []),
    ...(noScheduleEmployees.length > 0
      ? [
          "Review employees with missing schedule rows and assign working shift, OFF, or RD where intended.",
        ]
      : []),
    ...(overStaffDepartments.length > 0
      ? ["Check overstaffed departments for possible reassignment."]
      : []),
    ...(!hasPublishedSchedule
      ? ["Publish today’s weekly schedule so Workforce uses final locked data."]
      : []),
  ];

  const workforceStatus = !hasPublishedSchedule
    ? "Draft Data"
    : missingStaff >= 5
      ? "Needs Attention"
      : missingStaff > 0 || noScheduleEmployees.length > 0
        ? "Watchlist"
        : "Stable";

  const statusClass =
    workforceStatus === "Stable"
      ? "border-green-500/20 bg-green-500/10 text-green-300"
      : workforceStatus === "Watchlist" || workforceStatus === "Draft Data"
        ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
        : "border-red-500/20 bg-red-500/10 text-red-300";

  /// UI
  return (
    <div className="flex min-h-screen bg-[#07111f] text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-[#0B1220] via-[#13203D] to-[#07111f] p-5 shadow-2xl shadow-blue-950/30 lg:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_460px]">
            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">
                  Executive Suite
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-bold text-slate-200">
                  {hasPublishedSchedule
                    ? "Published Schedule"
                    : "Draft Schedule Data"}
                </span>
              </div>

              <p className="text-sm font-black uppercase tracking-[0.35em] text-blue-100/80">
                OPSCORE Workforce Intelligence
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">
                Workforce Command Center
              </h1>

              <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-slate-200">
                Monitor manpower coverage, schedule publication, leave impact,
                floaters, staffing gaps, and daily workforce risk from one
                executive command center.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <HeroMetric
                  label="Staffing Health"
                  title={workforceStatus}
                  value={`${totalScheduled}/${totalRequired}`}
                  subtitle="Scheduled vs required today"
                />

                <HeroMetric
                  label="Coverage Gap"
                  title={missingStaff > 0 ? "Action Required" : "Balanced"}
                  value={missingStaff}
                  subtitle="Missing staff across departments"
                />

                <HeroMetric
                  label="Schedule Control"
                  title={hasPublishedSchedule ? "Locked" : "Draft"}
                  value={publishedSchedules.length}
                  subtitle="Published schedule record(s) today"
                />
              </div>

              <div className="mt-6 rounded-2xl border border-blue-200/20 bg-blue-300/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100/80">
                  Recommended action
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                  {aiActions[0] ||
                    "Maintain current manpower setup and monitor staffing coverage throughout the day."}
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200/80">
                    Workforce Health
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-white">
                    {workforceStatus}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                    {missingStaff > 0
                      ? `${missingStaff} missing staff need immediate review.`
                      : noScheduleEmployees.length > 0
                        ? `${noScheduleEmployees.length} employee(s) need schedule validation.`
                        : hasPublishedSchedule
                          ? "No critical shortage detected today."
                          : "Schedule is not yet locked for today."}
                  </p>
                </div>

                <div
                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${statusClass}`}
                >
                  {workforceStatus}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <ExecutiveMiniStat
                  label="Active"
                  value={activeEmployees.length}
                />
                <ExecutiveMiniStat
                  label="Inactive"
                  value={inactiveEmployees.length}
                />
                <ExecutiveMiniStat
                  label="On Leave"
                  value={approvedLeavesToday.length}
                />
                <ExecutiveMiniStat
                  label="Pending Leave"
                  value={pendingLeaves.length}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Department Filter
                </p>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none"
                >
                  <option value="All">All Departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {!hasPublishedSchedule && (
          <section className="mb-6 overflow-hidden rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-blue-950/20">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-200">
              Schedule Publication Notice
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Draft schedule data is currently being used.
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              Publish the weekly schedule in Scheduling to make Workforce
              reflect final locked manpower.
            </p>
          </section>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard
            icon={<Users size={22} />}
            title="Active Employees"
            value={activeEmployees.length}
          />
          <StatCard
            icon={<ClipboardList size={22} />}
            title="Required Today"
            value={totalRequired}
          />
          <StatCard
            icon={<UserCheck size={22} />}
            title="Scheduled Today"
            value={totalScheduled}
          />
          <StatCard
            icon={<AlertTriangle size={22} />}
            title="Missing Staff"
            value={missingStaff}
            danger={missingStaff > 0}
          />
          <StatCard
            icon={<AlertTriangle size={22} />}
            title="No Schedule Alert"
            value={noScheduleEmployees.length}
            danger={noScheduleEmployees.length > 0}
          />
          <StatCard
            icon={<UserX size={22} />}
            title="Inactive / Resigned"
            value={inactiveEmployees.length}
            danger={inactiveEmployees.length > 0}
          />
        </section>

        <section className="mb-6 overflow-hidden rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-blue-950/20 lg:p-6">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-stretch">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                <AlertTriangle size={18} /> AI Workforce Briefing
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {workforceStatus === "Stable"
                  ? "Workforce coverage is under control."
                  : workforceStatus === "Watchlist"
                    ? "Workforce is stable, but needs review."
                    : workforceStatus === "Draft Data"
                      ? "Schedule publication is still pending."
                      : "Immediate manpower attention is recommended."}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                OPSCORE summarized today’s staffing position based on required
                headcount, scheduled manpower, leave impact, unpublished
                schedule data, and no-schedule alerts.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {(aiNotes.length > 0
                  ? aiNotes
                  : ["No major workforce issue detected."]
                )
                  .slice(0, 4)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200/60">
                        Insight {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                        {item}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-300/20 bg-slate-950/70 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200/70">
                Action Center
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Highest priority workforce actions for today.
              </p>

              <div className="mt-5 space-y-3">
                {(aiActions.length > 0
                  ? aiActions
                  : ["Maintain current manpower setup."]
                )
                  .slice(0, 5)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <p className="text-sm font-semibold leading-6 text-slate-100">
                        {item}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 lg:p-6 xl:col-span-1">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
              Staffing Risk Monitor
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Risk Summary
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <RiskLine
                label="Low Staff Departments"
                value={lowStaffDepartments.length}
                danger={lowStaffDepartments.length > 0}
              />
              <RiskLine
                label="Overstaffed Departments"
                value={overStaffDepartments.length}
                danger={overStaffDepartments.length > 0}
              />
              <RiskLine
                label="Approved Leaves Today"
                value={approvedLeavesToday.length}
                danger={approvedLeavesToday.length > 0}
              />
              <RiskLine
                label="Pending Leave Requests"
                value={pendingLeaves.length}
                danger={pendingLeaves.length > 0}
              />
              <RiskLine
                label="No Schedule Employees"
                value={noScheduleEmployees.length}
                danger={noScheduleEmployees.length > 0}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 lg:p-6 xl:col-span-2">
            <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                  Department Exceptions
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Needs Attention
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Departments with shortage, excess manpower, leave impact, no
                  schedule alerts, or missing published schedule.
                </p>
              </div>
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Issue</th>
                    <th className="px-5 py-4">Gap</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {needsAttention.length > 0 ? (
                    needsAttention.slice(0, 8).map((dept) => (
                      <tr
                        key={dept.department}
                        className="border-t border-slate-800 hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4 font-bold text-white">
                          {dept.department}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {dept.gap < 0
                            ? "Shortage"
                            : dept.gap > 0
                              ? "Overstaffed"
                              : dept.onLeave > 0
                                ? "Leave impact"
                                : dept.noSchedule > 0
                                  ? "No schedule"
                                  : "Not published"}
                        </td>
                        <td
                          className={
                            dept.gap < 0
                              ? "px-5 py-4 font-black text-red-300"
                              : dept.gap > 0
                                ? "px-5 py-4 font-black text-blue-300"
                                : "px-5 py-4 font-black text-slate-300"
                          }
                        >
                          {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
                        </td>
                        <td className="px-5 py-4">
                          <PriorityBadge priority={dept.priority} />
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {dept.action}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="border-t border-slate-800 px-5 py-8 text-center text-sm text-slate-500"
                      >
                        No department needs attention.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 lg:p-6">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                Workforce Operations
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Department Coverage
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Required, scheduled, available, leave, no schedule, RD, shift
                colors, gap, and published status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredDepartmentSummary.map((dept) => (
              <DepartmentCoverageCard
                key={dept.department}
                dept={dept}
                getShiftColorClass={getShiftColorClass}
                getShiftTimeLabel={getShiftTimeLabel}
              />
            ))}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <StaffList
            title="Available Floaters / No Schedule"
            subtitle="Active employees without a working shift today. RD and approved leave are excluded."
            employees={possibleFloaters}
            empty="No available floater found."
          />

          <StaffList
            title="On Leave Today"
            subtitle="Approved leave that affects today’s manpower."
            employees={approvedLeavesToday.map((leave) => {
              const emp = employees.find((employee) =>
                isSameEmployee(employee.id, leave.employee_id),
              );

              return emp || leave;
            })}
            empty="No approved leave today."
          />

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 lg:p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
              Leave Control
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Leave Queue</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Pending leave requests needing review.
            </p>

            <div className="mt-5 space-y-3">
              {pendingLeaves.slice(0, 6).map((leave, index) => {
                const emp = employees.find((employee) =>
                  isSameEmployee(employee.id, leave.employee_id),
                );

                return (
                  <div
                    key={leave.id || index}
                    className="rounded-2xl border border-blue-300/20 bg-blue-300/10 p-4"
                  >
                    <p className="font-bold text-blue-100">
                      {emp
                        ? getEmployeeName(emp)
                        : leave.employee_name || "Employee"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {String(leave.start_date || leave.date || "").slice(
                        0,
                        10,
                      )}{" "}
                      -{" "}
                      {String(leave.end_date || leave.date || "").slice(0, 10)}
                    </p>
                  </div>
                );
              })}

              {pendingLeaves.length === 0 && (
                <p className="text-sm text-slate-500">
                  No pending leave requests.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 lg:p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
              Manpower Action Ledger
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Action Table
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Operational manpower issues and recommended action by department.
            </p>
          </div>

          <div className="overflow-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Required</th>
                  <th className="px-5 py-4">Scheduled</th>
                  <th className="px-5 py-4">Available</th>
                  <th className="px-5 py-4">No Sched</th>
                  <th className="px-5 py-4">RD</th>
                  <th className="px-5 py-4">Gap</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredDepartmentSummary.map((dept) => (
                  <tr
                    key={dept.department}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4 font-semibold text-white">
                      {dept.department}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {dept.required}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {dept.scheduled}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {dept.available}
                    </td>
                    <td
                      className={
                        dept.noSchedule > 0
                          ? "px-5 py-4 font-bold text-red-300"
                          : "px-5 py-4 text-slate-300"
                      }
                    >
                      {dept.noSchedule}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {dept.restDayToday}
                    </td>
                    <td
                      className={
                        dept.gap < 0
                          ? "px-5 py-4 font-bold text-red-300"
                          : dept.gap > 0
                            ? "px-5 py-4 font-bold text-blue-300"
                            : "px-5 py-4 font-bold text-emerald-300"
                      }
                    >
                      {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
                    </td>
                    <td className="px-5 py-4">
                      <PriorityBadge priority={dept.priority} />
                    </td>
                    <td className="px-5 py-4 text-slate-300">{dept.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function HeroMetric({
  label,
  title,
  value,
  subtitle,
}: {
  label: string;
  title: string;
  value: any;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/70">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-3xl font-black text-blue-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function ExecutiveMiniStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function RiskLine({
  label,
  value,
  danger,
}: {
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-sm font-semibold text-slate-300">{label}</p>
      <span
        className={
          danger
            ? "rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300"
            : "rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300"
        }
      >
        {value}
      </span>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-xl shadow-black/10 ${
        danger
          ? "border-red-300/20 bg-red-500/10"
          : "border-blue-300/20 bg-slate-900"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className={
            danger
              ? "rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-red-300"
              : "rounded-2xl border border-blue-300/20 bg-blue-500/10 p-3 text-blue-200"
          }
        >
          {icon}
        </div>
        <p className="text-sm font-bold text-slate-400">{title}</p>
      </div>

      <h2 className="text-3xl font-black text-white">{value}</h2>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={
        priority === "High"
          ? "rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300"
          : priority === "Medium"
            ? "rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300"
            : priority === "Review"
              ? "rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300"
              : "rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300"
      }
    >
      {priority}
    </span>
  );
}

function DepartmentCoverageCard({
  dept,
  getShiftColorClass,
  getShiftTimeLabel,
}: {
  dept: any;
  getShiftColorClass: (shiftName?: string | null) => string;
  getShiftTimeLabel: (shiftName?: string | null) => string;
}) {
  const width = Math.min(100, Math.max(0, dept.coverage));

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-white">{dept.department}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Required {dept.required} • Scheduled {dept.scheduled} • Available{" "}
            {dept.available}
          </p>
        </div>

        <span
          className={
            dept.status === "LOW STAFF"
              ? "rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300"
              : dept.status === "OVER STAFF"
                ? "rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300"
                : "rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300"
          }
        >
          {dept.status}
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Coverage</span>
          <span>{dept.coverage}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className={
              dept.gap < 0
                ? "h-full rounded-full bg-gradient-to-r from-red-500 to-red-300"
                : dept.gap > 0
                  ? "h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-200"
                  : "h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-300 to-cyan-200"
            }
            style={{ width: `${width}%` }}
          />
        </div>
      </div>

      {dept.shiftBreakdown?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {dept.shiftBreakdown.map((item: any) => (
            <span
              key={item.shiftName}
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getShiftColorClass(item.shiftName)}`}
            >
              {getShiftTimeLabel(item.shiftName)} × {item.count}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <p className="text-slate-500">Leave</p>
          <p className="font-bold text-white">{dept.onLeave}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <p className="text-slate-500">No Sched</p>
          <p
            className={
              dept.noSchedule > 0
                ? "font-bold text-red-300"
                : "font-bold text-white"
            }
          >
            {dept.noSchedule}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <p className="text-slate-500">Gap</p>
          <p
            className={
              dept.gap < 0
                ? "font-bold text-red-300"
                : dept.gap > 0
                  ? "font-bold text-blue-300"
                  : "font-bold text-emerald-300"
            }
          >
            {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <p className="text-slate-500">Pub</p>
          <p
            className={
              dept.published
                ? "font-bold text-blue-300"
                : "font-bold text-red-300"
            }
          >
            {dept.published ? "Yes" : "Draft"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StaffList({
  title,
  subtitle,
  employees,
  empty,
}: {
  title: string;
  subtitle: string;
  employees: any[];
  empty: string;
}) {
  const getName = (emp: any) =>
    `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
    emp.name ||
    emp.employee_name ||
    "Employee";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 lg:p-6">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
        Workforce List
      </p>
      <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p>

      <div className="mt-5 space-y-3">
        {employees.slice(0, 8).map((emp, index) => (
          <div
            key={emp.id || index}
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3"
          >
            <p className="font-semibold text-white">{getName(emp)}</p>
            <p className="text-xs text-slate-500">
              {emp.department || "Unassigned"} • {emp.position || "No position"}
            </p>
          </div>
        ))}

        {employees.length === 0 && (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}
