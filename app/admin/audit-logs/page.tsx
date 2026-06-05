"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Database,
  Eye,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type Severity = "info" | "warning" | "critical";

export default function AuditLogsPage() {
  /// STATES
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  /// FUNCTIONS
  const loadLogs = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.log("GET AUDIT LOGS ERROR:", error.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  };

  const formatDateTime = (value: any) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSeverityStyle = (severity: Severity) => {
    if (severity === "critical") return "bg-red-500/10 text-red-400 border-red-500/30";
    if (severity === "warning") return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  };

  const getActionStyle = (action: string) => {
    const value = String(action || "").toLowerCase();

    if (value.includes("delete") || value.includes("void") || value.includes("cancel")) {
      return "text-red-400";
    }

    if (value.includes("update") || value.includes("edit")) {
      return "text-amber-400";
    }

    if (value.includes("create") || value.includes("insert") || value.includes("record")) {
      return "text-emerald-400";
    }

    return "text-slate-300";
  };

  const getUserName = (log: any) =>
    log.user_name ||
    log.employee_name ||
    log.performed_by ||
    log.user_email ||
    "System / Unknown";

  const getModuleName = (log: any) =>
    log.module_name ||
    log.module ||
    log.module_key ||
    "General";

  const getDescription = (log: any) =>
    log.description ||
    log.summary ||
    log.details ||
    log.action_description ||
    "-";

  /// CALCULATIONS
  const todayKey = new Date().toISOString().slice(0, 10);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const moduleName = String(getModuleName(log)).toLowerCase();
      const severity = String(log.severity || "info").toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesModule =
        moduleFilter === "all" || moduleName === moduleFilter.toLowerCase();

      const matchesSeverity =
        severityFilter === "all" || severity === severityFilter.toLowerCase();

      const matchesSearch =
        !search ||
        String(getUserName(log)).toLowerCase().includes(search) ||
        String(log.action || "").toLowerCase().includes(search) ||
        String(getDescription(log)).toLowerCase().includes(search) ||
        String(getModuleName(log)).toLowerCase().includes(search);

      return matchesModule && matchesSeverity && matchesSearch;
    });
  }, [logs, moduleFilter, severityFilter, searchTerm]);

  const logsToday = logs.filter((log) =>
    String(log.created_at || "").slice(0, 10) === todayKey
  );

  const criticalLogs = logs.filter(
    (log) => String(log.severity || "info").toLowerCase() === "critical"
  );

  const warningLogs = logs.filter(
    (log) => String(log.severity || "info").toLowerCase() === "warning"
  );

  const uniqueUsersToday = new Set(
    logsToday.map((log) => String(getUserName(log)))
  ).size;

  const moduleOptions = Array.from(
    new Set(logs.map((log) => String(getModuleName(log)).toLowerCase()))
  )
    .filter(Boolean)
    .sort();

  const recentCritical = criticalLogs.slice(0, 6);

  /// EFFECTS
  useEffect(() => {
    loadLogs();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              OPSCORE Admin
            </p>

            <h1 className="mt-2 text-4xl font-black">Audit Logs</h1>

            <p className="mt-2 text-slate-400">
              Track sensitive actions across finance, payroll, employees, apartment, cash drawer, and system settings.
            </p>
          </div>

          <button
            onClick={loadLogs}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            {loading ? "Loading..." : "Refresh Logs"}
          </button>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Actions Today"
            value={logsToday.length}
            icon={<ClipboardList size={22} />}
            color="text-blue-400"
          />

          <SummaryCard
            title="Users Active Today"
            value={uniqueUsersToday}
            icon={<UserCheck size={22} />}
            color="text-emerald-400"
          />

          <SummaryCard
            title="Warning Logs"
            value={warningLogs.length}
            icon={<AlertTriangle size={22} />}
            color="text-amber-400"
          />

          <SummaryCard
            title="Critical Logs"
            value={criticalLogs.length}
            icon={<ShieldCheck size={22} />}
            color="text-red-400"
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <Database className="text-amber-400" size={26} />

              <div>
                <h2 className="text-2xl font-black">Audit Trail</h2>
                <p className="text-sm text-slate-400">
                  Latest 500 audit entries from the database.
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user, action, module..."
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none md:col-span-2"
              />

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              >
                <option value="all">All Modules</option>
                {moduleOptions.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              >
                <option value="all">All Severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Severity</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => {
                    const severity = String(log.severity || "info").toLowerCase() as Severity;

                    return (
                      <tr
                        key={log.id}
                        className="border-t border-slate-800 hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 text-slate-300">
                          {formatDateTime(log.created_at)}
                        </td>

                        <td className="px-4 py-3 font-bold text-white">
                          {getUserName(log)}
                        </td>

                        <td className="px-4 py-3">
                          {getModuleName(log)}
                        </td>

                        <td className={`px-4 py-3 font-bold ${getActionStyle(log.action)}`}>
                          {log.action || "-"}
                        </td>

                        <td className="px-4 py-3 text-slate-400">
                          {getDescription(log)}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getSeverityStyle(severity)}`}>
                            {severity.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        {loading
                          ? "Loading audit logs..."
                          : "No audit logs found. Create the audit_logs table and start logging sensitive actions."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-red-400" size={24} />
                <h2 className="text-xl font-black text-white">Critical Changes</h2>
              </div>

              <div className="mt-5 space-y-3">
                {recentCritical.length > 0 ? (
                  recentCritical.map((log) => (
                    <div key={log.id} className="rounded-xl border border-red-500/20 bg-slate-950/60 p-4">
                      <p className="text-sm font-bold text-red-300">
                        {log.action || "Critical Action"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateTime(log.created_at)} • {getUserName(log)}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {getDescription(log)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-300">
                    No critical changes found.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center gap-3">
                <Eye className="text-amber-400" size={24} />
                <h2 className="text-xl font-black">Audit Standard</h2>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <AuditStandardRow label="Employees" value="create, update, archive" />
                <AuditStandardRow label="Payroll" value="generate, approve, release" />
                <AuditStandardRow label="Cash Drawer" value="open, close, variance, delete" />
                <AuditStandardRow label="Expenses" value="create, update, delete" />
                <AuditStandardRow label="Apartment" value="bill, payment, delete" />
                <AuditStandardRow label="Reservations" value="create, edit, cancel, payment" />
              </div>
            </section>
          </aside>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
          <h2 className="text-xl font-black text-amber-300">Next Step</h2>
          <p className="mt-2 text-sm text-amber-100">
            After this page is working, create the audit_logs table in Supabase, then add an audit helper so sensitive actions automatically create logs.
          </p>

          <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-300">
{`create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid,
  user_name text,
  module text not null,
  action text not null,
  description text,
  severity text default 'info',
  record_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text
);`}
          </pre>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <div className="rounded-full bg-slate-800 p-3 text-amber-400">
          {icon}
        </div>
      </div>

      <h2 className={`text-3xl font-black ${color}`}>{value}</h2>
    </div>
  );
}

function AuditStandardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="font-bold text-white">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{value}</p>
    </div>
  );
}
