"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../lib/supabase";


type Employee = {
  id: string;
  employee_no?: string;
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
  id: string | number;
  shift_name: string;
  start_time: string | null;
  end_time: string | null;
  color: string | null;
};

type HCRules = {
  occupancyRules: any[];
  peakRules: any[];
  eventRules: any[];
};

export default function SchedulingPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hcRules, setHcRules] = useState<HCRules | null>(null);
  const [roomsSold, setRoomsSold] = useState(1);
  const [showWarnings, setShowWarnings] = useState(false);
  const [copyingSchedule, setCopyingSchedule] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [eventAddons, setEventAddons] = useState<any[]>([]);
  const todayColumnRef = useRef<HTMLDivElement | null>(null);

  /// DATA
  const defaultShifts: ShiftTemplate[] = [
    { id: 1, shift_name: "AM Shift", start_time: "07:00", end_time: "16:00", color: "blue" },
    { id: 2, shift_name: "PM Shift", start_time: "14:00", end_time: "23:59", color: "purple" },
    { id: 3, shift_name: "Mid Shift", start_time: "11:00", end_time: "20:00", color: "green" },
    { id: 4, shift_name: "GY Shift", start_time: "23:00", end_time: "08:00", color: "gray" },
    { id: 5, shift_name: "OFF", start_time: null, end_time: null, color: "gray" },
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
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const daysArray = [];
    const date = new Date(startDate);

    while (date <= endDate) {
      daysArray.push({
        key: formatDateKey(date),
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dateLabel: formatShortDate(date),
      });

      date.setDate(date.getDate() + 1);
    }

    return daysArray;
  };

  const visibleDays = getVisibleDays();

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("EMPLOYEE ERROR:", error.message);
      return;
    }

    const activeEmployees = (data || []).filter((employee) => {
      const status = employee.employment_status?.trim().toLowerCase();
      return status !== "resigned" && status !== "terminated";
    });

    setEmployees(activeEmployees);

    const firstDepartment = activeEmployees.find(
      (employee) => employee.department?.trim()
    )?.department?.trim();

    if (firstDepartment) {
      setSelectedDepartment((current) => current || firstDepartment);
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

  const getApprovedLeaves = async () => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("status", "Approved");

    if (error) {
      console.log("GET APPROVED LEAVES ERROR:", error.message);
      return;
    }

    console.log("APPROVED LEAVES:", data);
    setApprovedLeaves(data || []);
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

 const loadHCRules = async () => {
  const { data, error } = await supabase
    .from("hc_rule_settings")
    .select("*")
    .eq("setting_name", "hc_rules")
    .single();

  if (error) {
    console.log(error);
    return;
  }

  console.log("HC SETTINGS:", data);

  setHcRules(data.setting_data);
};

  const getEmployeeMatchKeys = (employee: Employee) => {
    return [
      String(employee.id || "").trim(),
      String(employee.employee_no || "").trim(),
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
    ]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
  };

  const isEmployeeOnLeave = (employee: Employee, dayKey: string) => {
    const employeeKeys = getEmployeeMatchKeys(employee);

    return approvedLeaves.some((leave) => {
      const leaveEmployeeId = String(leave.employee_id || "").trim().toLowerCase();

      return (
        employeeKeys.includes(leaveEmployeeId) &&
        dayKey >= String(leave.start_date) &&
        dayKey <= String(leave.end_date)
      );
    });
  };

  const getLeaveType = (employee: Employee, dayKey: string) => {
    const employeeKeys = getEmployeeMatchKeys(employee);

    const foundLeave = approvedLeaves.find((leave) => {
      const leaveEmployeeId = String(leave.employee_id || "").trim().toLowerCase();

      return (
        employeeKeys.includes(leaveEmployeeId) &&
        dayKey >= String(leave.start_date) &&
        dayKey <= String(leave.end_date)
      );
    });

    return foundLeave?.leave_type || "Approved Leave";
  };

  const getShift = (employeeId: string, day: string) => {
    const foundSchedule = schedules.find(
      (schedule) =>
        String(schedule.employee_id) === String(employeeId) &&
        String(schedule.day) === String(day)
    );

    return foundSchedule?.shift || "OFF";
  };

  const updateSchedule = async (employeeId: string, day: string, shift: string) => {
    const employee = employees.find((emp) => String(emp.id) === String(employeeId));

    if (employee && isEmployeeOnLeave(employee, day) && shift !== "OFF") {
      alert("This employee has an approved leave on this date.");
      return;
    }

    setSaveStatus("saving");

    const existingSchedule = schedules.find(
      (schedule) =>
        String(schedule.employee_id) === String(employeeId) &&
        String(schedule.day) === String(day)
    );

    if (existingSchedule) {
      const { error } = await supabase
        .from("schedules")
        .update({ shift })
        .eq("id", existingSchedule.id);

      if (error) {
        console.log("UPDATE SCHEDULE ERROR:", error.message);
        setSaveStatus("idle");
        return;
      }

      setSchedules((prev) =>
        prev.map((schedule) =>
          schedule.id === existingSchedule.id ? { ...schedule, shift } : schedule
        )
      );

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
      return;
    }

    const { data, error } = await supabase
      .from("schedules")
      .insert({
        employee_id: employeeId,
        day,
        shift,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.log("INSERT SCHEDULE ERROR:", error.message);
      setSaveStatus("idle");
      return;
    }

    setSchedules((prev) => [
      ...prev,
      {
        id: data?.id || Date.now(),
        employee_id: employeeId,
        day,
        shift,
      },
    ]);

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  };

  const moveDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);

    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setFullYear(
        newDate.getFullYear() + (direction === "next" ? 1 : -1)
      );
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeLabel = () => {
    const first = visibleDays[0];
    const last = visibleDays[visibleDays.length - 1];

    if (!first || !last) return "";

    if (viewMode === "weekly") {
      return `${first.dateLabel} - ${last.dateLabel}, ${currentDate.getFullYear()}`;
    }

    return `Full Year ${currentDate.getFullYear()}`;
  };

  const getShortShiftLabel = (shiftName: string) => {
    const shift = shifts.find((item) => item.shift_name === shiftName);

    if (shiftName === "OFF") return "OFF";

    const shortName = shiftName.includes("AM")
      ? "AM"
      : shiftName.includes("PM")
      ? "PM"
      : shiftName.includes("Mid")
      ? "MID"
      : shiftName.includes("GY")
      ? "GY"
      : shiftName;

    if (!shift?.start_time || !shift?.end_time) return shortName;

    return `${shortName} ${shift.start_time.slice(0, 5)}-${shift.end_time.slice(
      0,
      5
    )}`;
  };

  const normalizeColor = (color?: string | null) => {
    if (!color) return "blue";
    if (color.includes("green")) return "green";
    if (color.includes("yellow")) return "yellow";
    if (color.includes("purple")) return "purple";
    if (color.includes("red")) return "red";
    if (color.includes("slate") || color.includes("gray")) return "gray";
    return "blue";
  };

  const getShiftColorClass = (shiftName: string) => {
    const shift = shifts.find((item) => item.shift_name === shiftName);
    const colorKey = normalizeColor(shift?.color);

    if (colorKey === "blue") return "border-blue-500/40 bg-blue-500/20 text-blue-300";
    if (colorKey === "green") return "border-green-500/40 bg-green-500/20 text-green-300";
    if (colorKey === "yellow") return "border-yellow-500/40 bg-yellow-500/20 text-yellow-300";
    if (colorKey === "purple") return "border-purple-500/40 bg-purple-500/20 text-purple-300";
    if (colorKey === "red") return "border-red-500/40 bg-red-500/20 text-red-300";

    return "border-slate-600 bg-slate-800 text-slate-400";
  };

  const copyLastWeekSchedule = async () => {
    if (viewMode !== "weekly") {
      alert("Copy Last Week is only available in weekly view.");
      return;
    }

    const confirmCopy = window.confirm("Copy last week's schedule into this week?");
    if (!confirmCopy) return;

    try {
      setCopyingSchedule(true);

      const currentWeekStart = new Date(visibleDays[0].key);
      const lastWeekStart = new Date(currentWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

      const startKey = formatDateKey(lastWeekStart);
      const endKey = formatDateKey(lastWeekEnd);

      const { data: lastWeekSchedules, error } = await supabase
        .from("schedules")
        .select("*")
        .gte("day", startKey)
        .lte("day", endKey);

      if (error) throw error;

      const newSchedules =
        lastWeekSchedules?.map((schedule) => {
          const oldDate = new Date(schedule.day);
          const newDate = new Date(oldDate);
          newDate.setDate(newDate.getDate() + 7);

          return {
            employee_id: schedule.employee_id,
            day: formatDateKey(newDate),
            shift: schedule.shift,
          };
        }) || [];

      if (newSchedules.length === 0) {
        alert("No schedule found from last week.");
        return;
      }

      const currentWeekKeys = visibleDays.map((day) => day.key);

      await supabase.from("schedules").delete().in("day", currentWeekKeys);

      const { error: insertError } = await supabase
        .from("schedules")
        .insert(newSchedules);

      if (insertError) throw insertError;

      await getSchedules();
      alert("Schedule copied successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to copy schedule.");
    } finally {
      setCopyingSchedule(false);
    }
  };

const getEventAddons = async () => {
  const { data, error } = await supabase
    .from("event_addons")
    .select("*");

  if (error) {
    console.log("GET EVENT ADDONS ERROR:", error.message);
    return;
  }

  setEventAddons(data || []);
};



  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getSchedules();
    getShiftTemplates();
    loadHCRules();
    getApprovedLeaves();
    getEventAddons();
  }, []);

  useEffect(() => {
    if (viewMode === "monthly" && todayColumnRef.current) {
      setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }, 100);
    }
  }, [viewMode, currentDate]);

  /// CALCULATIONS
  const departments = useMemo(() => {
    const uniqueDepartments = employees
      .map((employee) => employee.department?.trim())
      .filter((department): department is string => Boolean(department));

    return Array.from(new Set(uniqueDepartments));
  }, [employees]);

  useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments, selectedDepartment]);

  const filteredEmployees = selectedDepartment
    ? employees.filter((employee) => employee.department?.trim() === selectedDepartment)
    : employees;

  const tableGridColumns =
    viewMode === "weekly"
      ? `220px repeat(${visibleDays.length}, minmax(120px, 1fr))`
      : `220px repeat(${visibleDays.length}, 125px)`;

  const tableWidthClass =
    viewMode === "weekly" ? "w-full min-w-[1100px]" : "w-[46000px] max-w-none";

  const dailyStaffCount = visibleDays.map((day) =>
    filteredEmployees.filter(
      (employee) =>
        getShift(employee.id, day.key) !== "OFF" &&
        !isEmployeeOnLeave(employee, day.key)
    ).length
  );

  const approvedLeaveCount = visibleDays.map((day) =>
    filteredEmployees.filter((employee) => isEmployeeOnLeave(employee, day.key)).length
  );


  const getRequiredHC = (dayKey: string) => {
  if (!hcRules || !selectedDepartment) return 0;

  const occupancyRule = hcRules.occupancyRules?.find((rule: any) => {
    return (
      roomsSold >= Number(rule.min || 0) &&
      roomsSold <= Number(rule.max || 999999)
    );
  });

  const baseHC = Number(occupancyRule?.rules?.[selectedDepartment] || 0);

  const dayName = new Date(dayKey).toLocaleDateString("en-US", {
    weekday: "long",
  });

  const peakRule = hcRules.peakRules?.find((rule: any) => {
    return rule.day === dayName;
  });

const peakHC = Number(peakRule?.rules?.[selectedDepartment] || 0);

const eventToday = eventAddons.find(
  (event) => String(event.event_date) === String(dayKey)
);

const eventPax = Number(eventToday?.expected_pax || 0);

const eventRule = hcRules.eventRules?.find((rule: any) => {
  return (
    eventPax >= Number(rule.min || 0) &&
    eventPax <= Number(rule.max || 999999)
  );
});

const eventHC = Number(eventRule?.rules?.[selectedDepartment] || 0);

return baseHC + peakHC + eventHC;
};

