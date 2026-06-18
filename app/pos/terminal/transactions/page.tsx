"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";

type PosSession = {
  id: string;
  company_id: string | null;
  opened_by: string | null;
  opening_cash: number | null;
  status: string;
  opened_at: string | null;
};

type PosOrder = {
  id: string;
  company_id: string | null;
  session_id: string | null;
  cashier_id: string | null;
  table_no: string | null;
  order_tag: string | null;
  order_type: string | null;
  order_number: string | null;
  receipt_no: string | null;
  subtotal: number | null;
  discount_amount: number | null;
  service_charge: number | null;
  total_amount: number | null;
  payment_method: string | null;
  payment_method_name: string | null;
  payment_status: string | null;
  production_status: string | null;
  status: string | null;
  amount_paid: number | null;
  change_amount: number | null;
  payment_reference: string | null;
  created_at: string | null;
};

type PosOrderItem = {
  id: string;
  order_id: string;
  item_name: string;
  qty: number;
  price: number | null;
  total: number | null;
  production_area: string | null;
  production_status: string | null;
  created_at: string | null;
};

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type PosApprovalRequest = {
  id: string;
  request_type: string | null;
  reference_id: string | null;
  status: string | null;
  title: string | null;
  description: string | null;
  request_payload: any;
  created_at: string | null;
};

