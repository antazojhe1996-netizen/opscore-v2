"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function PayrollRegisterPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [periods, setPeriods] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);

  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("Resto Unpaid");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentRemarks, setAdjustmentRemarks] = useState("");

  const [selectedPayslipId, setSelectedPayslipId] = useState("");
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [checkedAuditItems, setCheckedAuditItems] = useState<string[]>([]);
  const [payslipAdjustments, setPayslipAdjustments] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /// DATA
  const deductionTypes = [
    "Resto Unpaid",
    "Cash Advance",
    "Salary Loan",
    "Other Deduction",
  ];

  const earningTypes = ["Allowance", "Bonus", "Incentive"];

  /// FUNCTIONS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const normalize = (value: any) => String(value || "").trim().toLowerCase();

  const isRestDay = (entry: any) => {
    const combined = `${entry.status || ""} ${entry.schedule || ""} ${
      entry.shift || ""
    } ${entry.scheduled_shift || ""} ${entry.shift_name || ""}`.toLowerCase();

    return (
      combined.includes("rest") ||
      combined.includes("rd") ||
      combined.includes("off")
    );
  };

  const isAbsent = (entry: any) => normalize(entry.status) === "absent";

  const hasActualTime = (entry: any) => Boolean(entry.time_in || entry.time_out);

  const getScheduleLabel = (entry: any) =>
    entry.scheduled_shift ||
    entry.shift ||
    entry.schedule ||
    entry.shift_name ||
    "-";

  const getActualLabel = (entry: any) => {
    if (!entry.time_in && !entry.time_out) return "No time entry";
    return `${entry.time_in || "-"} - ${entry.time_out || "-"}`;
  };

  const getAuditKey = (log: any, index: number) => {
    return `${selectedPeriodId}-${selectedAuditRecord?.employee_id || ""}-${
      log.date
    }-${log.issue}-${index}`;
  };

  const toggleAuditCheck = (key: string) => {
    setCheckedAuditItems((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const mapSettings = (rows: any[] = []) => {
    const mapped: Record<string, string> = {};

    rows.forEach((item: any) => {
      mapped[item.setting_key] = item.setting_value;
    });

    return mapped;
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("payroll_active", true)
      .order("department", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) return console.log("GET EMPLOYEES ERROR:", error.message);
    setEmployees(data || []);
  };

  const getSettings = async () => {
    const { data, error } = await supabase.from("payroll_settings").select("*");

    if (error) return console.log("GET SETTINGS ERROR:", error.message);

    const mapped = mapSettings(data || []);
    setSettings(mapped);
  };

  const fetchLatestSettings = async () => {
    const { data, error } = await supabase.from("payroll_settings").select("*");

    if (error) {
      console.log("FETCH LATEST SETTINGS ERROR:", error.message);
      return settings;
    }

    const mapped = mapSettings(data || []);
    setSettings(mapped);
    return mapped;
  };

  const getPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return console.log("GET PERIODS ERROR:", error.message);
    setPeriods(data || []);
  };

  const getRecords = async (periodId: string) => {
    if (!periodId) return;

    const { data, error } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("period_id", periodId)
      .order("department", { ascending: true })
      .order("employee_name", { ascending: true });

    if (error) return console.log("GET RECORDS ERROR:", error.message);
    setRecords(data || []);
  };

  const getAdjustments = async (periodId: string) => {
    if (!periodId) return;

    const { data, error } = await supabase
      .from("payroll_adjustments")
      .select("*")
      .eq("period_id", periodId)
      .order("created_at", { ascending: false });

    if (error) return console.log("GET ADJUSTMENTS ERROR:", error.message);
    setAdjustments(data || []);
  };

  const createPeriod = async () => {
    if (!periodName.trim() || !startDate || !endDate) {
      alert("Complete payroll period details.");
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("payroll_periods")
      .insert({
        period_name: periodName.trim(),
        start_date: startDate,
        end_date: endDate,
        status: "Draft",
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      alert("Failed to create period.");
      return console.log("CREATE PERIOD ERROR:", error.message);
    }

    setPeriodName("");
    setStartDate("");
    setEndDate("");
    setSelectedPeriodId(data.id);

    await getPeriods();
  };

  const deletePeriod = async () => {
    if (!selectedPeriodId) {
      alert("Select a payroll period first.");
      return;
    }

    const selected = periods.find((period) => period.id === selectedPeriodId);

    const confirmDelete = confirm(
      `Delete payroll period "${
        selected?.period_name || "selected period"
      }"? This will also delete its payroll records and manual adjustments.`
    );

    if (!confirmDelete) return;

    setIsSaving(true);

    await supabase
      .from("payroll_records")
      .delete()
      .eq("period_id", selectedPeriodId);

    await supabase
      .from("payroll_adjustments")
      .delete()
      .eq("period_id", selectedPeriodId);

    const { error } = await supabase
      .from("payroll_periods")
      .delete()
      .eq("id", selectedPeriodId);

    setIsSaving(false);

    if (error) {
      alert("Failed to delete payroll period.");
      return console.log("DELETE PERIOD ERROR:", error.message);
    }

    setSelectedPeriodId("");
    setRecords([]);
    setAdjustments([]);
    setSelectedPayslipId("");
    setSelectedAuditRecord(null);
    setAuditLogs([]);
    setPayslipAdjustments([]);
    setCheckedAuditItems([]);

    await getPeriods();
    alert("Payroll period deleted.");
  };

  const getAttendanceRows = async (employeeId: string) => {
    if (!selectedPeriod) return [];

    const { data, error } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("attendance_date", selectedPeriod.start_date)
      .lte("attendance_date", selectedPeriod.end_date)
      .order("attendance_date", { ascending: true });

    if (error) {
      console.log("GET ATTENDANCE ROWS ERROR:", error.message);
      return [];
    }

    return data || [];
  };

  const getAttendanceSummary = async (employeeId: string) => {
    const rows = await getAttendanceRows(employeeId);

    const workRows = rows.filter((row) => !isRestDay(row));
    const restRows = rows.filter((row) => isRestDay(row));

    return {
      scheduledDays: workRows.length,
      restDays: restRows.length,
      daysWorked: workRows.filter((row) => !isAbsent(row) && hasActualTime(row))
        .length,
      lateMinutes: workRows.reduce(
        (sum, row) => sum + Number(row.late_minutes || 0),
        0
      ),
      undertimeMinutes: workRows.reduce(
        (sum, row) => sum + Number(row.undertime_minutes || 0),
        0
      ),
      absentDays: workRows.filter((row) => isAbsent(row) || !hasActualTime(row))
        .length,
      otMinutes: workRows.reduce(
        (sum, row) => sum + Number(row.ot_minutes || 0),
        0
      ),
    };
  };

  const computeRecord = (
    base: any,
    employeeAdjustments: any[] = [],
    activeSettings: Record<string, string> = settings
  ) => {
    const paidHours = Number(activeSettings.paid_hours || 8);
    const lateGrace = Number(activeSettings.late_grace_minutes || 15);
    const undertimeGrace = Number(activeSettings.undertime_grace_minutes || 0);

    const lateEnabled = activeSettings.late_deduction_enabled === "Yes";
    const undertimeEnabled =
      activeSettings.undertime_deduction_enabled === "Yes";
    const absentEnabled = activeSettings.absent_deduction_enabled === "Yes";
    const holidayEnabled = activeSettings.holiday_pay_enabled === "Yes";

    const otMultiplier = Number(activeSettings.ot_multiplier || 1.25);

    const rateType = base.rate_type || "Daily";
    const basicRate = Number(base.basic_rate || 0);

    const daysWorked = Number(base.days_worked || 0);
    const absentDays = Number(base.absent_days || 0);
    const lateMinutes = Number(base.late_minutes || 0);
    const undertimeMinutes = Number(base.undertime_minutes || 0);
    const otMinutes = Number(base.ot_minutes || 0);
    const otHours = otMinutes / 60;

    const dailyRate = rateType === "Monthly" ? basicRate / 26 : basicRate;
    const hourlyRate = dailyRate / paidHours;
    const minuteRate = hourlyRate / 60;

    const basicPay =
      rateType === "Monthly"
        ? basicRate
        : rateType === "Weekly"
        ? basicRate
        : dailyRate * daysWorked;

    const lateDeduction =
      lateEnabled && lateMinutes > lateGrace ? lateMinutes * minuteRate : 0;

    const undertimeDeduction =
      undertimeEnabled && undertimeMinutes > undertimeGrace
        ? undertimeMinutes * minuteRate
        : 0;

    const absentDeduction =
      absentEnabled && rateType === "Monthly" ? absentDays * dailyRate : 0;

    const otPay = otHours * hourlyRate * otMultiplier;
    const holidayPay = holidayEnabled ? Number(base.holiday_pay || 0) : 0;

    const manualEarnings = employeeAdjustments
      .filter((item) => item.adjustment_direction === "Earning")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const manualDeductions = employeeAdjustments
      .filter((item) => item.adjustment_direction === "Deduction")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const grossPay = basicPay + holidayPay + otPay + manualEarnings;

    const totalDeductions =
      lateDeduction + undertimeDeduction + absentDeduction + manualDeductions;

    const netPay = grossPay - totalDeductions;

    return {
      ...base,
      basic_pay: basicPay,
      holiday_pay: holidayPay,
      ot_pay: otPay,
      allowance: manualEarnings,
      manual_deduction: manualDeductions,
      late_deduction: lateDeduction,
      undertime_deduction: undertimeDeduction,
      absent_deduction: absentDeduction,
      total_deductions: totalDeductions,
      gross_pay: grossPay,
      net_pay: netPay,
    };
  };

  const generatePayroll = async () => {
    if (!selectedPeriodId || !selectedPeriod) {
      alert("Select payroll period first.");
      return;
    }

    if (employees.length === 0) {
      alert("No payroll active employees.");
      return;
    }

    const confirmGenerate = confirm(
      "Generate payroll from latest attendance and payroll settings? Existing records for this period will be replaced, but manual adjustments will remain."
    );

    if (!confirmGenerate) return;

    setIsSaving(true);

    const latestSettings = await fetchLatestSettings();

    await supabase
      .from("payroll_records")
      .delete()
      .eq("period_id", selectedPeriodId);

    const generated = await Promise.all(
      employees.map(async (employee) => {
        const attendance = await getAttendanceSummary(employee.id);

        const employeeAdjustments = adjustments.filter(
          (item) => item.employee_id === employee.id
        );

        const base = {
          period_id: selectedPeriodId,
          employee_id: employee.id,
          employee_no: employee.employee_no,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          department: employee.department,
          position: employee.position,
          rate_type:
            employee.rate_type || latestSettings.default_rate_type || "Daily",
          basic_rate: Number(employee.basic_rate || employee.daily_rate || 0),

          scheduled_days: attendance.scheduledDays,
          rest_days: attendance.restDays,
          days_worked: attendance.daysWorked,
          weeks_worked: 0,
          late_minutes: attendance.lateMinutes,
          undertime_minutes: attendance.undertimeMinutes,
          absent_days: attendance.absentDays,
          ot_minutes: attendance.otMinutes,

          remarks: "",
        };

        return computeRecord(base, employeeAdjustments, latestSettings);
      })
    );

    const { error } = await supabase.from("payroll_records").insert(generated);

    setIsSaving(false);

    if (error) {
      alert("Failed to generate payroll.");
      return console.log("GENERATE PAYROLL ERROR:", error.message);
    }

    await getRecords(selectedPeriodId);

    setSelectedPayslipId("");
    setSelectedAuditRecord(null);
    setAuditLogs([]);
    setPayslipAdjustments([]);
    setCheckedAuditItems([]);

    alert("Payroll generated using latest schedule-aware attendance logic.");
  };

  const addAdjustment = async () => {
    if (!selectedPeriodId || !selectedEmployeeId || !adjustmentAmount) {
      alert("Complete adjustment form.");
      return;
    }

    const employee = employees.find((item) => item.id === selectedEmployeeId);
    if (!employee) return;

    const direction = earningTypes.includes(adjustmentType)
      ? "Earning"
      : "Deduction";

    setIsSaving(true);

    const { error } = await supabase.from("payroll_adjustments").insert({
      period_id: selectedPeriodId,
      employee_id: selectedEmployeeId,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      adjustment_type: adjustmentType,
      adjustment_direction: direction,
      amount: Number(adjustmentAmount || 0),
      remarks: adjustmentRemarks,
    });

    setIsSaving(false);

    if (error) {
      alert("Failed to add adjustment.");
      return console.log("ADD ADJUSTMENT ERROR:", error.message);
    }

    setSelectedEmployeeId("");
    setAdjustmentType("Resto Unpaid");
    setAdjustmentAmount("");
    setAdjustmentRemarks("");

    await getAdjustments(selectedPeriodId);

    setSelectedPayslipId("");
    setSelectedAuditRecord(null);
    setAuditLogs([]);
    setPayslipAdjustments([]);

    alert("Adjustment saved. Click Generate again to apply.");
  };

  const deleteAdjustment = async (id: string) => {
    const confirmDelete = confirm("Delete this manual adjustment?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("payroll_adjustments")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Failed to delete adjustment.");
      return console.log("DELETE ADJUSTMENT ERROR:", error.message);
    }

    await getAdjustments(selectedPeriodId);

    setSelectedPayslipId("");
    setSelectedAuditRecord(null);
    setAuditLogs([]);
    setPayslipAdjustments([]);

    alert("Adjustment deleted. Click Generate again to update payroll.");
  };

  const getEmployeeAuditLogs = async (record: any) => {
    if (!selectedPeriod) return [];

    const activeSettings = await fetchLatestSettings();

    const paidHours = Number(activeSettings.paid_hours || 8);
    const lateGrace = Number(activeSettings.late_grace_minutes || 15);
    const undertimeGrace = Number(activeSettings.undertime_grace_minutes || 0);

    const lateEnabled = activeSettings.late_deduction_enabled === "Yes";
    const undertimeEnabled =
      activeSettings.undertime_deduction_enabled === "Yes";
    const absentEnabled = activeSettings.absent_deduction_enabled === "Yes";

    const basicRate = Number(record.basic_rate || 0);
    const rateType = record.rate_type || "Daily";

    const dailyRate = rateType === "Monthly" ? basicRate / 26 : basicRate;
    const minuteRate = dailyRate / paidHours / 60;

    const attendanceData = await getAttendanceRows(record.employee_id);

    const attendanceLogs = (attendanceData || []).map((entry: any) => {
      const restDay = isRestDay(entry);
      const absent = isAbsent(entry) || (!restDay && !hasActualTime(entry));
      const lateMinutes = Number(entry.late_minutes || 0);
      const undertimeMinutes = Number(entry.undertime_minutes || 0);
      const otMinutes = Number(entry.ot_minutes || 0);

      const lateAmount =
        lateEnabled && lateMinutes > lateGrace ? lateMinutes * minuteRate : 0;

      const undertimeAmount =
        undertimeEnabled && undertimeMinutes > undertimeGrace
          ? undertimeMinutes * minuteRate
          : 0;

      const absentAmount =
        absentEnabled && rateType === "Monthly" && absent ? dailyRate : 0;

      let issue = "OK";
      const issueParts: string[] = [];

      if (restDay) issueParts.push("Rest Day / Off");
      if (!restDay && absent) issueParts.push("Absent from scheduled work day");
      if (lateMinutes > 0) issueParts.push(`${lateMinutes} mins late`);
      if (undertimeMinutes > 0)
        issueParts.push(`${undertimeMinutes} mins undertime`);
      if (otMinutes > 0) issueParts.push(`${otMinutes} mins OT`);

      if (issueParts.length > 0) issue = issueParts.join(" • ");

      return {
        date: entry.attendance_date,
        schedule: getScheduleLabel(entry),
        actual: getActualLabel(entry),
        status: entry.status || (restDay ? "RD/OFF" : "No Status"),
        issue,
        lateAmount,
        undertimeAmount,
        absentAmount,
        totalAmount: lateAmount + undertimeAmount + absentAmount,
        isDeduction: lateAmount + undertimeAmount + absentAmount > 0,
      };
    });

    const manualLogs = adjustments
      .filter((item) => item.employee_id === record.employee_id)
      .map((item) => ({
        date: item.created_at?.slice(0, 10) || "-",
        schedule: "Manual",
        actual: "Manual adjustment",
        status: item.adjustment_direction,
        issue: `${item.adjustment_type} • ${item.remarks || "No remarks"}`,
        lateAmount: 0,
        undertimeAmount: 0,
        absentAmount: 0,
        totalAmount:
          item.adjustment_direction === "Deduction"
            ? Number(item.amount || 0)
            : 0,
        isDeduction: item.adjustment_direction === "Deduction",
      }));

    return [...attendanceLogs, ...manualLogs];
  };

  const openEmployeeAudit = async (record: any) => {
    setSelectedAuditRecord(record);
    setSelectedPayslipId(record.id);

    const logs = await getEmployeeAuditLogs(record);
    setAuditLogs(logs);

    const employeeAdjustments = adjustments.filter(
      (item) => item.employee_id === record.employee_id
    );

    setPayslipAdjustments(employeeAdjustments);
  };

  const approvePayroll = async () => {
    if (!selectedPeriodId) return;

    const highAlerts = managerAlerts.filter(
      (alert) => alert.severity === "High"
    );

    if (highAlerts.length > 0) {
      const proceed = confirm(
        `There are ${highAlerts.length} high manager audit alert/s. Approve anyway?`
      );

      if (!proceed) return;
    }

    const confirmApprove = confirm("Approve this payroll period?");
    if (!confirmApprove) return;

    const { error } = await supabase
      .from("payroll_periods")
      .update({ status: "Approved" })
      .eq("id", selectedPeriodId);

    if (error) {
      alert("Failed to approve payroll.");
      return console.log("APPROVE ERROR:", error.message);
    }

    await getPeriods();
    alert("Payroll approved.");
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getSettings();
    getPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      getRecords(selectedPeriodId);
      getAdjustments(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  /// CALCULATIONS
  const selectedPeriod = periods.find(
    (period) => period.id === selectedPeriodId
  );

  const filteredRecords = useMemo(() => {
    return records.filter((record) =>
      `${record.employee_name} ${record.department} ${record.position}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const selectedPayslip = records.find(
    (record) => record.id === selectedPayslipId
  );

  const totalGross = records.reduce(
    (sum, record) => sum + Number(record.gross_pay || 0),
    0
  );

  const totalDeductions = records.reduce(
    (sum, record) => sum + Number(record.total_deductions || 0),
    0
  );

  const totalNet = records.reduce(
    (sum, record) => sum + Number(record.net_pay || 0),
    0
  );

  const managerAlerts = records.flatMap((record) => {
    const alerts: any[] = [];

    const scheduledDays = Number(record.scheduled_days || 0);
    const restDays = Number(record.rest_days || 0);
    const daysWorked = Number(record.days_worked || 0);
    const absentDays = Number(record.absent_days || 0);
    const lateMinutes = Number(record.late_minutes || 0);
    const undertimeMinutes = Number(record.undertime_minutes || 0);
    const otMinutes = Number(record.ot_minutes || 0);
    const netPay = Number(record.net_pay || 0);
    const basicPay = Number(record.basic_pay || 0);
    const totalDeduction = Number(record.total_deductions || 0);

    if (scheduledDays === 0 && daysWorked === 0 && absentDays === 0) {
      alerts.push({
        employee: record.employee_name,
        type: "No Schedule / Attendance Summary",
        message:
          "No scheduled work day, worked day, or absent day found. Check schedule and attendance matching.",
        severity: "High",
      });
    }

    if (restDays > 2) {
      alerts.push({
        employee: record.employee_name,
        type: "More Than 2 Rest Days",
        message: `${restDays} rest/off days detected in this payroll period. Review schedule setup.`,
        severity: "Medium",
      });
    }

    if (absentDays > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "Scheduled Absence",
        message: `${absentDays} scheduled work day/s with no valid attendance.`,
        severity: "Medium",
      });
    }

    if (daysWorked === 0 && netPay > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "Pay Without Attendance",
        message: "Employee has net pay but zero worked days.",
        severity: "High",
      });
    }

    if (lateMinutes >= 60) {
      alerts.push({
        employee: record.employee_name,
        type: "High Late Minutes",
        message: `${lateMinutes} minutes late. Review employee audit tab.`,
        severity: "Medium",
      });
    }

    if (undertimeMinutes >= 60) {
      alerts.push({
        employee: record.employee_name,
        type: "High Undertime",
        message: `${undertimeMinutes} minutes undertime. Review employee audit tab.`,
        severity: "Medium",
      });
    }

    if (otMinutes > 0 && settings.ot_requires_approval === "Yes") {
      alerts.push({
        employee: record.employee_name,
        type: "OT Needs Approval",
        message: `${otMinutes} OT minutes detected. Confirm approval before release.`,
        severity: "Medium",
      });
    }

    if (totalDeduction > basicPay * 0.5 && basicPay > 0) {
      alerts.push({
        employee: record.employee_name,
        type: "High Deduction",
        message: "Deductions are more than 50% of basic pay.",
        severity: "High",
      });
    }

    return alerts;
  });

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
            <h1 className="mt-2 text-4xl font-black">Payroll Register</h1>
            <p className="mt-2 max-w-5xl text-sm text-slate-400">
              Schedule-aware payroll with manager audit, per-employee attendance
              audit, manual adjustments, and detailed payslip preview.
            </p>
          </div>

          <button
            onClick={approvePayroll}
            disabled={!selectedPeriodId || records.length === 0}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            Approve Payroll
          </button>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Employees" value={records.length} />
          <SummaryCard
            title="Manager Alerts"
            value={managerAlerts.length}
            color="text-amber-400"
          />
          <SummaryCard
            title="Gross Pay"
            value={formatMoney(totalGross)}
            color="text-blue-400"
          />
          <SummaryCard
            title="Deductions"
            value={formatMoney(totalDeductions)}
            color="text-red-400"
          />
          <SummaryCard
            title="Net Pay"
            value={formatMoney(totalNet)}
            color="text-emerald-400"
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-black">1. Payroll Period</h2>

            <div className="mt-4 space-y-3">
              <input
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="June 1-15, 2026"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />
              </div>

              <button
                onClick={createPeriod}
                disabled={isSaving}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-black hover:bg-blue-500 disabled:opacity-50"
              >
                Create Period
              </button>

              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="">Select payroll period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.period_name} ({period.status})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={generatePayroll}
                  disabled={isSaving || !selectedPeriodId}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black hover:bg-emerald-500 disabled:opacity-50"
                >
                  Generate
                </button>

                <button
                  onClick={deletePeriod}
                  disabled={isSaving || !selectedPeriodId}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black hover:bg-red-500 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-black">2. Manual Adjustment</h2>
            <p className="text-xs text-slate-400">
              Add or delete resto unpaid, cash advance, salary loan, allowance,
              bonus, or other adjustments.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none md:col-span-2"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
              </select>

              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {[...deductionTypes, ...earningTypes].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>

              <input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="Amount"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <button
                onClick={addAdjustment}
                disabled={isSaving || !selectedPeriodId}
                className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
              >
                Save
              </button>

              <input
                value={adjustmentRemarks}
                onChange={(e) => setAdjustmentRemarks(e.target.value)}
                placeholder="Remarks"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none md:col-span-5"
              />

              <div className="max-h-44 overflow-auto rounded-xl border border-slate-800 md:col-span-5">
                <table className="w-full min-w-[800px] text-xs">
                  <thead className="bg-slate-950 text-left text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Direction</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Remarks</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {adjustments.map((item) => (
                      <tr key={item.id} className="border-t border-slate-800">
                        <td className="px-3 py-2 font-bold">
                          {item.employee_name}
                        </td>
                        <td className="px-3 py-2">{item.adjustment_type}</td>
                        <td className="px-3 py-2">
                          {item.adjustment_direction}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatMoney(item.amount)}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {item.remarks || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => deleteAdjustment(item.id)}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    {adjustments.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No manual adjustments yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black text-amber-400">
                3. Manager AI Audit
              </h2>
              <p className="text-sm text-slate-400">
                Employees that need checking before payroll approval.
              </p>
            </div>

            <div className="rounded-full border border-amber-500/40 px-4 py-2 text-sm font-black text-amber-400">
              {managerAlerts.length} item/s to check
            </div>
          </div>

          <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Severity</th>
                </tr>
              </thead>

              <tbody>
                {managerAlerts.map((alert, index) => (
                  <tr key={index} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-black">{alert.employee}</td>
                    <td className="px-4 py-3 text-amber-400">{alert.type}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {alert.message}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          alert.severity === "High"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                  </tr>
                ))}

                {managerAlerts.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No manager audit alerts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black">4. Payroll Review</h2>
              <p className="text-sm text-slate-400">
                Click View Audit to see date, schedule, actual attendance, issue,
                and deduction.
              </p>
            </div>

            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none xl:w-80"
            />
          </div>

          <div className="mt-4 max-h-[650px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1550px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-right">Sched</th>
                  <th className="px-4 py-3 text-right">Worked</th>
                  <th className="px-4 py-3 text-right">RD/OFF</th>
                  <th className="px-4 py-3 text-right">Absent</th>
                  <th className="px-4 py-3 text-right">Late</th>
                  <th className="px-4 py-3 text-right">UT</th>
                  <th className="px-4 py-3 text-right">OT</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Auto Ded.</th>
                  <th className="px-4 py-3 text-right">Manual Ded.</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const autoDeduction =
                    Number(record.late_deduction || 0) +
                    Number(record.undertime_deduction || 0) +
                    Number(record.absent_deduction || 0);

                  return (
                    <tr
                      key={record.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-black">{record.employee_name}</p>
                        <p className="text-xs text-slate-500">
                          {record.department} • {record.position}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.scheduled_days || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.days_worked || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.rest_days || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.absent_days || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.late_minutes || 0} min
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.undertime_minutes || 0} min
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(record.ot_minutes || 0)} min
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(record.basic_pay)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(autoDeduction)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(record.manual_deduction)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">
                        {formatMoney(record.net_pay)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEmployeeAudit(record)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"
                        >
                          View Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-14 text-center text-slate-500"
                    >
                      No payroll records. Select period then click Generate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedAuditRecord && (
          <section className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-blue-400">
                  5. Employee Complete Audit
                </h2>
                <p className="text-sm text-slate-400">
                  {selectedAuditRecord.employee_name} •{" "}
                  {selectedAuditRecord.department} •{" "}
                  {selectedAuditRecord.position}
                </p>
              </div>

              <div className="rounded-full border border-blue-500/40 px-4 py-2 text-sm font-black text-blue-400">
                {auditLogs.filter((log) => log.isDeduction).length} deduction
                item/s
              </div>
            </div>

            <div className="mt-4 overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1400px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Checked</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Actual Attendance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Issue / Evidence</th>
                    <th className="px-4 py-3 text-right">Late Ded.</th>
                    <th className="px-4 py-3 text-right">UT Ded.</th>
                    <th className="px-4 py-3 text-right">Absent Ded.</th>
                    <th className="px-4 py-3 text-right">Total Ded.</th>
                  </tr>
                </thead>

                <tbody>
                  {auditLogs.map((log, index) => {
                    const key = getAuditKey(log, index);
                    const checked = checkedAuditItems.includes(key);

                    return (
                      <tr
                        key={index}
                        className={`border-t border-slate-800 ${
                          checked ? "bg-emerald-500/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleAuditCheck(key)}
                            className={`rounded-lg px-3 py-1 text-xs font-black ${
                              checked
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {checked ? "✓ Checked" : "Check"}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-bold">{log.date}</td>
                        <td className="px-4 py-3">{log.schedule}</td>
                        <td className="px-4 py-3">{log.actual}</td>
                        <td className="px-4 py-3">{log.status}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {log.issue}
                        </td>
                        <td className="px-4 py-3 text-right text-red-400">
                          {formatMoney(log.lateAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-400">
                          {formatMoney(log.undertimeAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-400">
                          {formatMoney(log.absentAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-red-400">
                          {formatMoney(log.totalAmount)}
                        </td>
                      </tr>
                    );
                  })}

                  {auditLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No audit logs found for this employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedPayslip && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-black">6. Detailed Payslip Preview</h2>

            <div className="mt-5 bg-white p-8 text-black">
              <div className="text-center">
                <h1 className="text-2xl font-black">VINCENT RESORT HOTEL</h1>
                <p className="text-sm">PAYSLIP</p>
                <p className="font-bold">{selectedPeriod?.period_name}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <Info label="Employee" value={selectedPayslip.employee_name} />
                <Info
                  label="Employee No."
                  value={selectedPayslip.employee_no || "-"}
                />
                <Info label="Department" value={selectedPayslip.department} />
                <Info label="Position" value={selectedPayslip.position} />
              </div>

              <div className="mt-8 rounded-xl border border-slate-300 p-4 text-sm">
                <h3 className="mb-3 font-black">Attendance Summary</h3>
                <div className="grid grid-cols-6 gap-3 text-center">
                  <Info
                    label="Scheduled"
                    value={selectedPayslip.scheduled_days || 0}
                  />
                  <Info
                    label="Worked"
                    value={selectedPayslip.days_worked || 0}
                  />
                  <Info label="RD/OFF" value={selectedPayslip.rest_days || 0} />
                  <Info
                    label="Absent"
                    value={selectedPayslip.absent_days || 0}
                  />
                  <Info
                    label="Late"
                    value={`${selectedPayslip.late_minutes || 0} min`}
                  />
                  <Info
                    label="UT"
                    value={`${selectedPayslip.undertime_minutes || 0} min`}
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
                <div>
                  <h3 className="border-b pb-2 font-black">
                    Earnings Breakdown
                  </h3>
                  <Row
                    label="Basic Pay"
                    value={formatMoney(selectedPayslip.basic_pay)}
                  />
                  <Row
                    label="Holiday Pay"
                    value={formatMoney(selectedPayslip.holiday_pay)}
                  />
                  <Row
                    label="OT Pay"
                    value={formatMoney(selectedPayslip.ot_pay)}
                  />

                  {payslipAdjustments
                    .filter((item) => item.adjustment_direction === "Earning")
                    .map((item) => (
                      <Row
                        key={item.id}
                        label={item.adjustment_type}
                        value={formatMoney(item.amount)}
                      />
                    ))}

                  {payslipAdjustments.filter(
                    (item) => item.adjustment_direction === "Earning"
                  ).length === 0 && (
                    <Row label="Allowance / Bonus" value={formatMoney(0)} />
                  )}

                  <Row
                    label="Gross Pay"
                    value={formatMoney(selectedPayslip.gross_pay)}
                    strong
                  />
                </div>

                <div>
                  <h3 className="border-b pb-2 font-black">
                    Deductions Breakdown
                  </h3>
                  <Row
                    label="Late Deduction"
                    value={formatMoney(selectedPayslip.late_deduction)}
                  />
                  <Row
                    label="Undertime Deduction"
                    value={formatMoney(selectedPayslip.undertime_deduction)}
                  />
                  <Row
                    label="Absent Deduction"
                    value={formatMoney(selectedPayslip.absent_deduction)}
                  />

                  {payslipAdjustments
                    .filter((item) => item.adjustment_direction === "Deduction")
                    .map((item) => (
                      <Row
                        key={item.id}
                        label={item.adjustment_type}
                        value={formatMoney(item.amount)}
                      />
                    ))}

                  <Row
                    label="Manual Deductions"
                    value={formatMoney(selectedPayslip.manual_deduction)}
                  />

                  <Row
                    label="Total Deductions"
                    value={formatMoney(selectedPayslip.total_deductions)}
                    strong
                  />
                </div>
              </div>

              <div className="mt-8 rounded-xl border-2 border-black p-4 text-center">
                <p className="text-sm font-bold">NET PAY</p>
                <p className="text-3xl font-black">
                  {formatMoney(selectedPayslip.net_pay)}
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-10 text-center text-sm">
                <div className="border-t border-black pt-2">
                  {settings.authorized_signatory || "Authorized Signatory"}
                </div>
                <div className="border-t border-black pt-2">
                  Employee Signature
                </div>
              </div>

              <p className="mt-8 text-center text-xs">
                {settings.payslip_footer ||
                  "This is a system-generated payslip."}
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="mt-5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
            >
              Print / Save as PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 text-2xl font-black ${color}`}>{value}</h2>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value, strong = false }: any) {
  return (
    <div
      className={`flex justify-between py-1 ${
        strong ? "mt-3 border-t pt-3 font-black" : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}