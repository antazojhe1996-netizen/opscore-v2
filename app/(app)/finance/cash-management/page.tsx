"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  RefreshCcw,
  Send,
  Wallet,
  XCircle,
} from "lucide-react";

const FALLBACK_COMPANY_ID = "e68414f1-ecfc-419a-8081-d1a0b894106c";

type CashMovement = {
  id: string;
  amount: number;
  type?: string;
  movement_type?: string;
  source?: string;
  category?: string;
  payment_type?: string;
  payment_method?: string;
};

type ApprovalRequest = {
  id: string;
  title: string;
  status: string;
  amount?: number;
  category?: string;
};

type CashDrawer = {
  id: string;
  holder_name: string;
  opening_float: number;
  status: string;
};

export default function CashManagementPage() {
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<CashDrawer | null>(null);

  const [drawerHolder, setDrawerHolder] = useState("Jherome");
  const [openingFloat, setOpeningFloat] = useState("0");

  const [type, setType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [category, setCategory] = useState("Room Sales");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [requestedBy, setRequestedBy] = useState("Jherome");

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id") || FALLBACK_COMPANY_ID
      : FALLBACK_COMPANY_ID;

  const getMovementType = (m: CashMovement) =>
    String(m.type || m.movement_type || "").toUpperCase().replace(/\s+/g, "_");

  const totals = useMemo(() => {
    const cashIn = movements
      .filter((m) => getMovementType(m) === "CASH_IN")
      .reduce((sum, m) => sum + Number(m.amount || 0), 0);

    const cashOut = movements
      .filter((m) => getMovementType(m) === "CASH_OUT")
      .reduce((sum, m) => sum + Number(m.amount || 0), 0);

    return {
      cashIn,
      cashOut,
      expected: Number(activeDrawer?.opening_float || 0) + cashIn - cashOut,
    };
  }, [movements, activeDrawer]);

  const refreshAll = async () => {
    const drawerRes = await fetch(`/api/cash/drawer/list?company_id=${companyId}`);
    const drawerJson = await drawerRes.json();

    const current = drawerJson.data?.[0] || null;
    setActiveDrawer(current);

    const [movRes, appRes] = await Promise.all([
      fetch(`/api/cash/movements?drawer_id=${current?.id || ""}&company_id=${companyId}`),
      fetch(`/api/approval/pending?company_id=${companyId}`),
    ]);

    const movJson = await movRes.json();
    const appJson = await appRes.json();

    setMovements(movJson.data || []);
    setApprovals(appJson.data || []);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const openDrawer = async () => {
    setLoading(true);

    const res = await fetch("/api/cash/drawer/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: companyId,
        holder_name: drawerHolder,
        opening_float: Number(openingFloat || 0),
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok || !json.success) {
      alert(json.error || "Open drawer failed");
      return;
    }

    await refreshAll();
  };

  const closeDrawer = async () => {
    if (!activeDrawer) {
      alert("No active drawer");
      return;
    }

    const actualCash = prompt(
      `Actual cash count? Expected: ₱${totals.expected.toLocaleString()}`
    );

    if (actualCash === null) return;

    setLoading(true);

    const res = await fetch("/api/cash/drawer/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drawer_id: activeDrawer.id,
        actual_cash: Number(actualCash || 0),
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok || !json.success) {
      alert(json.error || "Close drawer failed");
      return;
    }

    alert(
      `Drawer closed. Variance: ₱${Number(
        json.intelligence?.variance || 0
      ).toLocaleString()}`
    );

    await refreshAll();
  };

  const submitCash = async () => {
    if (!activeDrawer) {
      alert("Open drawer first");
      return;
    }

    const parsedAmount = Number(amount || 0);

    if (!parsedAmount || parsedAmount <= 0) {
      alert("Invalid amount");
      return;
    }

    setLoading(true);

    if (type === "CASH_IN") {
      const res = await fetch("/api/cash/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          cash_drawer_id: activeDrawer.id,
          cash_cash_drawer_id: activeDrawer.id,
          type: "CASH_IN",
          movement_type: "Cash In",
          category,
          source: category,
          amount: parsedAmount,
          payment_method: paymentMethod,
          payment_type: paymentMethod,
          created_by: requestedBy,
          created_by_user_name: requestedBy,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.error || "Cash in failed");
      }
    }

    if (type === "CASH_OUT") {
      const res = await fetch("/api/approval/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          type: "CASH_OUT",
          module: "CASH",
          category,
          title: `Cash Out - ${category}`,
          amount: parsedAmount,
          payment_method: paymentMethod,
          payment_type: paymentMethod,
          requested_by: requestedBy,
          cash_drawer_id: activeDrawer.id,
          cash_cash_drawer_id: activeDrawer.id,
          drawer_id: activeDrawer.id,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.error || "Approval request failed");
      }
    }

    setAmount("");
    setLoading(false);
    await refreshAll();
  };

  const approveRequest = async (id: string) => {
    await fetch("/api/approval/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approved_by: requestedBy }),
    });

    await refreshAll();
  };

  const rejectRequest = async (id: string) => {
    await fetch("/api/approval/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, rejected_by: requestedBy }),
    });

    await refreshAll();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-10 pt-20 text-slate-900 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
            Finance
          </p>
          <h1 className="mt-2 text-3xl font-black">Cash Management</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Cash drawer, cash in, cash out approvals, and live movement review.
          </p>
        </div>

        <button
          onClick={refreshAll}
          disabled={loading}
          className="flex h-11 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-black shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black text-slate-500">
            <Wallet size={18} /> Drawer
          </div>
          <div className="mt-3 text-xl font-black">
            {activeDrawer?.holder_name || "No Active Drawer"}
          </div>
          <p className="mt-1 text-xs font-bold text-slate-400">
            Opening Float: ₱{Number(activeDrawer?.opening_float || 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-black text-slate-500">Cash In</div>
          <div className="mt-3 text-2xl font-black text-emerald-700">
            ₱{totals.cashIn.toLocaleString()}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-black text-slate-500">Cash Out</div>
          <div className="mt-3 text-2xl font-black text-red-700">
            ₱{totals.cashOut.toLocaleString()}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-black text-slate-500">Expected Cash</div>
          <div className="mt-3 text-2xl font-black text-blue-700">
            ₱{totals.expected.toLocaleString()}
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black">Drawer Control</h2>

          <input
            value={drawerHolder}
            onChange={(e) => setDrawerHolder(e.target.value)}
            placeholder="Holder name"
            className="mb-3 h-11 w-full rounded-2xl border px-4 text-sm font-semibold"
          />

          <input
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            placeholder="Opening float"
            className="mb-4 h-11 w-full rounded-2xl border px-4 text-sm font-semibold"
          />

          <button
            onClick={openDrawer}
            disabled={loading || !!activeDrawer}
            className="h-11 w-full rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-50"
          >
            Open Drawer
          </button>

          <button
            onClick={closeDrawer}
            disabled={loading || !activeDrawer}
            className="mt-3 h-11 w-full rounded-2xl bg-red-700 text-sm font-black text-white disabled:opacity-50"
          >
            Close Drawer
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="mb-4 text-lg font-black">Cash Action</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="h-11 rounded-2xl border px-4 text-sm font-semibold"
            >
              <option value="CASH_IN">Cash In</option>
              <option value="CASH_OUT">Cash Out / Approval</option>
            </select>

            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Source / Category"
              className="h-11 rounded-2xl border px-4 text-sm font-semibold"
            />

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="h-11 rounded-2xl border px-4 text-sm font-semibold"
            />

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-11 rounded-2xl border px-4 text-sm font-semibold"
            >
              <option>Cash</option>
              <option>GCash</option>
              <option>Bank</option>
              <option>Card</option>
              <option>Terminal</option>
            </select>

            <input
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Requested by"
              className="h-11 rounded-2xl border px-4 text-sm font-semibold md:col-span-2"
            />
          </div>

          <button
            onClick={submitCash}
            disabled={loading || !activeDrawer}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 text-sm font-black text-white disabled:opacity-50"
          >
            <Send size={16} />
            Submit
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <Banknote size={20} /> Movements
          </h2>

          <div className="space-y-3">
            {movements.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div>
                  <div className="text-sm font-black">
                    {m.movement_type || m.type}
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {m.source || m.category || "-"} •{" "}
                    {m.payment_type || m.payment_method || "Cash"}
                  </div>
                </div>

                <div className="text-sm font-black">
                  ₱{Number(m.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}

            {movements.length === 0 && (
              <div className="py-8 text-center text-sm font-semibold text-slate-400">
                No movements yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black">Pending Approvals</h2>

          <div className="space-y-3">
            {approvals.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="font-black">{a.title}</div>
                <div className="text-sm font-semibold text-slate-500">
                  ₱{Number(a.amount || 0).toLocaleString()} • {a.category || "-"}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => approveRequest(a.id)}
                    className="flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>

                  <button
                    onClick={() => rejectRequest(a.id)}
                    className="flex h-9 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-black text-white"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}

            {approvals.length === 0 && (
              <div className="py-8 text-center text-sm font-semibold text-slate-400">
                No pending approvals.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}