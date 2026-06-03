"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
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
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [hcRules, setHcRules] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [publishedSchedules, setPublishedSchedules] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  /// DATA
  const todayKey = new Date().toISOString().slice(0, 10);

  const fallbackRequiredHC: Record<string, number> = {
    "Front Desk": 4,
    Housekeeping: 12,
    Maintenance: 2,
    Cashier: 3,
    Waitress: 4,
    Kitchen: 5,
    Restaurant: 8,
    Management: 1,
  };

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

  /// FUNCTIONS
  const loadWorkforceData = async () => {
    const { data: employeeData } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: scheduleData } = await supabase.from("schedules").select("*");

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
    setLeaveRequests(leaveData || []);
    setOccupancyData(occupancy || []);
    setHcRules(hcData?.setting_data || null);
    setPublishedSchedules(publishedData || []);
  };

  const getRequiredHC = () => {
    const latestOccupancy =
      occupancyData.find((row) => String(row.business_date) === todayKey) ||
      occupancyData[occupancyData.length - 1];

    if (!hcRules || !latestOccupancy) return fallbackRequiredHC;

    const roomsSold = Number(latestOccupancy.rooms_sold || 0);

    const occupancyRule = hcRules.occupancyRules?.find((rule: any) => {
      return (
        roomsSold >= Number(rule.min || 0) &&
        roomsSold <= Number(rule.max || 999999)
      );
    });

    return {
      ...fallbackRequiredHC,
      ...(occupancyRule?.rules || {}),
    };
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

  const todaySchedules = allTodaySchedules.filter((schedule) => {
    const shift = String(schedule.shift || "").toUpperCase();
    if (shift === "OFF") return false;

    if (!hasPublishedSchedule) return true;

    const employee = employees.find((emp) =>
      isSameEmployee(emp.id, schedule.employee_id)
    );

    const dept = String(employee?.department || "Unassigned");

    return departmentHasPublishedSchedule(dept);
  });

  const offTodaySchedules = allTodaySchedules.filter((schedule) => {
    const shift = String(schedule.shift || "").toUpperCase();
    if (shift !== "OFF") return false;

    if (!hasPublishedSchedule) return true;

    const employee = employees.find((emp) =>
      isSameEmployee(emp.id, schedule.employee_id)
    );

    const dept = String(employee?.department || "Unassigned");

    return departmentHasPublishedSchedule(dept);
  });

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
  const offEmployeeIds = offTodaySchedules.map((row) => row.employee_id);
  const leaveEmployeeIds = approvedLeavesToday.map((row) => row.employee_id);

  const noScheduleEmployees = activeEmployees.filter((emp) => {
    return (
      !scheduledEmployeeIds.some((id) => isSameEmployee(id, emp.id)) &&
      !offEmployeeIds.some((id) => isSameEmployee(id, emp.id)) &&
      !leaveEmployeeIds.some((id) => isSameEmployee(id, emp.id))
    );
  });

  const departments = Array.from(
    new Set([
      ...Object.keys(requiredHC),
      ...activeEmployees.map((emp) => emp.department || "Unassigned"),
    ])
  ).filter(Boolean);

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

    const offToday = offTodaySchedules.filter((schedule) => {
      const employee = employees.find((emp) =>
        isSameEmployee(emp.id, schedule.employee_id)
      );

      return String(employee?.department || "Unassigned") === department;
    });

    const required = Number(requiredHC[department] || 0);
    const totalEmployees = departmentEmployees.length;
    const available = Math.max(totalEmployees - onLeave.length - offToday.length, 0);
    const scheduledCount = scheduled.length;
    const gap = scheduledCount - required;

    return {
      department,
      required,
      available,
      scheduled: scheduledCount,
      onLeave: onLeave.length,
      offToday: offToday.length,
      totalEmployees,
      gap,
      coverage:
        required > 0 ? Math.min(100, Math.round((scheduledCount / required) * 100)) : 100,
      status: gap < 0 ? "LOW STAFF" : gap > 0 ? "OVER STAFF" : "NORMAL",
      priority:
        gap <= -3 ? "High" : gap < 0 ? "Medium" : gap > 0 ? "Review" : "Normal",
      action:
        gap < 0
          ? `Need ${Math.abs(gap)} more staff`
          : gap > 0
          ? `Possible excess ${gap} staff`
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
      : missingStaff > 0
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
              Departments with shortage, excess manpower, leave impact, or missing published schedule.
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
            Required, scheduled, available, leave, OFF, gap, and published status.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredDepartmentSummary.map((dept) => (
              <DepartmentCoverageCard key={dept.department} dept={dept} />
            ))}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <StaffList
            title="Available Floaters / No Schedule"
            subtitle="Active employees without schedule, OFF, or leave today."
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
            <div className="grid grid-cols-8 bg-slate-950 px-6 py-4 text-sm font-bold text-slate-400">
              <div>Department</div>
              <div>Required</div>
              <div>Scheduled</div>
              <div>Available</div>
              <div>OFF</div>
              <div>Gap</div>
              <div>Priority</div>
              <div>Action</div>
            </div>

            {filteredDepartmentSummary.map((dept) => (
              <div
                key={dept.department}
                className="grid grid-cols-8 border-t border-slate-800 px-6 py-4 text-sm"
              >
                <div className="font-semibold">{dept.department}</div>
                <div>{dept.required}</div>
                <div>{dept.scheduled}</div>
                <div>{dept.available}</div>
                <div>{dept.offToday}</div>

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

function DepartmentCoverageCard({ dept }: { dept: any }) {
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

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-900 p-2">
          <p className="text-slate-500">Leave</p>
          <p className="font-bold text-white">{dept.onLeave}</p>
        </div>

        <div className="rounded-lg bg-slate-900 p-2">
          <p className="text-slate-500">OFF</p>
          <p className="font-bold text-white">{dept.offToday}</p>
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