"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import PageGuard from "@/components/PageGuard";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/app/lib/supabase";
import { ClipboardList, RefreshCcw, Search } from "lucide-react";

const Sidebar = dynamic(() => import("@/components/Sidebar"), {
  ssr: false,
});

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(false);

  const getLogs = async () => {
    setIsLoading(true);

    const companyId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_company_id") || ""
        : "";

    let query = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    setIsLoading(false);

    if (error) {
      console.log("GET ACTIVITY LOGS ERROR:", error.message);
      return;
    }

    setLogs(data || []);
  };

  useEffect(() => {
    getLogs();
  }, []);

  const modules = useMemo(() => {
    const uniqueModules = Array.from(
      new Set(logs.map((log) => log.module).filter(Boolean)),
    );

    return ["All", ...uniqueModules];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesModule =
        moduleFilter === "All" || String(log.module || "") === moduleFilter;

      const searchableText = `
        ${log.module || ""}
        ${log.action || ""}
        ${log.user_name || ""}
        ${log.employee_name || ""}
        ${log.details || ""}
        ${log.description || ""}
        ${log.role_name || ""}
      `.toLowerCase();

      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());

      return matchesModule && matchesSearch;
    });
  }, [logs, searchTerm, moduleFilter]);

  const getDisplayUser = (log: any) =>
    log.user_name || log.employee_name || "System User";

  const getDisplayDetails = (log: any) =>
    log.details || log.description || "-";

  return (
    <PageGuard moduleKey="activity_logs">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="SYSTEM / ACTIVITY LOGS" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  System
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Activity Logs
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
                  Company-scoped audit trail of important OPSCORE system activities.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <ClipboardList size={18} />
                    <span>{filteredLogs.length} Logs</span>
                  </div>
                </div>

                <button
                  onClick={getLogs}
                  disabled={isLoading}
                  className="flex h-12 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCcw size={16} />
                  {isLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </section>

            <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
              <div className="relative xl:col-span-3">
                <Search
                  size={18}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search module, action, user, role, or details..."
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                {modules.map((moduleName) => (
                  <option key={moduleName} value={moduleName}>
                    {moduleName}
                  </option>
                ))}
              </select>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-auto">
                <table className="w-full min-w-[1250px] text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Module</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">Date & Time</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="text-slate-700 hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {log.module || "-"}
                        </td>

                        <td className="px-4 py-3 font-bold text-blue-700">
                          {log.action || "-"}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {getDisplayUser(log)}
                        </td>

                        <td className="px-4 py-3 text-slate-500">
                          {log.role_name || "-"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {getDisplayDetails(log)}
                        </td>

                        <td className="px-4 py-3 text-slate-500">
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    ))}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-sm font-medium text-slate-500"
                        >
                          No activity logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}