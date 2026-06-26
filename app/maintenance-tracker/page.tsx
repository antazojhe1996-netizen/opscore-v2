"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Hotel,
  Plus,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Tv,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";

const rooms = [
  { room: "STR 108", type: "Standard", issue: "Healthy", status: "healthy" },
  { room: "STR 118", type: "Standard", issue: "Aircon", status: "warning" },
  { room: "STR 207", type: "Standard", issue: "Plumbing", status: "maintenance" },
  { room: "STR 209", type: "Standard", issue: "Healthy", status: "healthy" },
  { room: "STR 210", type: "Standard", issue: "Healthy", status: "healthy" },
  { room: "STR 211", type: "Standard", issue: "Door Lock", status: "warning" },
  { room: "STR 212", type: "Standard", issue: "Painting", status: "maintenance" },
  { room: "STR 213", type: "Standard", issue: "Healthy", status: "healthy" },
  { room: "DEL 101", type: "Deluxe", issue: "Healthy", status: "healthy" },
  { room: "DEL 102", type: "Deluxe", issue: "Water Heater", status: "warning" },
  { room: "DEL 103", type: "Deluxe", issue: "Healthy", status: "healthy" },
  { room: "DEL 104", type: "Deluxe", issue: "Healthy", status: "healthy" },
  { room: "DEL 105", type: "Deluxe", issue: "Television", status: "warning" },
  { room: "DEL 110", type: "Deluxe", issue: "Healthy", status: "healthy" },
  { room: "PRE 117", type: "Premium", issue: "Healthy", status: "healthy" },
  { room: "PRE 119", type: "Premium", issue: "Healthy", status: "healthy" },
  { room: "PRE 201", type: "Premium", issue: "Electrical", status: "critical" },
  { room: "PRE 202", type: "Premium", issue: "Healthy", status: "healthy" },
  { room: "FAM 206", type: "Family", issue: "Out of Service", status: "critical" },
  { room: "FAM 222", type: "Family", issue: "Plumbing", status: "maintenance" },
];

const workOrders = [
  {
    ticket: "MT-001",
    room: "STR 118",
    issue: "Aircon Not Cooling",
    category: "Aircon",
    priority: "Medium",
    assigned: "Jonathan",
    status: "Open",
  },
  {
    ticket: "MT-002",
    room: "DEL 105",
    issue: "TV No Signal",
    category: "Television",
    priority: "Low",
    assigned: "Charlie",
    status: "In Progress",
  },
  {
    ticket: "MT-003",
    room: "FAM 206",
    issue: "Bathroom Plumbing Leak",
    category: "Plumbing",
    priority: "Critical",
    assigned: "Jonathan",
    status: "Critical",
  },
  {
    ticket: "MT-004",
    room: "PRE 201",
    issue: "Breaker Inspection",
    category: "Electrical",
    priority: "Critical",
    assigned: "Jonathan",
    status: "In Progress",
  },
  {
    ticket: "MT-005",
    room: "STR 211",
    issue: "Door Lock Hard To Open",
    category: "Lock",
    priority: "Medium",
    assigned: "Charlie",
    status: "Open",
  },
];

const timeline = {
  pending: ["STR118 Aircon", "STR211 Door Lock", "DEL102 Water Heater"],
  progress: ["PRE201 Electrical", "STR207 Plumbing", "DEL105 TV"],
  completed: ["STR108 AC Cleaning", "DEL103 Faucet Repair", "PRE117 Light Check"],
};

const technicians = [
  {
    name: "Jonathan Antazo",
    role: "Head Maintenance",
    completed: 42,
    active: 6,
    rate: "94%",
  },
  {
    name: "Charlie Elic",
    role: "Maintenance",
    completed: 27,
    active: 3,
    rate: "91%",
  },
];

const assets = [
  { label: "Aircons", value: "85%" },
  { label: "Televisions", value: "92%" },
  { label: "Water Heaters", value: "78%" },
  { label: "Electrical", value: "88%" },
  { label: "Plumbing", value: "81%" },
];

