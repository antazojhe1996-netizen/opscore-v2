"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import TopNavbar from "@/components/TopNavbar";
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  ClipboardList,
  Clock3,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Store,
  UserCheck,
} from "lucide-react";

const posModules = [
  {
    title: "Terminal",
    description:
      "Live cashier POS for orders, payments, parked orders, and production routing.",
    href: "/pos/terminal",
    icon: Store,
    status: "Ready",
  },
  {
    title: "Transactions",
    description:
      "View POS orders, receipts, payment methods, cashier activity, and order details.",
    href: "/pos/transactions",
    icon: Receipt,
    status: "Ready",
  },
  {
    title: "Sessions",
    description:
      "Track cashier opening cash, closing cash, expected cash, and variance.",
    href: "/pos/sessions",
    icon: UserCheck,
    status: "Ready",
  },
  {
    title: "Production Queue",
    description:
      "Live kitchen, bar, and station queue with item-level status movement.",
    href: "/pos/production",
    icon: ChefHat,
    status: "Ready",
  },
  {
    title: "Parked Orders",
    description: "Monitor held orders waiting for recall, payment, or bill-out.",
    href: "/pos/parked-orders",
    icon: Clock3,
    status: "Ready",
  },
  {
    title: "Categories",
    description:
      "Manage POS product groups, production routing, and reporting labels.",
    href: "/pos/categories",
    icon: ClipboardList,
    status: "Ready",
  },
  {
    title: "Menu Items",
    description:
      "Manage products, prices, cost, photos, badges, and item status.",
    href: "/pos/menu-items",
    icon: Package,
    status: "Ready",
  },
  {
    title: "Settings",
    description:
      "Configure tables, order types, payment methods, stations, and POS behavior.",
    href: "/pos/settings",
    icon: Settings,
    status: "Ready",
  },
];

const readinessStats = [
  {
    label: "POS Completion",
    value: "93%",
    helper: "Core POS workflow is almost lockable.",
  },
  {
    label: "Production Ready",
    value: "92%",
    helper: "Terminal, sessions, queue, and transactions are working.",
  },
  {
    label: "SaaS Ready",
    value: "95%",
    helper: "POS tables use company-based architecture.",
  },
  {
    label: "Lock Status",
    value: "Pending",
    helper: "Needs X/Z read, export, and void/refund flow.",
  },
];

const remainingItems = [
  "Session Sales Summary",
  "X Read / Z Read",
  "Payment Breakdown Report",
  "Transaction Export",
  "Void / Refund Approval",
];

export default function POSDashboardPage() {
  return (
    <PageGuard moduleKey="pos_dashboard">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="POS / COMMAND CENTER" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  POS
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  POS Command Center
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Control cashier terminal operations, sessions, transactions,
                  production queue, parked orders, menu setup, and POS
                  configuration from one operating layer.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                93% Complete · Almost Lockable
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {readinessStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {stat.label}
                  </p>

                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                    {stat.value}
                  </p>

                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                    {stat.helper}
                  </p>
                </div>
              ))}
            </section>

            <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      POS Modules
                    </p>

                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Operating Areas
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                    <ShoppingBag size={18} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {posModules.map((module) => {
                    const Icon = module.icon;

                    return (
                      <Link
                        key={module.href}
                        href={module.href}
                        className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                            <Icon size={18} />
                          </div>

                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                            {module.status}
                          </span>
                        </div>

                        <h3 className="mt-4 text-base font-black text-slate-950">
                          {module.title}
                        </h3>

                        <p className="mt-2 min-h-[44px] text-xs font-semibold leading-5 text-slate-500">
                          {module.description}
                        </p>

                        <div className="mt-4 flex items-center gap-2 text-xs font-black text-slate-700">
                          Open
                          <ArrowRight
                            size={14}
                            className="transition group-hover:translate-x-1"
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                    <BarChart3 size={18} />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Before Lock
                    </p>

                    <h2 className="text-xl font-black text-slate-950">
                      Remaining Items
                    </h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {remainingItems.map((item, index) => (
                    <div
                      key={item}
                      className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-black text-white">
                        {index + 1}
                      </div>

                      <p className="pt-1 text-sm font-bold text-amber-800">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                Current Assessment
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                POS is operational. Reporting and control hardening remain.
              </h2>

              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-emerald-800">
                Terminal, sessions, transactions, parked orders, production
                queue, categories, menu items, and settings are already
                established. The next lock requirement is cashier accountability
                reporting, transaction export, and controlled void/refund
                workflow.
              </p>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}


