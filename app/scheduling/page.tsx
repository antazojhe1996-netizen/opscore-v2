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
  position?: string;
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

export default function SchedulingPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [copyingSchedule, setCopyingSchedule] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hcRules, setHcRules] = useState<any>(null);
  const [roomsSold, setRoomsSold] = useState(1);
  const [eventAddons, setEventAddons] = useState<any[]>([]);
  const todayColumnRef = useRef<HTMLDivElement | null>(null);

  /// DATA
  const defaultShifts: ShiftTemplate[] = [
    { id: 1, shift_name: "AM Shift", start_time: "07:00", end_time: "16:00", color: "blue" },
    { id: 2, shift_name: "PM Shift", start_time: "14:00", end_time: "23:00", color: "purple" },
    { id: 3, shift_name: "Mid Shift", start_time: "11:00", end_time: "20:00", color: "green" },
    { id: 4, shift_name: "GY Shift", start_time: "23:00", end_time: "08:00", color: "yellow" },
    { id: 5, shift_name: "OFF", start_time: null, end_time: null, color: "gray" },
  ];

  /// FUNCTIONS
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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

  const visibleDays = useMemo(() => {
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
    const days = [];
    const date = new Date(startDate);

    while (date <= endDate) {
      days.push({
        key: formatDateKey(date),
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dateLabel: formatShortDate(date),
      });

      date.setDate(date.getDate() + 1);
    }

    return days;
  }, [currentDate, viewMode]);

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("department", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.log("EMPLOYEE ERROR:", error.message);
      return;
    }

    const activeEmployees = (data || []).filter((employee) => {
      const status = String(employee.employment_status || "").trim().toLowerCase();
      return status !== "resigned" && status !== "terminated" && status !== "inactive";
    });

    setEmployees(activeEmployees);
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
      console.log("LEAVE ERROR:", error.message);
      return;
    }

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
      console.log("HC RULES ERROR:", error.message);
      return;
    }

    setHcRules(data.setting_data);
  };

  const getEventAddons = async () => {
    const { data, error } = await supabase.from("event_addons").select("*");

    if (error) {
      console.log("EVENT ADDONS ERROR:", error.message);
      return;
    }

    setEventAddons(data || []);
  };

  const getRequiredHC = (dayKey: string) => {
    if (!hcRules || selectedDepartment === "ALL") return 0;

    const occupancyRule = hcRules.occupancyRules?.find((rule: any) => {
      return roomsSold >= Number(rule.min || 0) && roomsSold <= Number(rule.max || 999999);
    });

    const baseHC = Number(occupancyRule?.rules?.[selectedDepartment] || 0);

    const dayName = new Date(dayKey).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const peakRule = hcRules.peakRules?.find((rule: any) => rule.day === dayName);
    const peakHC = Number(peakRule?.rules?.[selectedDepartment] || 0);

    const eventToday = eventAddons.find(
      (event) => String(event.event_date) === String(dayKey)
    );

    const eventPax = Number(eventToday?.expected_pax || 0);

    const eventRule = hcRules.eventRules?.find((rule: any) => {
      return eventPax >= Number(rule.min || 0) && eventPax <= Number(rule.max || 999999);
    });

    const eventHC = Number(eventRule?.rules?.[selectedDepartment] || 0);

    return baseHC + peakHC + eventHC;
  };

  const getEmployeeKeys = (employee: Employee) => {
    return [
      String(employee.id || "").trim(),
      String(employee.employee_no || "").trim(),
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
    ]
      .filter(Boolean)
      .map((item) => item.toLowerCase());
  };

  const isEmployeeOnLeave = (employee: Employee, dayKey: string) => {
    const keys = getEmployeeKeys(employee);

    return approvedLeaves.some((leave) => {
      const leaveEmployeeId = String(leave.employee_id || "").trim().toLowerCase();

      return (
        keys.includes(leaveEmployeeId) &&
        dayKey >= String(leave.start_date) &&
        dayKey <= String(leave.end_date)
      );
    });
  };

  const getLeaveType = (employee: Employee, dayKey: string) => {
    const keys = getEmployeeKeys(employee);

    const found = approvedLeaves.find((leave) => {
      const leaveEmployeeId = String(leave.employee_id || "").trim().toLowerCase();

      return (
        keys.includes(leaveEmployeeId) &&
        dayKey >= String(leave.start_date) &&
        dayKey <= String(leave.end_date)
      );
    });

    return found?.leave_type || "Approved Leave";
  };

  const getShift = (employeeId: string, day: string) => {
    const found = schedules.find(
      (schedule) =>
        String(schedule.employee_id) === String(employeeId) &&
        String(schedule.day) === String(day)
    );

    return found?.shift || "OFF";
  };

  const updateSchedule = async (employeeId: string, day: string, shift: string) => {
    const employee = employees.find((emp) => String(emp.id) === String(employeeId));

    if (employee && isEmployeeOnLeave(employee, day) && shift !== "OFF") {
      alert("This employee has an approved leave on this date.");
      return;
    }

    setSaveStatus("saving");

    const existing = schedules.find(
      (schedule) =>
        String(schedule.employee_id) === String(employeeId) &&
        String(schedule.day) === String(day)
    );

    if (existing) {
      const { error } = await supabase
        .from("schedules")
        .update({ shift })
        .eq("id", existing.id);

      if (error) {
        console.log("UPDATE SCHEDULE ERROR:", error.message);
        setSaveStatus("idle");
        return;
      }

      setSchedules((prev) =>
        prev.map((item) => (item.id === existing.id ? { ...item, shift } : item))
      );

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1300);
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
    setTimeout(() => setSaveStatus("idle"), 1300);
  };

  const moveDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);

    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setFullYear(newDate.getFullYear() + (direction === "next" ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getDateRangeLabel = () => {
    const first = visibleDays[0];
    const last = visibleDays[visibleDays.length - 1];

    if (!first || !last) return "";

    if (viewMode === "weekly") {
      return `${first.dateLabel} - ${last.dateLabel}, ${currentDate.getFullYear()}`;
    }

    return `Full Year ${currentDate.getFullYear()}`;
  };

  const copyLastWeekSchedule = async () => {
    if (viewMode !== "weekly") {
      alert("Copy Last Week is only available in weekly view.");
      return;
    }

    const confirmCopy = confirm("Copy last week's schedule into this week?");
    if (!confirmCopy) return;

    setCopyingSchedule(true);

    const currentWeekStart = new Date(visibleDays[0].key);
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

    const startKey = formatDateKey(lastWeekStart);
    const endKey = formatDateKey(lastWeekEnd);

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .gte("day", startKey)
      .lte("day", endKey);

    if (error) {
      console.log("COPY LAST WEEK ERROR:", error.message);
      setCopyingSchedule(false);
      return;
    }

    const newSchedules =
      data?.map((schedule) => {
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
      setCopyingSchedule(false);
      return;
    }

    const currentWeekKeys = visibleDays.map((day) => day.key);

    await supabase.from("schedules").delete().in("day", currentWeekKeys);

    const { error: insertError } = await supabase.from("schedules").insert(newSchedules);

    if (insertError) {
      console.log("COPY INSERT ERROR:", insertError.message);
      setCopyingSchedule(false);
      return;
    }

    await getSchedules();
    setCopyingSchedule(false);
    alert("Schedule copied successfully.");
  };

  const normalizeColor = (color?: string | null) => {
    if (!color) return "blue";
    if (color.includes("green")) return "green";
    if (color.includes("yellow")) return "yellow";
    if (color.includes("purple")) return "purple";
    if (color.includes("red")) return "red";
    if (color.includes("gray") || color.includes("slate")) return "gray";
    return "blue";
  };

  const getShiftColorClass = (shiftName: string) => {
    const shift = shifts.find((item) => item.shift_name === shiftName);
    const color = normalizeColor(shift?.color);

    if (shiftName === "OFF") return "border-slate-700 bg-slate-800 text-slate-400";
    if (color === "blue") return "border-blue-500/40 bg-blue-500/15 text-blue-300";
    if (color === "green") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    if (color === "yellow") return "border-amber-500/40 bg-amber-500/15 text-amber-300";
    if (color === "purple") return "border-purple-500/40 bg-purple-500/15 text-purple-300";
    if (color === "red") return "border-red-500/40 bg-red-500/15 text-red-300";
    return "border-slate-700 bg-slate-800 text-slate-400";
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

    return `${shortName} ${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`;
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getSchedules();
    getApprovedLeaves();
    getShiftTemplates();
    loadHCRules();
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
      }, 120);
    }
  }, [viewMode, currentDate]);

  /// CALCULATIONS
  const departments = useMemo(() => {
    const list = employees
      .map((employee) => employee.department?.trim())
      .filter((department): department is string => Boolean(department));

    return Array.from(new Set(list)).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();

      const matchesDepartment =
        selectedDepartment === "ALL" ||
        employee.department?.trim().toLowerCase() === selectedDepartment.trim().toLowerCase();

      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        String(employee.employee_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(employee.position || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDepartment && matchesSearch;
    });
  }, [employees, selectedDepartment, searchTerm]);

  const currentHC = visibleDays.map((day) =>
    filteredEmployees.filter(
      (employee) =>
        getShift(employee.id, day.key) !== "OFF" && !isEmployeeOnLeave(employee, day.key)
    ).length
  );

  const requiredHC = visibleDays.map((day) => getRequiredHC(day.key));

  const coverageGap = currentHC.map((count, index) => count - requiredHC[index]);

  const recommendationText = coverageGap.map((gap) => {
    if (selectedDepartment === "ALL") return "Select dept";
    if (gap < 0) return `Add ${Math.abs(gap)} staff`;
    if (gap > 0) return `Reduce ${gap} staff`;
    return "Good";
  });

  const totalScheduledCells = visibleDays.length * filteredEmployees.length;
  const workingCells = currentHC.reduce((sum, count) => sum + count, 0);

  const leaveCells = visibleDays.reduce((sum, day) => {
    return sum + filteredEmployees.filter((employee) => isEmployeeOnLeave(employee, day.key)).length;
  }, 0);

  const offCells = totalScheduledCells - workingCells - leaveCells;

  const unscheduledEmployees = filteredEmployees.filter((employee) =>
    visibleDays.every(
      (day) => getShift(employee.id, day.key) === "OFF" && !isEmployeeOnLeave(employee, day.key)
    )
  ).length;

  const understaffedDays = coverageGap.filter((gap) => selectedDepartment !== "ALL" && gap < 0).length;
  const overstaffedDays = coverageGap.filter((gap) => selectedDepartment !== "ALL" && gap > 0).length;

  const tableGridColumns =
    viewMode === "weekly"
      ? `260px repeat(${visibleDays.length}, minmax(135px, 1fr))`
      : `260px repeat(${visibleDays.length}, 128px)`;

  const tableWidthClass =
    viewMode === "weekly" ? "w-full min-w-[1180px]" : "w-[47000px] max-w-none";

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Workforce
            </p>
            <h1 className="mt-2 text-4xl font-black">Scheduling</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Manage schedules, monitor required headcount, protect approved leave, and prepare attendance data for payroll.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
              Save Status
            </p>
            <h2 className="mt-1 text-xl font-black text-emerald-400">
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Ready"}
            </h2>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          <SummaryCard title="Visible Staff" value={filteredEmployees.length} />
          <SummaryCard title="Working Cells" value={workingCells} color="text-emerald-400" />
          <SummaryCard title="Approved Leave" value={leaveCells} color="text-red-400" />
          <SummaryCard title="Understaffed" value={understaffedDays} color="text-red-400" />
          <SummaryCard title="Overstaffed" value={overstaffedDays} color="text-amber-400" />
          <SummaryCard title="Unscheduled" value={unscheduledEmployees} color="text-blue-400" />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                {selectedDepartment === "ALL" ? "All Departments" : selectedDepartment}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{getDateRangeLabel()}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                value={roomsSold}
                onChange={(e) => setRoomsSold(Number(e.target.value || 0))}
                className="w-28 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
                placeholder="Rooms"
              />

              <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
                <button
                  onClick={() => setViewMode("weekly")}
                  className={
                    viewMode === "weekly"
                      ? "rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-slate-950"
                      : "rounded-lg px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800"
                  }
                >
                  Weekly
                </button>

                <button
                  onClick={() => setViewMode("monthly")}
                  className={
                    viewMode === "monthly"
                      ? "rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-slate-950"
                      : "rounded-lg px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800"
                  }
                >
                  Yearly
                </button>
              </div>

              <button onClick={() => moveDate("prev")} className="rounded-xl bg-slate-800 px-4 py-2 font-black hover:bg-slate-700">
                ‹
              </button>

              <button onClick={goToToday} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700">
                Today
              </button>

              <button
                onClick={copyLastWeekSchedule}
                disabled={copyingSchedule || viewMode !== "weekly"}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black hover:bg-blue-500 disabled:opacity-50"
              >
                {copyingSchedule ? "Copying..." : "Copy Last Week"}
              </button>

              <button onClick={() => moveDate("next")} className="rounded-xl bg-slate-800 px-4 py-2 font-black hover:bg-slate-700">
                ›
              </button>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff..."
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="block w-full max-w-full overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-800">
            <div className={tableWidthClass}>
              <div
                className="grid bg-slate-950 text-sm font-black text-slate-300"
                style={{ gridTemplateColumns: tableGridColumns }}
              >
                <div className="sticky left-0 z-30 border-r border-slate-800 bg-slate-950 px-4 py-4">
                  Staff Name
                </div>

                {visibleDays.map((day) => {
                  const isToday = day.key === formatDateKey(new Date());

                  return (
                    <div
                      key={day.key}
                      ref={isToday ? todayColumnRef : null}
                      className={`border-r border-slate-800 px-4 py-4 text-center last:border-r-0 ${
                        isToday ? "bg-amber-400/10 text-amber-300" : ""
                      }`}
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
                  className="grid border-t border-slate-800 text-sm hover:bg-slate-800/40"
                  style={{ gridTemplateColumns: tableGridColumns }}
                >
                  <div className="sticky left-0 z-20 border-r border-slate-800 bg-slate-900 px-4 py-3">
                    <p className="font-black">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {employee.position || "-"} • {employee.employee_no || "-"}
                    </p>
                  </div>

                  {visibleDays.map((day) => {
                    const currentShift = getShift(employee.id, day.key);
                    const onLeave = isEmployeeOnLeave(employee, day.key);

                    return (
                      <div key={`${employee.id}-${day.key}`} className="border-r border-slate-800 px-2 py-2 last:border-r-0">
                        {onLeave ? (
                          <div className="rounded-xl border border-red-500/40 bg-red-500/15 px-2 py-2 text-center text-xs font-black text-red-300">
                            LEAVE
                            <div className="mt-1 text-[10px] font-normal text-red-200">
                              {getLeaveType(employee, day.key)}
                            </div>
                          </div>
                        ) : (
                          <select
                            value={currentShift}
                            onChange={(e) => updateSchedule(employee.id, day.key, e.target.value)}
                            className={`block rounded-xl border px-2 py-2 text-center text-xs font-black outline-none ${
                              viewMode === "weekly" ? "w-full" : "w-[108px]"
                            } ${getShiftColorClass(currentShift)}`}
                          >
                            {shifts.map((shift) => (
                              <option key={shift.shift_name} value={shift.shift_name} className="bg-slate-900 text-white">
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

              <SummaryRow label="Current HC" values={currentHC} tableGridColumns={tableGridColumns} color="text-blue-400" />
              <SummaryRow label="Required HC" values={requiredHC} tableGridColumns={tableGridColumns} color="text-emerald-400" />
              <SummaryRow
                label="Coverage Gap"
                values={coverageGap.map((gap) => (selectedDepartment === "ALL" ? "-" : gap > 0 ? `+${gap}` : String(gap)))}
                tableGridColumns={tableGridColumns}
                color="text-amber-400"
              />
              <SummaryRow label="Recommendation" values={recommendationText} tableGridColumns={tableGridColumns} color="text-slate-200" />

              {filteredEmployees.length === 0 && (
                <div className="border-t border-slate-800 px-6 py-16 text-center text-slate-500">
                  No employees found for this department/search.
                </div>
              )}
            </div>
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

function SummaryRow({ label, values, tableGridColumns, color }: any) {
  return (
    <div
      className="grid border-t border-slate-700 bg-slate-950/80 text-sm font-black"
      style={{ gridTemplateColumns: tableGridColumns }}
    >
      <div className="sticky left-0 z-20 border-r border-slate-700 bg-slate-950 px-4 py-4">
        {label}
      </div>

      {values.map((value: any, index: number) => (
        <div
          key={`${label}-${index}`}
          className={`border-r border-slate-700 px-4 py-4 text-center last:border-r-0 ${color}`}
        >
          {value}
        </div>
      ))}
    </div>
  );
}