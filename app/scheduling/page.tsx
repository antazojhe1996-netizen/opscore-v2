"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  employment_status?: string;
};

type Schedule = {
  id: number;
  employee_id: string;
  day: string;
  shift: string;
};

type ShiftTemplate = {
  id: number;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
};

export default function SchedulingPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());

  /// DATA
  const defaultShifts: ShiftTemplate[] = [
    { id: 1, shift_name: "AM Shift", start_time: "07:00", end_time: "16:00" },
    { id: 2, shift_name: "PM Shift", start_time: "14:00", end_time: "23:59" },
    { id: 3, shift_name: "Mid Shift", start_time: "11:00", end_time: "20:00" },
    { id: 4, shift_name: "GY Shift", start_time: "23:00", end_time: "08:00" },
    { id: 5, shift_name: "OFF", start_time: null, end_time: null },
  ];

  /// FUNCTIONS
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

  const getVisibleDays = () => {
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
    const month = currentDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(year, month, index + 1);

      return {
        key: formatDateKey(date),
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dateLabel: formatShortDate(date),
      };
    });
  };

  const moveDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);

    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  const getDateRangeLabel = () => {
    const visibleDays = getVisibleDays();
    const first = visibleDays[0];
    const last = visibleDays[visibleDays.length - 1];

    if (!first || !last) return "";

    if (viewMode === "weekly") {
      return `${first.dateLabel} - ${last.dateLabel}, ${currentDate.getFullYear()}`;
    }

    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("EMPLOYEE ERROR:", error.message);
      return;
    }

    const activeEmployees = (data || []).filter(
      (employee) =>
        employee.employment_status !== "Resigned" &&
        employee.employment_status !== "Terminated"
    );

    setEmployees(activeEmployees);

    if (!selectedDepartment && activeEmployees.length > 0) {
      setSelectedDepartment(activeEmployees[0].department);
    }
  };

  const getSchedules = async () => {
    const { data, error } = await supabase.from("schedules").select("*");

    if (error) {
      console.log("SCHEDULE ERROR:", error.message);
      return;
    }

    setSchedules(data || []);
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

  const updateSchedule = async (
    employeeId: string,
    day: string,
    shift: string
  ) => {
    const existingSchedule = schedules.find(
      (schedule) => schedule.employee_id === employeeId && schedule.day === day
    );

    if (existingSchedule) {
      const { error } = await supabase
        .from("schedules")
        .update({ shift })
        .eq("id", existingSchedule.id);

      if (error) {
        console.log("UPDATE SCHEDULE ERROR:", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("schedules").insert({
        employee_id: employeeId,
        day,
        shift,
      });

      if (error) {
        console.log("INSERT SCHEDULE ERROR:", error.message);
        return;
      }
    }

    getSchedules();
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getSchedules();
    getShiftTemplates();
  }, []);

  /// CALCULATIONS
  const departments = useMemo(() => {
    const uniqueDepartments = employees
      .map((employee) => employee.department)
      .filter(Boolean);

    return Array.from(new Set(uniqueDepartments));
  }, [employees]);

  const filteredEmployees = employees.filter(
    (employee) => employee.department === selectedDepartment
  );

  const visibleDays = getVisibleDays();

  const tableGridColumns =
    viewMode === "weekly"
      ? `220px repeat(${visibleDays.length}, minmax(120px, 1fr))`
      : `220px repeat(${visibleDays.length}, 125px)`;

  const tableWidthClass =
    viewMode === "weekly" ? "w-full min-w-[1100px]" : "w-[4100px] max-w-none";

  const getShift = (employeeId: string, day: string) => {
    const foundSchedule = schedules.find(
      (schedule) => schedule.employee_id === employeeId && schedule.day === day
    );

    return foundSchedule?.shift || "OFF";
  };

  const getShiftLabel = (shiftName: string) => {
    if (shiftName === "OFF") return "OFF";

    const shift = shifts.find((item) => item.shift_name === shiftName);

    if (!shift) return shiftName;

    if (!shift.start_time || !shift.end_time) return shift.shift_name;

    return `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`;
  };

  const getShiftColorClass = (shift: string) => {
    const lowerShift = shift.toLowerCase();

    if (lowerShift.includes("am")) {
      return "border-blue-500/40 bg-blue-500/20 text-blue-300";
    }

    if (lowerShift.includes("pm")) {
      return "border-purple-500/40 bg-purple-500/20 text-purple-300";
    }

    if (lowerShift.includes("mid")) {
      return "border-green-500/40 bg-green-500/20 text-green-300";
    }

    if (lowerShift.includes("gy") || lowerShift.includes("night")) {
      return "border-indigo-500/40 bg-indigo-500/20 text-indigo-300";
    }

    if (lowerShift.includes("off")) {
      return "border-slate-600 bg-slate-800 text-slate-400";
    }

    return "border-slate-600 bg-slate-800 text-white";
  };

  const dailyStaffCount = visibleDays.map((day) =>
    filteredEmployees.filter(
      (employee) => getShift(employee.id, day.key) !== "OFF"
    ).length
  );

  const requiredHC = visibleDays.map(() => 0);

  const coverageGap = dailyStaffCount.map(
    (count, index) => count - requiredHC[index]
  );

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Scheduling</h1>
          <p className="mt-1 text-slate-400">
            Manage weekly and monthly staff schedules with shift color coding.
          </p>
        </section>

        <section className="mt-8 w-full max-w-full rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {selectedDepartment || "Department"} Schedule
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {getDateRangeLabel()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1">
                <button
                  onClick={() => setViewMode("weekly")}
                  className={
                    viewMode === "weekly"
                      ? "rounded-md bg-yellow-400 px-4 py-2 text-sm font-bold text-black"
                      : "rounded-md px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  }
                >
                  Weekly
                </button>

                <button
                  onClick={() => setViewMode("monthly")}
                  className={
                    viewMode === "monthly"
                      ? "rounded-md bg-yellow-400 px-4 py-2 text-sm font-bold text-black"
                      : "rounded-md px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  }
                >
                  Monthly
                </button>
              </div>

              <button
                onClick={() => moveDate("prev")}
                className="rounded-lg bg-slate-800 px-4 py-2 font-bold hover:bg-slate-700"
              >
                ‹
              </button>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700"
              >
                Today
              </button>

              <button
                onClick={() => moveDate("next")}
                className="rounded-lg bg-slate-800 px-4 py-2 font-bold hover:bg-slate-700"
              >
                ›
              </button>

              <select
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white"
              >
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="block w-full max-w-full overflow-x-auto overflow-y-hidden rounded-xl border border-slate-800">
            <div className={tableWidthClass}>
              <div
                className="grid bg-slate-950 text-sm font-bold text-slate-300"
                style={{ gridTemplateColumns: tableGridColumns }}
              >
                <div className="border-r border-slate-800 px-4 py-3">
                  Staff Name
                </div>

                {visibleDays.map((day) => (
                  <div
                    key={day.key}
                    className="border-r border-slate-800 px-4 py-3 text-center last:border-r-0"
                  >
                    <div>{day.dayName}</div>
                    <div className="mt-1 text-xs font-normal text-slate-400">
                      {day.dateLabel}
                    </div>
                  </div>
                ))}
              </div>

              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid border-t border-slate-800 text-sm"
                  style={{ gridTemplateColumns: tableGridColumns }}
                >
                  <div className="border-r border-slate-800 px-4 py-3 font-semibold">
                    {employee.first_name} {employee.last_name}
                  </div>

                  {visibleDays.map((day) => {
                    const currentShift = getShift(employee.id, day.key);

                    return (
                      <div
                        key={`${employee.id}-${day.key}`}
                        className="border-r border-slate-800 px-2 py-2 last:border-r-0"
                      >
                        <select
                          value={currentShift}
                          onChange={(event) =>
                            updateSchedule(
                              employee.id,
                              day.key,
                              event.target.value
                            )
                          }
                          className={`block rounded-md border px-2 py-2 text-center text-xs font-bold outline-none ${
                            viewMode === "weekly" ? "w-full" : "w-[105px]"
                          } ${getShiftColorClass(currentShift)}`}
                        >
                          {shifts.map((shift) => (
                            <option
                              key={shift.shift_name}
                              value={shift.shift_name}
                            >
                              {getShiftLabel(shift.shift_name)}
                            </option>
                          ))}

                          {!shifts.some(
                            (shift) => shift.shift_name === "OFF"
                          ) && <option value="OFF">OFF</option>}
                        </select>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div
                className="grid border-t border-slate-700 bg-slate-800/60 text-sm font-semibold"
                style={{ gridTemplateColumns: tableGridColumns }}
              >
                <div className="border-r border-slate-700 px-4 py-3">
                  Daily Staff Count
                </div>

                {dailyStaffCount.map((count, index) => (
                  <div
                    key={visibleDays[index].key}
                    className="border-r border-slate-700 px-4 py-3 text-center last:border-r-0"
                  >
                    {count}
                  </div>
                ))}
              </div>

              <div
                className="grid border-t border-slate-700 bg-slate-800/40 text-sm font-semibold"
                style={{ gridTemplateColumns: tableGridColumns }}
              >
                <div className="border-r border-slate-700 px-4 py-3">
                  Required HC
                </div>

                {requiredHC.map((required, index) => (
                  <div
                    key={visibleDays[index].key}
                    className="border-r border-slate-700 px-4 py-3 text-center text-green-400 last:border-r-0"
                  >
                    {required}
                  </div>
                ))}
              </div>

              <div
                className="grid border-t border-slate-700 bg-slate-800/40 text-sm font-semibold"
                style={{ gridTemplateColumns: tableGridColumns }}
              >
                <div className="border-r border-slate-700 px-4 py-3">
                  Coverage Gap
                </div>

                {coverageGap.map((gap, index) => (
                  <div
                    key={visibleDays[index].key}
                    className={
                      gap < 0
                        ? "border-r border-slate-700 px-4 py-3 text-center text-red-400 last:border-r-0"
                        : gap > 0
                        ? "border-r border-slate-700 px-4 py-3 text-center text-yellow-400 last:border-r-0"
                        : "border-r border-slate-700 px-4 py-3 text-center text-green-400 last:border-r-0"
                    }
                  >
                    {gap > 0 ? `+${gap}` : gap}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}