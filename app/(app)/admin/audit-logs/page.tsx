"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Database,
  Eye,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
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
    if (severity === "critical") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (severity === "warning") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  };

  const getActionStyle = (action: string) => {
    const value = String(action || "").toLowerCase();

    if (
      value.includes("delete") ||
      value.includes("void") ||
      value.includes("cancel")
    ) {
      return "text-red-700";
    }

    if (value.includes("update") || value.includes("edit")) {
      return "text-amber-700";
    }

    if (
      value.includes("create") ||
      value.includes("insert") ||
      value.includes("record")
    ) {
      return "text-emerald-700";
    }

    return "text-slate-950";
  };

  const getUserName = (log: any) =>
    log.user_name ||
    log.employee_name ||
    log.performed_by ||
    log.user_email ||
    "System / Unknown";

  const getModuleName = (log: any) =>
    log.module_name || log.module || log.module_key || "General";

  const getDescription = (log: any) =>
    log.description || log.summary || log.details || log.action_description || "-";

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

  const logsToday = logs.filter(
    (log) => String(log.created_at || "").slice(0, 10) === todayKey
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
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  ADMIN
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Audit Logs
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  Track sensitive actions across finance, payroll, employees,
                  apartment, cash drawer, reservations, and system settings.
                </p>
              </div>

              <button
                onClick={loadLogs}
                disabled={loading}
                className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "Refresh Logs"}
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Actions Today"
              value={logsToday.length}
              icon={<ClipboardList size={22} />}
            />

            <SummaryCard
              title="Users Active Today"
              value={uniqueUsersToday}
              icon={<UserCheck size={22} />}
            />

            <SummaryCard
              title="Warning Logs"
              value={warningLogs.length}
              icon={<AlertTriangle size={22} />}
            />

            <SummaryCard
              title="Critical Logs"
              value={criticalLogs.length}
              icon={<ShieldCheck size={22} />}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-slate-700" />

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Audit Trail
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Latest Audit Entries
                    </h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                      Latest 500 audit entries from the database.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search user, action, module..."
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 md:col-span-2"
                  />

                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="all">All Severity</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Date / Time</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Module</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Severity</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {filteredLogs.map((log) => {
                      const severity = String(
                        log.severity || "info"
                      ).toLowerCase() as Severity;

                      return (
                        <tr
                          key={log.id}
                          className="transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            {formatDateTime(log.created_at)}
                          </td>

                          <td className="px-6 py-4 font-black text-slate-950">
                            {getUserName(log)}
                          </td>

                          <td className="px-6 py-4">{getModuleName(log)}</td>

                          <td
                            className={`px-6 py-4 font-black ${getActionStyle(
                              log.action
                            )}`}
                          >
                            {log.action || "-"}
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {getDescription(log)}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${getSeverityStyle(
                                severity
                              )}`}
                            >
                              {severity.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-14 text-center">
                          <p className="text-sm font-black text-slate-950">
                            {loading ? "Loading audit logs..." : "No audit logs found"}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            Audit entries will appear here once sensitive actions are
                            logged.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-slate-700" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Critical Monitor
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Critical Changes
                    </h2>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {recentCritical.length > 0 ? (
                    recentCritical.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-red-200 bg-red-50 p-4"
                      >
                        <p className="text-sm font-black text-red-700">
                          {log.action || "Critical Action"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-red-700">
                          {formatDateTime(log.created_at)} â€¢ {getUserName(log)}
                        </p>
                        <p className="mt-2 text-sm font-bold leading-6 text-red-700">
                          {getDescription(log)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
                      No critical changes found.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-slate-700" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Audit Coverage
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Audit Standard
                    </h2>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <AuditStandardRow label="Employees" value="create, update, archive" />
                  <AuditStandardRow label="Payroll" value="generate, approve, release" />
                  <AuditStandardRow
                    label="Cash Drawer"
                    value="open, close, variance, delete"
                  />
                  <AuditStandardRow label="Expenses" value="create, update, delete" />
                  <AuditStandardRow label="Apartment" value="bill, payment, delete" />
                  <AuditStandardRow
                    label="Reservations"
                    value="create, edit, cancel, payment"
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  System Note
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Audit Logging Standard
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                  Sensitive actions should automatically create audit entries through
                  the shared audit helper.
                </p>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {title}
        </p>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          {icon}
        </div>
      </div>

      <h2 className="text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
    </div>
  );
}

function AuditStandardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="font-black text-slate-950">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{value}</p>
    </div>
  );
}



