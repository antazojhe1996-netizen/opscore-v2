import { supabase } from '@/lib/supabase';
"use client";

import { useEffect, useMemo, useState } from "react";

type ApprovalRequest = {
  id: string;
  company_id?: string;
  module?: string;
  request_type?: string;
  title?: string;
  category?: string;
  amount?: number;
  payment_method?: string;
  status: string;
  requested_by?: string;
  approved_by?: string;
  created_at?: string;
};

export default function ApprovalCenterPage() {
  const [activeTab, setActiveTab] = useState("PENDING");
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const modules = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.module || "OTHER")));
  }, [requests]);

  const [moduleFilter, setModuleFilter] = useState("ALL");

  const filteredRequests = useMemo(() => {
    if (moduleFilter === "ALL") return requests;
    return requests.filter((r) => r.module === moduleFilter);
  }, [requests, moduleFilter]);

  const loadRequests = async () => {
    setLoading(true);

    const res = await fetch(`/api/approval/list?status=${activeTab}`);
    const json = await res.json();

    setRequests(json.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const approveRequest = async (id: string) => {
    setLoading(true);

    const res = await fetch("/api/approval/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        approved_by: "Jherome",
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Approve failed.");
      setLoading(false);
      return;
    }

    alert("Approved successfully.");
    await loadRequests();
  };

  const rejectRequest = async (id: string) => {
    const reason = prompt("Reason for rejection:");

    setLoading(true);

    const res = await fetch("/api/approval/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        approved_by: "Jherome",
        reason: reason || "Rejected from Approval Center",
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Reject failed.");
      setLoading(false);
      return;
    }

    alert("Rejected.");
    await loadRequests();
  };

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Approval Center</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Engine-based Approval Center â€” dynamic by module and request type.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["PENDING", "APPROVED", "REJECTED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: activeTab === tab ? "#111827" : "white",
              color: activeTab === tab ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          <option value="ALL">All Modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <button
          onClick={loadRequests}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          background: "white",
        }}
      >
        {loading ? (
          <p>Loading approvals...</p>
        ) : filteredRequests.length === 0 ? (
          <p style={{ color: "#666" }}>No {activeTab.toLowerCase()} approvals.</p>
        ) : (
          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>Date</th>
                <th>Module</th>
                <th>Type</th>
                <th>Title</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Requested By</th>
                <th>Status</th>
                {activeTab === "PENDING" && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString("en-PH")
                      : "-"}
                  </td>
                  <td>{r.module || "-"}</td>
                  <td>{r.request_type || "-"}</td>
                  <td>{r.title || r.category || "-"}</td>
                  <td>â‚±{Number(r.amount || 0).toLocaleString()}</td>
                  <td>{r.payment_method || "-"}</td>
                  <td>{r.requested_by || "-"}</td>
                  <td>{r.status}</td>

                  {activeTab === "PENDING" && (
                    <td style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => approveRequest(r.id)}
                        disabled={loading}
                        style={{
                          padding: "6px 10px",
                          background: "#16a34a",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                        }}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => rejectRequest(r.id)}
                        disabled={loading}
                        style={{
                          padding: "6px 10px",
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                        }}
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}


