"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageGuard from "@/components/PageGuard";import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  Loader2,
  RefreshCw,
  Send,
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

type ProductionStatus =
  | "NEW"
  | "SENT"
  | "PENDING"
  | "PRINTED"
  | "IN_PROGRESS"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "VOIDED"
  | "CANCELLED";

type LaneKey = "NEW" | "PREPARING" | "READY";

type QueueOrder = {
  id: string;
  company_id: string | null;
  order_tag: string | null;
  table_no: string | null;
  order_type: string | null;
  total_amount: number | null;
  production_status: string | null;
  status: string | null;
  created_at: string | null;
  cashier_id: string | null;
};

type QueueModifier = {
  id: string;
  company_id: string | null;
  order_id: string;
  order_item_id: string;
  menu_item_id: string | null;
  setup_pack_id: string | null;
  setup_pack_name: string | null;
  modifier_group_id: string | null;
  modifier_group_name: string;
  modifier_option_id: string | null;
  modifier_option_name: string;
  price_adjustment: number | null;
  sort_order: number | null;
  created_at: string | null;
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
  modifiers?: QueueModifier[];
  order?: QueueOrder | null;
};

type QueueGroup = {
  orderId: string;
  order: QueueOrder | null;
  items: QueueItem[];
  allOrderItems: QueueItem[];
  lane: LaneKey;
};

type StationTab = {
  key: string;
  name: string;
  printerName: string;
  count: number;
};

const ACTIVE_STATUSES: ProductionStatus[] = [
  "NEW",
  "SENT",
  "PENDING",
  "PRINTED",
  "IN_PROGRESS",
  "PREPARING",
  "READY",
];

const laneOrder: LaneKey[] = ["NEW", "PREPARING", "READY"];

const laneLabel: Record<LaneKey, string> = {
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
};

const laneSubtext: Record<LaneKey, string> = {
  NEW: "Start production",
  PREPARING: "Mark ready",
  READY: "Complete handoff",
};

const normalizeCode = (value: string) =>
  value.trim().toUpperCase().replaceAll(" ", "_");

const normalizeStatus = (value: string | null | undefined): ProductionStatus => {
  const status = String(value || "SENT").trim().toUpperCase();

  if (status === "NEW") return "NEW";
  if (status === "PENDING") return "PENDING";
  if (status === "SENT") return "SENT";
  if (status === "PRINTED") return "PRINTED";
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  if (status === "PREPARING") return "PREPARING";
  if (status === "READY") return "READY";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "VOIDED") return "VOIDED";
  if (status === "CANCELLED") return "CANCELLED";

  return "SENT";
};

const getLaneFromStatus = (value: string | null | undefined): LaneKey | null => {
  const status = normalizeStatus(value);

  if (
    status === "NEW" ||
    status === "SENT" ||
    status === "PENDING" ||
    status === "PRINTED"
  ) {
    return "NEW";
  }

  if (status === "IN_PROGRESS" || status === "PREPARING") {
    return "PREPARING";
  }

  if (status === "READY") return "READY";

  return null;
};

const getNextStatus = (status: string | null | undefined): ProductionStatus | null => {
  const normalized = normalizeStatus(status);

  if (
    normalized === "NEW" ||
    normalized === "SENT" ||
    normalized === "PENDING" ||
    normalized === "PRINTED"
  ) {
    return "PREPARING";
  }

  if (normalized === "IN_PROGRESS" || normalized === "PREPARING") return "READY";
  if (normalized === "READY") return "COMPLETED";

  return null;
};

const getActionLabel = (lane: LaneKey) => {
  if (lane === "NEW") return "Start Order";
  if (lane === "PREPARING") return "Mark Ready";
  return "Complete Order";
};

const getItemActionLabel = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);

  if (
    normalized === "NEW" ||
    normalized === "SENT" ||
    normalized === "PENDING" ||
    normalized === "PRINTED"
  ) {
    return "Start";
  }

  if (normalized === "IN_PROGRESS" || normalized === "PREPARING") return "Ready";
  if (normalized === "READY") return "Complete";

  return "Done";
};

