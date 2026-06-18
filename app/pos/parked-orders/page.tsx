"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";

type OrderItemRow = {
  id: string;
  order_id: string;
  production_status?: string | null;
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
  sentItemCount: number;
  pendingItemCount: number;
  paymentStatus: string;
  productionStatus: string;
  displayProductionStatus: string;
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

const getStatusClass = (status: string) => {
  const normalized = status.toUpperCase();

  if (normalized.includes("READY") || normalized.includes("COMPLETED")) {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
  }

  if (
    normalized.includes("SENT") ||
    normalized.includes("PRINTED") ||
    normalized.includes("IN_PROGRESS")
  ) {
    return "border-sky-400/25 bg-sky-500/10 text-sky-300";
  }

  if (normalized.includes("PREPARING")) {
    return "border-violet-400/25 bg-violet-500/10 text-violet-300";
  }

  if (normalized.includes("PENDING")) {
    return "border-amber-400/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/10 bg-white/5 text-slate-300";
};

const getAgeClass = (minutes: number) => {
  if (minutes >= 45) return "text-red-300";
  if (minutes >= 25) return "text-amber-300";
  return "text-emerald-300";
};

const normalizeProductionStatus = (
  orderStatus: string,
  sentItemCount: number,
  pendingItemCount: number,
) => {
  const normalized = orderStatus.toUpperCase();

  if (pendingItemCount > 0 && sentItemCount > 0) return "PARTIAL SENT";
  if (sentItemCount > 0) return "SENT TO STATION";
  if (normalized === "SENT") return "SENT TO STATION";
  if (normalized === "PRINTED") return "PRINTED";
  if (normalized === "IN_PROGRESS") return "IN PROGRESS";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "READY") return "READY";

  return orderStatus || "PENDING";
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

  useEffect(() => {
    loadParkedOrders();

    const channel = supabase
      .channel("pos-parked-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_orders",
        },
        () => {
          loadParkedOrders(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_order_items",
        },
        () => {
          loadParkedOrders(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadParkedOrders = async (showLoader = true) => {
    if (showLoader) setLoading(true);
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
          order_id,
          production_status
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
      const items = order.pos_order_items || [];
      const sentItemCount = items.filter((item) => {
        const status = String(item.production_status || "").toUpperCase();
        return ["SENT", "PRINTED", "IN_PROGRESS", "READY", "COMPLETED"].includes(
          status,
        );
      }).length;
      const pendingItemCount = items.filter((item) => {
        const status = String(item.production_status || "").toUpperCase();
        return status === "PENDING";
      }).length;
      const productionStatus = order.production_status || "PENDING";

      return {
        id: order.id,
        tag: order.order_tag || `ORDER ${order.id.slice(0, 8)}`,
        total: Number(order.total_amount || 0),
        itemCount: items.length,
        sentItemCount,
        pendingItemCount,
        paymentStatus: order.payment_status || "UNPAID",
        productionStatus,
        displayProductionStatus: normalizeProductionStatus(
          productionStatus,
          sentItemCount,
          pendingItemCount,
        ),
        createdAtLabel: formatTime(order.created_at),
        minutesAgo,
      };
    });

    setOrders(mappedOrders);
    setLoading(false);
  };

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;

    return orders.filter((order) => order.tag.toLowerCase().includes(term));
  }, [orders, search]);

  const delayedOrders = orders.filter((order) => order.minutesAgo >= 30).length;
  const readyOrders = orders.filter((order) =>
  ["READY", "COMPLETED"].some((status) =>
    String(order.displayProductionStatus || order.productionStatus || "")
      .toUpperCase()
      .includes(status),
  ),
).length;
  const sentOrders = orders.filter((order) => order.sentItemCount > 0).length;
  const totalValue = orders.reduce((sum, order) => sum + order.total, 0);

  const openOrder = (order: ParkedOrder) => {
    localStorage.setItem("opscore_open_parked_order_id", order.id);
    localStorage.setItem("opscore_open_parked_order_tag", order.tag);
    router.push("/pos/terminal");
  };

  const payOrder = (order: ParkedOrder) => {
    localStorage.setItem("opscore_pay_parked_order_id", order.id);
    localStorage.setItem("opscore_pay_parked_order_tag", order.tag);
    router.push("/pos/terminal");
  };

  return (
    <PageGuard moduleKey="pos_terminal">
      <div className="h-screen overflow-hidden bg-[#05080d] text-white">
        <main className="flex h-full flex-col p-2">
          <section className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#070b10] px-4 py-3 shadow-xl shadow-black/40">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <ShoppingBag size={22} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                  OPSCORE POS Recall
                </p>
                <h1 className="truncate text-2xl font-black leading-tight">
                  Parked Orders
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                Parked {orders.length}
              </span>
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-200">
                Sent {sentOrders}
              </span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
                Ready {readyOrders}
              </span>
              <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200">
                Delayed {delayedOrders}
              </span>
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                {peso(totalValue)}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => router.push("/pos/terminal")}
                className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                Terminal
              </button>

              <button
                onClick={() => loadParkedOrders()}
                disabled={loading}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-40"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </section>

          {message && (
            <section className="mb-2 shrink-0 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {message}
            </section>
          )}

          <section className="mb-2 shrink-0 rounded-2xl border border-white/10 bg-[#070b10] p-2">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-3.5 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order tag..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1017] px-4 pl-11 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </section>

          <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#070b10] p-2 shadow-2xl shadow-black/40">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-3 animate-spin" size={34} />
                  <p className="text-sm font-black uppercase tracking-wide">
                    Loading parked orders...
                  </p>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center">
                <div>
                  <ShoppingBag
                    size={42}
                    className="mx-auto mb-4 text-slate-700"
                  />
                  <p className="text-lg font-black uppercase tracking-wide text-slate-300">
                    No Parked Orders
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Held orders will appear here after cashier parks or sends an
                    open order to a production station.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredOrders.map((order) => {
                  const isDelayed = order.minutesAgo >= 30;
                  const isReady =
                    order.displayProductionStatus.toUpperCase().includes("READY") ||
                    order.displayProductionStatus
                      .toUpperCase()
                      .includes("COMPLETED");
                  const isSent = order.sentItemCount > 0;

                  return (
                    <article
                      key={order.id}
                      className={[
                        "overflow-hidden rounded-2xl border bg-[#0b1017] shadow-xl shadow-black/30",
                        isDelayed
                          ? "border-red-400/30"
                          : isReady
                            ? "border-emerald-400/25"
                            : isSent
                              ? "border-sky-400/25"
                              : "border-white/10",
                      ].join(" ")}
                    >
                      <div className="border-b border-white/10 bg-black/20 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xl font-black uppercase tracking-tight">
                              {order.tag}
                            </p>

                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                                <Clock3 size={10} />
                                {order.createdAtLabel}
                              </span>

                              <span
                                className={`rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase ring-1 ring-white/10 ${getAgeClass(
                                  order.minutesAgo,
                                )}`}
                              >
                                {order.minutesAgo}m
                              </span>
                            </div>
                          </div>

                          {isDelayed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase text-red-300 ring-1 ring-red-400/25">
                              <AlertTriangle size={10} />
                              Delay
                            </span>
                          ) : isSent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-[9px] font-black uppercase text-sky-300 ring-1 ring-sky-400/25">
                              <Send size={10} />
                              Sent
                            </span>
                          ) : isReady ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-300 ring-1 ring-emerald-400/25">
                              <CheckCircle2 size={10} />
                              Ready
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                              Total
                            </p>
                            <p className="mt-0.5 truncate text-xl font-black text-amber-300">
                              {peso(order.total)}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-right">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                              Items
                            </p>
                            <p className="mt-0.5 text-xl font-black text-white">
                              {order.itemCount}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                            {order.paymentStatus}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${getStatusClass(
                              order.displayProductionStatus,
                            )}`}
                          >
                            {order.displayProductionStatus}
                          </span>

                          {order.sentItemCount > 0 &&
                            order.sentItemCount < order.itemCount && (
                              <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-sky-300">
                                {order.sentItemCount}/{order.itemCount} sent
                              </span>
                            )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openOrder(order)}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-black uppercase text-black transition hover:bg-amber-100 active:scale-[0.98]"
                          >
                            Recall
                            <ArrowRight size={13} />
                          </button>

                          <button
                            onClick={() => payOrder(order)}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-400 text-xs font-black uppercase text-black transition hover:bg-amber-300 active:scale-[0.98]"
                          >
                            Pay
                            <Banknote size={13} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </PageGuard>
  );
}
