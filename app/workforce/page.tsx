"use client";

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
        ""
    ).slice(0, 10);

  const isActiveEmployee = (emp: any) => {
    const status = String(emp.employment_status || emp.status || "").toLowerCase();
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
    const cleanColor = String(color || "").toLowerCase().trim();

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

    if (normalized === "blue") return "border-blue-500/40 bg-blue-500/15 text-blue-300";
    if (normalized === "sky") return "border-sky-500/40 bg-sky-500/15 text-sky-300";
    if (normalized === "cyan") return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300";
    if (normalized === "teal") return "border-teal-500/40 bg-teal-500/15 text-teal-300";
    if (normalized === "green") return "border-green-500/40 bg-green-500/15 text-green-300";
    if (normalized === "emerald") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    if (normalized === "lime") return "border-lime-500/40 bg-lime-500/15 text-lime-300";
    if (normalized === "yellow") return "border-yellow-500/40 bg-yellow-500/15 text-yellow-300";
    if (normalized === "amber") return "border-amber-500/40 bg-amber-500/15 text-amber-300";
    if (normalized === "orange") return "border-orange-500/40 bg-orange-500/15 text-orange-300";
    if (normalized === "red") return "border-red-500/40 bg-red-500/15 text-red-300";
    if (normalized === "rose") return "border-rose-500/40 bg-rose-500/15 text-rose-300";
    if (normalized === "pink") return "border-pink-500/40 bg-pink-500/15 text-pink-300";
    if (normalized === "purple") return "border-purple-500/40 bg-purple-500/15 text-purple-300";
    if (normalized === "violet") return "border-violet-500/40 bg-violet-500/15 text-violet-300";
    if (normalized === "indigo") return "border-indigo-500/40 bg-indigo-500/15 text-indigo-300";
    if (normalized === "gray") return "border-gray-500/40 bg-gray-500/15 text-gray-300";

    return "border-slate-500/40 bg-slate-500/15 text-slate-300";
  };

  const getShiftColorClass = (shiftName?: string | null) => {
    const shift = getShiftTemplate(shiftName);
    return getColorClasses(shift?.color);
  };

