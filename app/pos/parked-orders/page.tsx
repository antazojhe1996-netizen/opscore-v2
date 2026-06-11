"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Clock3,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";

type OrderItemRow = {
  id: string;
  order_id: string;
};

type ParkedOrderRow = {
  id: string;
  order_tag: string | null;
  total_amount: number | null;
  payment_status: string | null;
  production_status: string | null;
  status: string | null;
  created_at: string;
  pos_order_items?: OrderItemRow[] | null;
};

type ParkedOrder = {
  id: string;
  tag: string;
  total: number;
  itemCount: number;
  paymentStatus: string;
  productionStatus: string;
  createdAtLabel: string;
  minutesAgo: number;
};

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getMinutesAgo = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 0;

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
};

const getProductionClass = (status: string) => {
  const normalized = status.toUpperCase();

  if (normalized === "READY") {
    return "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25";
  }

  if (normalized === "PREPARING") {
    return "bg-sky-500/10 text-sky-300 ring-sky-400/25";
  }

  if (normalized === "PENDING") {
    return "bg-amber-500/10 text-amber-300 ring-amber-400/25";
  }

  if (normalized === "COMPLETED") {
    return "bg-slate-500/10 text-slate-300 ring-white/10";
  }

  return "bg-slate-500/10 text-slate-300 ring-white/10";
};

const getAgeClass = (minutes: number) => {
  if (minutes >= 45) return "text-red-300";
  if (minutes >= 25) return "text-amber-300";
  return "text-emerald-300";
};

