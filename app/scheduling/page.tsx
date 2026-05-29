"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../lib/supabase";

export default function SchedulingPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("Frontdesk");

  /// DATA
  const departments = [
    "Frontdesk",
    "Housekeeping",
    "Waitress",
    "Kitchen",
    "Cashier",
    "Management",
    "CEO",
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const shifts = ["7AM-4PM", "3PM-12AM", "11PM-8AM", "11AM-8PM", "OFF"];

  const requiredHC = [2, 2, 2, 2, 2, 2, 2];

  /// FUNCTIONS
  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("EMPLOYEE ERROR:", error.message);
      return;
    }

    setEmployees(data || []);
  };

  const getSchedules = async () => {
    const { data, error } = await supabase.from("schedules").select("*");

    if (error) {
      console.log("SCHEDULE ERROR:", error.message);
      return;
    }

    setSchedules(data || []);
  };

  const updateSchedule = async (
    employeeId: string,
    day: string,
    shift: string
  ) => {
    const existingSchedule = schedules.find(
      (schedule) =>
        schedule.employee_id === employeeId && schedule.day === day
    );

    if (existingSchedule) {
      await supabase
        .from("schedules")
        .update({ shift })
        .eq("id", existingSchedule.id);
    } else {
      await supabase.from("schedules").insert({
        employee_id: employeeId,
        day,
        shift,
      });
    }

    getSchedules();
  };

  useEffect(() => {
    getEmployees();
    getSchedules();
  }, []);

  /// CALCULATIONS
  const filteredEmployees = employees.filter(
    (employee) => employee.department === selectedDepartment
  );

  const getShift = (employeeId: string, day: string) => {
    const foundSchedule = schedules.find(
      (schedule) =>
        schedule.employee_id === employeeId && schedule.day === day
    );

    return foundSchedule?.shift || "OFF";
  };

  const dailyStaffCount = days.map((day) =>
    filteredEmployees.filter(
      (employee) => getShift(employee.id, day) !== "OFF"
    ).length
  );

  const coverageGap = dailyStaffCount.map(
    (count, index) => count - requiredHC[index]
  );

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Weekly Scheduling</h1>
          <p className="mt-1 text-slate-400">
            Live weekly schedule connected to Supabase database
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {selectedDepartment} Schedule
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Edit shifts directly from the weekly table
              </p>
            </div>

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

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-8 bg-slate-950 text-sm font-bold text-slate-300">
                <div className="border-r border-slate-800 px-4 py-3">
                  Staff Name
                </div>

                {days.map((day) => (
                  <div
                    key={day}
                    className="border-r border-slate-800 px-4 py-3 text-center last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-8 border-t border-slate-800 text-sm"
                >
                  <div className="border-r border-slate-800 px-4 py-3 font-semibold">
                    {employee.first_name} {employee.last_name}
                  </div>

                  {days.map((day) => (
                    <div
                      key={`${employee.id}-${day}`}
                      className="border-r border-slate-800 px-2 py-2 last:border-r-0"
                    >
                      <select
                        value={getShift(employee.id, day)}
                        onChange={(event) =>
                          updateSchedule(employee.id, day, event.target.value)
                        }
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-center text-xs text-white"
                      >
                        {shifts.map((shift) => (
                          <option key={shift} value={shift}>
                            {shift}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ))}

              <div className="grid grid-cols-8 border-t border-slate-700 bg-slate-800/60 text-sm font-semibold">
                <div className="border-r border-slate-700 px-4 py-3">
                  Daily Staff Count
                </div>

                {dailyStaffCount.map((count, index) => (
                  <div
                    key={days[index]}
                    className="border-r border-slate-700 px-4 py-3 text-center last:border-r-0"
                  >
                    {count}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-8 border-t border-slate-700 bg-slate-800/40 text-sm font-semibold">
                <div className="border-r border-slate-700 px-4 py-3">
                  Required HC
                </div>

                {requiredHC.map((required, index) => (
                  <div
                    key={days[index]}
                    className="border-r border-slate-700 px-4 py-3 text-center text-green-400 last:border-r-0"
                  >
                    {required}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-8 border-t border-slate-700 bg-slate-800/40 text-sm font-semibold">
                <div className="border-r border-slate-700 px-4 py-3">
                  Coverage Gap
                </div>

                {coverageGap.map((gap, index) => (
                  <div
                    key={days[index]}
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