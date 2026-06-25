"use client";

import { useEffect, useMemo, useState } from "react";

const COMPANY_ID = "e68414f1-ecfc-419a-8081-d1a0b894106c";

type CashMovement = {
  id: string;
  type: string;
  amount: number;
};

type ApprovalRequest = {
  id: string;
  title: string;
  status: string;
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
  const [amount, setAmount] = useState("1000");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [requestedBy, setRequestedBy] = useState("Jherome");

  // =====================
  // LOAD SNAPSHOT (SINGLE SOURCE OF TRUTH)
  // =====================
  const refreshAll = async () => {
  const openDrawersRes = await fetch(
    `/api/cash/drawer/list?company_id=${COMPANY_ID}`
  );
  const openDrawersJson = await openDrawersRes.json();

  const openDrawers = openDrawersJson.data || [];

  const current =
    activeDrawer ??
    openDrawers[0] ??
    null;

  setActiveDrawer(current);

  const [movRes, appRes] = await Promise.all([
    fetch(
      `/api/cash/movements?drawer_id=${current?.id || ""}&company_id=${COMPANY_ID}`
    ),
    fetch(`/api/approval/pending?company_id=${COMPANY_ID}`),
  ]);

  const movJson = await movRes.json();
  const appJson = await appRes.json();

  setMovements(movJson.data || []);
  setApprovals(appJson.data || []);
};
  // =====================
  // SAFE TOTALS (NO LOCAL MATH SOURCE BUG)
  // =====================
  const totals = useMemo(() => {
    const cashIn = movements
      .filter((m) => m.type === "CASH_IN")
      .reduce((a, b) => a + Number(b.amount || 0), 0);

    const cashOut = movements
      .filter((m) => m.type === "CASH_OUT")
      .reduce((a, b) => a + Number(b.amount || 0), 0);

    return {
      cashIn,
      cashOut,
      net: cashIn - cashOut,
    };
  }, [movements]);

  // =====================
  // OPEN DRAWER
  // =====================
  const openDrawer = async () => {
    setLoading(true);

    const res = await fetch("/api/cash/drawer/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        holder_name: drawerHolder,
        opening_float: Number(openingFloat || 0),
      }),
    });

    const json = await res.json();

    setLoading(false);

    if (!res.ok) {
      alert(json.error);
      return;
    }

    setActiveDrawer(json.data);
    await refreshAll();
  };

  // =====================
  // CASH ACTION
  // =====================
  const submitCash = async () => {
    if (!activeDrawer) {
      alert("Open drawer first");
      return;
    }

    const parsed = Number(amount);

    if (!parsed || parsed <= 0) {
      alert("Invalid amount");
      return;
    }

    setLoading(true);

    if (type === "CASH_IN") {
      await fetch("/api/cash/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          cash_drawer_id: activeDrawer.id,
          type,
          category,
          amount: parsed,
          payment_method: paymentMethod,
          created_by: requestedBy,
        }),
      });
    }

    if (type === "CASH_OUT") {
      await fetch("/api/approval/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          type,
          category,
          title: `${type} - ${category}`,
          amount: parsed,
          payment_method: paymentMethod,
          requested_by: requestedBy,
          drawer_id: activeDrawer.id,
        }),
      });
    }

    setLoading(false);
    await refreshAll();
  };

  // =====================
  // APPROVAL ACTIONS
  // =====================
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
      body: JSON.stringify({ id }),
    });

    await refreshAll();
  };

  // =====================
  // UI
  // =====================
  return (
    <main style={{ padding: 24 }}>
      <h1>Cash Management</h1>

      <div>
        <strong>Drawer:</strong>{" "}
        {activeDrawer?.holder_name || "No Active Drawer"}
      </div>

      <div>
        <h3>Totals</h3>
        <p>Cash In: {totals.cashIn}</p>
        <p>Cash Out: {totals.cashOut}</p>
        <p>Net: {totals.net}</p>
      </div>

      <button onClick={openDrawer} disabled={loading}>
        Open Drawer
      </button>

      <button onClick={submitCash} disabled={loading}>
        Submit Cash
      </button>

      <h3>Movements</h3>
      {movements.map((m) => (
        <div key={m.id}>
          {m.type} - {m.amount}
        </div>
      ))}

      <h3>Approvals</h3>
      {approvals.map((a) => (
        <div key={a.id}>
          {a.title}
          <button onClick={() => approveRequest(a.id)}>Approve</button>
          <button onClick={() => rejectRequest(a.id)}>Reject</button>
        </div>
      ))}
    </main>
  );
}