const requiredHC = visibleDays.map((day) => getRequiredHC(day.key));

  const coverageGap = dailyStaffCount.map(
    (count, index) => count - requiredHC[index]
  );

  const recommendationText = coverageGap.map((gap) => {
    if (gap < 0) return `Add ${Math.abs(gap)} staff`;
    if (gap > 0) return `Reduce ${gap} staff`;
    return "Good coverage";
  });

  const understaffDays = coverageGap.filter((gap) => gap < 0).length;
  const overstaffDays = coverageGap.filter((gap) => gap > 0).length;
  const totalApprovedLeaves = approvedLeaveCount.reduce((sum, count) => sum + count, 0);

  const employeeNameCount = filteredEmployees.reduce<Record<string, number>>(
    (count, employee) => {
      const name = `${employee.first_name} ${employee.last_name}`.toLowerCase();
      count[name] = (count[name] || 0) + 1;
      return count;
    },
    {}
  );

  const duplicateEmployees = filteredEmployees.filter((employee) => {
    const name = `${employee.first_name} ${employee.last_name}`.toLowerCase();
    return employeeNameCount[name] > 1;
  });

  const unscheduledEmployees = filteredEmployees.filter((employee) =>
    visibleDays.every(
      (day) =>
        getShift(employee.id, day.key) === "OFF" &&
        !isEmployeeOnLeave(employee, day.key)
    )
  );

  const overworkedEmployees = filteredEmployees.filter((employee) => {
    const workingDays = visibleDays.filter(
      (day) =>
        getShift(employee.id, day.key) !== "OFF" &&
        !isEmployeeOnLeave(employee, day.key)
    ).length;

    return workingDays >= 7;
  });

  const totalScheduleWarnings =
    understaffDays +
    overstaffDays +
    duplicateEmployees.length +
    unscheduledEmployees.length +
    overworkedEmployees.length +
    totalApprovedLeaves;

  const hasScheduleWarnings = totalScheduleWarnings > 0;

  const autoFixGaps = async () => {
    try {
      if (viewMode !== "weekly") {
        alert("Auto Fix Gaps is only available in weekly view.");
        return;
      }

      const updates: {
        employeeId: string;
        day: string;
        shift: string;
      }[] = [];

      visibleDays.forEach((day, dayIndex) => {
        const gap = coverageGap[dayIndex];

        if (gap >= 0) return;

        const availableEmployees = filteredEmployees.filter(
          (employee) =>
            getShift(employee.id, day.key) === "OFF" &&
            !isEmployeeOnLeave(employee, day.key)
        );

        availableEmployees.slice(0, Math.abs(gap)).forEach((employee) => {
          updates.push({
            employeeId: employee.id,
            day: day.key,
            shift: "PM Shift",
          });
        });
      });

      for (const update of updates) {
        await updateSchedule(update.employeeId, update.day, update.shift);
      }

      await getSchedules();
      alert(`${updates.length} schedule gaps fixed.`);
    } catch (error) {
      console.error(error);
      alert("Failed to auto fix schedule.");
    }
  };

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Scheduling</h1>
          <p className="mt-1 text-slate-400">
            Manage weekly and monthly staff schedules with approved leave protection.
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

                {hasScheduleWarnings && (
                  <span
                    onMouseEnter={() => setShowWarnings(true)}
                    onMouseLeave={() => setShowWarnings(false)}
                    className="relative ml-2 cursor-help font-medium text-yellow-400"
                  >
                    • {totalScheduleWarnings} schedule warnings

                    {showWarnings && (
                      <div className="absolute left-0 top-6 z-50 w-96 rounded-lg border border-yellow-500/30 bg-slate-950 p-3 text-sm font-normal text-slate-300 shadow-xl">
                        <p className="mb-2 font-semibold text-yellow-400">
                          Schedule Warnings
                        </p>

                        {understaffDays > 0 && <p>• {understaffDays} day(s) understaffed.</p>}
                        {overstaffDays > 0 && <p>• {overstaffDays} day(s) overstaffed.</p>}
                        {totalApprovedLeaves > 0 && <p>• {totalApprovedLeaves} approved leave marker(s).</p>}
                        {duplicateEmployees.length > 0 && <p>• {duplicateEmployees.length} duplicate employee record detected.</p>}
                        {unscheduledEmployees.length > 0 && <p>• {unscheduledEmployees.length} employee has no schedule this week.</p>}
                        {overworkedEmployees.length > 0 && <p>• {overworkedEmployees.length} employee scheduled 7 straight days.</p>}
                      </div>
                    )}
                  </span>
                )}
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

              <button onClick={() => moveDate("prev")} className="rounded-lg bg-slate-800 px-4 py-2 font-bold hover:bg-slate-700">
                ‹
              </button>

              <button onClick={goToToday} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700">
                Today
              </button>

              <button
                onClick={copyLastWeekSchedule}
                disabled={copyingSchedule || viewMode !== "weekly"}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
              >
                {copyingSchedule ? "Copying..." : "Copy Last Week"}
              </button>

              <button
                onClick={autoFixGaps}
                disabled={viewMode !== "weekly"}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50"
              >
                Auto Fix Gaps
              </button>

              <button onClick={() => moveDate("next")} className="rounded-lg bg-slate-800 px-4 py-2 font-bold hover:bg-slate-700">
                ›
              </button>

              <select
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white"
              >
                {departments.length === 0 && <option value="">No departments found</option>}

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
                <div className="sticky left-0 z-30 border-r border-slate-800 bg-slate-950 px-4 py-3">
                  Staff Name
                </div>

                {visibleDays.map((day) => {
                  const todayKey = formatDateKey(new Date());
                  const isToday = day.key === todayKey;

                  return (
                    <div
                      key={day.key}
                      ref={isToday ? todayColumnRef : null}
                      className="border-r border-slate-800 px-4 py-3 text-center last:border-r-0"
                    >
                      <div>{day.dayName}</div>
                      <div className="mt-1 text-xs font-normal text-slate-400">
                        {day.dateLabel}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid border-t border-slate-800 text-sm"
                  style={{ gridTemplateColumns: tableGridColumns }}
                >
                  <div className="sticky left-0 z-20 border-r border-slate-800 bg-slate-900 px-4 py-3 font-semibold">
                    {employee.first_name} {employee.last_name}
                  </div>

                  {visibleDays.map((day) => {
                    const currentShift = getShift(employee.id, day.key);
                    const onLeave = isEmployeeOnLeave(employee, day.key);

                    return (
                      <div
                        key={`${employee.id}-${day.key}`}
                        className="border-r border-slate-800 px-2 py-2 last:border-r-0"
                      >
                        {onLeave ? (
                          <div className="rounded-md border border-red-500/40 bg-red-500/20 px-2 py-2 text-center text-xs font-bold text-red-300">
                            ON LEAVE
                            <div className="mt-1 text-[10px] font-normal text-red-200">
                              {getLeaveType(employee, day.key)}
                            </div>
                          </div>
                        ) : (
                          <select
                            value={currentShift}
                            onChange={(event) =>
                              updateSchedule(employee.id, day.key, event.target.value)
                            }
                            className={`block rounded-md border px-2 py-2 text-center text-xs font-bold outline-none ${
                              viewMode === "weekly" ? "w-full" : "w-[105px]"
                            } ${getShiftColorClass(currentShift)}`}
                          >
                            {shifts.map((shift) => (
                              <option
                                key={shift.shift_name}
                                value={shift.shift_name}
                                className="bg-slate-900 text-white"
                              >
                                {getShortShiftLabel(shift.shift_name)}
                              </option>
                            ))}

                            {!shifts.some((shift) => shift.shift_name === "OFF") && (
                              <option value="OFF">OFF</option>
                            )}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="grid border-t border-slate-700 bg-slate-800/60 text-sm font-semibold" style={{ gridTemplateColumns: tableGridColumns }}>
                <div className="sticky left-0 z-20 border-r border-slate-700 bg-slate-800 px-4 py-3">
                  Daily Staff Count
                </div>

                {dailyStaffCount.map((count, index) => (
                  <div key={visibleDays[index].key} className="border-r border-slate-700 px-4 py-3 text-center last:border-r-0">
                    {count}
                  </div>
                ))}
              </div>

             

              <div className="grid border-t border-slate-700 bg-slate-800/40 text-sm font-semibold" style={{ gridTemplateColumns: tableGridColumns }}>
                <div className="sticky left-0 z-20 border-r border-slate-700 bg-slate-800 px-4 py-3">
                  Required HC
                </div>

                {requiredHC.map((required, index) => (
                  <div key={visibleDays[index].key} className="border-r border-slate-700 px-4 py-3 text-center text-green-400 last:border-r-0">
                    {required}
                  </div>
                ))}
              </div>

              <div className="grid border-t border-slate-700 bg-slate-800/40 text-sm font-semibold" style={{ gridTemplateColumns: tableGridColumns }}>
                <div className="sticky left-0 z-20 border-r border-slate-700 bg-slate-800 px-4 py-3">
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

              <div className="grid border-t border-slate-700 bg-slate-900/80 text-sm font-semibold" style={{ gridTemplateColumns: tableGridColumns }}>
                <div className="sticky left-0 z-20 border-r border-slate-700 bg-slate-900 px-4 py-3">
                  Recommendation
                </div>

                {recommendationText.map((text, index) => (
                  <div
                    key={visibleDays[index].key}
                    className={
                      coverageGap[index] < 0
                        ? "border-r border-slate-700 px-3 py-3 text-center text-red-400 last:border-r-0"
                        : coverageGap[index] > 0
                        ? "border-r border-slate-700 px-3 py-3 text-center text-yellow-400 last:border-r-0"
                        : "border-r border-slate-700 px-3 py-3 text-center text-green-400 last:border-r-0"
                    }
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {saveStatus !== "idle" && (
            <div className="fixed bottom-4 right-4 z-50">
              <div
                className={`rounded-lg border px-4 py-2 text-sm shadow-lg backdrop-blur ${
                  saveStatus === "saving"
                    ? "border-yellow-500/30 bg-slate-900/90 text-yellow-400"
                    : "border-green-500/30 bg-slate-900/90 text-green-400"
                }`}
              >
                {saveStatus === "saving" ? "Saving changes..." : "✓ All changes saved"}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}