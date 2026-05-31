"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { title } from "process";

export default function SettingsPage() {
  /// DATA
  const settingsModules = [
    {
      title: "Department Management",
      description: "Configure departments shown in workforce, scheduling, and dashboard.",
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
      description: "Configure full-time, part-time, OJT, and other employment types.",
      href: "/settings/employment-types",
    },
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
     {
      title: "Leave Credits",
      description: "Configure employee leave balances and leave credit allocation.",
      href: "/settings/leave-credits",
    },
    

      {
        title: "Leave Settings",
        description: " Manage leave types, leave credits, and leave approval rules.",
        href: "/settings/leave-settings",
      }


  ];

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-slate-400">
            Configure the rules and setup used across OPSCORE.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {settingsModules.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-yellow-400 hover:bg-slate-800"
            >
              <h2 className="text-xl font-bold">{module.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {module.description}
              </p>

              <p className="mt-6 text-sm font-semibold text-yellow-400">
                Open Settings →
              </p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}