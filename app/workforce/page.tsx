"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  UserCheck,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";
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
          `${noScheduleEmployees.length} active employee(s) have no saved schedule row today.`,
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
          "Review missing schedule rows and assign working shift, OFF, or RD where intended.",
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

type ReminderStatus = "critical" | "warning" | "info" | "success" | "neutral";

type Reminder = {
  status: ReminderStatus;
  text: string;
};

const assistantReminders: Reminder[] = [
  ...lowStaffDepartments.map((dept) => ({
    status: "critical" as const,
    text: `${dept.department} is short by ${Math.abs(dept.gap)} staff.`,
  })),
  ...(pendingLeaves.length > 0
    ? [
        {
          status: "warning" as const,
          text: `${pendingLeaves.length} pending leave request(s) need review.`,
        },
      ]
    : []),
  ...(noScheduleEmployees.length > 0
    ? [
        {
          status: "warning" as const,
          text: `${noScheduleEmployees.length} active employee(s) have no schedule row today.`,
        },
      ]
    : []),
  ...(!hasPublishedSchedule
    ? [
        {
          status: "info" as const,
          text: "Today is still using draft schedule data.",
        },
      ]
    : []),
].slice(0, 5);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="OPERATIONS / WORKFORCE" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Operations
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Workforce Command Center
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Monitor manpower coverage, schedule publication, leave impact,
                floaters, staffing gaps, and daily workforce risk.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="All">All Departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <StatusBadge
                status={hasPublishedSchedule ? "success" : "warning"}
                label={
                  hasPublishedSchedule
                    ? "Published Schedule"
                    : "Draft Schedule Data"
                }
              />
            </div>
          </section>

          {!hasPublishedSchedule && (
            <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                Schedule Publication Notice
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Draft schedule data is currently being used.
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-amber-700">
                Publish the weekly schedule in Scheduling to make Workforce
                reflect final locked manpower.
              </p>
            </section>
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Users size={20} />}
              title="Active Employees"
              value={activeEmployees.length}
              helper={`${inactiveEmployees.length} inactive / resigned`}
            />
            <StatCard
              icon={<ClipboardList size={20} />}
              title="Required Today"
              value={totalRequired}
              helper="Based on HC rule settings"
            />
            <StatCard
              icon={<UserCheck size={20} />}
              title="Scheduled Today"
              value={totalScheduled}
              helper={`${workforceStatus} workforce status`}
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              title="Missing Staff"
              value={missingStaff}
              helper={`${noScheduleEmployees.length} no schedule alert(s)`}
              danger={missingStaff > 0 || noScheduleEmployees.length > 0}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  OPSCORE Workforce Briefing
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  {workforceStatus === "Stable"
                    ? "Workforce coverage is under control."
                    : workforceStatus === "Watchlist"
                      ? "Workforce is stable, but needs review."
                      : workforceStatus === "Draft Data"
                        ? "Schedule publication is still pending."
                        : "Immediate manpower attention is recommended."}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  OPSCORE summarized today’s staffing position based on required
                  headcount, scheduled manpower, leave impact, unpublished
                  schedule data, and no-schedule alerts.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                {(aiNotes.length > 0
                  ? aiNotes
                  : ["No major workforce issue detected."]
                )
                  .slice(0, 4)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Insight {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                        {item}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Action Center
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Priority Actions
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
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
                      className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-700"
                    >
                      {item}
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Staffing Risk Monitor
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Risk Summary
              </h2>

              <div className="mt-5 space-y-3">
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

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Department Exceptions
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Needs Attention
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Shortage, excess manpower, leave impact, no schedule alerts,
                  or missing published schedule.
                </p>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Issue</th>
                      <th className="px-6 py-4">Gap</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {needsAttention.length > 0 ? (
                      needsAttention.slice(0, 8).map((dept) => (
                        <tr
                          key={dept.department}
                          className="transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 font-black text-slate-950">
                            {dept.department}
                          </td>
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4 font-black text-slate-950">
                            {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
                          </td>
                          <td className="px-6 py-4">
                            <PriorityBadge priority={dept.priority} />
                          </td>
                          <td className="px-6 py-4">{dept.action}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-sm font-medium text-slate-500"
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

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Workforce Operations
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Department Coverage
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                Required, scheduled, available, leave, no schedule, RD, shift
                breakdown, gap, and published status.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredDepartmentSummary.map((dept) => (
                <DepartmentCoverageCard
                  key={dept.department}
                  dept={dept}
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

            <LeaveQueue
              pendingLeaves={pendingLeaves}
              employees={employees}
              isSameEmployee={isSameEmployee}
              getEmployeeName={getEmployeeName}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Manpower Action Ledger
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Action Table
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                Operational manpower issues and recommended action by
                department.
              </p>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Required</th>
                    <th className="px-6 py-4">Scheduled</th>
                    <th className="px-6 py-4">Available</th>
                    <th className="px-6 py-4">No Sched</th>
                    <th className="px-6 py-4">RD</th>
                    <th className="px-6 py-4">Gap</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredDepartmentSummary.map((dept) => (
                    <tr
                      key={dept.department}
                      className="transition-all duration-200 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-black text-slate-950">
                        {dept.department}
                      </td>
                      <td className="px-6 py-4">{dept.required}</td>
                      <td className="px-6 py-4">{dept.scheduled}</td>
                      <td className="px-6 py-4">{dept.available}</td>
                      <td className="px-6 py-4">{dept.noSchedule}</td>
                      <td className="px-6 py-4">{dept.restDayToday}</td>
                      <td className="px-6 py-4 font-black text-slate-950">
                        {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
                      </td>
                      <td className="px-6 py-4">
                        <PriorityBadge priority={dept.priority} />
                      </td>
                      <td className="px-6 py-4">{dept.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <OpscoreAssistant reminders={assistantReminders} />
      </main>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  helper,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  helper: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-950">
          {icon}
        </div>

        <StatusBadge
          status={danger ? "danger" : "success"}
          label={danger ? "Review" : "Normal"}
        />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
      <p className="mt-1 text-sm font-medium text-slate-500">{helper}</p>
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
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <StatusBadge
        status={danger ? "warning" : "neutral"}
        label={String(value)}
      />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "High") return <StatusBadge status="danger" label="High" />;
  if (priority === "Medium")
    return <StatusBadge status="warning" label="Medium" />;
  if (priority === "Review")
    return <StatusBadge status="info" label="Review" />;

  return <StatusBadge status="success" label="Normal" />;
}

function StatusBadge({
  status,
  label,
}: {
  status: "success" | "warning" | "danger" | "info" | "neutral";
  label: string;
}) {
  const className =
    status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : status === "info"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {label}
    </span>
  );
}

function DepartmentCoverageCard({
  dept,
  getShiftTimeLabel,
}: {
  dept: any;
  getShiftTimeLabel: (shiftName?: string | null) => string;
}) {
  const width = Math.min(100, Math.max(0, dept.coverage));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">{dept.department}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Required {dept.required} • Scheduled {dept.scheduled} • Available{" "}
            {dept.available}
          </p>
        </div>

        <StatusBadge
          status={
            dept.status === "LOW STAFF"
              ? "danger"
              : dept.status === "OVER STAFF"
                ? "info"
                : "success"
          }
          label={dept.status}
        />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Coverage</span>
          <span>{dept.coverage}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-950" style={{ width: `${width}%` }} />
        </div>
      </div>

      {dept.shiftBreakdown?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {dept.shiftBreakdown.map((item: any) => (
            <span
              key={item.shiftName}
              className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
            >
              {getShiftTimeLabel(item.shiftName)} × {item.count}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <MiniValue label="Leave" value={dept.onLeave} />
        <MiniValue label="No Sched" value={dept.noSchedule} />
        <MiniValue label="Gap" value={dept.gap > 0 ? `+${dept.gap}` : dept.gap} />
        <MiniValue label="Pub" value={dept.published ? "Yes" : "Draft"} />
      </div>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <p className="text-slate-500">{label}</p>
      <p className="font-black text-slate-950">{value}</p>
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Workforce List
      </p>
      <h2 className="mt-2 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
        {subtitle}
      </p>

      <div className="mt-5 space-y-3">
        {employees.slice(0, 8).map((emp, index) => (
          <div
            key={emp.id || index}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p className="font-black text-slate-950">{getName(emp)}</p>
            <p className="text-xs font-medium text-slate-500">
              {emp.department || "Unassigned"} • {emp.position || "No position"}
            </p>
          </div>
        ))}

        {employees.length === 0 && (
          <p className="py-8 text-center text-sm font-medium text-slate-500">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}

function LeaveQueue({
  pendingLeaves,
  employees,
  isSameEmployee,
  getEmployeeName,
}: {
  pendingLeaves: any[];
  employees: any[];
  isSameEmployee: (a: any, b: any) => boolean;
  getEmployeeName: (emp: any) => string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Leave Control
      </p>
      <h2 className="mt-2 text-xl font-black text-slate-950">Leave Queue</h2>
      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
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
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <p className="font-black text-slate-950">
                {emp ? getEmployeeName(emp) : leave.employee_name || "Employee"}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-700">
                {String(leave.start_date || leave.date || "").slice(0, 10)} -{" "}
                {String(leave.end_date || leave.date || "").slice(0, 10)}
              </p>
            </div>
          );
        })}

        {pendingLeaves.length === 0 && (
          <p className="py-8 text-center text-sm font-medium text-slate-500">
            No pending leave requests.
          </p>
        )}
      </div>
    </div>
  );
}