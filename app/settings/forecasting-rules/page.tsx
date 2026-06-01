"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ForecastingRulesPage() {
  const [high, setHigh] = useState("90");
  const [normal, setNormal] = useState("50");
  const [low, setLow] = useState("30");

  const [highPax, setHighPax] = useState("200");
  const [normalPax, setNormalPax] = useState("80");
  const [lowPax, setLowPax] = useState("30");

  const [overstaffGap, setOverstaffGap] = useState("5");

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
      setHigh(String(data.setting_data.demand?.high ?? 90));
      setNormal(String(data.setting_data.demand?.normal ?? 50));
      setLow(String(data.setting_data.demand?.low ?? 30));

      setHighPax(String(data.setting_data.eventDemand?.highPax ?? 200));
      setNormalPax(String(data.setting_data.eventDemand?.normalPax ?? 80));
      setLowPax(String(data.setting_data.eventDemand?.lowPax ?? 30));

      setOverstaffGap(String(data.setting_data.laborRisk?.overstaffGap ?? 5));
    }
  };

  const saveSettings = async () => {
    const { error } = await supabase.from("forecasting_settings").upsert(
      {
        setting_name: "forecasting_rules",
        setting_data: {
          demand: {
            high: Number(high || 90),
            normal: Number(normal || 50),
            low: Number(low || 30),
          },
          eventDemand: {
            highPax: Number(highPax || 200),
            normalPax: Number(normalPax || 80),
            lowPax: Number(lowPax || 30),
          },
          laborRisk: {
            overstaffGap: Number(overstaffGap || 5),
          },
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_name" }
    );

    if (error) {
      console.log("SAVE FORECASTING SETTINGS ERROR:", error.message);
      alert("Failed to save settings.");
      return;
    }

    alert("Forecasting rules saved.");
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Forecasting Rules</h1>
        <p className="mt-2 text-slate-400">
          Configure demand targets based on occupancy and event pax.
        </p>

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

        <button
          onClick={saveSettings}
          className="mt-6 rounded-xl bg-yellow-400 px-6 py-3 font-bold text-slate-950 hover:bg-yellow-300"
        >
          Save Forecasting Rules
        </button>
      </main>
    </div>
  );
}