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

export default function AttendancePage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);

  const [mode, setMode] = useState<"daily" | "range">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [missingEmployees, setMissingEmployees] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  /// HELPERS
  const dateFrom = mode === "daily" ? selectedDate : startDate;
  const dateTo = mode === "daily" ? selectedDate : endDate;

  const normalizeName = (name: string) =>
    String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const getDateRange = () => {
    const dates: string[] = [];
    const current = new Date(dateFrom);
    const end = new Date(dateTo);

    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const getValue = (row: any, keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
    }
    return "";
  };

  const parseExcelDate = (value: any) => {
    if (!value) return "";

    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return "";
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
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
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    const text = String(value).trim();
    if (!text) return "";

    if (/^\d{1,2}:\d{2}/.test(text)) {
      const date = new Date(`2000-01-01 ${text}`);
      if (!isNaN(date.getTime())) {
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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

  const findEmployeeByName = (name: string) => {
    const clean = normalizeName(name);

    let match = employees.find(
      (emp) => normalizeName(`${emp.first_name} ${emp.last_name}`) === clean
    );

    if (match) return match;

    match = employees.find((emp) => {
      const full = normalizeName(`${emp.first_name} ${emp.last_name}`);
      return full.includes(clean) || clean.includes(full);
    });

    if (match) return match;

    const firstNameMatches = employees.filter(
      (emp) => normalizeName(emp.first_name) === clean
    );

    if (firstNameMatches.length === 1) return firstNameMatches[0];

    return null;
  };

  const getEntryKey = (employeeId: string, date: string) => `${employeeId}-${date}`;

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

  const computeEntry = (employee: Employee, date: string, entry?: AttendanceEntry) => {
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

    const undertimeRaw = timeOut && scheduledOut ? diffMinutes(timeOut, scheduledOut) : 0;
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
      return status !== "resigned" && status !== "terminated" && status !== "inactive";
    });

    setEmployees(active);
  };

  const getSchedules = async () => {
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .gte("day", dateFrom)
      .lte("day", dateTo);

    setSchedules(data || []);
  };

  const getShiftTemplates = async () => {
    const { data } = await supabase.from("shift_templates").select("*").order("id");
    setShiftTemplates(data || []);
  };

  const getApprovedLeaves = async () => {
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("status", "Approved")
      .lte("start_date", dateTo)
      .gte("end_date", dateFrom);

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
      .gte("attendance_date", dateFrom)
      .lte("attendance_date", dateTo);

    setEntries(data || []);
  };

  /// ACTIONS
  const updateLocalEntry = (
    employee: Employee,
    date: string,
    field: string,
    value: string
  ) => {
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

  const importBiometrics = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet =
      workbook.Sheets["Time Entries"] || workbook.Sheets[workbook.SheetNames[0]];

    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    const imported: AttendanceEntry[] = [];
    const missing: string[] = [];

    rows.forEach((row) => {
      const name = String(getValue(row, ["Name", "Employee", "Employee Name"])).trim();
      const date = parseExcelDate(getValue(row, ["Date", "Attendance Date"]));

      if (!name || !date) return;

      const employee = findEmployeeByName(name);

      if (!employee) {
        if (!missing.includes(name)) missing.push(name);
        return;
      }

      const scheduledIn = parseExcelTime(getValue(row, ["Approved In", "Schedule In", "Scheduled In"]));
      const scheduledOut = parseExcelTime(getValue(row, ["Approved Out", "Schedule Out", "Scheduled Out"]));
      const timeIn = parseExcelTime(getValue(row, ["Time In", "In"]));
      const timeOut = parseExcelTime(getValue(row, ["Time Out", "Out"]));

      const lateMinutes = parseMinutes(getValue(row, ["Late Min", "Late Minutes", "Late"]));
      const undertimeMinutes = parseMinutes(getValue(row, ["Undertime", "Undertime Min", "UT"]));
      const otMinutes = parseOtMinutes(getValue(row, ["OT Hrs", "OT Hours", "OT"]));

      let status = "Present";
      if (!timeIn && !timeOut) status = "Absent";
      if (lateMinutes > 0) status = "Late";
      if (undertimeMinutes > 0) status = "Undertime";

      imported.push({
        employee_id: employee.id,
        attendance_date: date,
        scheduled_shift: "Biometrics",
        scheduled_in: scheduledIn || null,
        scheduled_out: scheduledOut || null,
        time_in: timeIn || null,
        time_out: timeOut || null,
        late_minutes: lateMinutes,
        undertime_minutes: undertimeMinutes,
        ot_minutes: otMinutes,
        status,
        remarks: "Imported from biometrics",
      });
    });

    setMissingEmployees(missing);

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

    setImportStatus(
      `Imported ${imported.length} row(s). Missing employees: ${missing.length}`
    );
  };

  const saveAttendance = async () => {
    setIsSaving(true);

    const rows = attendanceRows.map((row) => ({
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
    }));

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
  }, [dateFrom, dateTo]);

  /// CALCULATIONS
  const departments = useMemo(() => {
  const list = employees
    .map((emp) => String(emp.department || "").trim())
    .filter((dept) => dept.length > 0);

  return Array.from(new Set(list)).sort();
}, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesDepartment =
        departmentFilter === "ALL" ||
        employee.department?.toLowerCase() === departmentFilter.toLowerCase();

      const searchText = `${employee.employee_no} ${employee.first_name} ${employee.last_name} ${employee.department} ${employee.position}`.toLowerCase();

      return matchesDepartment && searchText.includes(searchTerm.toLowerCase());
    });
  }, [employees, departmentFilter, searchTerm]);

  const attendanceRows = useMemo(() => {
    const rows: any[] = [];
    const dates = getDateRange();

    dates.forEach((date) => {
      filteredEmployees.forEach((employee) => {
        const entry = getEntry(employee.id, date);
        const computed = computeEntry(employee, date, entry);

        rows.push({
          key: getEntryKey(employee.id, date),
          employee,
          date,
          entry,
          ...computed,
        });
      });
    });

    return rows;
  }, [filteredEmployees, entries, schedules, approvedLeaves, settings, dateFrom, dateTo]);

  const presentCount = attendanceRows.filter((row) =>
    ["Present", "Late", "Undertime"].includes(row.status)
  ).length;

  const lateCount = attendanceRows.filter((row) => Number(row.late_minutes || 0) > 0).length;
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
              Import biometrics, review/edit time entries, and save payroll-ready attendance records.
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
          <SummaryCard title="Rows" value={attendanceRows.length} />
          <SummaryCard title="Present" value={presentCount} color="text-emerald-400" />
          <SummaryCard title="Late" value={lateCount} color="text-amber-400" />
          <SummaryCard title="Absent" value={absentCount} color="text-red-400" />
          <SummaryCard title="OT Hours" value={(totalOtMinutes / 60).toFixed(2)} color="text-blue-400" />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-black">Biometrics / Manual Review</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Only needed columns are imported. You can still edit wrong time entries before saving.
                </p>
              </div>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importBiometrics(file);
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm"
              />
            </div>

            {importStatus && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                {importStatus}
              </div>
            )}

            {missingEmployees.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                Missing employees: {missingEmployees.join(", ")}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              >
                <option value="daily">Daily</option>
                <option value="range">Cutoff Range</option>
              </select>

              {mode === "daily" ? (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
                />
              ) : (
                <>
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
                </>
              )}

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept: any) => (
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
            <table className="w-full min-w-[1550px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
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
                  <tr key={row.key} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold">{row.date}</td>

                    <td className="px-4 py-3">
                      <p className="font-black">
                        {row.employee.first_name} {row.employee.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.employee.department} • {row.employee.position || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-amber-400">{row.scheduled_shift}</p>
                      <p className="text-xs text-slate-500">
                        {row.scheduled_in || "--:--"} - {row.scheduled_out || "--:--"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={row.entry?.time_in || ""}
                        onChange={(e) =>
                          updateLocalEntry(row.employee, row.date, "time_in", e.target.value)
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={row.entry?.time_out || ""}
                        onChange={(e) =>
                          updateLocalEntry(row.employee, row.date, "time_out", e.target.value)
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
                          updateLocalEntry(row.employee, row.date, "remarks", e.target.value)
                        }
                        className="w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      />
                    </td>
                  </tr>
                ))}

                {attendanceRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-14 text-center text-slate-500">
                      No attendance rows found.
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
      : "bg-slate-700 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {status}
    </span>
  );
}