const isUnscheduledShift = (shiftName?: string | null) =>
  !shiftName;

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

    const { data: leaveData } = await supabase.from("leave_requests").select("*");

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

    // ENTERPRISE SOURCE OF TRUTH:
    // Workforce required HC must come from HC Rules Settings only.
    // Do not merge hardcoded fallback departments such as Restaurant/Management/Maintenance.
    // If rules or occupancy are missing, return empty requirements instead of fake shortages.
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
      isSameEmployee(emp.id, schedule.employee_id)
    );

    const dept = String(employee?.department || "Unassigned");

    return departmentHasPublishedSchedule(dept);
  });

  const todaySchedules = visibleTodaySchedules.filter((schedule) =>
    isWorkingShift(schedule.shift)
  );

  const restDayTodaySchedules = visibleTodaySchedules.filter((schedule) =>
    isRestDayShift(schedule.shift)
  );

  const unscheduledTodaySchedules = visibleTodaySchedules.filter((schedule) =>
    isUnscheduledShift(schedule.shift)
  );

  const approvedLeavesToday = leaveRequests.filter((leave) => {
    const status = String(leave.status || "").toLowerCase();
    const start = String(leave.start_date || leave.date || "").slice(0, 10);
    const end = String(leave.end_date || leave.date || "").slice(0, 10);

    return status === "approved" && start <= todayKey && end >= todayKey;
  });

  const pendingLeaves = leaveRequests.filter(
    (leave) => String(leave.status || "").toLowerCase() === "pending"
  );

  const scheduledEmployeeIds = todaySchedules.map((row) => row.employee_id);
  const restDayEmployeeIds = restDayTodaySchedules.map((row) => row.employee_id);
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
      (emp) => String(emp.department || "Unassigned") === department
    );

    const scheduled = todaySchedules.filter((schedule) => {
      const employee = employees.find((emp) =>
        isSameEmployee(emp.id, schedule.employee_id)
      );

      return String(employee?.department || "Unassigned") === department;
    });

    const onLeave = approvedLeavesToday.filter((leave) => {
      const employee = employees.find((emp) =>
        isSameEmployee(emp.id, leave.employee_id)
      );

      return String(employee?.department || "Unassigned") === department;
    });

    const restDayToday = restDayTodaySchedules.filter((schedule) => {
      const employee = employees.find((emp) =>
        isSameEmployee(emp.id, schedule.employee_id)
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
          isSameEmployee(emp.id, schedule.employee_id)
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

    const available = Math.max(totalEmployees - onLeave.length - restDayToday.length, 0);
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
        required > 0 ? Math.min(100, Math.round((scheduledCount / required) * 100)) : 100,
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
      : departmentSummary.filter((dept) => dept.department === selectedDepartment);

  const lowStaffDepartments = departmentSummary.filter((dept) => dept.gap < 0);
  const overStaffDepartments = departmentSummary.filter((dept) => dept.gap > 0);

  const totalRequired = departmentSummary.reduce((sum, dept) => sum + dept.required, 0);
  const totalScheduled = departmentSummary.reduce((sum, dept) => sum + dept.scheduled, 0);

  const missingStaff = lowStaffDepartments.reduce(
    (sum, dept) => sum + Math.abs(dept.gap),
    0
  );

  const possibleFloaters = noScheduleEmployees.slice(0, 8);

  const needsAttention = departmentSummary
    .filter(
      (dept) =>
        dept.gap < 0 ||
        dept.gap > 0 ||
        dept.onLeave > 0 ||
        dept.noSchedule > 0 ||
        (!dept.published && hasPublishedSchedule)
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
      (dept) => `${dept.department}: short by ${Math.abs(dept.gap)} staff.`
    ),
    ...(approvedLeavesToday.length > 0
      ? [`${approvedLeavesToday.length} approved leave(s) affecting manpower today.`]
      : []),
    ...(pendingLeaves.length > 0
      ? [`${pendingLeaves.length} leave request(s) still pending.`]
      : []),
    ...(noScheduleEmployees.length > 0
      ? [`${noScheduleEmployees.length} active employee(s) have OFF/no schedule today. RD is treated as Rest Day and does not trigger this alert.`]
      : []),
    ...(overStaffDepartments.length > 0
      ? [`${overStaffDepartments.length} department(s) may be overstaffed.`]
      : []),
    ...(!hasPublishedSchedule
      ? ["No published schedule found for today. Workforce is using draft schedule data."]
      : []),
  ];

  const aiActions = [
    ...lowStaffDepartments.map((dept) => {
      const floater = possibleFloaters.find(
        (emp) => String(emp.department || "") !== dept.department
      );

      return floater
        ? `Consider assigning ${getEmployeeName(floater)} to ${dept.department}.`
        : `Call extra manpower for ${dept.department}.`;
    }),
    ...(pendingLeaves.length > 0
      ? ["Review pending leave requests before final schedule release."]
      : []),
    ...(noScheduleEmployees.length > 0
      ? [`${noScheduleEmployees.length} active employee(s) have OFF/no schedule today. RD is treated as Rest Day and does not trigger this alert.`]
      : []),
    ...(noScheduleEmployees.length > 0
      ? ["Review employees tagged OFF/no schedule and assign working shift or RD where intended."]
      : []),
    ...(overStaffDepartments.length > 0
      ? ["Check overstaffed departments for possible reassignment."]
      : []),
    ...(!hasPublishedSchedule
      ? ["Publish today’s weekly schedule so Workforce uses final locked data."]
      : []),
  ];

  const workforceStatus =
    !hasPublishedSchedule
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
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Operations
            </p>

            <h1 className="mt-2 text-4xl font-black">Workforce</h1>

            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Monitor manpower requirement, published schedule coverage, leave impact,
              floaters, and department staffing gaps.
            </p>
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold outline-none"
          >
            <option value="All">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </section>

        {!hasPublishedSchedule && (
          <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
            <p className="font-black">Draft schedule data is being used.</p>
            <p className="mt-1 text-sm text-yellow-100/80">
              Publish the weekly schedule in Scheduling to make Workforce reflect final locked manpower.
            </p>
          </section>
        )}

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={<Users size={22} />} title="Active Employees" value={activeEmployees.length} />
          <StatCard icon={<ClipboardList size={22} />} title="Required Today" value={totalRequired} />
          <StatCard icon={<UserCheck size={22} />} title="Scheduled Today" value={totalScheduled} />
          <StatCard icon={<AlertTriangle size={22} />} title="Missing Staff" value={missingStaff} danger={missingStaff > 0} />
          <StatCard icon={<AlertTriangle size={22} />} title="No Schedule Alert" value={noScheduleEmployees.length} danger={noScheduleEmployees.length > 0} />
          <StatCard icon={<UserX size={22} />} title="Inactive / Resigned" value={inactiveEmployees.length} danger={inactiveEmployees.length > 0} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className={`rounded-2xl border p-6 xl:col-span-1 ${statusClass}`}>
            <p className="text-sm font-bold uppercase tracking-wide">
              AI Workforce Status
            </p>

            <h2 className="mt-2 text-3xl font-black">{workforceStatus}</h2>

            <div className="mt-5 rounded-xl bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">Today’s main issue</p>
              <p className="mt-1 text-xl font-black text-white">
                {missingStaff > 0
                  ? `${missingStaff} missing staff`
                  : noScheduleEmployees.length > 0
                  ? `${noScheduleEmployees.length} no schedule alert(s)`
                  : hasPublishedSchedule
                  ? "No critical shortage"
                  : "Schedule not published"}
              </p>
            </div>

            <InfoBox
              title="AI Notes"
              items={aiNotes}
              empty="No major workforce issue detected."
            />

            <InfoBox
              title="Recommended Actions"
              items={aiActions}
              empty="Maintain current manpower setup."
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="text-xl font-bold">Needs Attention</h2>
            <p className="mt-1 text-sm text-slate-400">
              Departments with shortage, excess manpower, leave impact, no schedule alerts, or missing published schedule.
            </p>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
              <div className="grid grid-cols-5 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-400">
                <div>Department</div>
                <div>Issue</div>
                <div>Gap</div>
                <div>Priority</div>
                <div>Action</div>
              </div>

              {needsAttention.length > 0 ? (
                needsAttention.slice(0, 8).map((dept) => (
                  <div
                    key={dept.department}
                    className="grid grid-cols-5 border-t border-slate-800 px-5 py-4 text-sm"
                  >
                    <div className="font-bold">{dept.department}</div>
                    <div className="text-slate-300">
                      {dept.gap < 0
                        ? "Shortage"
                        : dept.gap > 0
                        ? "Overstaffed"
                        : dept.onLeave > 0
                        ? "Leave impact"
                        : dept.noSchedule > 0
                        ? "No schedule"
                        : "Not published"}
                    </div>
                    <div
                      className={
                        dept.gap < 0
                          ? "font-black text-red-400"
                          : dept.gap > 0
                          ? "font-black text-yellow-400"
                          : "font-black text-slate-300"
                      }
                    >
                      {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
                    </div>
                    <div>
                      <PriorityBadge priority={dept.priority} />
                    </div>
                    <div className="text-slate-300">{dept.action}</div>
                  </div>
                ))
              ) : (
                <div className="border-t border-slate-800 px-5 py-6 text-sm text-slate-500">
                  No department needs attention.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Department Coverage</h2>
          <p className="mt-1 text-sm text-slate-400">
            Required, scheduled, available, leave, no schedule, RD, shift colors, gap, and published status.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                isSameEmployee(employee.id, leave.employee_id)
              );

              return emp || leave;
            })}
            empty="No approved leave today."
          />

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Leave Queue</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pending leave requests needing review.
            </p>

            <div className="mt-5 space-y-3">
              {pendingLeaves.slice(0, 6).map((leave, index) => {
                const emp = employees.find((employee) =>
                  isSameEmployee(employee.id, leave.employee_id)
                );

                return (
                  <div
                    key={leave.id || index}
                    className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4"
                  >
                    <p className="font-bold text-yellow-300">
                      {emp ? getEmployeeName(emp) : leave.employee_name || "Employee"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {String(leave.start_date || leave.date || "").slice(0, 10)} -{" "}
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

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Action Table</h2>
          <p className="mt-1 text-sm text-slate-400">
            Operational manpower issues and recommended action by department.
          </p>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-9 bg-slate-950 px-6 py-4 text-sm font-bold text-slate-400">
              <div>Department</div>
              <div>Required</div>
              <div>Scheduled</div>
              <div>Available</div>
              <div>No Sched</div>
              <div>RD</div>
              <div>Gap</div>
              <div>Priority</div>
              <div>Action</div>
            </div>

            {filteredDepartmentSummary.map((dept) => (
              <div
                key={dept.department}
                className="grid grid-cols-9 border-t border-slate-800 px-6 py-4 text-sm"
              >
                <div className="font-semibold">{dept.department}</div>
                <div>{dept.required}</div>
                <div>{dept.scheduled}</div>
                <div>{dept.available}</div>
                <div className={dept.noSchedule > 0 ? "font-bold text-red-400" : ""}>{dept.noSchedule}</div>
                <div>{dept.restDayToday}</div>

                <div
                  className={
                    dept.gap < 0
                      ? "font-bold text-red-400"
                      : dept.gap > 0
                      ? "font-bold text-yellow-400"
                      : "font-bold text-green-400"
                  }
                >
                  {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
                </div>

                <div>
                  <PriorityBadge priority={dept.priority} />
                </div>

                <div className="text-slate-300">{dept.action}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
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
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/20 bg-red-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-amber-400">
          {icon}
        </div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>

      <h2 className="text-3xl font-black">{value}</h2>
    </div>
  );
}

function InfoBox({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="mt-4 rounded-xl bg-slate-950/60 p-4">
      <p className="mb-2 text-sm font-bold text-white">{title}</p>

      {items.length > 0 ? (
        <div className="space-y-1">
          {items.slice(0, 5).map((item, index) => (
            <p key={index} className="text-[13px] leading-5">
              • {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-[13px] leading-5">{empty}</p>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={
        priority === "High"
          ? "rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400"
          : priority === "Medium"
          ? "rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400"
          : priority === "Review"
          ? "rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400"
          : "rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400"
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{dept.department}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Required {dept.required} • Scheduled {dept.scheduled} • Available{" "}
            {dept.available}
          </p>
        </div>

        <span
          className={
            dept.status === "LOW STAFF"
              ? "rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400"
              : dept.status === "OVER STAFF"
              ? "rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400"
              : "rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400"
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
                ? "h-full rounded-full bg-red-400"
                : dept.gap > 0
                ? "h-full rounded-full bg-yellow-400"
                : "h-full rounded-full bg-green-400"
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
        <div className="rounded-lg bg-slate-900 p-2">
          <p className="text-slate-500">Leave</p>
          <p className="font-bold text-white">{dept.onLeave}</p>
        </div>

        <div className="rounded-lg bg-slate-900 p-2">
          <p className="text-slate-500">No Sched</p>
          <p className={dept.noSchedule > 0 ? "font-bold text-red-400" : "font-bold text-white"}>{dept.noSchedule}</p>
        </div>

        <div className="rounded-lg bg-slate-900 p-2">
          <p className="text-slate-500">Gap</p>
          <p
            className={
              dept.gap < 0
                ? "font-bold text-red-400"
                : dept.gap > 0
                ? "font-bold text-yellow-400"
                : "font-bold text-green-400"
            }
          >
            {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
          </p>
        </div>

        <div className="rounded-lg bg-slate-900 p-2">
          <p className="text-slate-500">Pub</p>
          <p className={dept.published ? "font-bold text-green-400" : "font-bold text-yellow-400"}>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>

      <div className="mt-5 space-y-3">
        {employees.slice(0, 8).map((emp, index) => (
          <div
            key={emp.id || index}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
          >
            <p className="font-semibold">{getName(emp)}</p>
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