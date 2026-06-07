"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { CheckCircle, Clock, FileText, XCircle } from "lucide-react";

export default function ApprovalCenterPage() {
  /// STATES
  const [requests, setRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  /// FUNCTIONS
  const getApprovalRequests = async () => {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("APPROVAL REQUESTS ERROR:", error.message);
      return;
    }

    setRequests(data || []);
  };

  const approveRequest = async (request: any) => {
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: "APPROVED",
        approved_by: "Manager Approval Center",
        approved_at: nowIso,
      })
      .eq("id", request.id);

    if (error) {
      alert(error.message);
      return;
    }

    // Sync back to origin module. Approval Center is the approval hub,
    // but the origin module still owns its processing workflow.
    if (request.request_type === "EXPENSE_REQUEST" && request.reference_id) {
      const { error: expenseError } = await supabase
        .from("expense_requests")
        .update({
          status: "APPROVED",
          approved_by: "Manager Approval Center",
          approval_role: "Manager Approval Center",
          approved_date: nowIso,
        })
        .eq("id", request.reference_id);

      if (expenseError) {
        alert(`Approval saved, but origin expense request was not updated: ${expenseError.message}`);
      }
    }

    await getApprovalRequests();
    setSelectedRequest(null);
    setActiveTab("APPROVED");
  };

  const rejectRequest = async (request: any) => {
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: "REJECTED",
        rejected_by: "Manager Approval Center",
        rejected_at: nowIso,
        rejection_reason: "Rejected from Manager Approval Center",
      })
      .eq("id", request.id);

    if (error) {
      alert(error.message);
      return;
    }

    // Sync back to origin module.
    if (request.request_type === "EXPENSE_REQUEST" && request.reference_id) {
      const { error: expenseError } = await supabase
        .from("expense_requests")
        .update({
          status: "REJECTED",
          remarks: "Rejected from Manager Approval Center",
        })
        .eq("id", request.reference_id);

      if (expenseError) {
        alert(`Rejection saved, but origin expense request was not updated: ${expenseError.message}`);
      }
    }

    await getApprovalRequests();
    setSelectedRequest(null);
    setActiveTab("REJECTED");
  };

  useEffect(() => {
    getApprovalRequests();
  }, []);

  /// CALCULATIONS
  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const approvedRequests = requests.filter((r) => r.status === "APPROVED");
  const rejectedRequests = requests.filter((r) => r.status === "REJECTED");
  const filteredRequests = requests.filter((r) => r.status === activeTab);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Manager Approval Center
          </h1>
          <p className="text-sm text-slate-500">
            Centralized approval hub for Finance, Operations, Payroll, and future workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Pending Requests</p>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">{pendingRequests.length}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Approved</p>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">{approvedRequests.length}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Rejected</p>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">{rejectedRequests.length}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Requests</p>
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">{requests.length}</h2>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {["PENDING", "APPROVED", "REJECTED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-white shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Module</th>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Requested By</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No approval requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-t">
                    <td className="p-3">
                      {request.created_at
                        ? new Date(request.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-3">{request.request_type}</td>
                    <td className="p-3">{request.module}</td>
                    <td className="p-3 font-medium text-slate-800">
                      {request.title}
                    </td>
                    <td className="p-3">{request.requested_by || "-"}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          request.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : request.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
            <div className="h-full w-full max-w-md bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Review Request
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedRequest.request_type}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-500">Title</p>
                  <p className="font-semibold text-slate-800">
                    {selectedRequest.title}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Module</p>
                  <p>{selectedRequest.module}</p>
                </div>

                <div>
                  <p className="text-slate-500">Requested By</p>
                  <p>{selectedRequest.requested_by || "-"}</p>
                </div>

                <div>
                  <p className="text-slate-500">Description</p>
                  <p>{selectedRequest.description || "No description provided."}</p>
                </div>

                <div>
                  <p className="text-slate-500">Reference ID</p>
                  <p>{selectedRequest.reference_id || "-"}</p>
                </div>
              </div>

              {selectedRequest.status === "PENDING" ? (
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => approveRequest(selectedRequest)}
                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => rejectRequest(selectedRequest)}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="mt-8 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
                  This request is already {selectedRequest.status}.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}