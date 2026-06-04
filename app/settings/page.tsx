"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Database,
  Hotel,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

export default function SettingsPage() {
  const settingGroups = [
    {
      groupTitle: "System Access",
      description:
        "Control user roles, access permissions, current user testing, audit logs, and backup tools.",
      modules: [
        {
          title: "User Roles",
          description:
            "Create roles, assign employees, and control module permissions.",
          href: "/settings/user-roles",
          icon: ShieldCheck,
        },
        {
          title: "Current User",
          description:
            "Temporary user selector for testing role-based access before final login.",
          href: "/settings/current-user",
          icon: UserCheck,
        },
        {
          title: "Activity Logs",
          description:
            "View audit trail of important system actions and access changes.",
          href: "/activity-logs",
          icon: ClipboardList,
        },
        {
          title: "Backup & Restore",
          description:
            "Export, restore, and safeguard important OPSCORE system data.",
          href: "/backup",
          icon: Database,
        },
      ],
    },
    {
      groupTitle: "HR Setup",
      description: "Core employee information used across OPSCORE.",
      modules: [
        {
          title: "Department Management",
          description:
            "Configure departments shown in workforce, scheduling, and dashboard.",
          href: "/settings/departments",
          icon: Users,
        },
        {
          title: "Position Management",
          description: "Configure employee positions used in employee records.",
          href: "/settings/positions",
          icon: Users,
        },
        {
          title: "Employment Status Management",
          description:
            "Control which statuses count in workforce and scheduling.",
          href: "/settings/employment-status",
          icon: ClipboardList,
        },
        {
          title: "Employment Type Management",
          description:
            "Configure full-time, part-time, OJT, and other employment types.",
          href: "/settings/employment-types",
          icon: ClipboardList,
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
          icon: CalendarDays,
        },
        {
          title: "HC Rules",
          description:
            "Set required headcount based on occupancy, peak days, and events.",
          href: "/settings/hc-rules",
          icon: BarChart3,
        },
        {
          title: "Forecasting Rules",
          description:
            "Configure demand status thresholds and labor risk rules.",
          href: "/settings/forecasting-rules",
          icon: BarChart3,
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
          icon: ClipboardList,
        },
        {
          title: "Leave Credits",
          description:
            "Configure employee leave balances and leave credit allocation.",
          href: "/settings/leave-credits",
          icon: ClipboardList,
        },
      ],
    },
    {
      groupTitle: "Operations Data",
      description:
        "Operational data used for occupancy forecasting and workforce planning.",
      modules: [
        {
          title: "Occupancy Import",
          description:
            "Import room occupancy forecast used by Forecasting and Scheduling.",
          href: "/forecasting/occupancy-import",
          icon: BarChart3,
        },
        {
          title: "Event Add-ons",
          description:
            "Encode event dates, event names, and expected pax for manpower forecasting.",
          href: "/forecasting/event-addons",
          icon: CalendarDays,
        },
      ],
    },
    {
      groupTitle: "Property Management",
      description:
        "Manage apartment units, tenants, rent defaults, payment methods, and billing setup.",
      modules: [
        {
          title: "Property Settings",
          description:
            "Configure apartment units, rent, due day, utility defaults, and payment methods.",
          href: "/settings/property",
          icon: Hotel,
        },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            System
          </p>

          <h1 className="mt-2 text-4xl font-black">Settings</h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-400">
            Configure OPSCORE rules, HR setup, workforce controls, access
            permissions, audit logs, and operations data.
          </p>
        </section>

        <div className="space-y-8">
          {settingGroups.map((group) => (
            <section
              key={group.groupTitle}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="mb-5">
                <h2 className="text-2xl font-black">{group.groupTitle}</h2>

                <p className="mt-1 text-sm text-slate-400">
                  {group.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {group.modules.map((module) => {
                  const Icon = module.icon || Settings;

                  return (
                    <Link
                      key={module.href}
                      href={module.href}
                      className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-amber-400 hover:bg-slate-800"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950">
                        <Icon size={20} />
                      </div>

                      <h3 className="text-xl font-black">{module.title}</h3>

                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {module.description}
                      </p>

                      <p className="mt-6 text-sm font-bold text-amber-400">
                        Open Settings →
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}