const peso = (value: number | null | undefined) =>
  `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusClass = (status: string | null) => {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "COMPLETED" || normalized === "PAID") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "PARKED" || normalized === "PENDING" || normalized === "UNPAID") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-300";
  }

  if (normalized.includes("VOID") || normalized.includes("CANCEL") || normalized.includes("REFUND")) {
    return "border-red-400/30 bg-red-500/10 text-red-300";
  }

  if (normalized === "PREPARING" || normalized === "SENT") {
    return "border-sky-400/25 bg-sky-500/10 text-sky-300";
  }

  if (normalized === "READY") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
  }

  return "border-white/10 bg-white/5 text-slate-300";
};

export default function POSCashierTransactionsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [cashierName, setCashierName] = useState("Cashier");

  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [items, setItems] = useState<PosOrderItem[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<PosApprovalRequest[]>([]);

  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null);
  const [voidOrder, setVoidOrder] = useState<PosOrder | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  useEffect(() => {
    loadCashierTransactions();

    const channel = supabase
      .channel("pos-cashier-transactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_orders",
        },
        () => {
          loadCashierTransactions(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCashierTransactions = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setMessage("");

let sessionQuery = supabase
  .from("pos_sessions")
  .select("*")
  .eq("status", "OPEN");

if (companyId) {
  sessionQuery = sessionQuery.eq("company_id", companyId);
}

const { data: sessionData, error: sessionError } = await sessionQuery
  .order("opened_at", { ascending: false })
  .limit(1)
  .maybeSingle();
  

    if (sessionError) {
      setMessage(sessionError.message);
      setActiveSession(null);
      setOrders([]);
      setItems([]);
      setApprovalRequests([]);
      setLoading(false);
      return;
    }

    if (!sessionData) {
      setMessage("No active POS session found. Start a POS session first.");
      setActiveSession(null);
      setOrders([]);
      setItems([]);
      setApprovalRequests([]);
      setLoading(false);
      return;
    }

    const session = sessionData as PosSession;
    setActiveSession(session);

    if (session.opened_by) {
      const { data: employeeData } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("id", session.opened_by)
        .maybeSingle();

      const employee = employeeData as Employee | null;
      const fullName = `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();
      setCashierName(fullName || "Cashier");
    }

    let orderQuery = supabase
      .from("pos_orders")
      .select(
        `
        id,
        company_id,
        session_id,
        cashier_id,
        table_no,
        order_tag,
        order_type,
        order_number,
        receipt_no,
        subtotal,
        discount_amount,
        service_charge,
        total_amount,
        payment_method,
        payment_method_name,
        payment_status,
        production_status,
        status,
        amount_paid,
        change_amount,
        payment_reference,
        created_at
      `,
      )
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(300);

    if (session.opened_by) {
      orderQuery = orderQuery.eq("cashier_id", session.opened_by);
    }

    const { data: orderData, error: orderError } = await orderQuery;

    if (orderError) {
      setMessage(orderError.message);
      setOrders([]);
      setItems([]);
      setApprovalRequests([]);
      setLoading(false);
      return;
    }

    const loadedOrders = (orderData || []) as PosOrder[];
    const orderIds = loadedOrders.map((order) => order.id);

    let loadedItems: PosOrderItem[] = [];
    let loadedApprovals: PosApprovalRequest[] = [];

    if (orderIds.length > 0) {
      const { data: itemData, error: itemError } = await supabase
        .from("pos_order_items")
        .select(
          "id, order_id, item_name, qty, price, total, production_area, production_status, created_at",
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (itemError) {
        setMessage(itemError.message);
      } else {
        loadedItems = (itemData || []) as PosOrderItem[];
      }

      const { data: approvalData } = await supabase
        .from("approval_requests")
        .select(
          "id, request_type, reference_id, status, title, description, request_payload, created_at",
        )
        .in("request_type", ["POS_VOID", "POS_REFUND"])
        .in("reference_id", orderIds)
        .order("created_at", { ascending: false });

      loadedApprovals = (approvalData || []) as PosApprovalRequest[];
    }

    setOrders(loadedOrders);
    setItems(loadedItems);
    setApprovalRequests(loadedApprovals);
    setLoading(false);
  };

  const getOrderReference = (order: PosOrder) =>
    order.order_tag || order.order_number || order.receipt_no || order.id.slice(0, 8);

  const getOrderItems = (orderId: string) =>
    items.filter((item) => item.order_id === orderId);

  const getOrderItemCount = (orderId: string) =>
    getOrderItems(orderId).reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const getApprovalForOrder = (orderId: string, type = "POS_VOID") =>
    approvalRequests.find(
      (request) =>
        request.reference_id === orderId &&
        request.request_type === type &&
        ["PENDING", "APPROVED"].includes(String(request.status || "").toUpperCase()),
    ) || null;

  const getOperationalStatus = (order: PosOrder) => {
    const voidRequest = getApprovalForOrder(order.id, "POS_VOID");

    if (voidRequest) {
      return String(voidRequest.status || "").toUpperCase() === "APPROVED"
        ? "VOID APPROVED"
        : "VOID PENDING";
    }

    return order.status || "-";
  };

  const canRequestVoid = (order: PosOrder) => {
    const status = String(order.status || "").toUpperCase();

    if (["VOIDED", "CANCELLED", "REFUNDED"].includes(status)) return false;
    if (getApprovalForOrder(order.id, "POS_VOID")) return false;

    return true;
  };

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return orders;

    return orders.filter((order) => {
      const ref = getOrderReference(order).toLowerCase();

      return (
        ref.includes(term) ||
        String(order.order_number || "").toLowerCase().includes(term) ||
        String(order.receipt_no || "").toLowerCase().includes(term) ||
        String(order.order_type || "").toLowerCase().includes(term) ||
        String(order.table_no || "").toLowerCase().includes(term) ||
        String(order.payment_method_name || order.payment_method || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [orders, search]);

  const paidOrders = filteredOrders.filter(
    (order) => String(order.payment_status || "").toUpperCase() === "PAID",
  );

  const unpaidOrders = filteredOrders.filter(
    (order) => String(order.payment_status || "").toUpperCase() !== "PAID",
  );

  const sessionSales = paidOrders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0,
  );

  const cashSales = paidOrders
    .filter((order) =>
      String(`${order.payment_method_name || ""} ${order.payment_method || ""}`)
        .toUpperCase()
        .includes("CASH"),
    )
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const nonCashSales = sessionSales - cashSales;
  const voidPending = approvalRequests.filter(
    (request) =>
      request.request_type === "POS_VOID" &&
      String(request.status || "").toUpperCase() === "PENDING",
  ).length;

  const openVoidModal = (order: PosOrder) => {
    setMessage("");

    if (!canRequestVoid(order)) {
      setMessage("This order already has a void request or cannot be voided.");
      return;
    }

    setVoidOrder(order);
    setVoidReason("");
  };

  const closeVoidModal = () => {
    setVoidOrder(null);
    setVoidReason("");
    setVoidSubmitting(false);
  };

  const submitVoidRequest = async () => {
    if (!voidOrder || voidSubmitting) return;

    const reason = voidReason.trim();

    if (!reason) {
      setMessage("Reason is required before submitting void request.");
      return;
    }

    setVoidSubmitting(true);
    setMessage("");

    const reference = getOrderReference(voidOrder);

    const { error } = await supabase.from("approval_requests").insert({
      company_id: voidOrder.company_id || activeSession?.company_id || companyId,
      request_type: "POS_VOID",
      module: "POS",
      reference_id: voidOrder.id,
      title: `POS Void Request - ${reference}`,
      description: `Cashier requested void for ${reference}. Reason: ${reason}`,
      requested_by: cashierName || "POS Cashier",
      status: "PENDING",
      request_payload: {
        order_id: voidOrder.id,
        order_tag: voidOrder.order_tag,
        order_number: voidOrder.order_number,
        receipt_no: voidOrder.receipt_no,
        session_id: voidOrder.session_id,
        cashier_id: voidOrder.cashier_id,
        cashier_name: cashierName,
        order_type: voidOrder.order_type,
        table_no: voidOrder.table_no,
        payment_status: voidOrder.payment_status,
        payment_method: voidOrder.payment_method_name || voidOrder.payment_method,
        production_status: voidOrder.production_status,
        status: voidOrder.status,
        total_amount: Number(voidOrder.total_amount || 0),
        reason,
        requested_at: new Date().toISOString(),
      },
    });

    if (error) {
      setMessage(error.message);
      setVoidSubmitting(false);
      return;
    }

    closeVoidModal();
    setMessage(`Void request submitted for ${reference}.`);
    await loadCashierTransactions(false);
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
                  OPSCORE POS Cashier Audit
                </p>
                <h1 className="truncate text-2xl font-black leading-tight">
                  My Transactions
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                Orders {filteredOrders.length}
              </span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
                Paid {paidOrders.length}
              </span>
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                Unpaid {unpaidOrders.length}
              </span>
              <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200">
                Void Pending {voidPending}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => router.push("/pos/terminal")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                <ArrowLeft size={15} />
                Terminal
              </button>

              <button
                onClick={() => loadCashierTransactions()}
                disabled={loading}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-40"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </section>

          {message && (
            <section className="mb-2 shrink-0 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
              {message}
            </section>
          )}

          <section className="mb-2 grid shrink-0 grid-cols-1 gap-2 md:grid-cols-4">
            <MetricCard label="Session Sales" value={peso(sessionSales)} />
            <MetricCard label="Expected Cash" value={peso(cashSales)} />
            <MetricCard label="Non-Cash" value={peso(nonCashSales)} />
            <MetricCard
              label="Session"
              value={activeSession?.id ? activeSession.id.slice(0, 8).toUpperCase() : "-"}
            />
          </section>

          <section className="mb-2 shrink-0 rounded-2xl border border-white/10 bg-[#070b10] p-2">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-3.5 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order tag, receipt, table, payment..."
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

          <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#070b10] shadow-2xl shadow-black/40">
            <div className="grid grid-cols-[1.25fr_0.9fr_0.8fr_0.8fr_0.8fr_1fr] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              <div>Order</div>
              <div>Time</div>
              <div>Payment</div>
              <div className="text-right">Amount</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>

            <div className="h-full min-h-0 overflow-y-auto">
              {loading ? (
                <div className="flex h-full min-h-[300px] items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Loader2 className="mx-auto mb-3 animate-spin" size={34} />
                    <p className="text-sm font-black uppercase tracking-wide">
                      Loading transactions...
                    </p>
                  </div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center">
                  <div>
                    <ShoppingBag size={42} className="mx-auto mb-4 text-slate-700" />
                    <p className="text-lg font-black uppercase tracking-wide text-slate-300">
                      No Transactions
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Orders from the active cashier session will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="grid grid-cols-[1.25fr_0.9fr_0.8fr_0.8fr_0.8fr_1fr] items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-black uppercase text-white">
                          {getOrderReference(order)}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-bold uppercase text-slate-500">
                          {order.order_number || "NO ORDER NO"} • {getOrderItemCount(order.id)} ITEM(S)
                        </p>
                      </div>

                      <div>
                        <p className="font-black text-white">{formatTime(order.created_at)}</p>
                        <p className="mt-0.5 text-[11px] font-bold uppercase text-slate-500">
                          {order.order_type || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="font-black text-white">
                          {order.payment_method_name || order.payment_method || "-"}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold uppercase text-slate-500">
                          {order.payment_status || "-"}
                        </p>
                      </div>

                      <div className="text-right text-base font-black text-amber-300">
                        {peso(order.total_amount)}
                      </div>

                      <div className="flex flex-col gap-1">
                        <span
                          className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getStatusClass(
                            getOperationalStatus(order),
                          )}`}
                        >
                          {getOperationalStatus(order)}
                        </span>
                        <span
                          className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getStatusClass(
                            order.production_status,
                          )}`}
                        >
                          {order.production_status || "-"}
                        </span>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase text-white transition hover:bg-white/10 active:scale-[0.98]"
                        >
                          <Eye size={15} />
                          View
                        </button>

                        <button
                          onClick={() => openVoidModal(order)}
                          disabled={!canRequestVoid(order)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 text-xs font-black uppercase text-red-300 transition hover:bg-red-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Ban size={15} />
                          Void
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        {selectedOrder && (
          <div className="fixed inset-0 z-[10050] flex justify-end bg-black/70 backdrop-blur-sm">
            <div className="flex h-full w-full max-w-[760px] flex-col border-l border-white/10 bg-[#0b1017] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                    Full Order Details
                  </p>
                  <h2 className="mt-1 text-2xl font-black uppercase text-white">
                    {getOrderReference(selectedOrder)}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoTile label="Date / Time" value={formatDateTime(selectedOrder.created_at)} />
                  <InfoTile label="Cashier" value={cashierName} />
                  <InfoTile label="Order Tag" value={selectedOrder.order_tag || "-"} />
                  <InfoTile label="Order No" value={selectedOrder.order_number || "-"} />
                  <InfoTile label="Receipt No" value={selectedOrder.receipt_no || "-"} />
                  <InfoTile label="Session" value={selectedOrder.session_id?.slice(0, 8).toUpperCase() || "-"} />
                  <InfoTile label="Type" value={selectedOrder.order_type || "-"} />
                  <InfoTile label="Table" value={selectedOrder.table_no || "-"} />
                  <InfoTile
                    label="Payment"
                    value={`${selectedOrder.payment_method_name || selectedOrder.payment_method || "-"} / ${
                      selectedOrder.payment_status || "-"
                    }`}
                  />
                  <InfoTile label="Production" value={selectedOrder.production_status || "-"} />
                </section>

                <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Items
                    </p>
                  </div>

                  <div className="divide-y divide-white/10">
                    {getOrderItems(selectedOrder.id).length === 0 ? (
                      <div className="p-5 text-center text-sm font-bold text-slate-500">
                        No items found.
                      </div>
                    ) : (
                      getOrderItems(selectedOrder.id).map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"
                        >
                          <div>
                            <p className="font-black text-white">{item.item_name}</p>
                            <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                              {item.qty} × {peso(item.price)} • {item.production_area || "NO STATION"} • {" "}
                              {item.production_status || "-"}
                            </p>
                          </div>
                          <p className="font-black text-amber-300">{peso(item.total)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Payment Summary
                  </p>
                  <TotalRow label="Subtotal" value={selectedOrder.subtotal} />
                  <TotalRow label="Discount" value={selectedOrder.discount_amount} />
                  <TotalRow label="Service Charge" value={selectedOrder.service_charge} />
                  <TotalRow label="Amount Paid" value={selectedOrder.amount_paid} />
                  <TotalRow label="Change" value={selectedOrder.change_amount} />
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <TotalRow label="Grand Total" value={selectedOrder.total_amount} strong />
                  </div>
                </section>

                <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Void / Approval Status
                    </p>
                  </div>

                  <div className="p-4">
                    {getApprovalForOrder(selectedOrder.id, "POS_VOID") ? (
                      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
                        <p className="font-black uppercase text-amber-300">
                          {String(getApprovalForOrder(selectedOrder.id, "POS_VOID")?.status || "-")}
                        </p>
                        <p className="mt-1 text-xs font-bold text-amber-100">
                          {getApprovalForOrder(selectedOrder.id, "POS_VOID")?.description || "Void request submitted."}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-slate-500">
                        No void request for this order.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <div className="border-t border-white/10 bg-[#0b1017] p-5">
                <button
                  onClick={() => openVoidModal(selectedOrder)}
                  disabled={!canRequestVoid(selectedOrder)}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 text-sm font-black uppercase text-red-300 transition hover:bg-red-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Ban size={17} />
                  Request Void
                </button>
              </div>
            </div>
          </div>
        )}

        {voidOrder && (
          <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b1017] p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-300 ring-1 ring-red-400/25">
                  <Ban size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">
                    Manager Approval Required
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Request Void
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                    This will submit a void request only. The transaction will not be changed until a manager approves it.
                  </p>
                </div>

                <button
                  onClick={closeVoidModal}
                  disabled={voidSubmitting}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoTile label="Order" value={getOrderReference(voidOrder)} />
                <InfoTile label="Total" value={peso(voidOrder.total_amount)} />
                <InfoTile label="Payment" value={voidOrder.payment_status || "-"} />
                <InfoTile label="Cashier" value={cashierName} />
              </div>

              <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18} />
                  <p className="text-sm font-bold leading-6 text-amber-100">
                    Enter a clear reason. This will appear in Approval Center and audit trail.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Void Reason
                </label>
                <textarea
                  value={voidReason}
                  onChange={(event) => setVoidReason(event.target.value)}
                  placeholder="Wrong item, duplicate order, customer cancelled..."
                  className="mt-2 min-h-[130px] w-full rounded-2xl border border-white/10 bg-[#05080d] p-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeVoidModal}
                  disabled={voidSubmitting}
                  className="h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-black text-white transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={submitVoidRequest}
                  disabled={voidSubmitting || !voidReason.trim()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-black text-white transition hover:bg-red-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {voidSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageGuard>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#070b10] p-4 shadow-xl shadow-black/30">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number | null | undefined;
  strong?: boolean;
}) {
  return (
    <div
      className={`mb-2 flex items-center justify-between ${
        strong ? "text-lg font-black text-white" : "text-sm font-bold text-slate-400"
      }`}
    >
      <span>{label}</span>
      <span className={strong ? "text-amber-300" : "font-black text-white"}>
        {peso(value)}
      </span>
    </div>
  );
}
