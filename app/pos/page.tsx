"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import {
  BarChart3,
  BadgeDollarSign,
  ClipboardList,
  Package,
  Receipt,
  Store,
  UserCheck,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";

const posModules = [
  {
    title: "Terminal",
    description: "Record dine-in, take-out, and room charge transactions.",
    href: "/pos/terminal",
    icon: Store,
    moduleKey: "pos_terminal",
    status: "Soon",
  },
  {
    title: "Orders",
    description: "View receipts, open orders, paid orders, and voided orders.",
    href: "/pos/orders",
    icon: Receipt,
    moduleKey: "pos_orders",
    status: "Soon",
  },
  {
    title: "Sessions",
    description: "Track cashier opening cash, closing cash, and variance.",
    href: "/pos/sessions",
    icon: UserCheck,
    moduleKey: "pos_sessions",
    status: "Soon",
  },
  {
    title: "Sales",
    description: "Monitor POS sales, payment methods, and daily totals.",
    href: "/pos/sales",
    icon: BadgeDollarSign,
    moduleKey: "pos_sales",
    status: "Soon",
  },
  {
    title: "Categories",
    description: "Manage POS product groups such as Food, Beverages, and Coffee.",
    href: "/pos/categories",
    icon: ClipboardList,
    moduleKey: "pos_categories",
    status: "Ready",
  },
  {
    title: "Menu Items",
    description: "Manage sellable products, pricing, cost, and item status.",
    href: "/pos/menu-items",
    icon: Package,
    moduleKey: "pos_menu_items",
    status: "Ready",
  },
];

const foundationStats = [
  {
    label: "POS Tables",
    value: "7",
    helper: "Categories, menu, orders, payments, voids, sessions",
  },
  {
    label: "SaaS Ready",
    value: "Yes",
    helper: "All POS tables prepared with company_id",
  },
  {
    label: "Accountability",
    value: "Ready",
    helper: "Cashier sessions and variance tracking enabled",
  },
  {
    label: "Reports",
    value: "Ready",
    helper: "Payment method, order, and item-level structure prepared",
  },
];

export default function POSDashboardPage() {
  return (
    <PageGuard moduleKey="pos_dashboard">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          <section className="mb-8 overflow-hidden rounded-[2rem] border border-blue-300/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
                  OPSCORE POS
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                  Point of Sale Foundation
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                  Manage POS categories, menu items, cashier sessions, orders,
                  payments, room charges, and sales reporting in one OPSCORE
                  operating layer.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-200">
                Database Foundation Ready
              </div>
            </div>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {foundationStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.5rem] border border-blue-300/10 bg-white/[0.035] p-5 shadow-xl shadow-black/20"
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  {stat.label}
                </p>

                <p className="mt-3 text-3xl font-black text-white">
                  {stat.value}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {stat.helper}
                </p>
              </div>
            ))}
          </section>

          <section className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-[1.75rem] border border-blue-300/10 bg-white/[0.035] p-5 shadow-xl shadow-black/20">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                    POS Modules
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Build Path
                  </h2>
                </div>

                <ShoppingCart className="text-blue-300" size={22} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {posModules.map((module) => {
                  const Icon = module.icon;

                  return (
                    <Link
                      key={module.href}
                      href={module.href}
                      className="group rounded-[1.35rem] border border-slate-800 bg-slate-950/70 p-4 transition hover:border-blue-300/25 hover:bg-blue-500/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-2xl border border-blue-300/10 bg-blue-500/10 p-3 text-blue-200">
                          <Icon size={20} />
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                            module.status === "Ready"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {module.status}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-black text-white">
                        {module.title}
                      </h3>

                      <p className="mt-2 min-h-[42px] text-xs leading-5 text-slate-400">
                        {module.description}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-xs font-black text-blue-300">
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

            <div className="rounded-[1.75rem] border border-blue-300/10 bg-white/[0.035] p-5 shadow-xl shadow-black/20">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl border border-blue-300/10 bg-blue-500/10 p-3 text-blue-200">
                  <BarChart3 size={20} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                    Roadmap
                  </p>
                  <h2 className="text-xl font-black text-white">
                    POS V1 Sequence
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  "Categories management",
                  "Menu items management",
                  "Cashier terminal",
                  "Payment modal",
                  "Receipt history",
                  "Cashier sessions",
                  "Daily sales reporting",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                      {index + 1}
                    </div>

                    <p className="pt-1 text-sm font-bold text-slate-200">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-emerald-400/15 bg-emerald-500/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Current Priority
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Start with Categories and Menu Items
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-emerald-100/80">
              The POS database is already prepared. The next step is to build the
              management screens where admins can create categories and menu
              items before the cashier terminal goes live.
            </p>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}