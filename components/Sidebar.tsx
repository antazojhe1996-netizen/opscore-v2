"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navGroups = [
  {
    label: "Workforce",
    links: [
      { href: "/workforce", name: "Workforce" },
      { href: "/employees", name: "Employee 201" },
      { href: "/scheduling", name: "Scheduling" },
      { href: "/leave-management", name: "Leave Management" },
      { href: "/forecasting", name: "Forecasting" },
    ],
  },
  {
    label: "Sales",
    links: [
      { href: "/finance/room-sales", name: "Hotel Room Sales" },
      { href: "/finance/apartment", name: "Apartment Sales" },
      { href: "/finance/restaurant-import", name: "Restaurant / Sports Bar" },
      { href: "/finance/sales-audit", name: "Sales Audit" },
    ],
  },
  {
    label: "Finance",
    links: [
      { href: "/finance", name: "Finance Dashboard" },
      { href: "/finance/expenses", name: "Expenses" },
      { href: "/finance/bills", name: "Bills Monitoring" },
      { href: "/finance/billing", name: "Billing" },
      { href: "/finance/payment", name: "Payment" },
      { href: "/finance/cash-management", name: "Cash Management" },
    ],
  },
  {
    label: "Payroll",
    links: [
      { href: "/finance/payroll/attendance", name: "Attendance Audit" },
      { href: "/finance/payroll/register", name: "Payroll Register" },
      { href: "/finance/payroll/manager", name: "Payroll Manager" },
      { href: "/finance/payroll/payslips", name: "Payslips" },
      { href: "/finance/payroll/history", name: "Release History" },
      { href: "/finance/payroll/settings", name: "Payroll Settings" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/settings", name: "General Settings" },
      { href: "/settings/departments", name: "Departments" },
      { href: "/settings/positions", name: "Positions" },
      { href: "/settings/employment-status", name: "Employment Status" },
      { href: "/settings/employment-types", name: "Employment Types" },
      { href: "/settings/shifts", name: "Shifts" },
      { href: "/settings/leave-rules", name: "Leave Rules" },
      { href: "/settings/forecasting-rules", name: "Forecasting Rules" },
      { href: "/settings/hc-rules", name: "HC Rules" },
    ],
  },
];

export default function Sidebar() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const currentGroup = navGroups.find((group) => group.label === activeGroup);

  return (
    <aside className="sticky top-0 z-50 h-screen w-60 shrink-0 border-r border-slate-800 bg-slate-950 p-3 text-white">
      <div className="relative flex h-full rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/30">
        <div className="flex w-full flex-col">
          <div className="border-b border-slate-800 px-4 py-6">
            <div className="flex justify-center">
              <Image
                src="/vincent-logo.png"
                alt="Vincent Resort Hotel"
                width={180}
                height={180}
                priority
                className="h-auto max-h-28 w-auto object-contain"
              />
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            <Link
              href="/dashboard"
              onClick={() => setActiveGroup(null)}
              className="block rounded-xl bg-slate-950/50 px-4 py-2.5 text-[14px] font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Dashboard
            </Link>

            {navGroups.map((group) => {
              const isActive = activeGroup === group.label;

              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => setActiveGroup(isActive ? null : group.label)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-[14px] font-semibold transition ${
                    isActive
                      ? "bg-blue-600/80 text-white"
                      : "bg-slate-950/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <span>{group.label}</span>
                  <span className="text-lg leading-none">
                    {isActive ? "×" : "›"}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {currentGroup && (
          <div className="absolute left-[calc(100%+10px)] top-0 z-[999] w-64 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-black/60">
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Module
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-100">
                  {currentGroup.label}
                </h2>
              </div>

              <button
                onClick={() => setActiveGroup(null)}
                className="rounded-lg bg-slate-800 px-3 py-1 text-sm font-black text-slate-300 hover:bg-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {currentGroup.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setActiveGroup(null)}
                  className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}