"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
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
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="SYSTEM / SETTINGS" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              System
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Settings
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              Configure OPSCORE rules, HR setup, workforce controls, access
              permissions, audit logs, and operations data.
            </p>
          </section>

          <div className="space-y-5">
            {settingGroups.map((group) => (
              <section
                key={group.groupTitle}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Settings Group
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {group.groupTitle}
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {group.description}
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.modules.map((module) => {
                    const Icon = module.icon || Settings;

                    return (
                      <Link
                        key={module.href}
                        href={module.href}
                        className="flex items-start gap-4 px-6 py-5 transition-all duration-200 hover:bg-slate-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                          <Icon size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-slate-950">
                            {module.title}
                          </h3>

                          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                            {module.description}
                          </p>
                        </div>

                        <div className="hidden h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 sm:flex">
                          Open
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


