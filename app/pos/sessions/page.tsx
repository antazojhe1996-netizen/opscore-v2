"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import TopNavbar from "@/components/TopNavbar";
import {
  Banknote,
  CheckCircle2,
  Play,
  RefreshCw,
  StopCircle,
  Wallet,
} from "lucide-react";

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
  opening_cash: number | null;
  closing_cash: number | null;
  expected_cash: number | null;
  actual_cash: number | null;
  variance: number | null;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at: string | null;
};

type PosOrder = {
  id: string;
  session_id: string | null;
  cashier_id: string | null;
  total_amount: number | null;
  payment_method: string | null;
  payment_method_name: string | null;
  payment_status: string | null;
  status: string | null;
};

const peso = (value: number | null | undefined) =>
  `â‚±${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const normalizePayment = (order: PosOrder) =>
  String(order.payment_method_name || order.payment_method || "Unknown").trim();

const isPaidOrder = (order: PosOrder) => {
  const status = String(order.status || "").toUpperCase();
  const paymentStatus = String(order.payment_status || "").toUpperCase();

  return (
    paymentStatus === "PAID" &&
    !["VOIDED", "CANCELLED", "PARKED"].includes(status)
  );
};

const varianceClass = (value: number) => {
  if (value < 0) {
    return "rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700";
  }

  if (value > 0) {
    return "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700";
  }

  return "rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700";
};

export default function POSSessionsPage() {
  const [pin, setPin] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");

  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [sessions, setSessions] = useState<PosSession[]>([]);
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [readSession, setReadSession] = useState<PosSession | null>(null);
  const [readType, setReadType] = useState<"X_READ" | "Z_READ">("X_READ");

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    setMessage("");

    let sessionQuery = supabase
      .from("pos_sessions")
      .select("*")
      .order("opened_at", { ascending: false });

    let employeeQuery = supabase
      .from("employees")
      .select("id, first_name, last_name");

    let orderQuery = supabase
      .from("pos_orders")
      .select(
        "id, session_id, cashier_id, total_amount, payment_method, payment_method_name, payment_status, status",
      );

    if (companyId) {
      sessionQuery = sessionQuery.eq("company_id", companyId);
      employeeQuery = employeeQuery.eq("company_id", companyId);
      orderQuery = orderQuery.eq("company_id", companyId);
    }

    const [sessionResult, employeeResult, orderResult] = await Promise.all([
      sessionQuery,
      employeeQuery,
      orderQuery,
    ]);

    if (sessionResult.error) {
      setMessage(sessionResult.error.message);
      setLoading(false);
      return;
    }

    if (employeeResult.error) {
      setMessage(employeeResult.error.message);
      setLoading(false);
      return;
    }

    if (orderResult.error) {
      setMessage(orderResult.error.message);
      setLoading(false);
      return;
    }

    const names: Record<string, string> = {};
    (employeeResult.data || []).forEach((emp: any) => {
      names[emp.id] =
        `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
        "Unknown Cashier";
    });

    const list = (sessionResult.data || []) as PosSession[];

    setEmployeeNames(names);
    setSessions(list);
    setOrders((orderResult.data || []) as PosOrder[]);
    setActiveSession(list.find((session) => session.status === "OPEN") || null);
    setLoading(false);
  }

  function cashierName(session: PosSession) {
    if (!session.opened_by) return "Unknown Cashier";
    return employeeNames[session.opened_by] || "Unknown Cashier";
  }

  function getSessionOrders(sessionId: string) {
    return orders.filter((order) => order.session_id === sessionId);
  }

  function getPaidSessionOrders(sessionId: string) {
    return getSessionOrders(sessionId).filter(isPaidOrder);
  }

  function getTotalOrders(sessionId: string) {
    return getSessionOrders(sessionId).filter((order) => {
      const status = String(order.status || "").toUpperCase();
      return !["VOIDED", "CANCELLED"].includes(status);
    }).length;
  }

  function getPaidOrdersCount(sessionId: string) {
    return getPaidSessionOrders(sessionId).length;
  }

  function getParkedOrdersCount(sessionId: string) {
    return getSessionOrders(sessionId).filter((order) => {
      const status = String(order.status || "").toUpperCase();
      return status === "PARKED";
    }).length;
  }

  function getSessionSales(sessionId: string) {
    return getPaidSessionOrders(sessionId).reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0,
    );
  }

  function getSessionCashSales(sessionId: string) {
    return getPaidSessionOrders(sessionId)
      .filter((order) => normalizePayment(order).toUpperCase().includes("CASH"))
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  }

  function getPaymentBreakdown(sessionId: string) {
    const map = new Map<string, number>();

    getPaidSessionOrders(sessionId).forEach((order) => {
      const payment = normalizePayment(order);
      const current = map.get(payment) || 0;
      map.set(payment, current + Number(order.total_amount || 0));
    });

    return Array.from(map.entries()).map(([payment, amount]) => ({
      payment,
      amount,
    }));
  }

  const activeSessionSales = activeSession
    ? getSessionSales(activeSession.id)
    : 0;

  const activeCashSales = activeSession
    ? getSessionCashSales(activeSession.id)
    : 0;

  const activeExpectedCash = activeSession
    ? Number(activeSession.opening_cash || 0) + activeCashSales
    : 0;

  const totalClosedSessions = sessions.filter(
    (session) => session.status === "CLOSED",
  ).length;

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

    let employeeQuery = supabase
      .from("employees")
      .select("id, company_id, first_name, last_name")
      .eq("can_access_pos", true)
      .eq("pos_pin", pin.trim());

    if (companyId) {
      employeeQuery = employeeQuery.eq("company_id", companyId);
    }

    const { data: employee, error: employeeError } =
      await employeeQuery.maybeSingle();

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
      expected_cash: 0,
      actual_cash: 0,
      variance: 0,
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
    const expected = activeExpectedCash;
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

  function openRead(session: PosSession, type: "X_READ" | "Z_READ") {
    setReadSession(session);
    setReadType(type);
  }

  function closeRead() {
    setReadSession(null);
  }

  function getReadExpectedCash(session: PosSession) {
    return session.status === "OPEN"
      ? Number(session.opening_cash || 0) + getSessionCashSales(session.id)
      : Number(session.expected_cash || 0);
  }

  function getReadActualCash(session: PosSession) {
    return Number(session.actual_cash || session.closing_cash || 0);
  }

  function getReadVariance(session: PosSession) {
    return session.status === "OPEN"
      ? 0
      : Number(
          session.variance ||
            getReadActualCash(session) - getReadExpectedCash(session),
        );
  }

  return (
    <PageGuard moduleKey="pos_sessions">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="POS / CASHIER SESSIONS" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  POS
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Cashier Sessions
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Open, close, review, and reconcile cashier POS sessions with
                  payment breakdown, order counters, and expected cash
                  monitoring.
                </p>
              </div>

              <button
                onClick={loadSessions}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </section>

            {message && (
              <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 shadow-sm">
                {message}
              </section>
            )}

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Active Session
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {activeSession ? "1" : "0"}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Only one open cashier session allowed.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Active Sales
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {peso(activeSessionSales)}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-emerald-800">
                  Paid sales under the open session.
                </p>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  Expected Cash
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {peso(activeExpectedCash)}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-blue-800">
                  Opening cash plus paid cash sales.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Closed Sessions
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {totalClosedSessions}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Total closed POS sessions loaded.
                </p>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Session Control
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Start Session
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Cashier enters PIN only. No cashier dropdown needed.
                  </p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Cashier PIN
                      </label>
                      <input
                        type="password"
                        value={pin}
                        onChange={(event) => setPin(event.target.value)}
                        placeholder="Enter cashier PIN"
                        disabled={!!activeSession}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Opening Cash
                      </label>
                      <input
                        type="number"
                        value={openingCash}
                        onChange={(event) => setOpeningCash(event.target.value)}
                        placeholder="0.00"
                        disabled={!!activeSession}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={startSession}
                      disabled={loading || !!activeSession}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Play size={16} />
                      Start Session
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Active Session
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Current Cashier
                  </h2>
                </div>

                {!activeSession ? (
                  <div className="p-6 text-sm font-semibold text-slate-500">
                    No active cashier session.
                  </div>
                ) : (
                  <div className="space-y-4 p-6">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                        Cashier
                      </p>
                      <p className="mt-2 text-xl font-black text-slate-950">
                        {cashierName(activeSession)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-emerald-800">
                        Opened: {formatDateTime(activeSession.opened_at)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <MiniCard
                        label="Total Orders"
                        value={String(getTotalOrders(activeSession.id))}
                      />
                      <MiniCard
                        label="Paid Orders"
                        value={String(getPaidOrdersCount(activeSession.id))}
                      />
                      <MiniCard
                        label="Parked Orders"
                        value={String(getParkedOrdersCount(activeSession.id))}
                      />
                      <MiniCard
                        label="Opening Cash"
                        value={peso(activeSession.opening_cash)}
                      />
                      <MiniCard label="Cash Sales" value={peso(activeCashSales)} />
                      <MiniCard
                        label="Expected Cash"
                        value={peso(activeExpectedCash)}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Actual Cash Count
                      </label>
                      <input
                        type="number"
                        value={closingCash}
                        onChange={(event) => setClosingCash(event.target.value)}
                        placeholder="0.00"
                        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <button
                      onClick={() => openRead(activeSession, "X_READ")}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      View X Read
                    </button>

                    <button
                      onClick={closeSession}
                      disabled={loading}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      <StopCircle size={16} />
                      End Session
                    </button>
                  </div>
                )}
              </div>
            </section>

            {activeSession && (
              <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      X Read Foundation
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Active Payment Breakdown
                    </h2>
                  </div>
                  <Banknote className="text-slate-500" size={22} />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {getPaymentBreakdown(activeSession.id).length === 0 ? (
                    <p className="text-sm font-semibold text-slate-500">
                      No paid transactions yet.
                    </p>
                  ) : (
                    getPaymentBreakdown(activeSession.id).map((item) => (
                      <div
                        key={item.payment}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {item.payment}
                        </p>
                        <p className="mt-2 text-lg font-black text-slate-950">
                          {peso(item.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Session History
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Cashier Accountability Log
                  </h2>
                </div>

                <Wallet className="text-slate-500" size={22} />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Cashier",
                        "Status",
                        "Total Orders",
                        "Paid Orders",
                        "Parked Orders",
                        "Opening",
                        "Sales",
                        "Expected",
                        "Actual",
                        "Variance",
                        "Opened",
                        "Closed",
                        "Read",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={13}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading sessions...
                        </td>
                      </tr>
                    ) : sessions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={13}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          No POS sessions found.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((session) => {
                        const sales = getSessionSales(session.id);
                        const expected =
                          session.status === "OPEN"
                            ? Number(session.opening_cash || 0) +
                              getSessionCashSales(session.id)
                            : Number(session.expected_cash || 0);
                        const actual = Number(
                          session.actual_cash || session.closing_cash || 0,
                        );
                        const variance =
                          session.status === "OPEN"
                            ? 0
                            : Number(session.variance || actual - expected);

                        return (
                          <tr
                            key={session.id}
                            className="transition-all duration-200 hover:bg-slate-50"
                          >
                            <td className="px-5 py-4 font-black text-slate-950">
                              {cashierName(session)}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={
                                  session.status === "OPEN"
                                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700"
                                    : "rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700"
                                }
                              >
                                {session.status}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              {getTotalOrders(session.id)}
                            </td>
                            <td className="px-5 py-4">
                              {getPaidOrdersCount(session.id)}
                            </td>
                            <td className="px-5 py-4">
                              {getParkedOrdersCount(session.id)}
                            </td>
                            <td className="px-5 py-4">
                              {peso(session.opening_cash)}
                            </td>
                            <td className="px-5 py-4">{peso(sales)}</td>
                            <td className="px-5 py-4">{peso(expected)}</td>
                            <td className="px-5 py-4">{peso(actual)}</td>

                            <td className="px-5 py-4">
                              <span className={varianceClass(variance)}>
                                {peso(variance)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              {formatDateTime(session.opened_at)}
                            </td>

                            <td className="px-5 py-4">
                              {formatDateTime(session.closed_at)}
                            </td>

                            <td className="px-5 py-4">
                              <button
                                onClick={() =>
                                  openRead(
                                    session,
                                    session.status === "OPEN"
                                      ? "X_READ"
                                      : "Z_READ",
                                  )
                                }
                                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                              >
                                {session.status === "OPEN" ? "X Read" : "Z Read"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-blue-700" size={20} />

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    POS Lock Note
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-blue-800">
                    Session Audit V1 now includes total orders, paid orders,
                    parked orders, actual cash count before variance, and
                    variance color logic for cashier accountability.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {readSession && (
            <div className="fixed inset-0 z-[10050] flex justify-end bg-slate-950/40">
              <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {readType === "X_READ" ? "X Read Preview" : "Z Read Final"}
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {cashierName(readSession)}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Opened: {formatDateTime(readSession.opened_at)}
                  </p>

                  {readSession.closed_at && (
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Closed: {formatDateTime(readSession.closed_at)}
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniCard
                      label="Total Orders"
                      value={String(getTotalOrders(readSession.id))}
                    />
                    <MiniCard
                      label="Paid Orders"
                      value={String(getPaidOrdersCount(readSession.id))}
                    />
                    <MiniCard
                      label="Parked Orders"
                      value={String(getParkedOrdersCount(readSession.id))}
                    />
                    <MiniCard
                      label="Opening Cash"
                      value={peso(readSession.opening_cash)}
                    />
                    <MiniCard
                      label="Total Sales"
                      value={peso(getSessionSales(readSession.id))}
                    />
                    <MiniCard
                      label="Cash Sales"
                      value={peso(getSessionCashSales(readSession.id))}
                    />
                    <MiniCard
                      label="Expected Cash"
                      value={peso(getReadExpectedCash(readSession))}
                    />
                    <MiniCard
                      label="Actual Cash Count"
                      value={peso(getReadActualCash(readSession))}
                    />
                    <MiniCard
                      label="Variance"
                      value={peso(getReadVariance(readSession))}
                    />
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Payment Breakdown
                    </p>

                    <div className="mt-4 space-y-3">
                      {getPaymentBreakdown(readSession.id).length === 0 ? (
                        <p className="text-sm font-semibold text-slate-500">
                          No paid transactions.
                        </p>
                      ) : (
                        getPaymentBreakdown(readSession.id).map((item) => (
                          <div
                            key={item.payment}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <p className="text-sm font-black text-slate-700">
                              {item.payment}
                            </p>
                            <p className="text-sm font-black text-slate-950">
                              {peso(item.amount)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                      {readType === "X_READ" ? "X Read" : "Z Read"}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
                      {readType === "X_READ"
                        ? "X Read is a live preview for the open session. It does not close or finalize the cashier drawer."
                        : "Z Read is the final session summary after cashier closing. This is the basis for cashier accountability and variance review."}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 p-6">
                  <button
                    onClick={closeRead}
                    className="h-11 w-full rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PageGuard>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}





