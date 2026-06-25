"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCcw,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type OnboardingSettings = {
  id: string;
  company_id: string;
  is_registration_open: boolean;
  closed_message: string;
  created_at?: string;
  updated_at?: string;
};

export default function RegistrationSettingsPage() {
  /// STATES
  const [settings, setSettings] = useState<OnboardingSettings | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [closedMessage, setClosedMessage] = useState(
    "Employee onboarding is currently closed. Please contact HR.",
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /// FUNCTIONS
  const getCurrentCompanyId = () => {
    if (typeof window === "undefined") return "";

    return (
      localStorage.getItem("opscore_current_company_id") ||
      localStorage.getItem("opscore_company_id") ||
      localStorage.getItem("company_id") ||
      ""
    );
  };

  const loadSettings = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const currentCompanyId = getCurrentCompanyId();

    if (!currentCompanyId) {
      setLoading(false);
      setErrorMessage("Company session not found. Please logout and login again.");
      return;
    }

    setCompanyId(currentCompanyId);

    const { data, error } = await supabase
      .from("onboarding_settings")
      .select("*")
      .eq("company_id", currentCompanyId)
      .maybeSingle();

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    if (!data) {
      const { data: insertedSettings, error: insertError } = await supabase
        .from("onboarding_settings")
        .insert({
          company_id: currentCompanyId,
          is_registration_open: false,
          closed_message:
            "Employee onboarding is currently closed. Please contact HR.",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      setLoading(false);

      if (insertError) {
        setErrorMessage(insertError.message);
        return;
      }

      setSettings(insertedSettings);
      setIsRegistrationOpen(insertedSettings.is_registration_open);
      setClosedMessage(insertedSettings.closed_message);
      return;
    }

    setSettings(data);
    setIsRegistrationOpen(Boolean(data.is_registration_open));
    setClosedMessage(
      data.closed_message ||
        "Employee onboarding is currently closed. Please contact HR.",
    );

    setLoading(false);
  };

  const saveSettings = async () => {
    if (!companyId) {
      setErrorMessage("Company session not found. Please logout and login again.");
      return;
    }

    if (!closedMessage.trim()) {
      setErrorMessage("Closed message is required.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: companyId,
      is_registration_open: isRegistrationOpen,
      closed_message: closedMessage.trim(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("onboarding_settings")
      .upsert(payload, {
        onConflict: "company_id",
      })
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSettings(data);
    setSuccessMessage("Registration settings saved successfully.");
  };

  /// EFFECTS
  useEffect(() => {
    loadSettings();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="SYSTEM / REGISTRATION SETTINGS" />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
        <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              System
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Registration Settings
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              Control whether employees can access the public onboarding form.
              Manual encoding and import remain available for HR/Admin.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSettings}
            disabled={loading || saving}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCcw size={17} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Employee Onboarding
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Public Registration Access
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                    When open, employees can submit their 201 information for HR
                    review. When closed, the public onboarding page will show
                    the closed message only.
                  </p>
                </div>

                <span
                  className={[
                    "inline-flex h-10 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.14em]",
                    isRegistrationOpen
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700",
                  ].join(" ")}
                >
                  {isRegistrationOpen ? "Open" : "Closed"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsRegistrationOpen((prev) => !prev)}
                disabled={loading || saving}
                className={[
                  "flex w-full items-center justify-between rounded-3xl border p-5 text-left transition-all duration-200 active:scale-[0.99] disabled:opacity-50",
                  isRegistrationOpen
                    ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                ].join(" ")}
              >
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Registration is {isRegistrationOpen ? "OPEN" : "CLOSED"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {isRegistrationOpen
                      ? "Employees can access the onboarding form."
                      : "Employees cannot access the onboarding form."}
                  </p>
                </div>

                <div
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    isRegistrationOpen
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-950 text-white",
                  ].join(" ")}
                >
                  {isRegistrationOpen ? (
                    <ToggleRight size={25} />
                  ) : (
                    <ToggleLeft size={25} />
                  )}
                </div>
              </button>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Closed State Message
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Message shown when registration is closed
                </h2>
              </div>

              <textarea
                value={closedMessage}
                onChange={(event) => setClosedMessage(event.target.value)}
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm font-semibold leading-6 text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                This message will appear on the public onboarding page when the
                switch is closed.
              </p>
            </section>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Lock size={20} />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Control Panel
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  Save Registration Access
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              <StatusRow
                icon={
                  isRegistrationOpen ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )
                }
                label="Current Status"
                value={isRegistrationOpen ? "Open" : "Closed"}
                danger={!isRegistrationOpen}
              />

              <StatusRow
                icon={<CheckCircle2 size={18} />}
                label="Manual Encoding"
                value="Always Available"
              />

              <StatusRow
                icon={<CheckCircle2 size={18} />}
                label="CSV Import"
                value="Always Available"
              />
            </div>

            {errorMessage && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-5 text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-5 text-emerald-700">
                {successMessage}
              </div>
            )}

            <button
              type="button"
              onClick={saveSettings}
              disabled={loading || saving || !companyId}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Settings"}
            </button>

            {settings && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Company ID
                </p>
                <p className="mt-1 break-all text-xs font-bold text-slate-700">
                  {settings.company_id}
                </p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-xl",
            danger ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {icon}
        </div>

        <p className="text-sm font-black text-slate-950">{label}</p>
      </div>

      <p
        className={[
          "text-sm font-black",
          danger ? "text-red-700" : "text-emerald-700",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}


