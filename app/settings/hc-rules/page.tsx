"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type RuleGroup = {
  id: number;
  min: number;
  max: number;
  rules: Record<string, number>;
};

type PeakRule = {
  id: number;
  day: string;
  rules: Record<string, number>;
};

const defaultOccupancyRules: RuleGroup[] = [
  {
    id: 1,
    min: 0,
    max: 10,
    rules: {
      "Front Desk": 1,
      Housekeeping: 1,
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 0,
      Waitress: 1,
    },
  },
  {
    id: 2,
    min: 11,
    max: 20,
    rules: {
      "Front Desk": 2,
      Housekeeping: 2,
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 1,
    },
  },
  {
    id: 3,
    min: 21,
    max: 30,
    rules: {
      "Front Desk": 2,
      Housekeeping: 3,
      Cashier: 1,
      Kitchen: 2,
      "Kitchen Assistant": 1,
      Waitress: 2,
    },
  },
];

const defaultPeakRules: PeakRule[] = [
  {
    id: 1,
    day: "Friday",
    rules: {
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 1,
    },
  },
  {
    id: 2,
    day: "Saturday",
    rules: {
      Cashier: 2,
      Kitchen: 2,
      "Kitchen Assistant": 2,
      Waitress: 2,
    },
  },
  {
    id: 3,
    day: "Sunday",
    rules: {
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 1,
    },
  },
];

const defaultEventRules: RuleGroup[] = [
  {
    id: 1,
    min: 1,
    max: 30,
    rules: {
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 2,
    },
  },
  {
    id: 2,
    min: 31,
    max: 60,
    rules: {
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 2,
    },
  },
  {
    id: 3,
    min: 61,
    max: 100,
    rules: {
      Cashier: 1,
      Kitchen: 2,
      "Kitchen Assistant": 2,
      Waitress: 3,
    },
  },
];