const formatTime = (value: string | null) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString([], {
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

const getStationKey = (station: ProductionStation) =>
  station.id || normalizeCode(station.code || station.name);

const getItemStationKey = (item: QueueItem) => {
  if (item.production_station_id) return item.production_station_id;
  if (item.production_area) return normalizeCode(item.production_area);
  return "UNASSIGNED";
};

const getDisplayStationName = (
  item: QueueItem,
  stations: ProductionStation[],
) => {
  const stationById = stations.find(
    (station) => String(station.id) === String(item.production_station_id || ""),
  );

  if (stationById) return stationById.name.toUpperCase();

  const stationByCode = stations.find(
    (station) => normalizeCode(station.code) === normalizeCode(item.production_area || ""),
  );

  if (stationByCode) return stationByCode.name.toUpperCase();

  return normalizeCode(item.production_area || "UNASSIGNED");
};

const getOrderTitle = (group: QueueGroup) => {
  const tag = group.order?.order_tag?.trim();
  if (tag) return tag.toUpperCase();

  const table = group.order?.table_no?.trim();
  if (table) return table.toUpperCase();

  const orderType = group.order?.order_type?.trim();
  if (orderType) return orderType.toUpperCase();

  return `ORDER ${group.orderId.slice(0, 6).toUpperCase()}`;
};

const getOrderSubLabel = (group: QueueGroup) => {
  const table = group.order?.table_no?.trim();
  const orderType = group.order?.order_type?.trim();

  if (table && orderType) return `${table} • ${orderType}`.toUpperCase();
  if (table) return table.toUpperCase();
  if (orderType) return orderType.toUpperCase();
  return "POS ORDER";
};

const getLaneClass = (lane: LaneKey) => {
  if (lane === "NEW") return "border-amber-400/25 bg-amber-500/10";
  if (lane === "PREPARING") return "border-sky-400/25 bg-sky-500/10";
  return "border-emerald-400/25 bg-emerald-500/10";
};

const getLaneTextClass = (lane: LaneKey) => {
  if (lane === "NEW") return "text-amber-300";
  if (lane === "PREPARING") return "text-sky-300";
  return "text-emerald-300";
};

const getActionClass = (lane: LaneKey) => {
  if (lane === "NEW") return "bg-amber-400 text-black hover:bg-amber-300";
  if (lane === "PREPARING") return "bg-sky-400 text-black hover:bg-sky-300";
  return "bg-emerald-400 text-black hover:bg-emerald-300";
};

const getDelayLimit = (lane: LaneKey) => {
  if (lane === "NEW") return 15;
  if (lane === "PREPARING") return 25;
  return 10;
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
      .channel("pos-production-queue-v2")
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_orders",
        },
        () => {
          loadProductionQueue(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_order_item_modifiers",
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

    const itemQuery = supabase
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
          company_id,
          order_tag,
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
      .order("created_at", { ascending: true })
      .limit(1000);

    const [stationResult, itemResult] = await Promise.all([
      stationQuery,
      itemQuery,
    ]);

    if (stationResult.error || itemResult.error) {
      setMessage(stationResult.error?.message || itemResult.error?.message || "");
      setStations([]);
      setItems([]);
      setLoading(false);
      return;
    }

    const loadedStations = (stationResult.data || []) as ProductionStation[];
    const rawItems = (itemResult.data || []) as unknown as QueueItem[];

    const itemIds = rawItems.map((item) => item.id).filter(Boolean);
    let modifiersByItem = new Map<string, QueueModifier[]>();

    if (itemIds.length > 0) {
      const { data: modifierData, error: modifierError } = await supabase
        .from("pos_order_item_modifiers")
        .select("*")
        .in("order_item_id", itemIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (modifierError) {
        setMessage(modifierError.message);
      } else {
        (modifierData || []).forEach((modifier: any) => {
          const orderItemId = String(modifier.order_item_id || "");
          const current = modifiersByItem.get(orderItemId) || [];
          modifiersByItem.set(orderItemId, [...current, modifier as QueueModifier]);
        });
      }
    }

    const itemsWithModifiers = rawItems.map((item) => ({
      ...item,
      modifiers: modifiersByItem.get(item.id) || [],
    }));

    const activeItems = itemsWithModifiers.filter((item) => {
      const itemCompanyId = item.company_id || null;
      const orderCompanyId = item.order?.company_id || null;
      const itemBelongsToCompany = companyId
        ? itemCompanyId === companyId ||
          orderCompanyId === companyId ||
          (!itemCompanyId && !orderCompanyId)
        : !itemCompanyId && !orderCompanyId;

      const orderStatus = String(item.order?.status || "").trim().toUpperCase();
      const itemStatus = normalizeStatus(item.production_status);
      const lane = getLaneFromStatus(itemStatus);

      return (
        itemBelongsToCompany &&
        Boolean(lane) &&
        ACTIVE_STATUSES.includes(itemStatus) &&
        !["VOIDED", "CANCELLED", "REFUNDED"].includes(orderStatus)
      );
    });

    setStations(loadedStations);
    setItems(activeItems);
    setLoading(false);
  };

  const stationTabs = useMemo<StationTab[]>(() => {
    const getCountForKey = (key: string) => {
      if (key === "ALL") return items.length;
      return items.filter((item) => {
        const itemStationKey = getItemStationKey(item);
        const stationByCode = stations.find(
          (station) =>
            normalizeCode(station.code) ===
            normalizeCode(item.production_area || ""),
        );
        const matchedStationKey = stationByCode
          ? getStationKey(stationByCode)
          : itemStationKey;

        return key === itemStationKey || key === matchedStationKey;
      }).length;
    };

    return [
      {
        key: "ALL",
        name: "All",
        printerName: "All active stations",
        count: getCountForKey("ALL"),
      },
      ...stations.map((station) => {
        const key = getStationKey(station);
        return {
          key,
          name: station.name,
          printerName: station.printer_name || "No printer",
          count: getCountForKey(key),
        };
      }),
      {
        key: "UNASSIGNED",
        name: "Unassigned",
        printerName: "Missing station",
        count: getCountForKey("UNASSIGNED"),
      },
    ];
  }, [items, stations]);

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

  const allItemsByOrder = useMemo(() => {
    const groups = new Map<string, QueueItem[]>();

    items.forEach((item) => {
      const current = groups.get(item.order_id) || [];
      groups.set(item.order_id, [...current, item]);
    });

    return groups;
  }, [items]);

  const groupedByLane = useMemo(() => {
    const result: Record<LaneKey, QueueGroup[]> = {
      NEW: [],
      PREPARING: [],
      READY: [],
    };

    laneOrder.forEach((lane) => {
      const laneItems = filteredItems.filter(
        (item) => getLaneFromStatus(item.production_status) === lane,
      );

      const groups = new Map<string, QueueItem[]>();

      laneItems.forEach((item) => {
        const current = groups.get(item.order_id) || [];
        groups.set(item.order_id, [...current, item]);
      });

      result[lane] = Array.from(groups.entries()).map(([orderId, orderItems]) => ({
        orderId,
        order: orderItems[0]?.order || null,
        items: orderItems,
        allOrderItems: allItemsByOrder.get(orderId) || orderItems,
        lane,
      }));
    });

    return result;
  }, [filteredItems, allItemsByOrder]);

  const laneCounts = useMemo(() => {
    return laneOrder.reduce(
      (acc, lane) => {
        acc[lane] = filteredItems.filter(
          (item) => getLaneFromStatus(item.production_status) === lane,
        ).length;
        return acc;
      },
      {} as Record<LaneKey, number>,
    );
  }, [filteredItems]);

  const updateOrderProductionStatus = async (orderId: string) => {
    const { data } = await supabase
      .from("pos_order_items")
      .select("production_status")
      .eq("order_id", orderId);

    const orderItems = (data || []) as { production_status: string | null }[];
    if (orderItems.length === 0) return;

    const statuses = orderItems.map((item) => normalizeStatus(item.production_status));

    let nextOrderStatus: ProductionStatus = "SENT";

    if (statuses.every((status) => status === "COMPLETED")) {
      nextOrderStatus = "COMPLETED";
    } else if (
      statuses.every((status) => status === "READY" || status === "COMPLETED")
    ) {
      nextOrderStatus = "READY";
    } else if (
      statuses.some(
        (status) => status === "PREPARING" || status === "IN_PROGRESS",
      )
    ) {
      nextOrderStatus = "PREPARING";
    } else {
      nextOrderStatus = "SENT";
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

  const moveWholeOrder = async (group: QueueGroup) => {
    const itemIds = group.items.map((item) => item.id);
    if (itemIds.length === 0) return;

    const nextStatus = getNextStatus(group.items[0]?.production_status);
    if (!nextStatus) return;

    setActionLoadingId(group.orderId);
    setMessage("");

    const { error } = await supabase
      .from("pos_order_items")
      .update({ production_status: nextStatus })
      .in("id", itemIds);

    if (error) {
      setMessage(error.message);
      setActionLoadingId("");
      return;
    }

    await updateOrderProductionStatus(group.orderId);
    await loadProductionQueue(false);
    setActionLoadingId("");
  };

  const getAdditionalInfo = (group: QueueGroup) => {
    if (group.lane !== "NEW") return null;

    const previousItems = group.allOrderItems.filter(
      (item) => getLaneFromStatus(item.production_status) !== "NEW",
    );

    if (previousItems.length === 0) return null;

    const previousQty = previousItems.reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0,
    );

    return `ADDITIONAL ITEMS • ${previousQty} PREVIOUSLY SENT`;
  };

  const groupedModifiers = (item: QueueItem) => {
    const groups = new Map<string, QueueModifier[]>();

    (item.modifiers || []).forEach((modifier) => {
      const groupName = modifier.modifier_group_name || "Option";
      const current = groups.get(groupName) || [];
      groups.set(groupName, [...current, modifier]);
    });

    return Array.from(groups.entries());
  };

  return (
    <PageGuard moduleKey="pos_terminal">
      <div className="h-screen overflow-hidden bg-[#05080d] text-white">
        <main className="flex h-full flex-col p-2">
          <section className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#070b10] px-4 py-3 shadow-xl shadow-black/40">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <ChefHat size={22} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                  OPSCORE Production Monitor V2
                </p>
                <h1 className="truncate text-2xl font-black leading-tight">
                  Production Queue
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                New {laneCounts.NEW || 0}
              </span>
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-200">
                Preparing {laneCounts.PREPARING || 0}
              </span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
                Ready {laneCounts.READY || 0}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => window.location.href = "/pos/parked-orders"}
                className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                <ArrowLeft size={14} />
                Recall
              </button>

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
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-black uppercase">
                    {station.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      selectedStationKey === station.key
                        ? "bg-black/15 text-black"
                        : "bg-white/5 text-slate-300 ring-1 ring-white/10"
                    }`}
                  >
                    {station.count}
                  </span>
                </div>
                <p
                  className={`mt-0.5 truncate text-[10px] font-bold uppercase ${
                    selectedStationKey === station.key
                      ? "text-black/60"
                      : "text-slate-500"
                  }`}
                >
                  {station.printerName}
                </p>
              </button>
            ))}
          </section>

          <section className="grid min-h-0 flex-1 grid-cols-3 gap-2">
            {laneOrder.map((lane) => (
              <section
                key={lane}
                className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border ${getLaneClass(
                  lane,
                )}`}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <p
                      className={`text-[11px] font-black uppercase tracking-[0.18em] ${getLaneTextClass(
                        lane,
                      )}`}
                    >
                      {laneLabel[lane]}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">
                      {laneSubtext[lane]}
                    </p>
                  </div>

                  <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-black/30 px-3 text-lg font-black ring-1 ring-white/10">
                    {laneCounts[lane] || 0}
                  </span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                  {loading ? (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <Loader2 className="animate-spin" size={28} />
                    </div>
                  ) : groupedByLane[lane].length === 0 ? (
                    <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-center">
                      <div>
                        <ChefHat size={30} className="mx-auto mb-2 text-slate-700" />
                        <p className="text-sm font-black uppercase text-slate-400">
                          No {laneLabel[lane]} Orders
                        </p>
                      </div>
                    </div>
                  ) : (
                    groupedByLane[lane].map((group) => {
                      const createdAt =
                        group.order?.created_at || group.items[0]?.created_at;
                      const mins = getMinutesAgo(createdAt || null);
                      const isDelayed = mins >= getDelayLimit(lane);
                      const additionalInfo = getAdditionalInfo(group);
                      const totalQty = group.items.reduce(
                        (sum, item) => sum + Number(item.qty || 0),
                        0,
                      );

                      return (
                        <article
                          key={`${lane}-${group.orderId}`}
                          className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1017] shadow-xl shadow-black/30"
                        >
                          <div className="border-b border-white/10 bg-black/20 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-lg font-black uppercase tracking-tight">
                                    {getOrderTitle(group)}
                                  </p>
                                  {additionalInfo && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase text-black">
                                      <Send size={10} />
                                      Additional
                                    </span>
                                  )}
                                </div>

                                <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  {getOrderSubLabel(group)}
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                                    <Clock3 size={10} />
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

                                  <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                                    {totalQty} item(s)
                                  </span>
                                </div>
                              </div>

                              {isDelayed && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase text-red-300 ring-1 ring-red-400/25">
                                  <AlertTriangle size={11} />
                                  Delay
                                </span>
                              )}
                            </div>

                            {additionalInfo && (
                              <div className="mt-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-200">
                                {additionalInfo}
                              </div>
                            )}
                          </div>

                          <div className="divide-y divide-white/10">
                            {group.items.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-[minmax(0,1fr)_78px] items-center gap-2 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-[15px] font-black text-white">
                                    {item.item_name}
                                  </p>

                                  {groupedModifiers(item).length > 0 && (
                                    <div className="mt-1 space-y-0.5 rounded-xl border border-amber-400/15 bg-amber-400/5 px-2 py-1.5">
                                      {groupedModifiers(item).map(([groupName, modifiers]) => (
                                        <div
                                          key={`${item.id}-${groupName}`}
                                          className="grid grid-cols-[86px_minmax(0,1fr)] gap-1 text-[10px] leading-4"
                                        >
                                          <span className="truncate font-black uppercase text-amber-300">
                                            {groupName}
                                          </span>
                                          <span className="truncate font-black uppercase text-white">
                                            {modifiers
                                              .map((modifier) => modifier.modifier_option_name)
                                              .join(", ")}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span className="rounded-lg bg-amber-400 px-2 py-0.5 text-xs font-black text-black">
                                      x{item.qty}
                                    </span>

                                    <span className="truncate text-[10px] font-bold uppercase text-slate-500">
                                      {getDisplayStationName(item, stations)}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => moveItemStatus(item)}
                                  disabled={actionLoadingId === item.id}
                                  className={`flex h-9 items-center justify-center gap-1 rounded-xl text-[10px] font-black uppercase transition active:scale-[0.98] disabled:opacity-50 ${getActionClass(
                                    lane,
                                  )}`}
                                >
                                  {actionLoadingId === item.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : lane === "NEW" ? (
                                    <Flame size={13} />
                                  ) : lane === "PREPARING" ? (
                                    <Clock3 size={13} />
                                  ) : (
                                    <CheckCircle2 size={13} />
                                  )}
                                  {getItemActionLabel(item.production_status)}
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="border-t border-white/10 p-2">
                            <button
                              onClick={() => moveWholeOrder(group)}
                              disabled={actionLoadingId === group.orderId}
                              className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase transition active:scale-[0.98] disabled:opacity-50 ${getActionClass(
                                lane,
                              )}`}
                            >
                              {actionLoadingId === group.orderId ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Utensils size={15} />
                              )}
                              {getActionLabel(lane)}
                            </button>
                          </div>
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


