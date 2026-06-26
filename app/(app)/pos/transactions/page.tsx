"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import PageGuard from "@/components/PageGuard";
import {
  AlertTriangle,
  Ban,
  Download,
  Eye,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

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
};

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type PosApprovalRequest = {
  id: string;
  company_id: string | null;
  request_type: "POS_VOID" | "POS_REFUND" | string;
  reference_id: string | null;
  status: string | null;
  title: string | null;
  description: string | null;
  request_payload: any;
  created_at: string | null;
};

type PosApprovalAction = "POS_VOID" | "POS_REFUND";

type DateFilter = "today" | "week" | "month" | "all";

const peso = (value: number | null | undefined) =>
  `Ã¢â€šÂ±${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value: string | null) => {
  if (!value) return "-";

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDateStart = (filter: DateFilter) => {
  const date = new Date();

  if (filter === "today") {
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  if (filter === "week") {
    const day = date.getDay();
    const diff = date.getDate() - day;
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  if (filter === "month") {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  return null;
};

const getStatusBadgeClass = (status: string | null) => {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "OPEN") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized === "COMPLETED" || normalized === "PAID") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "VOID PENDING" || normalized === "REFUND PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "VOID APPROVED" || normalized === "REFUND APPROVED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "VOIDED" || normalized === "CANCELLED" || normalized === "REFUNDED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "PARKED" || normalized === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
};

export default function POSTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [orderItems, setOrderItems] = useState<PosOrderItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<PosApprovalRequest[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<PosOrderItem[]>(
    [],
  );

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");

  const [actionOrder, setActionOrder] = useState<PosOrder | null>(null);
  const [actionType, setActionType] = useState<PosApprovalAction>("POS_VOID");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  useEffect(() => {
    loadTransactions();
  }, [dateFilter]);

  const applyCompanyFilter = (query: any) => {
    if (!companyId) return query.is("company_id", null);
    return query.or(`company_id.eq.${companyId},company_id.is.null`);
  };

  const loadTransactions = async () => {
    setLoading(true);
    setMessage("");

    let orderQuery = applyCompanyFilter(
      supabase
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
          created_at
        `,
        )
        .order("created_at", { ascending: false })
        .limit(500),
    );

    const dateStart = getDateStart(dateFilter);

    if (dateStart) {
      orderQuery = orderQuery.gte("created_at", dateStart);
    }

    const { data: orderData, error: orderError } = await orderQuery;

    if (orderError) {
      setMessage(orderError.message);
      setOrders([]);
      setOrderItems([]);
      setApprovalRequests([]);
      setLoading(false);
      return;
    }

    const loadedOrders = (orderData || []) as PosOrder[];
    const orderIds = loadedOrders.map((order) => order.id);
    const cashierIds = Array.from(
      new Set(
        loadedOrders
          .map((order) => order.cashier_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    let loadedItems: PosOrderItem[] = [];
    let loadedEmployees: Employee[] = [];

    if (orderIds.length > 0) {
      const { data: itemData, error: itemError } = await supabase
        .from("pos_order_items")
        .select(
          `
          id,
          order_id,
          item_name,
          qty,
          price,
          total,
          production_area,
          production_status
        `,
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (itemError) {
        setMessage(itemError.message);
      } else {
        loadedItems = (itemData || []) as PosOrderItem[];
      }
    }

    if (cashierIds.length > 0) {
      let employeeQuery = supabase
        .from("employees")
        .select("id, first_name, last_name")
        .in("id", cashierIds);

      if (companyId) {
        employeeQuery = employeeQuery.eq("company_id", companyId);
      }

      const { data: employeeData } = await employeeQuery;
      loadedEmployees = (employeeData || []) as Employee[];
    }

    let loadedApprovalRequests: PosApprovalRequest[] = [];

    if (orderIds.length > 0) {
      let approvalQuery = supabase
        .from("approval_requests")
        .select(
          "id, company_id, request_type, reference_id, status, title, description, request_payload, created_at",
        )
        .in("request_type", ["POS_VOID", "POS_REFUND"])
        .in("reference_id", orderIds)
        .order("created_at", { ascending: false });

      if (companyId) {
        approvalQuery = approvalQuery.eq("company_id", companyId);
      }

      const { data: approvalData, error: approvalError } = await approvalQuery;

      if (approvalError) {
        setMessage(approvalError.message);
      } else {
        loadedApprovalRequests = (approvalData || []) as PosApprovalRequest[];
      }
    }

    setOrders(loadedOrders);
    setOrderItems(loadedItems);
    setEmployees(loadedEmployees);
    setApprovalRequests(loadedApprovalRequests);
    setLoading(false);
  };

  const getCashierName = (cashierId: string | null) => {
    if (!cashierId) return "Unknown";

    const employee = employees.find((item) => item.id === cashierId);
    if (!employee) return "Unknown";

    const fullName = `${employee.first_name || ""} ${
      employee.last_name || ""
    }`.trim();

    return fullName || "Unknown";
  };

  const getOrderReference = (order: PosOrder) =>
    order.order_tag || order.order_number || order.receipt_no || order.id.slice(0, 8);

  const getOrderItemCount = (orderId: string) =>
    orderItems
      .filter((item) => item.order_id === orderId)
      .reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const getApprovalForOrder = (orderId: string, requestType: PosApprovalAction) =>
    approvalRequests.find(
      (request) =>
        request.reference_id === orderId &&
        request.request_type === requestType &&
        ["PENDING", "APPROVED"].includes(String(request.status || "").toUpperCase()),
    ) || null;

  const getApprovalRequestsForOrder = (orderId: string) =>
    approvalRequests.filter((request) => request.reference_id === orderId);

  const getKitchenActivityForOrder = (orderId: string) =>
    orderItems
      .filter((item) => item.order_id === orderId && item.production_status)
      .map((item) => ({
        id: item.id,
        label: item.production_status || "-",
        helper: `${item.qty}x ${item.item_name}`,
        meta: item.production_area || "NO STATION",
      }));

  const getDerivedTimeline = (order: PosOrder, items: PosOrderItem[]) => {
    const events = [
      {
        label: "Order Created",
        value: formatDateTime(order.created_at),
        helper: `Cashier: ${getCashierName(order.cashier_id)}`,
      },
      {
        label: "Order Status",
        value: order.status || "-",
        helper: `Payment: ${order.payment_status || "-"} Ã¢â‚¬Â¢ Production: ${order.production_status || "-"}`,
      },
    ];

    const productionStatuses = Array.from(
      new Set(
        items
          .map((item) => item.production_status)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    productionStatuses.forEach((status) => {
      const count = items.filter((item) => item.production_status === status).length;
      events.push({
        label: `Production ${status}`,
        value: `${count} line item(s)`,
        helper: "Derived from POS order items",
      });
    });

    getApprovalRequestsForOrder(order.id).forEach((request) => {
      events.push({
        label: String(request.request_type || "Approval"),
        value: String(request.status || "-"),
        helper: formatDateTime(request.created_at),
      });
    });

    return events;
  };

  const getOperationalStatus = (order: PosOrder) => {
    const voidRequest = getApprovalForOrder(order.id, "POS_VOID");
    const refundRequest = getApprovalForOrder(order.id, "POS_REFUND");

    if (voidRequest) {
      return String(voidRequest.status || "").toUpperCase() === "APPROVED"
        ? "VOID APPROVED"
        : "VOID PENDING";
    }

    if (refundRequest) {
      return String(refundRequest.status || "").toUpperCase() === "APPROVED"
        ? "REFUND APPROVED"
        : "REFUND PENDING";
    }

    return order.status || "-";
  };

  const canRequestVoid = (order: PosOrder) => {
    const status = String(order.status || "").toUpperCase();
    if (["VOIDED", "CANCELLED", "REFUNDED"].includes(status)) return false;
    return !getApprovalForOrder(order.id, "POS_VOID");
  };

  const canRequestRefund = (order: PosOrder) => {
    const status = String(order.status || "").toUpperCase();
    const paymentStatus = String(order.payment_status || "").toUpperCase();
    if (["VOIDED", "CANCELLED", "REFUNDED"].includes(status)) return false;
    if (paymentStatus !== "PAID") return false;
    return !getApprovalForOrder(order.id, "POS_REFUND");
  };

  const paymentOptions = useMemo(() => {
    return Array.from(
      new Set(
        orders
          .map((order) => order.payment_method_name || order.payment_method)
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }, [orders]);

  const orderTypeOptions = useMemo(() => {
    return Array.from(
      new Set(
        orders
          .map((order) => order.order_type)
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }, [orders]);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(
        orders
          .map((order) => order.status)
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const paymentName = order.payment_method_name || order.payment_method || "";
      const cashierName = getCashierName(order.cashier_id);

      const matchesSearch =
        !term ||
        getOrderReference(order).toLowerCase().includes(term) ||
        String(order.order_tag || "").toLowerCase().includes(term) ||
        String(order.receipt_no || "").toLowerCase().includes(term) ||
        String(order.table_no || "").toLowerCase().includes(term) ||
        String(order.order_type || "").toLowerCase().includes(term) ||
        paymentName.toLowerCase().includes(term) ||
        cashierName.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const matchesPayment =
        paymentFilter === "all" ||
        paymentName.toLowerCase() === paymentFilter.toLowerCase();

      const matchesType =
        orderTypeFilter === "all" || order.order_type === orderTypeFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesType;
    });
  }, [
    orders,
    search,
    statusFilter,
    paymentFilter,
    orderTypeFilter,
    employees,
  ]);

  const totalSales = filteredOrders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0,
  );

  const openOrders = filteredOrders.filter(
    (order) => String(order.status || "").toUpperCase() === "OPEN",
  ).length;

  const voidedOrders = filteredOrders.filter((order) =>
    ["VOIDED", "CANCELLED", "REFUNDED", "VOID APPROVED"].includes(
      getOperationalStatus(order).toUpperCase(),
    ),
  ).length;

  const averageTicket =
    filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0;

  const exportCsv = () => {
    const headers = [
      "Date",
      "Order Tag",
      "Order No",
      "Receipt No",
      "Cashier",
      "Order Type",
      "Table",
      "Payment Method",
      "Payment Status",
      "Production Status",
      "Status",
      "Approval Status",
      "Items",
      "Subtotal",
      "Discount",
      "Service Charge",
      "Total",
    ];

    const rows = filteredOrders.map((order) => [
      formatDateTime(order.created_at),
      order.order_tag || "",
      order.order_number || "",
      order.receipt_no || "",
      getCashierName(order.cashier_id),
      order.order_type || "",
      order.table_no || "",
      order.payment_method_name || order.payment_method || "",
      order.payment_status || "",
      order.production_status || "",
      order.status || "",
      getOperationalStatus(order),
      getOrderItemCount(order.id),
      Number(order.subtotal || 0),
      Number(order.discount_amount || 0),
      Number(order.service_charge || 0),
      Number(order.total_amount || 0),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `opscore_pos_transactions_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const openOrderModal = (order: PosOrder) => {
    setSelectedOrder(order);
    setModalLoading(true);

    const items = orderItems.filter((item) => item.order_id === order.id);

    setSelectedOrderItems(items);
    setModalLoading(false);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setSelectedOrderItems([]);
  };

  const openApprovalAction = (order: PosOrder, type: PosApprovalAction) => {
    setActionOrder(order);
    setActionType(type);
    setActionReason("");
    setMessage("");
  };

  const closeApprovalAction = () => {
    setActionOrder(null);
    setActionReason("");
    setActionLoading(false);
  };

  const submitApprovalAction = async () => {
    if (!actionOrder || actionLoading) return;

    const reason = actionReason.trim();

    if (!reason) {
      setMessage("Reason is required before submitting POS void/refund approval.");
      return;
    }

    const existingRequest = getApprovalForOrder(actionOrder.id, actionType);

    if (existingRequest) {
      setMessage("This transaction already has a pending or approved request.");
      closeApprovalAction();
      return;
    }

    setActionLoading(true);
    setMessage("");

    const cashierName = getCashierName(actionOrder.cashier_id);
    const requestLabel = actionType === "POS_VOID" ? "POS Void" : "POS Refund";
    const reference = getOrderReference(actionOrder);

    const payload = {
      order_id: actionOrder.id,
      company_id: actionOrder.company_id || companyId,
      session_id: actionOrder.session_id,
      cashier_id: actionOrder.cashier_id,
      cashier_name: cashierName,
      order_tag: actionOrder.order_tag,
      order_number: actionOrder.order_number,
      receipt_no: actionOrder.receipt_no,
      order_type: actionOrder.order_type,
      table_no: actionOrder.table_no,
      payment_method:
        actionOrder.payment_method_name || actionOrder.payment_method || null,
      payment_status: actionOrder.payment_status,
      current_status: actionOrder.status,
      total_amount: Number(actionOrder.total_amount || 0),
      reason,
      requested_at: new Date().toISOString(),
      approver_role: "MANAGER",
    };

    const { error } = await supabase.from("approval_requests").insert({
      company_id: actionOrder.company_id || companyId,
      request_type: actionType,
      module: "POS",
      reference_id: actionOrder.id,
      title: `${requestLabel} Request - ${reference}`,
      description: `${requestLabel} requested for ${reference} / ${peso(
        actionOrder.total_amount,
      )}. Reason: ${reason}`,
      requested_by: cashierName || "POS Transactions",
      status: "PENDING",
      request_payload: payload,
    });

    setActionLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    closeApprovalAction();
    setMessage(`${requestLabel} submitted to Approval Center.`);
    await loadTransactions();
  };

  return (
<PageGuard moduleKey="pos_terminal">
        <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  POS
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Transactions Audit Center
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  View POS orders, cashier activity, payments, production status, item details, approval requests, and derived audit trail.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportCsv}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <Download size={16} />
                  Export CSV
                </button>

                <button
                  onClick={loadTransactions}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </section>

            {message && (
              <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 shadow-sm">
                {message}
              </section>
            )}

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Orders"
                value={String(filteredOrders.length)}
                helper="Transactions in current filter."
                icon={<ReceiptText size={18} />}
              />

              <KpiCard
                label="Sales"
                value={peso(totalSales)}
                helper="Total amount in current filter."
                tone="success"
                icon={<ShoppingBag size={18} />}
              />

              <KpiCard
                label="Average Ticket"
                value={peso(averageTicket)}
                helper="Average transaction value."
                tone="warning"
                icon={<ReceiptText size={18} />}
              />

              <KpiCard
                label="Open / Voided"
                value={`${openOrders} / ${voidedOrders}`}
                helper="Open orders versus cancelled or voided."
                icon={<UserRound size={18} />}
              />
            </section>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_160px_180px_180px_180px]">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search order, receipt, cashier, table, payment..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pl-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(event.target.value as DateFilter)
                  }
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Time</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="all">All Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="all">All Payments</option>
                  {paymentOptions.map((payment) => (
                    <option key={payment} value={payment}>
                      {payment}
                    </option>
                  ))}
                </select>

                <select
                  value={orderTypeFilter}
                  onChange={(event) => setOrderTypeFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="all">All Types</option>
                  {orderTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Transaction Ledger
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  POS Orders
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Order",
                        "Date / Cashier",
                        "Type / Table",
                        "Payment",
                        "Items",
                        "Total",
                        "Status",
                        "Action",
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
                          colSpan={8}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          <Loader2 className="mx-auto mb-3 animate-spin" />
                          Loading transactions...
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-950">
                              {getOrderReference(order)}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              Order No: {order.order_number || "-"} Ã¢â‚¬Â¢ Receipt: {order.receipt_no || "-"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-700">
                              {formatDateTime(order.created_at)}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              {getCashierName(order.cashier_id)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-black uppercase text-slate-700">
                              {order.order_type || "-"}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              {order.table_no || "No table"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-black text-slate-950">
                              {order.payment_method_name ||
                                order.payment_method ||
                                "-"}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              {order.payment_status || "-"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-right font-black text-slate-950">
                            {getOrderItemCount(order.id)}
                          </td>

                          <td className="px-5 py-4 text-right font-black text-slate-950">
                            {peso(order.total_amount)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getStatusBadgeClass(
                                  getOperationalStatus(order),
                                )}`}
                              >
                                {getOperationalStatus(order)}
                              </span>
                              <span className="text-[10px] font-bold uppercase text-slate-500">
                                Production: {order.production_status || "-"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                onClick={() => openOrderModal(order)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                              >
                                <Eye size={15} />
                                View
                              </button>

                              <button
                                onClick={() => openApprovalAction(order, "POS_VOID")}
                                disabled={!canRequestVoid(order)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700 transition-all duration-200 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Ban size={15} />
                                Void
                              </button>

                              <button
                                onClick={() => openApprovalAction(order, "POS_REFUND")}
                                disabled={!canRequestRefund(order)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-700 transition-all duration-200 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <RotateCcw size={15} />
                                Refund
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {actionOrder && (
            <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-slate-950/40 p-4">
              <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div
                    className={
                      actionType === "POS_VOID"
                        ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700"
                        : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"
                    }
                  >
                    {actionType === "POS_VOID" ? <Ban size={20} /> : <RotateCcw size={20} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      Approval Required
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {actionType === "POS_VOID" ? "Request POS Void" : "Request POS Refund"}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      This will create a manager approval request. The transaction will not be changed until approved in Approval Center.
                    </p>
                  </div>

                  <button
                    onClick={closeApprovalAction}
                    disabled={actionLoading}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoCard label="Order" value={getOrderReference(actionOrder)} />
                  <InfoCard label="Total" value={peso(actionOrder.total_amount)} />
                  <InfoCard label="Cashier" value={getCashierName(actionOrder.cashier_id)} />
                  <InfoCard
                    label="Payment"
                    value={actionOrder.payment_method_name || actionOrder.payment_method || "-"}
                  />
                </div>

                <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={18} />
                    <p className="text-sm font-bold leading-6 text-amber-800">
                      Reason is required for audit trail and manager approval.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Reason
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(event) => setActionReason(event.target.value)}
                    placeholder="Enter reason for this request..."
                    className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={closeApprovalAction}
                    disabled={actionLoading}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitApprovalAction}
                    disabled={actionLoading || !actionReason.trim()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    Submit to Approval Center
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedOrder && (
            <div className="fixed inset-0 z-[10050] flex justify-end bg-slate-950/35">
              <div className="flex h-[calc(100vh-64px)] w-full max-w-[820px] flex-col border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 p-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                      POS Transaction
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Order {getOrderReference(selectedOrder)}
                    </h2>
                  </div>

                  <button
                    onClick={closeModal}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {modalLoading ? (
                    <div className="py-14 text-center text-sm font-semibold text-slate-500">
                      <Loader2 className="mx-auto mb-3 animate-spin" />
                      Loading transaction...
                    </div>
                  ) : (
                    <>
                      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <InfoCard
                          label="Date / Time"
                          value={formatDateTime(selectedOrder.created_at)}
                        />
                        <InfoCard
                          label="Cashier"
                          value={getCashierName(selectedOrder.cashier_id)}
                        />
                        <InfoCard
                          label="Order Tag"
                          value={selectedOrder.order_tag || "-"}
                        />
                        <InfoCard
                          label="Order Type"
                          value={selectedOrder.order_type || "-"}
                        />
                        <InfoCard
                          label="Table"
                          value={selectedOrder.table_no || "-"}
                        />
                        <InfoCard
                          label="Payment Method"
                          value={
                            selectedOrder.payment_method_name ||
                            selectedOrder.payment_method ||
                            "-"
                          }
                        />
                        <InfoCard
                          label="Payment Status"
                          value={selectedOrder.payment_status || "-"}
                        />
                        <InfoCard
                          label="Session"
                          value={selectedOrder.session_id?.slice(0, 8) || "-"}
                        />
                        <InfoCard
                          label="Production Status"
                          value={selectedOrder.production_status || "-"}
                        />
                        <InfoCard
                          label="Approval Status"
                          value={getOperationalStatus(selectedOrder)}
                        />
                      </section>

                      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Items
                          </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {selectedOrderItems.length === 0 ? (
                            <div className="p-6 text-center text-sm font-semibold text-slate-500">
                              No items found.
                            </div>
                          ) : (
                            selectedOrderItems.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-5"
                              >
                                <div>
                                  <p className="font-black text-slate-950">
                                    {item.item_name}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {item.qty} Ãƒâ€” {peso(item.price)} Ã¢â‚¬Â¢{" "}
                                    {item.production_status || "-"}
                                  </p>
                                </div>

                                <p className="text-sm font-black text-slate-950">
                                  {peso(item.total)}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Kitchen / Production Activity
                          </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {getKitchenActivityForOrder(selectedOrder.id).length === 0 ? (
                            <div className="p-6 text-center text-sm font-semibold text-slate-500">
                              No production activity found.
                            </div>
                          ) : (
                            getKitchenActivityForOrder(selectedOrder.id).map((activity) => (
                              <div
                                key={activity.id}
                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-5"
                              >
                                <div>
                                  <p className="font-black uppercase text-slate-950">
                                    {activity.label}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {activity.helper}
                                  </p>
                                </div>

                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
                                  {activity.meta}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Audit Timeline
                          </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {getDerivedTimeline(selectedOrder, selectedOrderItems).map((event, index) => (
                            <div
                              key={`${event.label}-${index}`}
                              className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 p-5"
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-black text-slate-600">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-black text-slate-950">{event.label}</p>
                                <p className="mt-1 text-sm font-bold text-slate-700">{event.value}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{event.helper}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="space-y-3 text-sm">
                          <TotalRow
                            label="Subtotal"
                            value={selectedOrder.subtotal}
                          />
                          <TotalRow
                            label="Discount"
                            value={selectedOrder.discount_amount}
                          />
                          <TotalRow
                            label="Service Charge"
                            value={selectedOrder.service_charge}
                          />
                          <div className="border-t border-slate-100 pt-3">
                            <TotalRow
                              label="Grand Total"
                              value={selectedOrder.total_amount}
                              strong
                            />
                          </div>
                        </div>
                      </section>
                    </>
                  )}
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white/95 p-6">
                  <button
                    onClick={closeModal}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
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

function KpiCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone?: "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-500";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
          {label}
        </p>
        <div>{icon}</div>
      </div>

      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-xs font-semibold leading-5">{helper}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
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
      className={`flex items-center justify-between ${
        strong ? "text-lg font-black text-slate-950" : "font-semibold text-slate-500"
      }`}
    >
      <span>{label}</span>
      <span className={strong ? "text-slate-950" : "font-black text-slate-950"}>
        {peso(value)}
      </span>
    </div>
  );
}






