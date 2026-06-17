"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
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

const ACTIVE_STATUSES: ProductionStatus[] = ["PENDING", "PREPARING", "READY"];
const ALL_STATUSES: ProductionStatus[] = [
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

const statusSubtext: Record<ProductionStatus, string> = {
  PENDING: "Start cooking",
  PREPARING: "Mark ready",
  READY: "Complete handoff",
  COMPLETED: "Done",
};

const normalizeCode = (value: string) =>
  value.trim().toUpperCase().replaceAll(" ", "_");

const formatTime = (value: string | null) => {
  if (!value) return "--:--";

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getMinutesAgo = (value: string | null) => {
  if (!value) return 0;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
};

const getItemStationKey = (item: QueueItem) => {
  if (item.production_station_id) return item.production_station_id;
  if (item.production_area) return normalizeCode(item.production_area);
  return "UNASSIGNED";
};

const getStationKey = (station: ProductionStation) =>
  station.id || normalizeCode(station.code || station.name);

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

const getLaneClass = (status: ProductionStatus) => {
  if (status === "PENDING") return "border-amber-400/25 bg-amber-500/10";
  if (status === "PREPARING") return "border-sky-400/25 bg-sky-500/10";
  if (status === "READY") return "border-emerald-400/25 bg-emerald-500/10";
  return "border-white/10 bg-white/[0.03]";
};

const getLaneTextClass = (status: ProductionStatus) => {
  if (status === "PENDING") return "text-amber-300";
  if (status === "PREPARING") return "text-sky-300";
  if (status === "READY") return "text-emerald-300";
  return "text-slate-300";
};

const getActionClass = (status: string | null) => {
  if (status === "PENDING") return "bg-amber-400 text-black hover:bg-amber-300";
  if (status === "PREPARING") return "bg-sky-400 text-black hover:bg-sky-300";
  if (status === "READY") return "bg-emerald-400 text-black hover:bg-emerald-300";
  return "bg-white text-black";
};

export default function POSProductionQueuePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [message, setMessage] = useState("");

  const [stations, setStations] = useState<ProductionStation[]>([]);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedStationKey, setSelectedStationKey] = useState("ALL");

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
        .in("production_status", ALL_STATUSES)
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
        name: "All",
        printer_name: "All active stations",
      },
      ...stations.map((station) => ({
        key: getStationKey(station),
        name: station.name,
        printer_name: station.printer_name || "No printer",
      })),
      {
        key: "UNASSIGNED",
        name: "Unassigned",
        printer_name: "Missing station",
      },
    ];
  }, [stations]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemStationKey = getItemStationKey(item);

      const stationByCode = stations.find(
        (station) =>
          normalizeCode(station.code) === normalizeCode(item.production_area || ""),
      );

      const matchedStationKey = stationByCode
        ? getStationKey(stationByCode)
        : itemStationKey;

      return (
        selectedStationKey === "ALL" ||
        selectedStationKey === itemStationKey ||
        selectedStationKey === matchedStationKey
      );
    });
  }, [items, selectedStationKey, stations]);

  const groupedByStatus = useMemo(() => {
    const result: Record<
      ProductionStatus,
      { orderId: string; order: QueueOrder | null; items: QueueItem[] }[]
    > = {
      PENDING: [],
      PREPARING: [],
      READY: [],
      COMPLETED: [],
    };

    ACTIVE_STATUSES.forEach((status) => {
      const statusItems = filteredItems.filter(
        (item) => item.production_status === status,
      );

      const groups = new Map<string, QueueItem[]>();

      statusItems.forEach((item) => {
        const current = groups.get(item.order_id) || [];
        groups.set(item.order_id, [...current, item]);
      });

      result[status] = Array.from(groups.entries()).map(
        ([orderId, orderItems]) => ({
          orderId,
          order: orderItems[0]?.order || null,
          items: orderItems,
        }),
      );
    });

    return result;
  }, [filteredItems]);

  const statusCounts = useMemo(() => {
    return ALL_STATUSES.reduce(
      (acc, status) => {
        acc[status] = filteredItems.filter(
          (item) => item.production_status === status,
        ).length;

        return acc;
      },
      {} as Record<ProductionStatus, number>,
    );
  }, [filteredItems]);

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
    } else if (
      statuses.every((status) => status === "READY" || status === "COMPLETED")
    ) {
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

  const moveWholeOrder = async (
    orderId: string,
    orderItems: QueueItem[],
    status: ProductionStatus,
  ) => {
    const nextStatus = getNextStatus(status);

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
    <PageGuard moduleKey="pos_production">
      <div className="h-screen overflow-hidden bg-[#05080d] text-white">
        <main className="flex h-full flex-col p-2">
          <section className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#070b10] px-4 py-3 shadow-xl shadow-black/40">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <ChefHat size={22} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                  OPSCORE Kitchen Display
                </p>
                <h1 className="truncate text-2xl font-black leading-tight">
                  Production Queue
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                New {statusCounts.PENDING || 0}
              </span>
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-200">
                Preparing {statusCounts.PREPARING || 0}
              </span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
                Ready {statusCounts.READY || 0}
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
                onClick={() => loadProductionQueue()}
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

          <section className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-1">
            {stationTabs.map((station) => (
              <button
                key={station.key}
                onClick={() => setSelectedStationKey(station.key)}
                className={`h-14 min-w-[150px] shrink-0 rounded-2xl border px-4 text-left transition active:scale-[0.98] ${
                  selectedStationKey === station.key
                    ? "border-amber-300 bg-amber-400 text-black"
                    : "border-white/10 bg-[#0b1017] text-white hover:bg-white/5"
                }`}
              >
                <p className="truncate text-sm font-black uppercase">
                  {station.name}
                </p>
                <p
                  className={`mt-0.5 truncate text-[10px] font-bold uppercase ${
                    selectedStationKey === station.key
                      ? "text-black/60"
                      : "text-slate-500"
                  }`}
                >
                  {station.printer_name}
                </p>
              </button>
            ))}
          </section>

          <section className="grid min-h-0 flex-1 grid-cols-3 gap-2">
            {ACTIVE_STATUSES.map((status) => (
              <section
                key={status}
                className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border ${getLaneClass(
                  status,
                )}`}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <p
                      className={`text-[11px] font-black uppercase tracking-[0.18em] ${getLaneTextClass(
                        status,
                      )}`}
                    >
                      {statusLabel[status]}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">
                      {statusSubtext[status]}
                    </p>
                  </div>

                  <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-black/30 px-3 text-lg font-black ring-1 ring-white/10">
                    {statusCounts[status] || 0}
                  </span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                  {loading ? (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <Loader2 className="animate-spin" size={28} />
                    </div>
                  ) : groupedByStatus[status].length === 0 ? (
                    <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-center">
                      <div>
                        <ChefHat size={30} className="mx-auto mb-2 text-slate-700" />
                        <p className="text-sm font-black uppercase text-slate-400">
                          No {statusLabel[status]} Orders
                        </p>
                      </div>
                    </div>
                  ) : (
                    groupedByStatus[status].map((group) => {
                      const createdAt =
                        group.order?.created_at || group.items[0]?.created_at;
                      const mins = getMinutesAgo(createdAt || null);
                      const isDelayed =
                        status === "PENDING"
                          ? mins >= 15
                          : status === "PREPARING"
                            ? mins >= 25
                            : mins >= 10;

                      return (
                        <article
                          key={group.orderId}
                          className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1017] shadow-xl shadow-black/30"
                        >
                          <div className="border-b border-white/10 bg-black/20 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-lg font-black uppercase tracking-tight">
                                  {group.order?.table_no ||
                                    group.order?.order_type ||
                                    `Order ${group.orderId.slice(0, 6)}`}
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                                    {formatTime(createdAt || null)}
                                  </span>

                                  <span
                                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1 ${
                                      isDelayed
                                        ? "bg-red-500/10 text-red-300 ring-red-400/25"
                                        : "bg-white/5 text-slate-400 ring-white/10"
                                    }`}
                                  >
                                    {mins}m
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1 ${
                                  isDelayed
                                    ? "bg-red-500/10 text-red-300 ring-red-400/25"
                                    : "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25"
                                }`}
                              >
                                {isDelayed ? "Delay" : "OK"}
                              </span>
                            </div>
                          </div>

                          <div className="divide-y divide-white/10">
                            {group.items.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-2 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-[15px] font-black text-white">
                                    {item.item_name}
                                  </p>

                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span className="rounded-lg bg-amber-400 px-2 py-0.5 text-xs font-black text-black">
                                      x{item.qty}
                                    </span>

                                    <span className="truncate text-[10px] font-bold uppercase text-slate-500">
                                      {item.production_area || "No station"}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => moveItemStatus(item)}
                                  disabled={actionLoadingId === item.id}
                                  className={`flex h-10 items-center justify-center gap-1 rounded-xl text-[11px] font-black uppercase transition active:scale-[0.98] disabled:opacity-50 ${getActionClass(
                                    item.production_status,
                                  )}`}
                                >
                                  {actionLoadingId === item.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : status === "PENDING" ? (
                                    <Flame size={14} />
                                  ) : status === "PREPARING" ? (
                                    <Clock3 size={14} />
                                  ) : (
                                    <CheckCircle2 size={14} />
                                  )}
                                  {getNextButtonLabel(item.production_status)}
                                </button>
                              </div>
                            ))}
                          </div>

                          {group.items.length > 1 && (
                            <div className="border-t border-white/10 p-2">
                              <button
                                onClick={() =>
                                  moveWholeOrder(group.orderId, group.items, status)
                                }
                                disabled={actionLoadingId === group.orderId}
                                className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase transition active:scale-[0.98] disabled:opacity-50 ${getActionClass(
                                  status,
                                )}`}
                              >
                                {actionLoadingId === group.orderId ? (
                                  <Loader2 size={15} className="animate-spin" />
                                ) : (
                                  <Utensils size={15} />
                                )}
                                Move Whole Order
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            ))}
          </section>
        </main>
      </div>
    </PageGuard>
  );
}