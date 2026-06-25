import { supabase } from '@/lib/supabase';
"use client";

import Link from "next/link";
import {
  BarChart3,
  BedDouble,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Hotel,
  LineChart,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";

export default function ReservationsDashboardPage() {
  const reservationHealth = [
    ["Confirmed", "186"],
    ["Pending", "9"],
    ["Cancelled", "4"],
    ["No Show", "2"],
  ];

  const bookingSources = [
    ["Direct Website", "42%"],
    ["Booking.com", "35%"],
    ["Agoda", "15%"],
    ["Walk-In", "8%"],
  ];

  const forecastRows = [
    ["Today", "82%", "18 arrivals", "12 departures"],
    ["Tomorrow", "76%", "11 arrivals", "9 departures"],
    ["7 Days", "79%", "68 bookings", "â‚±248,500 forecast"],
    ["30 Days", "72%", "214 bookings", "â‚±890,000 forecast"],
  ];

  return (
<PageGuard moduleKey="dashboard">      
    <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {/* HEADER */}
          <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Reservations
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                  Reservation Management Workbench
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Monitor bookings, arrivals, departures, occupancy, guest
                  balances, and room activity from one operational dashboard.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  Module Status
                </p>
                <p className="mt-1 text-2xl font-black text-white">
                  Roadmap UI
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Front page only Â· Backend later
                </p>
              </div>
            </div>
          </section>

          {/* KPI CARDS */}
          <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<CalendarCheck size={22} />}
              title="Arrivals Today"
              value="18"
              subtitle="Guests expected today"
            />

            <MetricCard
              icon={<CalendarClock size={22} />}
              title="Departures Today"
              value="12"
              subtitle="Guests checking out"
            />

            <MetricCard
              icon={<Hotel size={22} />}
              title="Occupancy"
              value="82%"
              subtitle="Current occupancy"
            />

            <MetricCard
              icon={<ClipboardList size={22} />}
              title="Pending Reservations"
              value="9"
              subtitle="Awaiting confirmation"
            />
          </section>

          {/* QUICK ACTIONS */}
          <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:p-6">
            <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Workbench Actions
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Reservation Operations
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Future reservation workflows will connect here.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ActionCard
                href="/reservations/board"
                icon={<BedDouble size={24} />}
                title="Reservation Board"
                description="Visual room timeline"
                action="Open Board"
              />

              <ActionCard
                href="/reservations/ledger"
                icon={<ClipboardList size={24} />}
                title="Reservation Ledger"
                description="Reservation records"
                action="Open Ledger"
              />

              <ActionCard
                href="/reservations/analytics"
                icon={<BarChart3 size={24} />}
                title="Analytics"
                description="Occupancy and trends"
                action="View Analytics"
              />

              <ActionCard
                href="/reservations/new"
                icon={<Plus size={24} />}
                title="New Reservation"
                description="Create reservation"
                action="Open Form"
              />
            </div>
          </section>

          {/* SNAPSHOT */}
          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel
              icon={<Users size={22} />}
              eyebrow="Reservation Health"
              title="Booking Status"
              description="Current reservation activity snapshot."
            >
              <div className="space-y-3">
                {reservationHealth.map(([label, value]) => (
                  <ListRow key={label} label={label} value={value} />
                ))}
              </div>
            </Panel>

            <Panel
              icon={<TrendingUp size={22} />}
              eyebrow="Channel Performance"
              title="Booking Sources"
              description="Roadmap view for future channel analytics."
            >
              <div className="space-y-3">
                {bookingSources.map(([label, value]) => (
                  <ListRow key={label} label={label} value={value} />
                ))}
              </div>
            </Panel>
          </section>

          {/* FORECAST */}
          <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-300">
                <LineChart size={24} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Occupancy Forecast
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Reservation Outlook
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Sample future forecasting layout for bookings, arrivals, and
                  expected room revenue.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="p-4">Period</th>
                    <th>Occupancy</th>
                    <th>Activity</th>
                    <th className="pr-4">Forecast</th>
                  </tr>
                </thead>

                <tbody>
                  {forecastRows.map(([period, occupancy, activity, forecast]) => (
                    <tr
                      key={period}
                      className="border-t border-slate-800 text-slate-200 hover:bg-slate-950/50"
                    >
                      <td className="p-4 font-bold text-white">{period}</td>
                      <td className="font-black text-blue-200">{occupancy}</td>
                      <td>{activity}</td>
                      <td className="pr-4">{forecast}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* INTELLIGENCE */}
          <section className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5 shadow-xl shadow-blue-950/20 lg:p-6">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Reservation Intelligence
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Future PMS Lite Expansion
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  This module is designed to evolve into OPSCORE reservation
                  control: arrivals, departures, room timeline, occupancy,
                  guest balances, and revenue forecasting.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniInsight label="Expected Occupancy" value="82%" />
                <MiniInsight label="Expected Revenue" value="â‚±248.5K" />
                <MiniInsight label="Average Stay" value="2.4 Nights" />
                <MiniInsight label="Top Room Type" value="Deluxe" />
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-300">
          {icon}
        </div>
      </div>

      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className="mt-2 text-3xl font-black text-white">{value}</h2>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  action,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-blue-500/40 hover:bg-blue-500/10"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
        {icon}
      </div>

      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>

      <p className="mt-4 text-sm font-black text-blue-300 group-hover:text-blue-200">
        {action} â†’
      </p>
    </Link>
  );
}

function Panel({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-300">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function ListRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="font-semibold text-slate-300">{label}</p>
      <p className="font-black text-blue-200">{value}</p>
    </div>
  );
}

function MiniInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-300/20 bg-slate-950/60 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200/70">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}


