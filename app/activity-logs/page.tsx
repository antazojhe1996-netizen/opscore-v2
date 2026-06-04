"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { ClipboardList } from "lucide-react";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  const getLogs = async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setLogs(data || []);
  };

  useEffect(() => {
    getLogs();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              System
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Activity Logs
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Audit trail of system activities.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} />
              <span className="font-black">
                {logs.length} Logs
              </span>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Module</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-slate-800"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {log.module}
                    </td>

                    <td className="px-4 py-3 text-cyan-400">
                      {log.action}
                    </td>

                    <td className="px-4 py-3">
                      {log.user_name}
                    </td>

                    <td className="px-4 py-3">
                      {log.details}
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      {new Date(
                        log.created_at
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}