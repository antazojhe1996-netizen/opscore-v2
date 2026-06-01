"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function FinancePage() {
  /// STATES
  const [revenueSources, setRevenueSources] = useState<any[]>([]);

  /// FUNCTIONS
  const getRevenueSources = async () => {
    const { data, error } = await supabase
      .from("finance_revenue_sources")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.log("REVENUE SOURCES ERROR:", error);
      return;
    }

    setRevenueSources(data || []);
  };

  const getRevenueLink = (name: string) => {
    const slug = name.toLowerCase().replaceAll(" ", "-");

    if (slug === "hotel-rooms") return "/finance/room-sales";
    if (slug === "restaurant") return "/finance/restaurant-import";
    if (slug === "apartment") return "/finance/apartment-sales";
    if (slug === "sports-bar") return "/finance/sports-bar-sales";

    return `/finance/revenue/${slug}`;
  };

  useEffect(() => {
    getRevenueSources();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Finance</h1>

          <p className="mt-2 text-slate-400">
            Monitor revenue, expenses, and profit across hotel operations.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Revenue" value="₱0.00" color="text-emerald-400" />
          <SummaryCard title="Total Expenses" value="₱0.00" color="text-red-400" />
          <SummaryCard title="Net Profit" value="₱0.00" color="text-yellow-400" />
          <SummaryCard title="Profit Margin" value="0%" color="text-blue-400" />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-200">Revenue Sources</h2>

          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {revenueSources.map((source) => (
              <Link
                key={source.id}
                href={getRevenueLink(source.name)}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-yellow-400 hover:bg-slate-800"
              >
                <h3 className="text-xl font-bold">{source.name}</h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Manage {source.name} revenue records and sales tracking.
                </p>

                <p className="mt-6 text-sm font-semibold text-yellow-400">
                  Open {source.name} →
                </p>
              </Link>
            ))}

            {revenueSources.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
                No active revenue sources found.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-200">Expense & Reports</h2>

          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <FinanceLink
              href="/finance/expenses"
              title="Expenses"
              description="Encode daily expenses by category, department, and payment method."
              action="Open Expenses →"
            />

            <FinanceLink
              href="/finance/reports"
              title="Finance Reports"
              description="View daily, monthly, and yearly revenue, expenses, and profit reports."
              action="Open Reports →"
            />

            <FinanceLink
              href="/finance/settings"
              title="Finance Settings"
              description="Configure revenue sources, expense categories, payment methods, and departments."
              action="Open Settings →"
              muted
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, color }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 text-2xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}

function FinanceLink({ href, title, description, action, muted }: any) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border bg-slate-900 p-6 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-800 ${
        muted
          ? "border-slate-800 hover:border-slate-500"
          : "border-slate-800 hover:border-yellow-400"
      }`}
    >
      <h3 className="text-xl font-bold">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>

      <p
        className={`mt-6 text-sm font-semibold ${
          muted ? "text-slate-300" : "text-yellow-400"
        }`}
      >
        {action}
      </p>
    </Link>
  );
}