export default function POSParkedOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<ParkedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  const loadParkedOrders = async () => {
    setLoading(true);
    setMessage("");

    let query = supabase
      .from("pos_orders")
      .select(
        `
        id,
        order_tag,
        total_amount,
        payment_status,
        production_status,
        status,
        created_at,
        pos_order_items (
          id,
          order_id
        )
      `,
      )
      .eq("status", "PARKED")
      .order("created_at", { ascending: true });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const mappedOrders = ((data || []) as ParkedOrderRow[]).map((order) => {
      const minutesAgo = getMinutesAgo(order.created_at);

      return {
        id: order.id,
        tag: order.order_tag || `ORDER ${order.id.slice(0, 8)}`,
        total: Number(order.total_amount || 0),
        itemCount: order.pos_order_items?.length || 0,
        paymentStatus: order.payment_status || "UNPAID",
        productionStatus: order.production_status || "PENDING",
        createdAtLabel: formatTime(order.created_at),
        minutesAgo,
      };
    });

    setOrders(mappedOrders);
    setLoading(false);
  };

  useEffect(() => {
    loadParkedOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return orders;

    return orders.filter((order) => order.tag.toLowerCase().includes(term));
  }, [orders, search]);

  const unpaidOrders = orders.filter(
    (order) => order.paymentStatus.toUpperCase() === "UNPAID",
  ).length;

  const delayedOrders = orders.filter((order) => order.minutesAgo >= 30).length;

  const readyOrders = orders.filter(
    (order) => order.productionStatus.toUpperCase() === "READY",
  ).length;

  const totalValue = orders.reduce((sum, order) => sum + order.total, 0);

  const openOrder = (order: ParkedOrder) => {
    localStorage.setItem("opscore_open_parked_order_id", order.id);
    localStorage.setItem("opscore_open_parked_order_tag", order.tag);

    window.location.href = "/pos/terminal";
  };

  const payOrder = (order: ParkedOrder) => {
    localStorage.setItem("opscore_pay_parked_order_id", order.id);
    localStorage.setItem("opscore_pay_parked_order_tag", order.tag);

    router.push("/pos/terminal");
  };

  return (
    <PageGuard moduleKey="pos_terminal">
      <div className="min-h-screen bg-[#05080d] text-white">
        <main className="mx-auto min-h-screen max-w-7xl overflow-x-hidden p-6">
          <section className="mb-6 rounded-[2rem] border border-amber-300/10 bg-gradient-to-br from-[#111820] via-[#070b10] to-black p-6 shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-300">
                  OPSCORE POS
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight">
                  Parked Orders
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                  Real parked orders waiting for bill out, payment, or
                  production completion.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => router.push("/pos/terminal")}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f5c400] px-4 text-xs font-black uppercase tracking-wide text-black transition hover:bg-[#ffd21f]"
                >
                  Back To Terminal
                </button>

                <button
                  onClick={loadParkedOrders}
                  disabled={loading}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/10 disabled:opacity-40"
                >
                  <RefreshCw size={15} />
                  Refresh
                </button>
              </div>
            </div>
          </section>

          {message && (
            <section className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {message}
            </section>
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Parked
                </p>
                <ReceiptText size={18} className="text-amber-300" />
              </div>
              <p className="mt-3 text-3xl font-black">{orders.length}</p>
            </div>

            <div className="rounded-[1.5rem] border border-amber-400/15 bg-amber-500/10 p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                  Unpaid
                </p>
                <Banknote size={18} className="text-amber-300" />
              </div>
              <p className="mt-3 text-3xl font-black text-amber-100">
                {unpaidOrders}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-red-400/15 bg-red-500/10 p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
                  Delayed
                </p>
                <AlertTriangle size={18} className="text-red-300" />
              </div>
              <p className="mt-3 text-3xl font-black text-red-100">
                {delayedOrders}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/10 p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Value
                </p>
                <ShoppingBag size={18} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-3xl font-black text-emerald-100">
                {peso(totalValue)}
              </p>
            </div>
          </section>

          <section className="mb-6 rounded-[1.5rem] border border-amber-400/15 bg-amber-500/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
              OPSCORE Assistance
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                <p className="text-sm font-black text-white">
                  {delayedOrders} order(s) waiting over 30 minutes
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-100/70">
                  Check long waiting parked orders first.
                </p>
              </div>

              <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                <p className="text-sm font-black text-white">
                  {unpaidOrders} unpaid parked order(s)
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-100/70">
                  Monitor pending bill outs during peak hours.
                </p>
              </div>

              <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                <p className="text-sm font-black text-white">
                  {readyOrders} ready order(s)
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-100/70">
                  Ready orders may be prepared for bill out.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order tag..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/40"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.035] p-8 text-center text-sm font-bold text-slate-500 xl:col-span-3">
                Loading parked orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.035] p-8 text-center text-sm font-bold text-slate-500 xl:col-span-3">
                No parked orders found.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b1017] shadow-xl shadow-black/25"
                >
                  <div className="border-b border-white/10 bg-black/20 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-2xl font-black uppercase tracking-tight text-white">
                          {order.tag}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <Clock3 size={14} className="text-slate-500" />
                          <p className="text-sm font-black text-slate-300">
                            {order.createdAtLabel}
                          </p>
                          <p
                            className={`text-xs font-black uppercase ${getAgeClass(
                              order.minutesAgo,
                            )}`}
                          >
                            {order.minutesAgo} mins ago
                          </p>
                        </div>
                      </div>

                      {order.minutesAgo >= 30 && (
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-red-300 ring-1 ring-red-400/25">
                          Long Wait
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Total
                        </p>
                        <p className="mt-1 text-3xl font-black text-emerald-200">
                          {peso(order.total)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Items
                        </p>
                        <p className="mt-1 text-2xl font-black text-white">
                          {order.itemCount}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase text-amber-300 ring-1 ring-amber-400/25">
                        {order.paymentStatus}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getProductionClass(
                          order.productionStatus,
                        )}`}
                      >
                        {order.productionStatus}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openOrder(order)}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-black uppercase text-black transition hover:bg-amber-200 active:scale-[0.98]"
                      >
                        Open
                        <ArrowRight size={15} />
                      </button>

                      <button
                        onClick={() => payOrder(order)}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f5c400] text-sm font-black uppercase text-black transition hover:bg-[#ffd21f] active:scale-[0.98]"
                      >
                        Pay
                        <Banknote size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </main>
      </div>
    </PageGuard>
  );
}
