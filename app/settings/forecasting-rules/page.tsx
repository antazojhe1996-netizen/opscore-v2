"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createAuditLog } from "@/lib/audit";
import PageGuard from "@/components/PageGuard";

const defaultForecastingRules = {
  demand: {
    high: 90,
    normal: 50,
    low: 30,
  },
  eventDemand: {
    highPax: 200,
    normalPax: 80,
    lowPax: 30,
  },
  laborRisk: {
    overstaffGap: 5,
  },
};

export default function ForecastingRulesPage() {
  /// STATES
  const [high, setHigh] = useState("90");
  const [normal, setNormal] = useState("50");
  const [low, setLow] = useState("30");

  const [highPax, setHighPax] = useState("200");
  const [normalPax, setNormalPax] = useState("80");
  const [lowPax, setLowPax] = useState("30");

  const [overstaffGap, setOverstaffGap] = useState("5");

  /// FUNCTIONS

  const getCurrentUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email || "System User";
  };

  const buildPayload = () => ({
    demand: {
      high: Number(high || defaultForecastingRules.demand.high),
      normal: Number(normal || defaultForecastingRules.demand.normal),
      low: Number(low || defaultForecastingRules.demand.low),
    },
    eventDemand: {
      highPax: Number(highPax || defaultForecastingRules.eventDemand.highPax),
      normalPax: Number(
        normalPax || defaultForecastingRules.eventDemand.normalPax
      ),
      lowPax: Number(lowPax || defaultForecastingRules.eventDemand.lowPax),
    },
    laborRisk: {
      overstaffGap: Number(
        overstaffGap || defaultForecastingRules.laborRisk.overstaffGap
      ),
    },
  });

  const applyPayloadToForm = (payload: any) => {
    setHigh(String(payload?.demand?.high ?? defaultForecastingRules.demand.high));
    setNormal(
      String(payload?.demand?.normal ?? defaultForecastingRules.demand.normal)
    );
    setLow(String(payload?.demand?.low ?? defaultForecastingRules.demand.low));

    setHighPax(
      String(
        payload?.eventDemand?.highPax ??
          defaultForecastingRules.eventDemand.highPax
      )
    );
    setNormalPax(
      String(
        payload?.eventDemand?.normalPax ??
          defaultForecastingRules.eventDemand.normalPax
      )
    );
    setLowPax(
      String(
        payload?.eventDemand?.lowPax ??
          defaultForecastingRules.eventDemand.lowPax
      )
    );

    setOverstaffGap(
      String(
        payload?.laborRisk?.overstaffGap ??
          defaultForecastingRules.laborRisk.overstaffGap
      )
    );
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("forecasting_settings")
      .select("setting_data")
      .eq("setting_name", "forecasting_rules")
      .maybeSingle();

    if (error) {
      console.log("LOAD FORECASTING SETTINGS ERROR:", error.message);
      return;
    }

    if (data?.setting_data) {
      applyPayloadToForm(data.setting_data);
    }
  };

  const saveSettings = async () => {
    const { data: oldSettings } = await supabase
      .from("forecasting_settings")
      .select("*")
      .eq("setting_name", "forecasting_rules")
      .maybeSingle();

    const payload = buildPayload();

    const { error } = await supabase.from("forecasting_settings").upsert(
      {
        setting_name: "forecasting_rules",
        setting_data: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_name" }
    );

    if (error) {
      console.log("SAVE FORECASTING SETTINGS ERROR:", error.message);
      alert("Failed to save settings.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Forecasting Rules",
      action: "UPDATE_FORECASTING_RULE",
      description: "Updated Forecasting Rules configuration",
      severity: "warning",
      recordId: "forecasting_rules",
      oldValue: oldSettings?.setting_data || null,
      newValue: payload,
    });

    alert("Forecasting rules saved.");
  };

  const resetToDefault = async () => {
    const confirmReset = confirm(
      "Reset Forecasting Rules to default values? This will be recorded in Audit Trail."
    );

    if (!confirmReset) return;

    const oldValue = buildPayload();
    const newValue = defaultForecastingRules;

    applyPayloadToForm(defaultForecastingRules);

    const { error } = await supabase.from("forecasting_settings").upsert(
      {
        setting_name: "forecasting_rules",
        setting_data: newValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_name" }
    );

    if (error) {
      console.log("RESET FORECASTING SETTINGS ERROR:", error.message);
      alert("Failed to reset settings.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Forecasting Rules",
      action: "RESET_FORECASTING_RULE",
      description: "Reset Forecasting Rules to default values",
      severity: "critical",
      recordId: "forecasting_rules",
      oldValue,
      newValue,
    });

    alert("Forecasting rules reset to default.");
  };

  /// EFFECTS

  useEffect(() => {
    loadSettings();
  }, []);

  /// UI

 return (
  <PageGuard moduleKey="forecasting_rules">
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Forecasting Rules</h1>
            <p className="mt-2 text-slate-400">
              Configure demand targets based on occupancy and event pax.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetToDefault}
              className="rounded-xl bg-slate-700 px-5 py-3 font-bold text-white hover:bg-slate-600"
            >
              Reset Default
            </button>

            <button
              onClick={saveSettings}
              className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-slate-950 hover:bg-yellow-300"
            >
              Save Forecasting Rules
            </button>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Occupancy Demand Rules</h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-400">
                High Occupancy %
              </label>
              <input
                type="number"
                value={high}
                onChange={(e) => setHigh(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Normal Occupancy %
              </label>
              <input
                type="number"
                value={normal}
                onChange={(e) => setNormal(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Low Occupancy %
              </label>
              <input
                type="number"
                value={low}
                onChange={(e) => setLow(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Event Pax Demand Rules</h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-400">
                High Demand Pax
              </label>
              <input
                type="number"
                value={highPax}
                onChange={(e) => setHighPax(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Normal Demand Pax
              </label>
              <input
                type="number"
                value={normalPax}
                onChange={(e) => setNormalPax(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Low Demand Pax
              </label>
              <input
                type="number"
                value={lowPax}
                onChange={(e) => setLowPax(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Labor Risk Rules</h2>

          <div className="mt-5 max-w-md">
            <label className="mb-2 block text-sm text-slate-400">
              Overstaff Gap Threshold
            </label>
            <input
              type="number"
              value={overstaffGap}
              onChange={(e) => setOverstaffGap(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />

            <p className="mt-2 text-xs text-slate-500">
              If total schedule gap is greater than this number, labor risk becomes Overstaff Risk.
            </p>
          </div>
        </section>
      </main>
       </div>
  </PageGuard>
  );
}





