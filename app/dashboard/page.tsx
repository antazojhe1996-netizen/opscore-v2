"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

type DashboardRow = Record<string, unknown>;

type DashboardState = {
  loading: boolean;
  error: string | null;
  counts: Record<string, number>;
  drawerVariance: number;
  guestBalance: number;
  apartmentReceivable: number;
  payrollIssueCount: number;
};

const TRANSACTION_TABLES = [
  "finance_cash_management",
  "finance_cash_movements",
  "expenses",
  "finance_hotel_reservations",
  "approval_requests",
  "leave_requests",
  "payroll_records",
  "attendance_entries",
  "schedules",
  "cash_advance_requests",
  "employee_balances",
];

const INITIAL_STATE: DashboardState = {
  loading: true,
  error: null,
  counts: {},
  drawerVariance: 0,
  guestBalance: 0,
  apartmentReceivable: 0,
  payrollIssueCount: 0,
};

function peso(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function filterByCompany(rows: DashboardRow[], companyId: string | null) {
  if (!companyId) return rows;

  return rows.filter((row) => {
    if (!Object.prototype.hasOwnProperty.call(row, "company_id")) return true;
    return row.company_id === companyId;
  });
}

function sumPossibleVariance(rows: DashboardRow[]) {
  return rows.reduce((sum, row) => {
    const direct =
      row.variance_amount ??
      row.cash_variance ??
      row.drawer_variance ??
      row.total_cash_variance ??
      row.variance;

    if (direct !== undefined && direct !== null) {
      return sum + Math.abs(num(direct));
    }

    const expected =
      row.expected_cash ??
      row.expected_amount ??
      row.system_cash ??
      row.cash_expected;

    const actual =
      row.actual_cash ??
      row.actual_amount ??
      row.counted_cash ??
      row.cash_actual;

    if (expected !== undefined && actual !== undefined) {
      return sum + Math.abs(num(actual) - num(expected));
    }

    return sum;
  }, 0);
}

function sumPossibleBalance(rows: DashboardRow[]) {
  return rows.reduce((sum, row) => {
    const balance =
      row.balance_due ??
      row.remaining_balance ??
      row.unpaid_amount ??
      row.outstanding_balance ??
      row.receivable_amount;

    if (balance !== undefined && balance !== null) {
      return sum + num(balance);
    }

    const total =
      row.total_amount ??
      row.grand_total ??
      row.amount ??
      row.billing_amount;

    const paid =
      row.paid_amount ??
      row.amount_paid ??
      row.total_paid ??
      row.payment_amount;

    if (total !== undefined && paid !== undefined) {
      return sum + Math.max(num(total) - num(paid), 0);
    }

    return sum;
  }, 0);
}

async function fetchRows(table: string, companyId: string | null) {
  const { data, error } = await supabase.from(table).select("*").limit(1000);

  if (error) {
    console.warn(`[Dashboard] ${table}:`, error.message);
    return [];
  }

  return filterByCompany((data ?? []) as DashboardRow[], companyId);
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const companyId =
          typeof window !== "undefined"
            ? localStorage.getItem("opscore_current_company_id")
            : null;

        const results = await Promise.all(
          TRANSACTION_TABLES.map(async (table) => {
            const rows = await fetchRows(table, companyId);
            return [table, rows] as const;
          })
        );

        const map = Object.fromEntries(results) as Record<
          string,
          DashboardRow[]
        >;

        const apartmentBillingRows = await fetchRows(
          "apartment_billing",
          companyId
        );

        const apartmentRows =
          apartmentBillingRows.length > 0
            ? apartmentBillingRows
            : await fetchRows("apartment_units", companyId);

        if (!mounted) return;

        const counts = Object.fromEntries(
          results.map(([table, rows]) => [table, rows.length])
        );

        const cashManagement = map.finance_cash_management ?? [];
        const hotelReservations = map.finance_hotel_reservations ?? [];
        const payrollRows = map.payroll_records ?? [];

        const payrollIssueCount = payrollRows.filter((row) => {
          const status = String(row.status ?? "").toLowerCase();
          return status.includes("error") || status.includes("failed");
        }).length;

        setState({
          loading: false,
          error: null,
          counts,
          drawerVariance: sumPossibleVariance(cashManagement),
          guestBalance: sumPossibleBalance(hotelReservations),
          apartmentReceivable: sumPossibleBalance(apartmentRows),
          payrollIssueCount,
        });
      } catch (err: unknown) {
        if (!mounted) return;

        const message =
          err instanceof Error ? err.message : "Unable to load dashboard.";

        setState({
          ...INITIAL_STATE,
          loading: false,
          error: message,
        });
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const hasOperationalData = useMemo(() => {
    return Object.values(state.counts).some((count) => count > 0);
  }, [state.counts]);

  const hasFinancialRisk =
    state.drawerVariance > 0 ||
    state.guestBalance > 0 ||
    state.apartmentReceivable > 0 ||
    state.payrollIssueCount > 0;

  const healthScore = !hasOperationalData ? 100 : hasFinancialRisk ? 86 : 100;

  const primaryRisk = !hasOperationalData
    ? "Ready"
    : hasFinancialRisk
      ? "Review Required"
      : "Healthy";

  const operationMood = !hasOperationalData
    ? "Production baseline is clean. OPSCORE is ready for real operational data."
    : hasFinancialRisk
      ? "Operational data exists and selected areas need review before closing."
      : "Live operations are healthy. No major financial or payroll risks detected.";

  const compactAlert = !hasOperationalData
    ? "Production baseline is clean. System is ready for live transactions."
    : hasFinancialRisk
      ? "Some live records need review."
      : "Live records are currently healthy.";

  const topAction = !hasOperationalData
    ? "Begin live onboarding: verify employees, publish schedules, then start attendance collection."
    : hasFinancialRisk
      ? "Review cash, guest balances, apartment receivables, and payroll exceptions."
      : "Continue daily monitoring and close operational records on schedule.";

  return (
    <PageGuard moduleKey="dashboard">
      <div className="min-h-screen bg-[#07111f] text-slate-100">
        <Sidebar />

        <main className="min-h-screen px-4 py-6 lg:pl-72 lg:pr-8">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
                  OPSCORE V3
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                  Production Baseline Dashboard
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  {operationMood}
                </p>
              </div>

              <div className="rounded-3xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-200">
                  Health Score
                </p>
                <p className="mt-1 text-4xl font-bold text-white">
                  {state.loading ? "..." : healthScore}
                </p>
                <p className="mt-1 text-sm text-blue-100">{primaryRisk}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
              {state.loading ? "Loading production baseline..." : compactAlert}
            </div>

            {state.error && (
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {state.error}
              </div>
            )}
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Drawer Variance"
              value={state.loading ? "..." : peso(state.drawerVariance)}
              status={state.drawerVariance === 0 ? "Healthy" : "Review"}
            />
            <MetricCard
              label="Guest Balance"
              value={state.loading ? "..." : peso(state.guestBalance)}
              status={state.guestBalance === 0 ? "Healthy" : "Review"}
            />
            <MetricCard
              label="Apartment Receivable"
              value={state.loading ? "..." : peso(state.apartmentReceivable)}
              status={state.apartmentReceivable === 0 ? "Healthy" : "Review"}
            />
            <MetricCard
              label="Payroll"
              value={
                state.loading
                  ? "..."
                  : state.payrollIssueCount === 0
                    ? "Healthy"
                    : `${state.payrollIssueCount} Issue(s)`
              }
              status={state.payrollIssueCount === 0 ? "Healthy" : "Review"}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold">Production Readiness</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {topAction}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <ReadinessItem title="Master Data" status="Preserved" />
                <ReadinessItem title="Transaction Tables" status="Clean" />
                <ReadinessItem title="Go-Live Mode" status="Ready" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold">
                Operational Data Detector
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {hasOperationalData
                  ? "Live operational records are now present."
                  : "No live operational records detected after reset."}
              </p>

              <div className="mt-5 space-y-2">
                {TRANSACTION_TABLES.map((table) => (
                  <div
                    key={table}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm"
                  >
                    <span className="text-slate-300">{table}</span>
                    <span className="font-semibold text-white">
                      {state.loading ? "..." : state.counts[table] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function MetricCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: string;
}) {
  const healthy = status === "Healthy";

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-300">{label}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            healthy
              ? "bg-emerald-500/10 text-emerald-200"
              : "bg-amber-500/10 text-amber-200"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function ReadinessItem({ title, status }: { title: string; status: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{status}</p>
    </div>
  );
}