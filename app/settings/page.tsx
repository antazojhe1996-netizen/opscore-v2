"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function SettingsPage() {
  /// DATA
  const settingGroups = [

  
    {
      groupTitle: "HR Setup",
      description: "Core employee information used across OPSCORE.",
      modules: [
        {
          title: "Department Management",
          description:
            "Configure departments shown in workforce, scheduling, and dashboard.",
          href: "/settings/departments",
        },
        {
          title: "Position Management",
          description: "Configure employee positions used in employee records.",
          href: "/settings/positions",
        },
        {
          title: "Employment Status Management",
          description: "Control which statuses count in workforce and scheduling.",
          href: "/settings/employment-statuses",
        },
        {
          title: "Employment Type Management",
          description:
            "Configure full-time, part-time, OJT, and other employment types.",
          href: "/settings/employment-types",
        },
      ],
    },
    {

      groupTitle: "Workforce Rules",
      description: "Rules that control scheduling, manpower, and HC planning.",
      modules: [
        {
          title: "Shift Management",
          description: "Configure shift templates and working shift rules.",
          href: "/settings/shifts",
        },
        {
          title: "HC Rules",
          description: "Set required headcount based on occupancy and department.",
          href: "/settings/hc-rules",
        },
      ],
    },
    {
      groupTitle: "Leave Management",
      description: "Leave policy and employee leave credit setup.",
      modules: [
        {
          title: "Leave Settings",
          description:
            "Control enabled leave types and which leaves deduct credits.",
          href: "/settings/leave-settings",
        },
        {
          title: "Leave Credits",
          description:
            "Configure employee leave balances and leave credit allocation.",
          href: "/settings/leave-credits",
        },
      ],
    },
    {
      groupTitle: "Operations Data",
      description: "Operational data used for forecasting and finance.",
      modules: [

        
        {
          title: "Occupancy Import",
          description:
            "Upload room occupancy data for forecasting and workforce planning.",
          href: "/settings/occupancy-import",
        },

        
      ],
    },
  ];

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-slate-400">
            Configure OPSCORE rules, HR setup, workforce controls, and operations
            data.
          </p>
        </section>

        <div className="mt-8 space-y-8">
          {settingGroups.map((group) => (
            <section
              key={group.groupTitle}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="mb-5">
                <h2 className="text-2xl font-bold">{group.groupTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {group.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {group.modules.map((module) => (
                  <Link
                    key={module.title}
                    href={module.href}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-yellow-400 hover:bg-slate-800"
                  >
                    <h3 className="text-xl font-bold">{module.title}</h3>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {module.description}
                    </p>

                    <p className="mt-6 text-sm font-semibold text-yellow-400">
                      Open Settings →
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}