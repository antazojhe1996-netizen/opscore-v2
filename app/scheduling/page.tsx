"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function SchedulingPage() {
  /// STATES
  const [selectedDepartment, setSelectedDepartment] = useState("Front Desk");

  /// DATA
  const departments = ["Front Desk", "Housekeeping", "Restaurant", "Kitchen"];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const employees = [
    { name: "Aldrin Pineda", department: "Front Desk" },
    { name: "Andria Macaraig", department: "Front Desk" },
    { name: "Aicelle Luat", department: "Front Desk" },
    { name: "Janelle Pangan", department: "Front Desk" },
    { name: "Irish Anit", department: "Front Desk" },
    { name: "Laurence Asuncion", department: "Front Desk" },
    { name: "Maria Santos", department: "Housekeeping" },
    { name: "Jenny Cruz", department: "Housekeeping" },
    { name: "Carlo Reyes", department: "Restaurant" },
    { name: "Ben Garcia", department: "Kitchen" },
  ];

  const shifts = ["7AM-4PM", "3PM-12AM", "11PM-8AM", "OFF"];

  const schedule = [
    ["7AM-4PM", "OFF", "7AM-4PM", "7AM-4PM", "7AM-4PM", "OFF", "OFF"],
    ["3PM-12AM", "OFF", "OFF", "11PM-8AM", "OFF", "7AM-4PM", "7AM-4PM"],
    ["OFF", "7AM-4PM", "OFF", "3PM-12AM", "11PM-8AM", "OFF", "OFF"],
    ["11PM-8AM", "11PM-8AM", "11PM-8AM", "OFF", "3PM-12AM", "OFF", "3PM-12AM"],
    ["OFF", "3PM-12AM", "3PM-12AM", "OFF", "OFF", "11PM-8AM", "11PM-8AM"],
    ["7AM-4PM", "OFF", "OFF", "OFF", "OFF", "3PM-12AM", "OFF"],
    ["7AM-4PM", "7AM-4PM", "OFF", "OFF", "7AM-4PM", "OFF", "OFF"],
    ["OFF", "7AM-4PM", "7AM-4PM", "7AM-4PM", "OFF", "OFF", "OFF"],
    ["11AM-8PM", "OFF", "11AM-8PM", "OFF", "11AM-8PM", "OFF", "OFF"],
    ["7AM-4PM", "OFF", "7AM-4PM", "OFF", "7AM-4PM", "OFF", "OFF"],
  ];

  const requiredHC = [2, 2, 2, 2, 2, 2, 2];

  /// CALCULATIONS
  const filteredEmployees = employees.filter(
    (employee) => employee.department === selectedDepartment
  );

  const filteredSchedules = filteredEmployees.map((employee) => {
    const originalIndex = employees.findIndex(
      (item) => item.name === employee.name
    );

    return {
      ...employee,
      schedule: schedule[originalIndex],
    };
  });

  const dailyStaffCount = days.map((_, dayIndex) =>
    filteredSchedules.filter(
      (employee) => employee.schedule[dayIndex] !== "OFF"
    ).length
  );

  const coverageGap = dailyStaffCount.map(
    (count, index) => count - requiredHC[index]
  );

  /// FUNCTIONS

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Scheduling</h1>
          <p className="mt-1 text-slate-400">
            Weekly live schedule and coverage monitoring
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {selectedDepartment} Live Schedule
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Weekly schedule by department
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

              {filteredSchedules.map((employee) => (
                <div
                  key={employee.name}
                  className="grid grid-cols-8 border-t border-slate-800 text-sm"
                >
                  <div className="border-r border-slate-800 px-4 py-3 font-semibold">
                    {employee.name}
                  </div>

                  {employee.schedule.map((shift, index) => (
                    <div
                      key={`${employee.name}-${days[index]}`}
                      className="border-r border-slate-800 px-2 py-2 last:border-r-0"
                    >
                      <select
                        defaultValue={shift}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-center text-xs text-white"
                      >
                        {shifts.map((option) => (
                          <option key={option} value={option}>
                            {option}
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