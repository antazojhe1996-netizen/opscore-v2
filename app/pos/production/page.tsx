"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  Loader2,
  RefreshCw,
  Utensils,
} from "lucide-react";

type ProductionStation = {
  id: string;
  company_id: string | null;
  name: string;
  code: string;
  printer_name: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type ProductionStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED";

type QueueOrder = {
  id: string;
  table_no: string | null;
  order_type: string | null;
  total_amount: number | null;
  production_status: string | null;
  status: string | null;
  created_at: string | null;
  cashier_id: string | null;
};

type QueueItem = {
  id: string;
  company_id: string | null;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  qty: number;
  price: number | null;
  total: number | null;
  production_area: string | null;
  production_status: ProductionStatus | string | null;
  production_station_id: string | null;
  created_at: string | null;
  order?: QueueOrder | null;
};

const STATUS_FLOW: ProductionStatus[] = [
  "PENDING",
  "PREPARING",
  "READY",
  "COMPLETED",
];

const statusLabel: Record<ProductionStatus, string> = {
  PENDING: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
};

const normalizeCode = (value: string) =>
  value.trim().toUpperCase().replaceAll(" ", "_");

const formatTime = (value: string | null) => {
  if (!value) return "--:--";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getItemStationKey = (item: QueueItem) => {
  if (item.production_station_id) return item.production_station_id;
  if (item.production_area) return normalizeCode(item.production_area);
  return "UNASSIGNED";
};

const getStationKey = (station: ProductionStation) =>
  station.id || normalizeCode(station.code || station.name);

const getStatusClass = (status: ProductionStatus) => {
  if (status === "PENDING") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }

  if (status === "PREPARING") {
    return "border-sky-400/30 bg-sky-500/10 text-sky-200";
  }

  if (status === "READY") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  return "border-white/10 bg-white/5 text-slate-300";
};

const getNextStatus = (status: string | null): ProductionStatus | null => {
  if (status === "PENDING") return "PREPARING";
  if (status === "PREPARING") return "READY";
  if (status === "READY") return "COMPLETED";
  return null;
};

const getNextButtonLabel = (status: string | null) => {
  if (status === "PENDING") return "Start";
  if (status === "PREPARING") return "Ready";
  if (status === "READY") return "Complete";
  return "Done";
};

export default function POSProductionQueuePage() {
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [message, setMessage] = useState("");

  const [stations, setStations] = useState<ProductionStation[]>([]);
  const [items, setItems] = useState<QueueItem[]>([]);

  const [selectedStationKey, setSelectedStationKey] = useState("ALL");
  const [selectedStatus, setSelectedStatus] =
    useState<ProductionStatus>("PENDING");

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  useEffect(() => {
    loadProductionQueue();

    const channel = supabase
      .channel("pos-production-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_order_items",
        },
        () => {
          loadProductionQueue(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const applyCompanyFilter = (query: any) => {
    if (!companyId) return query.is("company_id", null);
    return query.or(`company_id.eq.${companyId},company_id.is.null`);
  };

  const loadProductionQueue = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setMessage("");

    const stationQuery = applyCompanyFilter(
      supabase
        .from("pos_production_stations")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    );

    const itemQuery = applyCompanyFilter(
      supabase
        .from("pos_order_items")
        .select(
          `
          id,
          company_id,
          order_id,
          menu_item_id,
          item_name,
          qty,
          price,
          total,
          production_area,
          production_status,
          production_station_id,
          created_at,
          order:pos_orders (
            id,
            table_no,
            order_type,
            total_amount,
            production_status,
            status,
            created_at,
            cashier_id
          )
        `,
        )
        .in("production_status", STATUS_FLOW)
        .order("created_at", { ascending: true }),
    );

    const [stationResult, itemResult] = await Promise.all([
      stationQuery,
      itemQuery,
    ]);

    if (stationResult.error || itemResult.error) {
      setMessage(stationResult.error?.message || itemResult.error?.message || "");
      setLoading(false);
      return;
    }

    setStations((stationResult.data || []) as ProductionStation[]);
    setItems((itemResult.data || []) as unknown as QueueItem[]);
    setLoading(false);
  };

  const stationTabs = useMemo(() => {
    return [
      {
        key: "ALL",
        name: "All Stations",
        printer_name: null,
      },
      ...stations.map((station) => ({
        key: getStationKey(station),
        name: station.name,
        printer_name: station.printer_name,
      })),
      {
        key: "UNASSIGNED",
        name: "Unassigned",
        printer_name: null,
      },
    ];
  }, [stations]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const itemStatus = (item.production_status || "PENDING") as ProductionStatus;

      const matchesStatus = itemStatus === selectedStatus;

      const itemStationKey = getItemStationKey(item);
      const stationByCode = stations.find(
        (station) =>
          normalizeCode(station.code) === normalizeCode(item.production_area || ""),
      );

      const matchedStationKey = stationByCode
        ? getStationKey(stationByCode)
        : itemStationKey;

      const matchesStation =
        selectedStationKey === "ALL" ||
        selectedStationKey === itemStationKey ||
        selectedStationKey === matchedStationKey;

      return matchesStatus && matchesStation;
    });
  }, [items, selectedStationKey, selectedStatus, stations]);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, QueueItem[]>();

    visibleItems.forEach((item) => {
      const key = item.order_id;
      const current = groups.get(key) || [];
      groups.set(key, [...current, item]);
    });

    return Array.from(groups.entries()).map(([orderId, orderItems]) => ({
      orderId,
      order: orderItems[0]?.order || null,
      items: orderItems,
    }));
  }, [visibleItems]);

  const statusCounts = useMemo(() => {
    return STATUS_FLOW.reduce(
      (acc, status) => {
        acc[status] = items.filter(
          (item) => item.production_status === status,
        ).length;

        return acc;
      },
      {} as Record<ProductionStatus, number>,
    );
  }, [items]);

  const updateOrderProductionStatus = async (orderId: string) => {
    const { data } = await supabase
      .from("pos_order_items")
      .select("production_status")
      .eq("order_id", orderId);

    const orderItems = (data || []) as { production_status: string | null }[];

    if (orderItems.length === 0) return;

    const statuses = orderItems.map((item) => item.production_status);

    let nextOrderStatus: ProductionStatus = "PENDING";

    if (statuses.every((status) => status === "COMPLETED")) {
      nextOrderStatus = "COMPLETED";
    } else if (statuses.every((status) => status === "READY" || status === "COMPLETED")) {
      nextOrderStatus = "READY";
    } else if (statuses.some((status) => status === "PREPARING")) {
      nextOrderStatus = "PREPARING";
    } else {
      nextOrderStatus = "PENDING";
    }

    await supabase
      .from("pos_orders")
      .update({ production_status: nextOrderStatus })
      .eq("id", orderId);
  };

  const moveItemStatus = async (item: QueueItem) => {
    const nextStatus = getNextStatus(item.production_status);

    if (!nextStatus) return;

    setActionLoadingId(item.id);
    setMessage("");

    const { error } = await supabase
      .from("pos_order_items")
      .update({ production_status: nextStatus })
      .eq("id", item.id);

    if (error) {
      setMessage(error.message);
      setActionLoadingId("");
      return;
    }

    await updateOrderProductionStatus(item.order_id);
    await loadProductionQueue(false);

    setActionLoadingId("");
  };

  const moveWholeOrder = async (orderId: string, orderItems: QueueItem[]) => {
    const nextStatus = getNextStatus(selectedStatus);

    if (!nextStatus) return;

    setActionLoadingId(orderId);
    setMessage("");

    const itemIds = orderItems.map((item) => item.id);

    const { error } = await supabase
      .from("pos_order_items")
      .update({ production_status: nextStatus })
      .in("id", itemIds);

    if (error) {
      setMessage(error.message);
      setActionLoadingId("");
      return;
    }

    await updateOrderProductionStatus(orderId);
    await loadProductionQueue(false);

    setActionLoadingId("");
  };

  return (
    <PageGuard moduleKey="pos_terminal">
      <div className="flex min-h-screen bg-[#05080d] text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 p-5">
          <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/pos/terminal"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#101620] text-slate-300 transition hover:bg-white/5"
                >
                  <ArrowLeft size={18} />
                </Link>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                    OPSCORE POS
                  </p>
                  <h1 className="text-3xl font-black tracking-tight">
                    Production Queue
                  </h1>
                </div>
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Live kitchen, bar, coffee, and station queue from POS orders.
              </p>
            </div>

            <button
              onClick={() => loadProductionQueue()}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#101620] px-4 text-sm font-black text-white transition hover:bg-white/5"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </section>

          {message && (
            <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
              {message}
            </div>
          )}

          <section className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {STATUS_FLOW.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                  selectedStatus === status
                    ? getStatusClass(status)
                    : "border-white/10 bg-[#0b1017] text-slate-300 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.18em]">
                    {statusLabel[status]}
                  </p>
                  <span className="rounded-full bg-black/30 px-2 py-1 text-xs font-black ring-1 ring-white/10">
                    {statusCounts[status] || 0}
                  </span>
                </div>
              </button>
            ))}
          </section>

          <section className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {stationTabs.map((station) => (
              <button
                key={station.key}
                onClick={() => setSelectedStationKey(station.key)}
                className={`min-w-[150px] shrink-0 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                  selectedStationKey === station.key
                    ? "border-amber-300/60 bg-amber-400 text-black shadow-lg shadow-amber-950/20"
                    : "border-white/10 bg-[#0b1017] text-white hover:bg-white/5"
                }`}
              >
                <p className="truncate text-sm font-black uppercase">
                  {station.name}
                </p>
                <p
                  className={`mt-1 truncate text-[10px] font-bold uppercase tracking-wide ${
                    selectedStationKey === station.key
                      ? "text-black/60"
                      : "text-slate-500"
                  }`}
                >
                  {station.printer_name || "No printer assigned"}
                </p>
              </button>
            ))}
          </section>

          <section className="min-h-[500px] rounded-3xl border border-white/10 bg-[#070b10] p-4 shadow-2xl shadow-black/40">
            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center text-slate-500">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-3 animate-spin" size={34} />
                  <p className="text-sm font-black uppercase tracking-wide">
                    Loading queue...
                  </p>
                </div>
              </div>
            ) : groupedOrders.length === 0 ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/10 text-center">
                <div>
                  <ChefHat size={44} className="mx-auto mb-4 text-slate-700" />
                  <p className="text-lg font-black uppercase tracking-wide text-slate-300">
                    No {statusLabel[selectedStatus]} Items
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Queue will update automatically after POS order submit.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {groupedOrders.map((group) => (
                  <div
                    key={group.orderId}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1017] shadow-xl shadow-black/30"
                  >
                    <div className="border-b border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xl font-black text-white">
                            Order {group.orderId.slice(0, 8)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                              {group.order?.order_type || "Order"}
                            </span>

                            {group.order?.table_no && (
                              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                                {group.order.table_no}
                              </span>
                            )}

                            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                              {formatTime(group.order?.created_at || group.items[0]?.created_at)}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black uppercase ${getStatusClass(
                            selectedStatus,
                          )}`}
                        >
                          {statusLabel[selectedStatus]}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-white/10">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-white">
                              {item.item_name}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="rounded-lg bg-amber-400 px-2 py-1 text-xs font-black text-black">
                                x{item.qty}
                              </span>
                              <span className="truncate text-xs font-bold uppercase text-slate-500">
                                {item.production_area || "No station"}
                              </span>
                            </div>
                          </div>

                          {selectedStatus !== "COMPLETED" && (
                            <button
                              onClick={() => moveItemStatus(item)}
                              disabled={actionLoadingId === item.id}
                              className="flex h-11 min-w-[96px] items-center justify-center gap-2 rounded-xl bg-white text-xs font-black uppercase text-black transition hover:bg-amber-300 disabled:opacity-50"
                            >
                              {actionLoadingId === item.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : selectedStatus === "PENDING" ? (
                                <Flame size={15} />
                              ) : selectedStatus === "PREPARING" ? (
                                <Clock3 size={15} />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                              {getNextButtonLabel(item.production_status)}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {selectedStatus !== "COMPLETED" && group.items.length > 1 && (
                      <div className="border-t border-white/10 p-3">
                        <button
                          onClick={() => moveWholeOrder(group.orderId, group.items)}
                          disabled={actionLoadingId === group.orderId}
                          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#f5c400] text-sm font-black uppercase text-black transition hover:bg-[#ffd21f] disabled:opacity-50"
                        >
                          {actionLoadingId === group.orderId ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Utensils size={16} />
                          )}
                          Move Whole Order to {statusLabel[getNextStatus(selectedStatus) || selectedStatus]}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </PageGuard>
  );
}
