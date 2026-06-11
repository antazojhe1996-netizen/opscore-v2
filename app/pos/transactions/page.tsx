"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
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

type DateFilter = "today" | "week" | "month" | "all";

const peso = (value: number | null | undefined) =>
  `₱${Number(value || 0).toLocaleString(undefined, {
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

const getStatusClass = (status: string | null) => {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "OPEN") {
    return "bg-sky-500/10 text-sky-300 ring-sky-400/20";
  }

  if (normalized === "COMPLETED" || normalized === "PAID") {
    return "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20";
  }

  if (normalized === "VOIDED" || normalized === "CANCELLED") {
    return "bg-red-500/10 text-red-300 ring-red-400/20";
  }

  return "bg-slate-500/10 text-slate-300 ring-white/10";
};

export default function POSTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [orderItems, setOrderItems] = useState<PosOrderItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<PosOrderItem[]>(
    [],
  );

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");

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
      const { data: employeeData } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .in("id", cashierIds);

      loadedEmployees = (employeeData || []) as Employee[];
    }

    setOrders(loadedOrders);
    setOrderItems(loadedItems);
    setEmployees(loadedEmployees);
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
    order.order_number || order.receipt_no || order.id.slice(0, 8);

  const getOrderItemCount = (orderId: string) =>
    orderItems
      .filter((item) => item.order_id === orderId)
      .reduce((sum, item) => sum + Number(item.qty || 0), 0);

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
    orderItems,
  ]);

  const totalSales = filteredOrders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0,
  );

  const openOrders = filteredOrders.filter(
    (order) => String(order.status || "").toUpperCase() === "OPEN",
  ).length;

  const voidedOrders = filteredOrders.filter((order) =>
    ["VOIDED", "CANCELLED"].includes(String(order.status || "").toUpperCase()),
  ).length;

  const averageTicket =
    filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0;

  const openOrderModal = async (order: PosOrder) => {
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

  return (
    <PageGuard moduleKey="pos_terminal">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          <section className="mb-6 rounded-[2rem] border border-blue-300/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <Link
                    href="/pos/terminal"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800"
                  >
                    <ArrowLeft size={18} />
                  </Link>

                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
                      OPSCORE POS
                    </p>
                    <h1 className="mt-1 text-4xl font-black tracking-tight">
                      Transactions
                    </h1>
                  </div>
                </div>

                <p className="max-w-4xl text-sm leading-6 text-slate-400">
                  View POS orders, payment methods, cashier activity, order
                  totals, production status, and transaction details.
                </p>
              </div>

              <button
                onClick={loadTransactions}
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </section>

          {message && (
            <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
              {message}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-blue-300/10 bg-white/[0.035] p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Orders
                </p>
                <ReceiptText size={18} className="text-blue-300" />
              </div>
              <p className="mt-3 text-3xl font-black">{filteredOrders.length}</p>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/10 p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Sales
                </p>
                <ShoppingBag size={18} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-3xl font-black text-emerald-100">
                {peso(totalSales)}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-amber-400/15 bg-amber-500/10 p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                  Average Ticket
                </p>
                <CalendarDays size={18} className="text-amber-300" />
              </div>
              <p className="mt-3 text-3xl font-black text-amber-100">
                {peso(averageTicket)}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-700 bg-white/[0.035] p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Open / Voided
                </p>
                <UserRound size={18} className="text-slate-400" />
              </div>
              <p className="mt-3 text-3xl font-black text-white">
                {openOrders} / {voidedOrders}
              </p>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_160px_180px_180px_180px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order, receipt, cashier, table, payment..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
              />
            </div>

            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
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
              className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
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
              className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
            >
              <option value="all">All Types</option>
              {orderTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-blue-300/10 bg-white/[0.035] shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-blue-300/10 bg-slate-950/80">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Order
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Date / Cashier
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Type / Table
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Payment
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Items
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Total
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        <Loader2 className="mx-auto mb-3 animate-spin" />
                        Loading transactions...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-slate-800/80 transition hover:bg-blue-500/5"
                      >
                        <td className="px-5 py-4">
                          <p className="font-black text-white">
                            {getOrderReference(order)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Receipt: {order.receipt_no || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-300">
                            {formatDateTime(order.created_at)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {getCashierName(order.cashier_id)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-black uppercase text-slate-300">
                            {order.order_type || "-"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {order.table_no || "No table"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-blue-200">
                            {order.payment_method_name ||
                              order.payment_method ||
                              "-"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {order.payment_status || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-black text-white">
                          {getOrderItemCount(order.id)}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-black text-emerald-200">
                          {peso(order.total_amount)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getStatusClass(
                                order.status,
                              )}`}
                            >
                              {order.status || "-"}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-slate-600">
                              Production: {order.production_status || "-"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => openOrderModal(order)}
                              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black text-slate-300 transition hover:border-blue-300/30 hover:text-white"
                            >
                              <Eye size={15} />
                              View
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

          {selectedOrder && (
            <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[2rem] border border-blue-300/10 bg-slate-950 shadow-2xl shadow-black">
                <div className="flex items-center justify-between border-b border-blue-300/10 p-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                      POS Transaction
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-white">
                      Order {getOrderReference(selectedOrder)}
                    </h2>
                  </div>

                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-5">
                  {modalLoading ? (
                    <div className="py-12 text-center text-slate-500">
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
                      </section>

                      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                        <div className="border-b border-slate-800 px-4 py-3">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Items
                          </p>
                        </div>

                        <div className="divide-y divide-slate-800">
                          {selectedOrderItems.length === 0 ? (
                            <div className="p-5 text-center text-sm text-slate-500">
                              No items found.
                            </div>
                          ) : (
                            selectedOrderItems.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"
                              >
                                <div>
                                  <p className="font-black text-white">
                                    {item.item_name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.qty} × {peso(item.price)} •{" "}
                                    {item.production_status || "-"}
                                  </p>
                                </div>

                                <p className="text-sm font-black text-emerald-200">
                                  {peso(item.total)}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                        <div className="space-y-2 text-sm">
                          <TotalRow label="Subtotal" value={selectedOrder.subtotal} />
                          <TotalRow
                            label="Discount"
                            value={selectedOrder.discount_amount}
                          />
                          <TotalRow
                            label="Service Charge"
                            value={selectedOrder.service_charge}
                          />
                          <div className="border-t border-slate-800 pt-3">
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
              </div>
            </div>
          )}
        </main>
      </div>
    </PageGuard>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
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
      className={`flex items-center justify-between ${
        strong ? "text-lg font-black text-white" : "text-slate-400"
      }`}
    >
      <span>{label}</span>
      <span className={strong ? "text-emerald-200" : "text-white"}>
        {peso(value)}
      </span>
    </div>
  );
}
