"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import PageGuard from "@/components/PageGuard";

type PayrollHoliday = {
  id?: number;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string;
  multiplier: number;
  is_active: boolean;
};

type SettingField = {
  key: string;
  label: string;
  type: string;
  options?: string[];
};

type SettingGroup = {
  title: string;
  description: string;
  fields: SettingField[];
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

  /// DATA
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

    ot_requires_approval: "Yes",
    ot_multiplier: "1.25",
    early_time_in_counts_as_ot: "No",
    after_shift_counts_as_ot: "Yes",

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

    authorized_signatory: "",
    payslip_footer: "This is a system-generated payslip.",
  };

  const settingGroups: SettingGroup[] = [
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
      description: "Automatic payroll deductions from attendance records.",
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
          key: "ot_requires_approval",
          label: "OT Requires Approval",
          type: "select",
          options: ["Yes", "No"],
        },
        { key: "ot_multiplier", label: "OT Multiplier", type: "number" },
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
      title: "Payslip Details",
      description: "Controls authorized signatory and payslip footer details.",
      fields: [
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

  const changedSettings = useMemo(() => {
    return settingGroups
      .flatMap((group) => group.fields)
      .filter((field) => {
        const currentValue = settings[field.key] || "";
        const defaultValue = defaultSettings[field.key] || "";
        return currentValue !== defaultValue;
      });
  }, [settings]);

  /// HELPERS
  const createAuditLog = async ({
    action,
    description,
    severity = "info",
    oldValue = null,
    newValue = null,
  }: {
    action: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    oldValue?: any;
    newValue?: any;
  }) => {
    try {
      await supabase.from("audit_logs").insert({
        module: "Payroll Settings",
        action,
        description,
        severity,
        old_value: oldValue,
        new_value: newValue,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.log("PAYROLL SETTINGS AUDIT ERROR:", error);
    }
  };

  const buildSettingsRows = () => {
    return settingGroups
      .flatMap((group) => group.fields)
      .map((field) => ({
        setting_key: field.key,
        setting_value: settings[field.key] || defaultSettings[field.key] || "",
      }));
  };

  const resetHolidayForm = () => {
    setHolidayName("");
    setHolidayDate("");
    setHolidayType("Regular");
    setHolidayMultiplier("2");
  };

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

    const rows = buildSettingsRows();
    const oldValue = { settings };
    const newValue = { rows };

    const { error } = await supabase.from("payroll_settings").upsert(rows, {
      onConflict: "setting_key",
    });

    setIsSaving(false);

    if (error) {
      console.log("SAVE PAYROLL SETTINGS ERROR:", error);

      await createAuditLog({
        action: "SAVE_PAYROLL_SETTINGS_FAILED",
        description: "Failed to save payroll settings.",
        severity: "critical",
        oldValue,
        newValue,
      });

      alert("Failed to save payroll settings.");
      return;
    }

    await createAuditLog({
      action: "SAVE_PAYROLL_SETTINGS",
      description: `Updated payroll settings (${rows.length} setting rows).`,
      severity: "warning",
      oldValue,
      newValue,
    });

    alert("Payroll settings saved.");
    await getSettings();
  };

  const addHoliday = async () => {
    if (!holidayName.trim() || !holidayDate || !holidayType || !holidayMultiplier) {
      alert("Please complete holiday name, date, type, and multiplier.");
      return;
    }

    const newHoliday = {
      holiday_name: holidayName.trim(),
      holiday_date: holidayDate,
      holiday_type: holidayType,
      multiplier: Number(holidayMultiplier || 1),
      is_active: true,
    };

    setIsSaving(true);

    const { data, error } = await supabase
      .from("payroll_holidays")
      .insert(newHoliday)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("ADD HOLIDAY ERROR:", error);

      await createAuditLog({
        action: "ADD_PAYROLL_HOLIDAY_FAILED",
        description: `Failed to add payroll holiday: ${newHoliday.holiday_name}`,
        severity: "critical",
        oldValue: null,
        newValue: newHoliday,
      });

      alert("Failed to add holiday.");
      return;
    }

    await createAuditLog({
      action: "ADD_PAYROLL_HOLIDAY",
      description: `Added payroll holiday: ${data?.holiday_name || newHoliday.holiday_name}`,
      severity: "warning",
      oldValue: null,
      newValue: data || newHoliday,
    });

    resetHolidayForm();
    await getHolidays();
  };

  const toggleHoliday = async (holiday: PayrollHoliday) => {
    const oldValue = { ...holiday };
    const newValue = {
      ...holiday,
      is_active: !holiday.is_active,
    };

    const { error } = await supabase
      .from("payroll_holidays")
      .update({
        is_active: !holiday.is_active,
      })
      .eq("id", holiday.id);

    if (error) {
      console.log("TOGGLE HOLIDAY ERROR:", error);

      await createAuditLog({
        action: "TOGGLE_PAYROLL_HOLIDAY_FAILED",
        description: `Failed to ${holiday.is_active ? "disable" : "enable"} payroll holiday: ${holiday.holiday_name}`,
        severity: "critical",
        oldValue,
        newValue,
      });

      alert("Failed to update holiday.");
      return;
    }

    await createAuditLog({
      action: "TOGGLE_PAYROLL_HOLIDAY",
      description: `${holiday.holiday_name} was ${
        holiday.is_active ? "disabled" : "enabled"
      }.`,
      severity: "warning",
      oldValue,
      newValue,
    });

    await getHolidays();
  };

  const deleteHoliday = async (id?: number) => {
    if (!id) return;

    const holidayToDelete = holidays.find((item) => item.id === id);
    const confirmDelete = confirm(
      `Delete holiday "${holidayToDelete?.holiday_name || "selected holiday"}"?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("payroll_holidays")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE HOLIDAY ERROR:", error);

      await createAuditLog({
        action: "DELETE_PAYROLL_HOLIDAY_FAILED",
        description: `Failed to delete payroll holiday: ${holidayToDelete?.holiday_name || id}`,
        severity: "critical",
        oldValue: holidayToDelete || { id },
        newValue: null,
      });

      alert("Failed to delete holiday.");
      return;
    }

    await createAuditLog({
      action: "DELETE_PAYROLL_HOLIDAY",
      description: `Deleted payroll holiday: ${holidayToDelete?.holiday_name || id}`,
      severity: "critical",
      oldValue: holidayToDelete || { id },
      newValue: null,
    });

    await getHolidays();
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
    <PageGuard moduleKey="payroll_settings">
      <div className="flex min-h-screen bg-[#07111f] text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {/* EXECUTIVE HERO */}
          <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-[#0B1220] via-[#13203D] to-[#07111f] p-5 shadow-2xl shadow-blue-950/30 lg:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
              <div className="min-w-0">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">
                    Payroll Control Center
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-bold text-slate-200">
                    Settings & Compliance
                  </span>
                </div>

                <p className="text-sm font-black uppercase tracking-[0.35em] text-blue-100/80">
                  OPSCORE Configuration Suite
                </p>

                <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">
                  Payroll Settings
                </h1>

                <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-200 sm:text-lg">
                  Configure attendance, overtime, leave, deductions, holidays, government compliance, and payslip controls.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/70">
                      Rule Groups
                    </p>
                    <p className="mt-2 text-3xl font-black text-blue-100">
                      {settingGroups.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Payroll policy sections
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/70">
                      Active Holidays
                    </p>
                    <p className="mt-2 text-3xl font-black text-blue-100">
                      {activeHolidays.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Used for holiday pay control
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/70">
                      Modified Controls
                    </p>
                    <p className="mt-2 text-3xl font-black text-blue-100">
                      {changedSettings.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Different from default setup
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200/80">
                  Settings Status
                </p>

                <h2 className="mt-3 text-3xl font-black text-white">
                  Ready
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Payroll configuration is ready for Vincent Phase 1. Save only after reviewing policy changes.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Compliance
                    </p>
                    <p className="mt-1 text-lg font-black text-blue-200">
                      {settings.government_contributions_enabled || "No"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      OT Approval
                    </p>
                    <p className="mt-1 text-lg font-black text-blue-200">
                      {settings.ot_requires_approval || "Yes"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Saving Configuration..." : "Save Payroll Configuration"}
                </button>
              </div>
            </div>
          </section>

          {/* EXECUTIVE SUMMARY */}
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Attendance Policy"
              value={settings.attendance_rule || "First In / Last Out"}
              description="Primary attendance rule used for payroll computation."
            />

            <SummaryCard
              title="Leave Pay"
              value={settings.leave_pay_enabled || "No"}
              description="Approved leave remains unpaid unless enabled."
            />

            <SummaryCard
              title="OT Controls"
              value={settings.ot_requires_approval || "Yes"}
              description="Overtime must pass approval before payroll."
            />

            <SummaryCard
              title="Compliance Status"
              value={settings.government_contributions_enabled || "No"}
              description="Government deductions stay hidden when disabled."
            />
          </section>

          {/* AI ADVISOR */}
          <section className="mb-6 overflow-hidden rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-blue-950/20 lg:p-6">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                  OPSCORE AI Advisor
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Payroll Compliance Readiness
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  Vincent Phase 1 can keep government contribution and tax controls disabled while the system remains ready for future compliance activation.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200/60">
                      Recommendation
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                      Keep SSS, PhilHealth, Pag-IBIG, withholding tax, and 13th month controls disabled until management confirms the compliance rollout.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200/60">
                      Audit Note
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                      Configuration changes, holiday activation, and holiday deletion should be treated as payroll-control decisions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-blue-300/20 bg-slate-950/70 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200/70">
                  Control Summary
                </p>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <span className="text-slate-400">Leave Pay</span>
                    <span className="font-black text-white">{settings.leave_pay_enabled || "No"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <span className="text-slate-400">Holiday Pay</span>
                    <span className="font-black text-white">{settings.holiday_pay_enabled || "No"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <span className="text-slate-400">Active Holidays</span>
                    <span className="font-black text-white">{activeHolidays.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SETTINGS GROUPS */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {settingGroups.map((group, groupIndex) => (
              <div
                key={group.title}
                className="overflow-hidden rounded-3xl border border-blue-300/10 bg-white/[0.035] shadow-xl shadow-black/10 backdrop-blur"
              >
                <div className="border-b border-blue-300/10 bg-slate-950/40 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/60">
                        Rule Group {groupIndex + 1}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-white">
                        {group.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {group.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-blue-300/15 bg-blue-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
                      {group.fields.length} Controls
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                  {group.fields.map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        {field.label}
                      </label>

                      {field.type === "select" ? (
                        <select
                          value={settings[field.key] || ""}
                          onChange={(e) => updateSetting(field.key, e.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
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
                          onChange={(e) => updateSetting(field.key, e.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* HOLIDAY PAY CONTROL */}
          <section className="mt-6 overflow-hidden rounded-3xl border border-blue-300/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur lg:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                  Holiday Pay Control Center
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Holiday Rules & Multipliers
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Add regular and special holidays for payroll computation. Manual mode can stay active while holiday records remain ready for future automation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Active</p>
                  <p className="mt-1 text-2xl font-black text-white">{activeHolidays.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Inactive</p>
                  <p className="mt-1 text-2xl font-black text-white">{inactiveHolidays.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Mode</p>
                  <p className="mt-1 text-lg font-black text-white">{settings.holiday_pay_mode || "Manual"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-5">
              <input
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="Holiday name"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400 lg:col-span-2"
              />

              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition [color-scheme:dark] focus:border-blue-400"
              />

              <select
                value={holidayType}
                onChange={(e) => {
                  setHolidayType(e.target.value);
                  setHolidayMultiplier(e.target.value === "Regular" ? "2" : "1.3");
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
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
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
                />

                <button
                  onClick={addHoliday}
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
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
    </PageGuard>
  );
}

function SummaryCard({ title, value, description }: any) {
  return (
    <div className="rounded-3xl border border-blue-300/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200/60">
        {title}
      </p>
      <h2 className="mt-3 text-2xl font-black text-white">{value}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
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
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
        <h3 className="font-black text-white">{title}</h3>
      </div>

      <div className="overflow-x-auto">
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
              <tr key={holiday.id} className="border-t border-slate-800/80 hover:bg-white/[0.025]">
                <td className="px-4 py-3 font-semibold text-white">
                  {holiday.holiday_name}
                </td>
                <td className="px-4 py-3 text-slate-300">{holiday.holiday_date}</td>
                <td className="px-4 py-3 text-slate-300">{holiday.holiday_type}</td>
                <td className="px-4 py-3 text-right font-black text-blue-300">
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
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-500"
                    >
                      {holiday.is_active ? "Disable" : "Enable"}
                    </button>

                    <button
                      onClick={() => deleteHoliday(holiday.id)}
                      className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-200 hover:bg-red-500/20"
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
    </div>
  );
}
