"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

/// TYPES
type Employee = {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
};

type PosSession = {
  id: string;
  company_id: string | null;
  opened_by: string | null;
  closed_by: string | null;
  opening_cash: number;
  closing_cash: number;
  expected_cash: number;
  actual_cash: number;
  variance: number;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at: string | null;
};

/// PAGE
export default function POSSessionsPage() {
  /// STATES
  const [pin, setPin] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [sessions, setSessions] = useState<PosSession[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /// LOAD DATA
  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    setMessage("");

    const { data: sessionData, error: sessionError } = await supabase
      .from("pos_sessions")
      .select("*")
      .order("opened_at", { ascending: false });

    if (sessionError) {
      setMessage(sessionError.message);
      setLoading(false);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, first_name, last_name");

    if (employeeError) {
      setMessage(employeeError.message);
      setLoading(false);
      return;
    }

    const names: Record<string, string> = {};

    (employeeData || []).forEach((emp) => {
      names[emp.id] =
        `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
        "Unknown Cashier";
    });

    const list = (sessionData || []) as PosSession[];

    setEmployeeNames(names);
    setSessions(list);
    setActiveSession(list.find((s) => s.status === "OPEN") || null);
    setLoading(false);
  }

  /// FUNCTIONS
  function cashierName(session: PosSession) {
    if (!session.opened_by) return "Unknown Cashier";
    return employeeNames[session.opened_by] || "Unknown Cashier";
  }

  function peso(value: number | null | undefined) {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  async function startSession() {
    setMessage("");

    if (activeSession) {
      setMessage("There is already an open POS session. Close it first.");
      return;
    }

    if (!pin.trim()) {
      setMessage("Enter cashier PIN.");
      return;
    }

    if (!openingCash.trim()) {
      setMessage("Enter opening cash.");
      return;
    }

    setLoading(true);

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id, first_name, last_name")
      .eq("can_access_pos", true)
      .eq("pos_pin", pin.trim())
      .maybeSingle();

    if (employeeError || !employee) {
      setLoading(false);
      setMessage("Invalid PIN or cashier has no POS access.");
      return;
    }

    const cashier = employee as Employee;

    const { error: insertError } = await supabase.from("pos_sessions").insert({
      company_id: cashier.company_id,
      opened_by: cashier.id,
      opening_cash: Number(openingCash),
      status: "OPEN",
    });

    if (insertError) {
      setLoading(false);
      setMessage(insertError.message);
      return;
    }

    setPin("");
    setOpeningCash("");
    setMessage("Session started.");
    await loadSessions();
    setLoading(false);
  }

  async function closeSession() {
    if (!activeSession) return;

    if (!closingCash.trim()) {
      setMessage("Enter closing cash.");
      return;
    }

    setLoading(true);
    setMessage("");

const actual = Number(closingCash);
const expected =
  Number(activeSession.opening_cash || 0) +
  Number(activeSession.expected_cash || 0);

const variance = actual - expected;

       const { error } = await supabase
  .from("pos_sessions")
  .update({
    status: "CLOSED",
    closed_at: new Date().toISOString(),
    closed_by: activeSession.opened_by,
    expected_cash: expected,
    closing_cash: actual,
    actual_cash: actual,
    variance,
  })
  .eq("id", activeSession.id);

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    setClosingCash("");
    setMessage("Session closed.");
    await loadSessions();
    setLoading(false);
  }

  /// UI
  return (
    <PageGuard moduleKey="pos_sessions">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          {/* HEADER */}
          <section className="mb-6 rounded-[2rem] border border-blue-300/10 bg-slate-900 p-6">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
              OPSCORE POS
            </p>

            <h1 className="mt-2 text-4xl font-black">Cashier Sessions</h1>

            <p className="mt-2 text-sm text-slate-400">
              Open and close cashier sessions using PIN-only access.
            </p>
          </section>

          {/* MESSAGE */}
          {message && (
            <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
              {message}
            </div>
          )}

          {/* MAIN GRID */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* START SESSION */}
            <div className="rounded-[1.75rem] border border-blue-300/10 bg-white/[0.035] p-5 xl:col-span-1">
              <h2 className="text-xl font-black">Start Session</h2>

              <p className="mt-1 text-sm text-slate-400">
                Cashier enters PIN only. No cashier selection needed.
              </p>

              <div className="mt-5 space-y-4">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter cashier PIN"
                  disabled={!!activeSession}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-300 disabled:opacity-40"
                />

                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="Opening cash"
                  disabled={!!activeSession}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-300 disabled:opacity-40"
                />

                <button
                  onClick={startSession}
                  disabled={loading || !!activeSession}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Start Session
                </button>
              </div>
            </div>

            {/* ACTIVE SESSION */}
            <div className="rounded-[1.75rem] border border-emerald-400/15 bg-emerald-500/10 p-5 xl:col-span-2">
              <h2 className="text-xl font-black">Active Session</h2>

              {!activeSession ? (
                <p className="mt-4 text-sm text-slate-400">
                  No active cashier session.
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                      Cashier
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {cashierName(activeSession)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                      Opened At
                    </p>
                    <p className="mt-2 text-lg font-bold">
                      {new Date(activeSession.opened_at).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                      Opening Cash
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {peso(activeSession.opening_cash)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                      Status
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-300">
                      OPEN
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="number"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      placeholder="Closing cash"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-300"
                    />

                    <button
                      onClick={closeSession}
                      disabled={loading}
                      className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      End Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SESSION HISTORY */}
          <section className="mt-6 rounded-[1.75rem] border border-blue-300/10 bg-white/[0.035] p-5">
            <h2 className="text-xl font-black">Session History</h2>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Opening</th>
                    <th className="px-4 py-3">Closing</th>
                    <th className="px-4 py-3">Variance</th>
                    <th className="px-4 py-3">Opened</th>
                    <th className="px-4 py-3">Closed</th>
                  </tr>
                </thead>

                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-bold">
                        {cashierName(session)}
                      </td>

                      <td className="px-4 py-3 font-bold">{session.status}</td>

                      <td className="px-4 py-3">
                        {peso(session.opening_cash)}
                      </td>

                      <td className="px-4 py-3">
                        {peso(session.closing_cash)}
                      </td>

                      <td className="px-4 py-3">{peso(session.variance)}</td>

                      <td className="px-4 py-3">
                        {new Date(session.opened_at).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        {session.closed_at
                          ? new Date(session.closed_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && sessions.length === 0 && (
                <p className="p-5 text-sm text-slate-400">
                  No POS sessions found.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}