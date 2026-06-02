"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type Employee = {
  id: string;
  employee_no?: string;
  first_name: string;
  last_name: string;
  department: string;
  position?: string;
  employment_status?: string;
};

export default function AttendancePage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<any[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /// FUNCTIONS
  const getEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("payroll_active", true)
      .order("department")
      .order("first_name");

    const active = (data || []).filter((emp) => {
      const status = String(emp.employment_status || "").toLowerCase();
      return status !== "resigned" && status !== "terminated" && status !== "inactive";
    });

    setEmployees(active);
  };

  const getSchedules = async () => {
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("day", selectedDate);

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
      .eq("status", "Approved")
      .lte("start_date", selectedDate)
      .gte("end_date", selectedDate);

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
      .eq("attendance_date", selectedDate);

    setEntries(data || []);
  };

  const timeToMinutes = (time?: string | null) => {
    if (!time) return 0;
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  };

  const diffMinutes = (start?: string | null, end?: string | null) => {
    if (!start || !end) return 0;

    let startMin = timeToMinutes(start);
    let endMin = timeToMinutes(end);

    if (endMin < startMin) endMin += 24 * 60;

    return endMin - startMin;
  };

  const getEmployeeSchedule = (employeeId: string) => {
    return schedules.find(
      (item) => String(item.employee_id) === String(employeeId)
    );
  };

  const getShiftTemplate = (shiftName?: string) => {
    return shiftTemplates.find((shift) => shift.shift_name === shiftName);
  };

  const isOnLeave = (employee: Employee) => {
    const keys = [
      String(employee.id || "").toLowerCase(),
      String(employee.employee_no || "").toLowerCase(),
      `${employee.first_name} ${employee.last_name}`.toLowerCase(),
    ];

    return approvedLeaves.some((leave) =>
      keys.includes(String(leave.employee_id || "").toLowerCase())
    );
  };

  const getEntry = (employeeId: string) => {
    return entries.find((entry) => String(entry.employee_id) === String(employeeId));
  };

  const computeAttendance = ({
    employee,
    timeIn,
    timeOut,
  }: {
    employee: Employee;
    timeIn: string;
    timeOut: string;
  }) => {
    const schedule = getEmployeeSchedule(employee.id);
    const shiftName = schedule?.shift || "OFF";
    const shift = getShiftTemplate(shiftName);

    const scheduledIn = shift?.start_time || null;
    const scheduledOut = shift?.end_time || null;

    const lateGrace = Number(settings.late_grace_minutes || 15);
    const undertimeGrace = Number(settings.undertime_grace_minutes || 0);

    if (isOnLeave(employee)) {
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

    if (!schedule || shiftName === "OFF") {
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

    const otRaw =
      timeOut && scheduledOut ? diffMinutes(scheduledOut, timeOut) : 0;
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

  const updateLocalEntry = (employee: Employee, field: string, value: string) => {
    const existing = getEntry(employee.id);

    const baseEntry = existing || {
      employee_id: employee.id,
      attendance_date: selectedDate,
      time_in: "",
      time_out: "",
      remarks: "",
    };

    const updated = {
      ...baseEntry,
      [field]: value,
    };

    const computed = computeAttendance({
      employee,
      timeIn: updated.time_in || "",
      timeOut: updated.time_out || "",
    });

    const finalEntry = {
      ...updated,
      ...computed,
    };

    setEntries((prev) => {
      const exists = prev.some((entry) => String(entry.employee_id) === String(employee.id));

      if (exists) {
        return prev.map((entry) =>
          String(entry.employee_id) === String(employee.id) ? finalEntry : entry
        );
      }

      return [...prev, finalEntry];
    });
  };

  const saveAttendance = async () => {
    setIsSaving(true);

    const rows = filteredEmployees.map((employee) => {
      const existing = getEntry(employee.id);

      const computed = computeAttendance({
        employee,
        timeIn: existing?.time_in || "",
        timeOut: existing?.time_out || "",
      });

      return {
        employee_id: employee.id,
        attendance_date: selectedDate,
        scheduled_shift: computed.scheduled_shift,
        scheduled_in: computed.scheduled_in,
        scheduled_out: computed.scheduled_out,
        time_in: existing?.time_in || null,
        time_out: existing?.time_out || null,
        late_minutes: computed.late_minutes,
        undertime_minutes: computed.undertime_minutes,
        ot_minutes: computed.ot_minutes,
        status: computed.status,
        remarks: existing?.remarks || "",
      };
    });

    const { error } = await supabase.from("attendance_entries").upsert(rows, {
      onConflict: "employee_id,attendance_date",
    });

    setIsSaving(false);

    if (error) {
      console.log("SAVE ATTENDANCE ERROR:", error.message);
      alert("Failed to save attendance.");
      return;
    }

    alert("Attendance saved.");
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
  }, [selectedDate]);

  /// CALCULATIONS
  const departments = useMemo(() => {
    const list = employees
      .map((emp) => emp.department)
      .filter(Boolean)
      .map((dept) => dept.trim());

    return Array.from(new Set(list)).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesDepartment =
        departmentFilter === "ALL" ||
        employee.department?.toLowerCase() === departmentFilter.toLowerCase();

      const searchText = `${employee.employee_no} ${employee.first_name} ${employee.last_name} ${employee.department} ${employee.position}`.toLowerCase();

      const matchesSearch = searchText.includes(searchTerm.toLowerCase());

      return matchesDepartment && matchesSearch;
    });
  }, [employees, departmentFilter, searchTerm]);

  const attendanceRows = filteredEmployees.map((employee) => {
    const entry = getEntry(employee.id);
    const computed = computeAttendance({
      employee,
      timeIn: entry?.time_in || "",
      timeOut: entry?.time_out || "",
    });

    return {
      employee,
      entry,
      ...computed,
    };
  });

  const presentCount = attendanceRows.filter((row) =>
    ["Present", "Late", "Undertime"].includes(row.status)
  ).length;

  const lateCount = attendanceRows.filter((row) => row.late_minutes > 0).length;
  const absentCount = attendanceRows.filter((row) => row.status === "Absent").length;
  const leaveCount = attendanceRows.filter((row) => row.status === "Leave").length;

  const totalOtMinutes = attendanceRows.reduce(
    (sum, row) => sum + Number(row.ot_minutes || 0),
    0
  );

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
              Encode manual time in/out. Late, undertime, OT, leave, RD, and absent status are auto-calculated from schedule and payroll settings.
            </p>
          </div>

          <button
            onClick={saveAttendance}
            disabled={isSaving}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Attendance"}
          </button>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Visible Staff" value={filteredEmployees.length} />
          <SummaryCard title="Present" value={presentCount} color="text-emerald-400" />
          <SummaryCard title="Late" value={lateCount} color="text-amber-400" />
          <SummaryCard title="Absent" value={absentCount} color="text-red-400" />
          <SummaryCard title="OT Hours" value={(totalOtMinutes / 60).toFixed(2)} color="text-blue-400" />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black">Daily Attendance</h2>
              <p className="mt-1 text-sm text-slate-400">
                First in / last out. Break is ignored.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              />

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee..."
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="max-h-[720px] overflow-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1400px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
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
                    key={row.employee.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-black">
                        {row.employee.first_name} {row.employee.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.employee.department} • {row.employee.position || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-amber-400">
                        {row.scheduled_shift}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.scheduled_in || "--:--"} - {row.scheduled_out || "--:--"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={row.entry?.time_in || ""}
                        onChange={(e) =>
                          updateLocalEntry(row.employee, "time_in", e.target.value)
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={row.entry?.time_out || ""}
                        onChange={(e) =>
                          updateLocalEntry(row.employee, "time_out", e.target.value)
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
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
                        onChange={(e) =>
                          updateLocalEntry(row.employee, "remarks", e.target.value)
                        }
                        className="w-60 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      />
                    </td>
                  </tr>
                ))}

                {attendanceRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-slate-500">
                      No employees found.
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
      : status === "Undertime"
      ? "bg-red-500/10 text-red-400"
      : status === "Absent"
      ? "bg-red-500/10 text-red-400"
      : status === "Leave"
      ? "bg-blue-500/10 text-blue-400"
      : "bg-slate-700 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {status}
    </span>
  );
}