export default function MaintenanceTrackerPage() {
  return (
    <PageGuard moduleKey="dashboard">
      <div className="flex min-h-screen bg-slate-100 text-slate-950">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/25">
                <Wrench size={24} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
                  OPSCORE Maintenance
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                  Maintenance Tracker
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Room health, work orders, facility issues, and preventive maintenance monitoring.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
                <Download size={16} />
                Export Report
              </button>

              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
                <CalendarDays size={16} />
                June 2026
              </button>

              <button className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25">
                <Plus size={17} />
                New Work Order
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Wrench size={22} />} title="Open Tickets" value="24" note="9 active work orders" />
            <Metric icon={<AlertTriangle size={22} />} title="Critical Issues" value="3" note="Needs immediate action" />
            <Metric icon={<CheckCircle2 size={22} />} title="Resolved This Week" value="18" note="+22% vs last week" />
            <Metric icon={<Hotel size={22} />} title="Rooms Affected" value="5" note="2 out of service" />
          </section>

          <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Room Health Board
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Quick visual status of room maintenance conditions.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                    <Legend label="Healthy" className="bg-emerald-500" />
                    <Legend label="Needs Attention" className="bg-amber-400" />
                    <Legend label="Maintenance" className="bg-blue-500" />
                    <Legend label="Critical" className="bg-red-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {rooms.map((room) => (
                    <div
                      key={room.room}
                      className={`rounded-2xl border p-4 shadow-sm ${getRoomCardClass(room.status)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black">{room.room}</p>
                          <p className="mt-0.5 text-xs font-bold opacity-70">
                            {room.type} Room
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/70 p-2">
                          {getRoomIcon(room.status)}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-[0.12em] opacity-70">
                          Status
                        </span>
                        <span className="text-sm font-black">{room.issue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <div className="mb-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Maintenance Work Orders
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Active tickets, assigned technicians, and repair progress.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <th className="pb-3 font-black">Ticket</th>
                        <th className="pb-3 font-black">Room</th>
                        <th className="pb-3 font-black">Issue</th>
                        <th className="pb-3 font-black">Category</th>
                        <th className="pb-3 font-black">Priority</th>
                        <th className="pb-3 font-black">Assigned</th>
                        <th className="pb-3 font-black">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {workOrders.map((order) => (
                        <tr key={order.ticket} className="border-b border-slate-100 last:border-0">
                          <td className="py-4 text-sm font-black text-blue-600">{order.ticket}</td>
                          <td className="py-4 text-sm font-black text-slate-900">{order.room}</td>
                          <td className="py-4">
                            <p className="text-sm font-black text-slate-900">{order.issue}</p>
                            <p className="text-xs font-bold text-slate-400">Vincent Resort Hotel</p>
                          </td>
                          <td className="py-4 text-sm font-bold text-slate-600">{order.category}</td>
                          <td className="py-4">
                            <span className={getPriorityClass(order.priority)}>
                              {order.priority}
                            </span>
                          </td>
                          <td className="py-4 text-sm font-bold text-slate-600">{order.assigned}</td>
                          <td className="py-4">
                            <span className={getStatusClass(order.status)}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <TimelineColumn title="Pending" icon={<Clock size={18} />} items={timeline.pending} />
                <TimelineColumn title="In Progress" icon={<Wrench size={18} />} items={timeline.progress} />
                <TimelineColumn title="Completed" icon={<CheckCircle2 size={18} />} items={timeline.completed} />
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-blue-200 bg-blue-600 p-5 text-white shadow-xl shadow-blue-600/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black">AI Maintenance Alert</p>
                    <p className="text-xs text-blue-100">Recurring issue detected</p>
                  </div>
                </div>

                <p className="mt-4 text-sm font-semibold leading-6 text-blue-50">
                  STR floor generated 12 aircon-related tickets within the last 60 days.
                  Schedule preventive maintenance before peak occupancy.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Technician Dashboard
                </h2>

                <div className="mt-4 space-y-3">
                  {technicians.map((tech) => (
                    <div key={tech.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
                          <UserCheck size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">{tech.name}</p>
                          <p className="text-xs font-bold text-slate-400">{tech.role}</p>
                        </div>

                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
                          {tech.rate}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xl font-black text-slate-950">{tech.completed}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Completed</p>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xl font-black text-slate-950">{tech.active}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Active</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Asset Monitoring
                </h2>

                <div className="mt-5 space-y-4">
                  {assets.map((asset) => (
                    <Progress key={asset.label} label={asset.label} value={asset.value} />
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Room Status Overview
                </h2>

                <div className="mt-5 space-y-4">
                  <Progress label="Operational" value="82%" />
                  <Progress label="Maintenance" value="12%" />
                  <Progress label="Out of Service" value="6%" />
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function Metric({
  icon,
  title,
  value,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>
          <h2 className="mt-1 text-3xl font-black text-slate-950">{value}</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">{note}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineColumn({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-blue-100 p-2 text-blue-600">{icon}</div>
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
          {title}
        </h3>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: value }} />
      </div>
    </div>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </div>
  );
}

function getRoomIcon(status: string) {
  if (status === "critical") return <AlertTriangle size={17} className="text-red-600" />;
  if (status === "maintenance") return <Wrench size={17} className="text-blue-600" />;
  if (status === "warning") return <Thermometer size={17} className="text-amber-600" />;
  return <ShieldCheck size={17} className="text-emerald-600" />;
}

function getRoomCardClass(status: string) {
  if (status === "critical") return "border-red-200 bg-red-50 text-red-900";
  if (status === "maintenance") return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function getPriorityClass(priority: string) {
  if (priority === "Critical") {
    return "rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-700";
  }

  if (priority === "Medium") {
    return "rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700";
  }

  return "rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600";
}

function getStatusClass(status: string) {
  if (status === "Critical") {
    return "rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-700";
  }

  if (status === "In Progress") {
    return "rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700";
  }

  if (status === "Open") {
    return "rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700";
  }

  return "rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700";
}


