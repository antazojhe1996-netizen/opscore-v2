"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type PayrollHoliday = {
  id?: number;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string;
  multiplier: number;
  is_active: boolean;
};

export default function PayrollSettingsPage() {
  /// STATES
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [holidays, setHolidays] = useState<PayrollHoliday[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayType, setHolidayType] = useState("Regular");
  const [holidayMultiplier, setHolidayMultiplier] = useState("2");

  const defaultSettings: Record<string, string> = {
    shift_hours: "9",
    break_hours: "1",
    paid_hours: "8",
    attendance_rule: "First In / Last Out",
    default_rate_type: "Daily",

    leave_enabled: "No",
    leave_pay_enabled: "No",
    leave_credits_enabled: "No",
    default_leave_credits: "0",

    late_deduction_enabled: "Yes",
    late_grace_minutes: "15",
    undertime_deduction_enabled: "Yes",
    undertime_grace_minutes: "0",
    absent_deduction_enabled: "Yes",

    leave_threshold_enabled: "No",
    leave_threshold_period: "Monthly",
    allowed_leave_count: "0",
    excess_leave_counts_as: "Warning Only",

    ot_enabled: "Yes",
    ot_requires_approval: "Yes",
    ot_multiplier: "1.25",
    early_time_in_counts_as_ot: "No",
    after_shift_counts_as_ot: "Yes",
    ot_review_threshold_minutes: "60",
    excessive_ot_threshold_minutes: "120",

    holiday_pay_enabled: "No",
    holiday_pay_mode: "Manual",
    regular_holiday_multiplier: "2",
    special_holiday_multiplier: "1.3",

    rest_day_pay_enabled: "No",
    rest_day_multiplier: "1.3",
    night_diff_enabled: "No",
    night_diff_start: "22:00",
    night_diff_end: "06:00",
    night_diff_rate: "0.1",

    benefits_enabled: "No",
    government_contributions_enabled: "No",
    sss_enabled: "No",
    sss_mode: "Manual",
    philhealth_enabled: "No",
    philhealth_mode: "Manual",
    pagibig_enabled: "No",
    pagibig_mode: "Manual",
    withholding_tax_enabled: "No",
    tax_mode: "Manual",
    thirteenth_month_enabled: "No",

    show_sss_on_payslip: "No",
    show_philhealth_on_payslip: "No",
    show_pagibig_on_payslip: "No",
    show_tax_on_payslip: "No",
    hide_zero_government_deductions: "Yes",

    require_sss_number: "No",
    require_philhealth_number: "No",
    require_pagibig_number: "No",
    require_tin_number: "No",

    payroll_approval_required: "Yes",
    authorized_signatory: "",
    payslip_footer: "This is a system-generated payslip.",
  };

  /// DATA
  const settingGroups = [
    {
      title: "General Payroll Rules",
      description: "Core rules used by attendance, payroll, and payslip.",
      fields: [
        { key: "shift_hours", label: "Shift Hours", type: "number" },
        { key: "break_hours", label: "Break Hours", type: "number" },
        { key: "paid_hours", label: "Paid Hours", type: "number" },
        {
          key: "attendance_rule",
          label: "Attendance Rule",
          type: "select",
          options: ["First In / Last Out"],
        },
        {
          key: "default_rate_type",
          label: "Default Rate Type",
          type: "select",
          options: ["Daily", "Weekly", "Monthly"],
        },
      ],
    },
    {
      title: "Leave Rules",
      description:
        "Approved leave is unpaid but not counted as absent unless KPI threshold is exceeded.",
      fields: [

        
        {
          key: "leave_enabled",
          label: "Leave Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "leave_pay_enabled",
          label: "Leave Pay Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "leave_credits_enabled",
          label: "Leave Credits Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "default_leave_credits",
          label: "Default Leave Credits",
          type: "number",
        },

        
      ],
      
    },
    {
  title: "Attendance Deductions",
  description:
    "Automatic payroll deductions from attendance records.",
  fields: [
    {
      key: "late_deduction_enabled",
      label: "Late Deduction Enabled",
      type: "select",
      options: ["Yes", "No"],
    },
    {
      key: "late_grace_minutes",
      label: "Late Grace Minutes",
      type: "number",
    },
    {
      key: "undertime_deduction_enabled",
      label: "Undertime Deduction Enabled",
      type: "select",
      options: ["Yes", "No"],
    },
    {
      key: "undertime_grace_minutes",
      label: "Undertime Grace Minutes",
      type: "number",
    },
    {
      key: "absent_deduction_enabled",
      label: "Absent Deduction Enabled",
      type: "select",
      options: ["Yes", "No"],
    },
  ],
},
    {
      title: "Employee KPI Leave Threshold",
      description:
        "Used for performance KPI. Payroll still treats approved leave as unpaid leave.",
      fields: [
        {
          key: "leave_threshold_enabled",
          label: "Leave Threshold Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "leave_threshold_period",
          label: "Threshold Period",
          type: "select",
          options: ["Monthly", "Payroll Period", "Yearly"],
        },
        {
          key: "allowed_leave_count",
          label: "Allowed Leave Count",
          type: "number",
        },
        {
          key: "excess_leave_counts_as",
          label: "Excess Leave Counts As",
          type: "select",
          options: ["Absent", "Warning Only"],
        },
      ],
    },
    {
      title: "Overtime Rules",
      description:
        "Detected OT must be approved before it enters payroll computation.",
      fields: [
        {
          key: "ot_enabled",
          label: "Overtime Pay Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "ot_requires_approval",
          label: "OT Requires Supervisor Review",
          type: "select",
          options: ["Yes", "No"],
        },
        { key: "ot_multiplier", label: "OT Multiplier", type: "number" },
        {
          key: "ot_review_threshold_minutes",
          label: "OT Review Threshold Minutes",
          type: "number",
        },
        {
          key: "excessive_ot_threshold_minutes",
          label: "Excessive OT Threshold Minutes",
          type: "number",
        },
        {
          key: "early_time_in_counts_as_ot",
          label: "Early Time-In Counts as OT",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "after_shift_counts_as_ot",
          label: "After Shift Counts as OT",
          type: "select",
          options: ["Yes", "No"],
        },
      ],
    },
    {
      title: "Holiday Pay Rules",
      description:
        "Holiday list below will be used later for auto holiday detection.",
      fields: [
        {
          key: "holiday_pay_enabled",
          label: "Holiday Pay Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "holiday_pay_mode",
          label: "Holiday Pay Mode",
          type: "select",
          options: ["Manual", "Auto"],
        },
        {
          key: "regular_holiday_multiplier",
          label: "Regular Holiday Multiplier",
          type: "number",
        },
        {
          key: "special_holiday_multiplier",
          label: "Special Holiday Multiplier",
          type: "number",
        },
      ],
    },
    {
      title: "Future Pay Rules",
      description: "Disabled for now, ready when management policy changes.",
      fields: [
        {
          key: "rest_day_pay_enabled",
          label: "Rest Day Pay Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "rest_day_multiplier",
          label: "Rest Day Multiplier",
          type: "number",
        },
        {
          key: "night_diff_enabled",
          label: "Night Differential Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "night_diff_start",
          label: "Night Diff Start",
          type: "time",
        },
        {
          key: "night_diff_end",
          label: "Night Diff End",
          type: "time",
        },
        {
          key: "night_diff_rate",
          label: "Night Diff Rate",
          type: "number",
        },
      ],
    },
    {
      title: "Benefits, Tax, and Compliance",
      description:
        "Future-ready compliance controls. Keep disabled for Vincent Phase 1, then enable when the company is ready.",
      fields: [
        {
          key: "benefits_enabled",
          label: "Benefits Module Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "government_contributions_enabled",
          label: "Government Contributions Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "sss_enabled",
          label: "SSS Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "sss_mode",
          label: "SSS Mode",
          type: "select",
          options: ["Manual", "Automatic"],
        },
        {
          key: "philhealth_enabled",
          label: "PhilHealth Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "philhealth_mode",
          label: "PhilHealth Mode",
          type: "select",
          options: ["Manual", "Automatic"],
        },
        {
          key: "pagibig_enabled",
          label: "Pag-IBIG Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "pagibig_mode",
          label: "Pag-IBIG Mode",
          type: "select",
          options: ["Manual", "Automatic"],
        },
        {
          key: "withholding_tax_enabled",
          label: "Withholding Tax Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "tax_mode",
          label: "Tax Mode",
          type: "select",
          options: ["Manual", "Automatic"],
        },
        {
          key: "thirteenth_month_enabled",
          label: "13th Month Enabled",
          type: "select",
          options: ["Yes", "No"],
        },
      ],
    },
    {
      title: "Payslip Visibility",
      description:
        "Controls which future compliance lines appear on the payslip. Disabled items are hidden completely, not shown as ₱0.00.",
      fields: [
        {
          key: "show_sss_on_payslip",
          label: "Show SSS on Payslip",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "show_philhealth_on_payslip",
          label: "Show PhilHealth on Payslip",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "show_pagibig_on_payslip",
          label: "Show Pag-IBIG on Payslip",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "show_tax_on_payslip",
          label: "Show Withholding Tax on Payslip",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "hide_zero_government_deductions",
          label: "Hide Zero Government Deductions",
          type: "select",
          options: ["Yes", "No"],
        },
      ],
    },
    {
      title: "Government Information Requirements",
      description:
        "Future-ready employee requirements. Keep disabled until government compliance details are required.",
      fields: [
        {
          key: "require_sss_number",
          label: "Require SSS Number",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "require_philhealth_number",
          label: "Require PhilHealth Number",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "require_pagibig_number",
          label: "Require Pag-IBIG Number",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "require_tin_number",
          label: "Require TIN Number",
          type: "select",
          options: ["Yes", "No"],
        },
      ],
    },
    {
      title: "Payroll Approval and Payslip",
      description: "Controls payroll release flow and payslip footer details.",
      fields: [
        {
          key: "payroll_approval_required",
          label: "Payroll Approval Required",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "authorized_signatory",
          label: "Authorized Signatory",
          type: "text",
        },
        {
          key: "payslip_footer",
          label: "Payslip Footer",
          type: "text",
        },
      ],
    },
  ];

  /// CALCULATIONS
  const activeHolidays = useMemo(
    () => holidays.filter((item) => item.is_active),
    [holidays]
  );

  const inactiveHolidays = useMemo(
    () => holidays.filter((item) => !item.is_active),
    [holidays]
  );

  /// FUNCTIONS
  const getSettings = async () => {
    const { data, error } = await supabase
      .from("payroll_settings")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.log("GET PAYROLL SETTINGS ERROR:", error);
      return;
    }

    const mapped: Record<string, string> = {};

    (data || []).forEach((item: any) => {
      mapped[item.setting_key] = item.setting_value;
    });

    setSettings({
      ...defaultSettings,
      ...mapped,
    });
  };

  const getHolidays = async () => {
    const { data, error } = await supabase
      .from("payroll_holidays")
      .select("*")
      .order("holiday_date", { ascending: true });

    if (error) {
      console.log("GET HOLIDAYS ERROR:", error);
      return;
    }

    setHolidays(data || []);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);

    const rows = settingGroups
      .flatMap((group) => group.fields)
      .map((field) => ({
        setting_key: field.key,
        setting_value: settings[field.key] || defaultSettings[field.key] || "",
      }));

    const { error } = await supabase.from("payroll_settings").upsert(rows, {
      onConflict: "setting_key",
    });

    setIsSaving(false);

    if (error) {
      console.log("SAVE PAYROLL SETTINGS ERROR:", error);
      alert("Failed to save payroll settings.");
      return;
    }

    alert("Payroll settings saved.");
    getSettings();
  };

  const addHoliday = async () => {
    if (!holidayName.trim() || !holidayDate || !holidayType || !holidayMultiplier) {
      alert("Please complete holiday name, date, type, and multiplier.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("payroll_holidays").insert({
      holiday_name: holidayName.trim(),
      holiday_date: holidayDate,
      holiday_type: holidayType,
      multiplier: Number(holidayMultiplier || 1),
      is_active: true,
    });

    setIsSaving(false);

    if (error) {
      console.log("ADD HOLIDAY ERROR:", error);
      alert("Failed to add holiday.");
      return;
    }

    setHolidayName("");
    setHolidayDate("");
    setHolidayType("Regular");
    setHolidayMultiplier("2");
    getHolidays();
  };

  const toggleHoliday = async (holiday: PayrollHoliday) => {
    const { error } = await supabase
      .from("payroll_holidays")
      .update({
        is_active: !holiday.is_active,
      })
      .eq("id", holiday.id);

    if (error) {
      console.log("TOGGLE HOLIDAY ERROR:", error);
      alert("Failed to update holiday.");
      return;
    }

    getHolidays();
  };

  const deleteHoliday = async (id?: number) => {
    if (!id) return;

    const confirmDelete = confirm("Delete this holiday?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("payroll_holidays")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE HOLIDAY ERROR:", error);
      alert("Failed to delete holiday.");
      return;
    }

    getHolidays();
  };

  const formatMultiplier = (value: any) => {
    return `${Number(value || 0).toFixed(2)}x`;
  };

  /// EFFECTS
  useEffect(() => {
    getSettings();
    getHolidays();
  }, []);

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
            <h1 className="mt-2 text-3xl font-bold">Payroll Settings</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Configure payroll rules before building payroll register,
              attendance import, OT approval, payslip, and employee KPI.
            </p>
          </div>

          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Attendance Rule"
            value="First In / Last Out"
            description="Break logs are ignored."
            color="text-emerald-400"
          />
          <SummaryCard
            title="Leave Pay"
            value={settings.leave_pay_enabled || "No"}
            description="Approved leave is unpaid."
            color="text-blue-400"
          />
          <SummaryCard
            title="OT Pay"
            value={settings.ot_enabled || "Yes"}
            description={
              settings.ot_enabled === "No"
                ? "Detected OT is audit-only."
                : "Detected OT can enter payroll."
            }
            color="text-amber-400"
          />
          <SummaryCard
            title="Gov Contributions"
            value={settings.government_contributions_enabled || "No"}
            description="Hidden when disabled."
            color="text-slate-300"
          />
        </section>

        <section className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
          <h2 className="text-xl font-black text-blue-300">Future-Ready Payroll Compliance</h2>
          <p className="mt-2 text-sm text-blue-100/80">
            SSS, PhilHealth, Pag-IBIG, withholding tax, visibility, and required ID controls are prepared here.
            Keep them disabled for Vincent Phase 1. When compliance is ready, enable the settings without redesigning payroll.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {settingGroups.map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="mb-5">
                <h2 className="text-xl font-bold">{group.title}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {group.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-semibold text-slate-200">
                      {field.label}
                    </label>

                    {field.type === "select" ? (
                      <select
                        value={settings[field.key] || ""}
                        onChange={(e) =>
                          updateSetting(field.key, e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Select</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={settings[field.key] || ""}
                        onChange={(e) =>
                          updateSetting(field.key, e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-bold">Holiday List</h2>
              <p className="mt-1 text-sm text-slate-400">
                Add regular and special holidays for payroll computation. V1 can
                still use manual holiday pay while keeping this list ready.
              </p>
            </div>

            <div className="text-sm text-slate-400">
              Active Holidays:{" "}
              <span className="font-bold text-emerald-400">
                {activeHolidays.length}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="Holiday name"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none md:col-span-2"
            />

            <input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            />

            <select
              value={holidayType}
              onChange={(e) => {
                setHolidayType(e.target.value);
                setHolidayMultiplier(e.target.value === "Regular" ? "2" : "1.3");
              }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            >
              <option value="Regular">Regular</option>
              <option value="Special">Special</option>
            </select>

            <div className="flex gap-2">
              <input
                type="number"
                value={holidayMultiplier}
                onChange={(e) => setHolidayMultiplier(e.target.value)}
                placeholder="Multiplier"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <button
                onClick={addHoliday}
                disabled={isSaving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <HolidayTable
            title="Active Holidays"
            holidays={activeHolidays}
            formatMultiplier={formatMultiplier}
            toggleHoliday={toggleHoliday}
            deleteHoliday={deleteHoliday}
          />

          {inactiveHolidays.length > 0 && (
            <HolidayTable
              title="Inactive Holidays"
              holidays={inactiveHolidays}
              formatMultiplier={formatMultiplier}
              toggleHoliday={toggleHoliday}
              deleteHoliday={deleteHoliday}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, description, color }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 text-2xl font-bold ${color}`}>{value}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function HolidayTable({
  title,
  holidays,
  formatMultiplier,
  toggleHoliday,
  deleteHoliday,
}: any) {
  return (
    <div className="mt-6 overflow-auto rounded-xl border border-slate-800">
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
        <h3 className="font-bold">{title}</h3>
      </div>

      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-slate-950 text-left text-slate-400">
          <tr>
            <th className="px-4 py-3">Holiday</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Multiplier</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {holidays.map((holiday: PayrollHoliday) => (
            <tr key={holiday.id} className="border-t border-slate-800">
              <td className="px-4 py-3 font-semibold">
                {holiday.holiday_name}
              </td>
              <td className="px-4 py-3">{holiday.holiday_date}</td>
              <td className="px-4 py-3">{holiday.holiday_type}</td>
              <td className="px-4 py-3 text-right font-bold text-amber-400">
                {formatMultiplier(holiday.multiplier)}
              </td>
              <td className="px-4 py-3">
                {holiday.is_active ? (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                    Inactive
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleHoliday(holiday)}
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold hover:bg-blue-500"
                  >
                    {holiday.is_active ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => deleteHoliday(holiday.id)}
                    className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
                
              </td>
            </tr>
          ))}

          

          {holidays.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                No holidays found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}