export default function HCRulesPage() {
  /// DATA
  const dayOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
    "Holiday",
    "Long Weekend",
    "Custom",
  ];

  /// STATES
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [occupancyRules, setOccupancyRules] =
    useState<RuleGroup[]>(defaultOccupancyRules);

  const [peakRules, setPeakRules] = useState<PeakRule[]>(defaultPeakRules);

  const [eventRules, setEventRules] =
    useState<RuleGroup[]>(defaultEventRules);

  /// FUNCTIONS
  const getDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.log("GET DEPARTMENTS ERROR:", error);

      const fallbackDepartments = [
        "Front Desk",
        "Housekeeping",
        "Cashier",
        "Kitchen",
        "Kitchen Assistant",
        "Waitress",
      ];

      setDepartmentOptions(fallbackDepartments);
      setSelectedDepartment(fallbackDepartments[0]);
      return;
    }

    const names = (data || [])
      .map((dept: any) => dept.name || dept.department_name || dept.title)
      .filter(Boolean);

    const finalDepartments =
      names.length > 0
        ? names
        : [
            "Front Desk",
            "Housekeeping",
            "Cashier",
            "Kitchen",
            "Kitchen Assistant",
            "Waitress",
          ];

    setDepartmentOptions(finalDepartments);
    setSelectedDepartment(finalDepartments[0] || "");
  };

  const loadHCRules = async () => {
    const { data, error } = await supabase
      .from("hc_rule_settings")
      .select("setting_data")
      .eq("setting_name", "hc_rules")
      .maybeSingle();

    if (error) {
      console.log("LOAD HC RULES ERROR:", error);
      return;
    }

    if (data?.setting_data) {
      setOccupancyRules(
        data.setting_data.occupancyRules || defaultOccupancyRules
      );
      setPeakRules(data.setting_data.peakRules || defaultPeakRules);
      setEventRules(data.setting_data.eventRules || defaultEventRules);
    }
  };

  const saveHCRules = async () => {
    const { error } = await supabase.from("hc_rule_settings").upsert(
      {
        setting_name: "hc_rules",
        setting_data: {
          occupancyRules,
          peakRules,
          eventRules,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "setting_name",
      }
    );

    if (error) {
      console.log("SAVE HC RULES ERROR:", error);
      alert("Failed to save HC rules. Check console.");
      return;
    }

    alert("HC rules saved successfully.");
  };

  const resetToDefault = () => {
    setOccupancyRules(defaultOccupancyRules);
    setPeakRules(defaultPeakRules);
    setEventRules(defaultEventRules);
  };

  const updateGroupRange = (
    section: "occupancy" | "event",
    id: number,
    field: "min" | "max",
    value: number
  ) => {
    const updater = (prev: RuleGroup[]) =>
      prev.map((group) =>
        group.id === id ? { ...group, [field]: value } : group
      );

    if (section === "occupancy") setOccupancyRules(updater);
    if (section === "event") setEventRules(updater);
  };

  const updateHC = (
    section: "occupancy" | "event",
    groupId: number,
    department: string,
    value: number
  ) => {
    const safeValue = Math.max(0, value || 0);

    const updater = (prev: RuleGroup[]) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              rules: {
                ...group.rules,
                [department]: safeValue,
              },
            }
          : group
      );

    if (section === "occupancy") setOccupancyRules(updater);
    if (section === "event") setEventRules(updater);
  };

  const updatePeakDay = (id: number, day: string) => {
    setPeakRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, day } : rule))
    );
  };

  const updatePeakHC = (ruleId: number, department: string, value: number) => {
    const safeValue = Math.max(0, value || 0);

    setPeakRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              rules: {
                ...rule.rules,
                [department]: safeValue,
              },
            }
          : rule
      )
    );
  };

  const addOccupancyRule = () => {
    setOccupancyRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        min: 0,
        max: 0,
        rules: {},
      },
    ]);
  };

  const addPeakRule = () => {
    setPeakRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        day: "Custom",
        rules: {},
      },
    ]);
  };

  const addEventRule = () => {
    setEventRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        min: 0,
        max: 0,
        rules: {},
      },
    ]);
  };

  const deleteOccupancyRule = (id: number) => {
    setOccupancyRules((prev) => prev.filter((group) => group.id !== id));
  };

  const deletePeakRule = (id: number) => {
    setPeakRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const deleteEventRule = (id: number) => {
    setEventRules((prev) => prev.filter((group) => group.id !== id));
  };

  const addDepartmentToOccupancyRule = (id: number) => {
    if (!selectedDepartment) return;

    setOccupancyRules((prev) =>
      prev.map((group) =>
        group.id === id
          ? {
              ...group,
              rules: {
                ...group.rules,
                [selectedDepartment]: group.rules[selectedDepartment] || 0,
              },
            }
          : group
      )
    );
  };

  const addDepartmentToPeakRule = (id: number) => {
    if (!selectedDepartment) return;

    setPeakRules((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              rules: {
                ...rule.rules,
                [selectedDepartment]: rule.rules[selectedDepartment] || 0,
              },
            }
          : rule
      )
    );
  };

  const addDepartmentToEventRule = (id: number) => {
    if (!selectedDepartment) return;

    setEventRules((prev) =>
      prev.map((group) =>
        group.id === id
          ? {
              ...group,
              rules: {
                ...group.rules,
                [selectedDepartment]: group.rules[selectedDepartment] || 0,
              },
            }
          : group
      )
    );
  };

  /// EFFECTS
  useEffect(() => {
    getDepartments();
    loadHCRules();
  }, []);

  const Counter = ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (value: number) => void;
  }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(value - 1)}
        className="rounded bg-slate-700 px-3 py-1 font-bold hover:bg-slate-600"
      >
        -
      </button>

      <input
        type="number"
        className="w-16 rounded bg-slate-800 p-1 text-center text-white outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <button
        onClick={() => onChange(value + 1)}
        className="rounded bg-slate-700 px-3 py-1 font-bold hover:bg-slate-600"
      >
        +
      </button>
    </div>
  );

  const DepartmentDropdown = ({ onAdd }: { onAdd: () => void }) => (
    <div className="flex flex-1 gap-2">
      <select
        className="w-full min-w-[150px] rounded bg-slate-800 px-2 py-1 text-xs text-white outline-none"
        value={selectedDepartment}
        onChange={(e) => setSelectedDepartment(e.target.value)}
      >
        {departmentOptions.map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
      </select>

      <button
        onClick={onAdd}
        className="rounded bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-600"
      >
        Add
      </button>
    </div>
  );

  /// UI
  return (
    <div className="flex min-h-screen bg-[#050514] text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">HC Rules Management</h1>
            <p className="mt-2 text-slate-400">
              Configure staffing rules for occupancy, peak days, and events.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetToDefault}
              className="rounded bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600"
            >
              Reset Default
            </button>

            <button
              onClick={saveHCRules}
              className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-300"
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Occupancy Rules</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Required HC based on rooms sold.
                </p>
              </div>

              <button
                onClick={addOccupancyRule}
                className="rounded bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600"
              >
                Add Room Range
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
              {occupancyRules.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-slate-800 bg-[#08081a] p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold">
                      {group.min} - {group.max} Rooms
                    </h3>

                    <div className="flex flex-1 items-center justify-end gap-2">
                      <DepartmentDropdown
                        onAdd={() => addDepartmentToOccupancyRule(group.id)}
                      />

                      <button
                        onClick={() => deleteOccupancyRule(group.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <input
                      type="number"
                      className="min-w-0 rounded bg-slate-800 p-2 text-white outline-none"
                      value={group.min}
                      onChange={(e) =>
                        updateGroupRange(
                          "occupancy",
                          group.id,
                          "min",
                          Number(e.target.value)
                        )
                      }
                    />

                    <span className="text-slate-400">-</span>

                    <input
                      type="number"
                      className="min-w-0 rounded bg-slate-800 p-2 text-white outline-none"
                      value={group.max}
                      onChange={(e) =>
                        updateGroupRange(
                          "occupancy",
                          group.id,
                          "max",
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    {Object.keys(group.rules).map((department) => (
                      <div
                        key={department}
                        className="flex items-center justify-between rounded bg-slate-900 p-3"
                      >
                        <span className="font-semibold">{department}</span>

                        <Counter
                          value={group.rules[department] || 0}
                          onChange={(value) =>
                            updateHC("occupancy", group.id, department, value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Peak Day Rules</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Restaurant add-on HC for busy days.
                </p>
              </div>

              <button
                onClick={addPeakRule}
                className="rounded bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600"
              >
                Add Peak Rule
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
              {peakRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-slate-800 bg-[#08081a] p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold">Peak Day Rule</h3>

                    <div className="flex flex-1 items-center justify-end gap-2">
                      <DepartmentDropdown
                        onAdd={() => addDepartmentToPeakRule(rule.id)}
                      />

                      <button
                        onClick={() => deletePeakRule(rule.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <select
                    className="mb-4 w-full rounded bg-slate-800 p-2 text-white outline-none"
                    value={rule.day}
                    onChange={(e) => updatePeakDay(rule.id, e.target.value)}
                  >
                    {dayOptions.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-3">
                    {Object.keys(rule.rules).map((department) => (
                      <div
                        key={department}
                        className="flex items-center justify-between rounded bg-slate-900 p-3"
                      >
                        <span className="font-semibold">{department}</span>

                        <Counter
                          value={rule.rules[department] || 0}
                          onChange={(value) =>
                            updatePeakHC(rule.id, department, value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Event Add-on Rules</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Additional HC based on expected event pax.
                </p>
              </div>

              <button
                onClick={addEventRule}
                className="rounded bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600"
              >
                Add Pax Range
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
              {eventRules.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-slate-800 bg-[#08081a] p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold">
                      {group.min} - {group.max} Pax
                    </h3>

                    <div className="flex flex-1 items-center justify-end gap-2">
                      <DepartmentDropdown
                        onAdd={() => addDepartmentToEventRule(group.id)}
                      />

                      <button
                        onClick={() => deleteEventRule(group.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <input
                      type="number"
                      className="min-w-0 rounded bg-slate-800 p-2 text-white outline-none"
                      value={group.min}
                      onChange={(e) =>
                        updateGroupRange(
                          "event",
                          group.id,
                          "min",
                          Number(e.target.value)
                        )
                      }
                    />

                    <span className="text-slate-400">-</span>

                    <input
                      type="number"
                      className="min-w-0 rounded bg-slate-800 p-2 text-white outline-none"
                      value={group.max}
                      onChange={(e) =>
                        updateGroupRange(
                          "event",
                          group.id,
                          "max",
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    {Object.keys(group.rules).map((department) => (
                      <div
                        key={department}
                        className="flex items-center justify-between rounded bg-slate-900 p-3"
                      >
                        <span className="font-semibold">{department}</span>

                        <Counter
                          value={group.rules[department] || 0}
                          onChange={(value) =>
                            updateHC("event", group.id, department, value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}