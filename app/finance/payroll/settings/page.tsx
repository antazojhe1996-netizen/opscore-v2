"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

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
        { key: "leave_enabled", label: "Leave Enabled", type: "select", options: ["Yes", "No"] },
        { key: "leave_pay_enabled", label: "Leave Pay Enabled", type: "select", options: ["Yes", "No"] },
        { key: "leave_credits_enabled", label: "Leave Credits Enabled", type: "select", options: ["Yes", "No"] },
        { key: "default_leave_credits", label: "Default Leave Credits", type: "number" },
      ],
    },
    {
      title: "Attendance Deductions",
      description: "Automatic payroll deductions from attendance records.",
      fields: [
        { key: "late_deduction_enabled", label: "Late Deduction Enabled", type: "select", options: ["Yes", "No"] },
        { key: "late_grace_minutes", label: "Late Grace Minutes", type: "number" },
        { key: "undertime_deduction_enabled", label: "Undertime Deduction Enabled", type: "select", options: ["Yes", "No"] },
        { key: "undertime_grace_minutes", label: "Undertime Grace Minutes", type: "number" },
        { key: "absent_deduction_enabled", label: "Absent Deduction Enabled", type: "select", options: ["Yes", "No"] },
      ],
    },
    {
      title: "Employee KPI Leave Threshold",
      description:
        "Used for performance KPI. Payroll still treats approved leave as unpaid leave.",
      fields: [
        { key: "leave_threshold_enabled", label: "Leave Threshold Enabled", type: "select", options: ["Yes", "No"] },
        { key: "leave_threshold_period", label: "Threshold Period", type: "select", options: ["Monthly", "Payroll Period", "Yearly"] },
        { key: "allowed_leave_count", label: "Allowed Leave Count", type: "number" },
        { key: "excess_leave_counts_as", label: "Excess Leave Counts As", type: "select", options: ["Absent", "Warning Only"] },
      ],
    },
    {
      title: "Overtime Rules",
      description:
        "Detected OT must be approved before it enters payroll computation.",
      fields: [
        { key: "ot_requires_approval", label: "OT Requires Approval", type: "select", options: ["Yes", "No"] },
        { key: "ot_multiplier", label: "OT Multiplier", type: "number" },
        { key: "early_time_in_counts_as_ot", label: "Early Time-In Counts as OT", type: "select", options: ["Yes", "No"] },
        { key: "after_shift_counts_as_ot", label: "After Shift Counts as OT", type: "select", options: ["Yes", "No"] },
      ],
    },
    {
      title: "Holiday Pay Rules",
      description:
        "Holiday list below will be used later for auto holiday detection.",
      fields: [
        { key: "holiday_pay_enabled", label: "Holiday Pay Enabled", type: "select", options: ["Yes", "No"] },
        { key: "holiday_pay_mode", label: "Holiday Pay Mode", type: "select", options: ["Manual", "Auto"] },
        { key: "regular_holiday_multiplier", label: "Regular Holiday Multiplier", type: "number" },
        { key: "special_holiday_multiplier", label: "Special Holiday Multiplier", type: "number" },
      ],
    },
    {
      title: "Future Pay Rules",
      description: "Disabled for now, ready when management policy changes.",
      fields: [
        { key: "rest_day_pay_enabled", label: "Rest Day Pay Enabled", type: "select", options: ["Yes", "No"] },
        { key: "rest_day_multiplier", label: "Rest Day Multiplier", type: "number" },
        { key: "night_diff_enabled", label: "Night Differential Enabled", type: "select", options: ["Yes", "No"] },
        { key: "night_diff_start", label: "Night Diff Start", type: "time" },
        { key: "night_diff_end", label: "Night Diff End", type: "time" },
        { key: "night_diff_rate", label: "Night Diff Rate", type: "number" },
      ],
    },
    {
      title: "Benefits, Tax, and Compliance",
      description:
        "Future-ready compliance controls. Keep disabled for Vincent Phase 1, then enable when the company is ready.",
      fields: [
        { key: "benefits_enabled", label: "Benefits Module Enabled", type: "select", options: ["Yes", "No"] },
        { key: "government_contributions_enabled", label: "Government Contributions Enabled", type: "select", options: ["Yes", "No"] },
        { key: "sss_enabled", label: "SSS Enabled", type: "select", options: ["Yes", "No"] },
        { key: "sss_mode", label: "SSS Mode", type: "select", options: ["Manual", "Automatic"] },
        { key: "philhealth_enabled", label: "PhilHealth Enabled", type: "select", options: ["Yes", "No"] },
        { key: "philhealth_mode", label: "PhilHealth Mode", type: "select", options: ["Manual", "Automatic"] },
        { key: "pagibig_enabled", label: "Pag-IBIG Enabled", type: "select", options: ["Yes", "No"] },
        { key: "pagibig_mode", label: "Pag-IBIG Mode", type: "select", options: ["Manual", "Automatic"] },
        { key: "withholding_tax_enabled", label: "Withholding Tax Enabled", type: "select", options: ["Yes", "No"] },
        { key: "tax_mode", label: "Tax Mode", type: "select", options: ["Manual", "Automatic"] },
        { key: "thirteenth_month_enabled", label: "13th Month Enabled", type: "select", options: ["Yes", "No"] },
      ],
    },
    {
      title: "Payslip Visibility",
      description:
        "Controls which future compliance lines appear on the payslip.",
      fields: [
        { key: "show_sss_on_payslip", label: "Show SSS on Payslip", type: "select", options: ["Yes", "No"] },
        { key: "show_philhealth_on_payslip", label: "Show PhilHealth on Payslip", type: "select", options: ["Yes", "No"] },
        { key: "show_pagibig_on_payslip", label: "Show Pag-IBIG on Payslip", type: "select", options: ["Yes", "No"] },
        { key: "show_tax_on_payslip", label: "Show Withholding Tax on Payslip", type: "select", options: ["Yes", "No"] },
        { key: "hide_zero_government_deductions", label: "Hide Zero Government Deductions", type: "select", options: ["Yes", "No"] },
      ],
    },
    {
      title: "Government Information Requirements",
      description:
        "Future-ready employee requirements. Keep disabled until compliance details are required.",
      fields: [
        { key: "require_sss_number", label: "Require SSS Number", type: "select", options: ["Yes", "No"] },
        { key: "require_philhealth_number", label: "Require PhilHealth Number", type: "select", options: ["Yes", "No"] },
        { key: "require_pagibig_number", label: "Require Pag-IBIG Number", type: "select", options: ["Yes", "No"] },
        { key: "require_tin_number", label: "Require TIN Number", type: "select", options: ["Yes", "No"] },
      ],
    },
    {
      title: "Payslip Details",
      description: "Controls authorized signatory and payslip footer details.",
      fields: [
        { key: "authorized_signatory", label: "Authorized Signatory", type: "text" },
        { key: "payslip_footer", label: "Payslip Footer", type: "text" },
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

  const inputClass =
    "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

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
      description: `Added payroll holiday: ${
        data?.holiday_name || newHoliday.holiday_name
      }`,
      severity: "warning",
      oldValue: null,
      newValue: data || newHoliday,
    });

    resetHolidayForm();
    await getHolidays();
  };

  const toggleHoliday = async (holiday: PayrollHoliday) => {
    const oldValue = { ...holiday };
    const newValue = { ...holiday, is_active: !holiday.is_active };

    const { error } = await supabase
      .from("payroll_holidays")
      .update({ is_active: !holiday.is_active })
      .eq("id", holiday.id);

    if (error) {
      console.log("TOGGLE HOLIDAY ERROR:", error);

      await createAuditLog({
        action: "TOGGLE_PAYROLL_HOLIDAY_FAILED",
        description: `Failed to ${
          holiday.is_active ? "disable" : "enable"
        } payroll holiday: ${holiday.holiday_name}`,
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
        description: `Failed to delete payroll holiday: ${
          holidayToDelete?.holiday_name || id
        }`,
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
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="PAYROLL / SETTINGS" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            {/* PAGE HEADER */}
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    PAYROLL
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    Payroll Settings
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                    Configure attendance, overtime, leave, deductions, holidays,
                    compliance visibility, and payslip controls for Vincent Resort
                    payroll operations.
                  </p>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="h-11 shrink-0 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </section>

            {/* KPI ROW */}
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Rule Groups"
                value={settingGroups.length}
                description="Payroll policy sections."
              />
              <SummaryCard
                title="Active Holidays"
                value={activeHolidays.length}
                description="Used for holiday pay control."
              />
              <SummaryCard
                title="Modified Controls"
                value={changedSettings.length}
                description="Different from default setup."
              />
              <SummaryCard
                title="OT Approval"
                value={settings.ot_requires_approval || "Yes"}
                description="Overtime must pass approval before payroll."
              />
            </section>

            {/* OPERATION NOTE */}
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Configuration Note
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Vincent Resort Phase 1 Payroll Controls
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                Keep future government contribution and tax controls disabled until
                management confirms compliance rollout. All payroll setting changes
                are audit logged.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <MiniStatusCard
                  label="Leave Pay"
                  value={settings.leave_pay_enabled || "No"}
                />
                <MiniStatusCard
                  label="Holiday Pay"
                  value={settings.holiday_pay_enabled || "No"}
                />
                <MiniStatusCard
                  label="Compliance"
                  value={settings.government_contributions_enabled || "No"}
                />
              </div>
            </section>

            {/* SETTINGS GROUPS */}
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {settingGroups.map((group, groupIndex) => (
                <div
                  key={group.title}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Rule Group {groupIndex + 1}
                        </p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">
                          {group.title}
                        </h2>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                          {group.description}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
                        {group.fields.length} Controls
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                    {group.fields.map((field) => (
                      <div key={field.key}>
                        <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {field.label}
                        </label>

                        {field.type === "select" ? (
                          <select
                            value={settings[field.key] || ""}
                            onChange={(e) =>
                              updateSetting(field.key, e.target.value)
                            }
                            className={inputClass}
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
                            className={inputClass}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* HOLIDAY PAY CONTROL */}
            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Holiday Pay Control
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Holiday Rules & Multipliers
                    </h2>
                    <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                      Add regular and special holidays for payroll computation.
                      Manual mode can stay active while records remain ready for
                      future automation.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <MiniStatusCard label="Active" value={activeHolidays.length} />
                    <MiniStatusCard label="Inactive" value={inactiveHolidays.length} />
                    <MiniStatusCard
                      label="Mode"
                      value={settings.holiday_pay_mode || "Manual"}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Holiday Name
                    </label>
                    <input
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      placeholder="Holiday name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Holiday Date
                    </label>
                    <input
                      type="date"
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Holiday Type
                    </label>
                    <select
                      value={holidayType}
                      onChange={(e) => {
                        setHolidayType(e.target.value);
                        setHolidayMultiplier(
                          e.target.value === "Regular" ? "2" : "1.3"
                        );
                      }}
                      className={inputClass}
                    >
                      <option value="Regular">Regular</option>
                      <option value="Special">Special</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Multiplier
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="number"
                        value={holidayMultiplier}
                        onChange={(e) => setHolidayMultiplier(e.target.value)}
                        placeholder="Multiplier"
                        className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        onClick={addHoliday}
                        disabled={isSaving}
                        className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
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
              </div>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MiniStatusCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function HolidayTable({
  title,
  holidays,
  formatMultiplier,
  toggleHoliday,
  deleteHoliday,
}: {
  title: string;
  holidays: PayrollHoliday[];
  formatMultiplier: (value: any) => string;
  toggleHoliday: (holiday: PayrollHoliday) => void;
  deleteHoliday: (id?: number) => void;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Holiday Table
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Holiday</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Multiplier</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {holidays.map((holiday) => (
              <tr
                key={holiday.id}
                className="transition-all duration-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-black text-slate-950">
                  {holiday.holiday_name}
                </td>
                <td className="px-6 py-4">{holiday.holiday_date}</td>
                <td className="px-6 py-4">{holiday.holiday_type}</td>
                <td className="px-6 py-4 text-right font-black text-slate-950">
                  {formatMultiplier(holiday.multiplier)}
                </td>
                <td className="px-6 py-4">
                  {holiday.is_active ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => toggleHoliday(holiday)}
                      className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      {holiday.is_active ? "Disable" : "Enable"}
                    </button>

                    <button
                      onClick={() => deleteHoliday(holiday.id)}
                      className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {holidays.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center">
                  <p className="text-sm font-black text-slate-950">
                    No holidays found
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Add a holiday above to activate payroll holiday tracking.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}