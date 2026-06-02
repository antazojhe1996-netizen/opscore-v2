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

  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  /// FUNCTIONS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("payroll_active", true)
      .order("department", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
      return;
    }

    setEmployees(data || []);
  };

  const getSettings = async () => {
    const { data, error } = await supabase.from("payroll_settings").select("*");

    if (error) {
      console.log("GET SETTINGS ERROR:", error.message);
      return;
    }

    const mapped: Record<string, string> = {};

    (data || []).forEach((item: any) => {
      mapped[item.setting_key] = item.setting_value;
    });

    setSettings(mapped);
  };

  const getPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET PERIODS ERROR:", error.message);
      return;
    }

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

    if (error) {
      console.log("GET PAYROLL RECORDS ERROR:", error.message);
      return;
    }

    setRecords(data || []);
  };

  const createPeriod = async () => {
    if (!periodName.trim() || !startDate || !endDate) {
      alert("Please complete period name, start date, and end date.");
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
      console.log("CREATE PERIOD ERROR:", error.message);
      alert("Failed to create payroll period.");
      return;
    }

    setPeriodName("");
    setStartDate("");
    setEndDate("");
    setSelectedPeriodId(data.id);

    await getPeriods();
    setRecords([]);
  };

  const computeRecord = (record: any) => {
    const paidHours = Number(settings.paid_hours || 8);
    const lateGrace = Number(settings.late_grace_minutes || 15);
    const undertimeGrace = Number(settings.undertime_grace_minutes || 0);

    const rateType = record.rate_type || "Daily";
    const basicRate = Number(record.basic_rate || 0);

    const daysWorked = Number(record.days_worked || 0);
    const weeksWorked = Number(record.weeks_worked || 0);
    const lateMinutesRaw = Number(record.late_minutes || 0);
    const undertimeMinutesRaw = Number(record.undertime_minutes || 0);
    const absentDays = Number(record.absent_days || 0);

    const deductibleLate =
      settings.late_deduction_enabled === "No"
        ? 0
        : lateMinutesRaw > lateGrace
        ? lateMinutesRaw
        : 0;

    const deductibleUndertime =
      settings.undertime_deduction_enabled === "No"
        ? 0
        : undertimeMinutesRaw > undertimeGrace
        ? undertimeMinutesRaw
        : 0;

    let basicPay = 0;

    if (rateType === "Daily") {
      basicPay = basicRate * daysWorked;
    }

    if (rateType === "Weekly") {
      basicPay = basicRate * weeksWorked;
    }

    if (rateType === "Monthly") {
      basicPay = basicRate;
    }

    const minuteRate =
      rateType === "Monthly"
        ? basicRate / 26 / paidHours / 60
        : basicRate / paidHours / 60;

    const dailyRateForAbsent =
      rateType === "Monthly" ? basicRate / 26 : basicRate;

    const lateDeduction = deductibleLate * minuteRate;
    const undertimeDeduction = deductibleUndertime * minuteRate;
    const absentDeduction =
      settings.absent_deduction_enabled === "No"
        ? 0
        : absentDays * dailyRateForAbsent;

    const holidayPay = Number(record.holiday_pay || 0);
    const otPay = Number(record.ot_pay || 0);
    const allowance = Number(record.allowance || 0);
    const manualDeduction = Number(record.manual_deduction || 0);

    const grossPay = basicPay + holidayPay + otPay + allowance;

    const totalDeductions =
      lateDeduction + undertimeDeduction + absentDeduction + manualDeduction;

    const netPay = grossPay - totalDeductions;

    return {
      ...record,
      basic_pay: basicPay,
      late_deduction: lateDeduction,
      undertime_deduction: undertimeDeduction,
      absent_deduction: absentDeduction,
      total_deductions: totalDeductions,
      gross_pay: grossPay,
      net_pay: netPay,
    };
  };

  const generatePayroll = async () => {
    if (!selectedPeriodId) {
      alert("Please select a payroll period first.");
      return;
    }

    if (employees.length === 0) {
      alert("No payroll active employees found.");
      return;
    }

    const confirmGenerate = confirm(
      "Generate payroll records for all payroll active employees?"
    );

    if (!confirmGenerate) return;

    setIsSaving(true);

    const generatedRecords = employees.map((employee) => {
      const baseRecord = {
        period_id: selectedPeriodId,
        employee_id: employee.id,
        employee_no: employee.employee_no,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        department: employee.department,
        position: employee.position,
        rate_type: employee.rate_type || "Daily",
        basic_rate: Number(employee.basic_rate || employee.daily_rate || 0),

        days_worked: 0,
        weeks_worked: 0,
        late_minutes: 0,
        undertime_minutes: 0,
        absent_days: 0,

        holiday_pay: 0,
        ot_pay: 0,
        allowance: 0,
        manual_deduction: 0,
        remarks: "",
      };

      return computeRecord(baseRecord);
    });

    const { error } = await supabase
      .from("payroll_records")
      .insert(generatedRecords);

    setIsSaving(false);

    if (error) {
      console.log("GENERATE PAYROLL ERROR:", error.message);
      alert("Failed to generate payroll.");
      return;
    }

    getRecords(selectedPeriodId);
  };

  const updateRecordField = (id: string, field: string, value: string) => {
    setRecords((prev) =>
      prev.map((record) => {
        if (record.id !== id) return record;

        return computeRecord({
          ...record,
          [field]: value,
        });
      })
    );
  };

  const savePayrollRecords = async () => {
    if (records.length === 0) {
      alert("No records to save.");
      return;
    }

    setIsSaving(true);

    const rows = records.map((record) => computeRecord(record));

    const { error } = await supabase.from("payroll_records").upsert(rows, {
      onConflict: "id",
    });

    setIsSaving(false);

    if (error) {
      console.log("SAVE PAYROLL RECORDS ERROR:", error.message);
      alert("Failed to save payroll records.");
      return;
    }

    alert("Payroll records saved.");
    getRecords(selectedPeriodId);
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getSettings();
    getPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) getRecords(selectedPeriodId);
  }, [selectedPeriodId]);

  /// CALCULATIONS
  const filteredRecords = useMemo(() => {
    return records.filter((record) =>
      `${record.employee_name} ${record.department} ${record.position} ${record.employee_no}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

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

  const totalEmployees = records.length;

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
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Generate employee payroll, encode worked days, holiday pay, OT,
              allowances, and deductions. Late and undertime deductions follow
              Payroll Settings.
            </p>
          </div>

          <button
            onClick={savePayrollRecords}
            disabled={isSaving || records.length === 0}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Payroll"}
          </button>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Employees" value={totalEmployees} />
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

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">Payroll Period</h2>

            <div className="mt-5 space-y-4">
              <input
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="Period name e.g. June 1-15, 2026"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <button
                onClick={createPeriod}
                disabled={isSaving}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black hover:bg-blue-500 disabled:opacity-50"
              >
                Create Period
              </button>

              <div className="border-t border-slate-800 pt-4">
                <label className="text-sm font-semibold text-slate-300">
                  Select Existing Period
                </label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                >
                  <option value="">Select payroll period</option>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.period_name} ({period.status})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={generatePayroll}
                disabled={isSaving || !selectedPeriodId}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black hover:bg-emerald-500 disabled:opacity-50"
              >
                Generate Payroll
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-black">Payroll Records</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Auto-calculated payroll register.
                </p>
              </div>

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none xl:w-80"
              />
            </div>

            <div className="mt-5 max-h-[720px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1800px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Weeks</th>
                    <th className="px-4 py-3">Late Min</th>
                    <th className="px-4 py-3">UT Min</th>
                    <th className="px-4 py-3">Absent</th>
                    <th className="px-4 py-3 text-right">Basic</th>
                    <th className="px-4 py-3">Holiday</th>
                    <th className="px-4 py-3">OT Pay</th>
                    <th className="px-4 py-3">Allowance</th>
                    <th className="px-4 py-3">Manual Ded.</th>
                    <th className="px-4 py-3 text-right">Auto Ded.</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((record) => (
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

                      <td className="px-4 py-3">
                        <p className="font-bold text-amber-400">
                          {record.rate_type}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatMoney(record.basic_rate)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.days_worked}
                          onChange={(value: string) =>
                            updateRecordField(record.id, "days_worked", value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.weeks_worked}
                          onChange={(value: string) =>
                            updateRecordField(record.id, "weeks_worked", value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.late_minutes}
                          onChange={(value: string) =>
                            updateRecordField(record.id, "late_minutes", value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.undertime_minutes}
                          onChange={(value: string) =>
                            updateRecordField(
                              record.id,
                              "undertime_minutes",
                              value
                            )
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.absent_days}
                          onChange={(value: string) =>
                            updateRecordField(record.id, "absent_days", value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3 text-right font-bold">
                        {formatMoney(record.basic_pay)}
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.holiday_pay}
                          onChange={(value: string) =>
                            updateRecordField(record.id, "holiday_pay", value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.ot_pay}
                          onChange={(value: string) =>
                            updateRecordField(record.id, "ot_pay", value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.allowance}
                          onChange={(value: string) =>
                            updateRecordField(record.id, "allowance", value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <MiniInput
                          value={record.manual_deduction}
                          onChange={(value: string) =>
                            updateRecordField(
                              record.id,
                              "manual_deduction",
                              value
                            )
                          }
                        />
                      </td>

                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(
                          Number(record.late_deduction || 0) +
                            Number(record.undertime_deduction || 0) +
                            Number(record.absent_deduction || 0)
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-blue-400">
                        {formatMoney(record.gross_pay)}
                      </td>

                      <td className="px-4 py-3 text-right font-black text-emerald-400">
                        {formatMoney(record.net_pay)}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={record.remarks || ""}
                          onChange={(e) =>
                            updateRecordField(
                              record.id,
                              "remarks",
                              e.target.value
                            )
                          }
                          className="w-52 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"
                        />
                      </td>
                    </tr>
                  ))}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td
                        colSpan={16}
                        className="px-4 py-14 text-center text-slate-500"
                      >
                        No payroll records yet. Create/select a payroll period,
                        then click Generate Payroll.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
      <h2 className={`mt-2 text-2xl font-black ${color}`}>{value}</h2>
    </div>
  );
}

function MiniInput({ value, onChange }: any) {
  return (
    <input
      type="number"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right text-xs outline-none"
    />
  );
}