"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/app/lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";

type RegistrationRequest = {
  id: string;
  company_id: string;

  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;

  birth_date?: string | null;
  gender?: string | null;
  civil_status?: string | null;
  nationality?: string | null;

  mobile_number?: string | null;
  email?: string | null;
  address?: string | null;

  sss_no?: string | null;
  philhealth_no?: string | null;
  pagibig_no?: string | null;
  tin_no?: string | null;

  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_address?: string | null;

  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;

  submitted_at: string;
  created_at?: string;
  updated_at?: string;
};

const statusOptions = ["PENDING", "APPROVED", "REJECTED", "ALL"];

export default function EmployeeOnboardingPage() {
  /// STATES
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<RegistrationRequest | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [rejectReason, setRejectReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /// FUNCTIONS
  const getCurrentCompanyId = () => {
    if (typeof window === "undefined") return "";

    return (
      localStorage.getItem("opscore_current_company_id") ||
      localStorage.getItem("opscore_company_id") ||
      localStorage.getItem("company_id") ||
      ""
    );
  };

  const getCurrentSystemUserId = () => {
    if (typeof window === "undefined") return "";

    return localStorage.getItem("opscore_current_system_user_id") || "";
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFullName = (request: RegistrationRequest) =>
    [
      request.first_name,
      request.middle_name,
      request.last_name,
      request.suffix,
    ]
      .filter(Boolean)
      .join(" ");

  const loadRequests = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const companyId = getCurrentCompanyId();

    if (!companyId) {
      setLoading(false);
      setErrorMessage("Company session not found. Please logout and login again.");
      return;
    }

    const { data, error } = await supabase
      .from("employee_registration_requests")
      .select("*")
      .eq("company_id", companyId)
      .order("submitted_at", { ascending: false });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRequests(data || []);
  };

  const updateRequestStatus = async (
    request: RegistrationRequest,
    status: "APPROVED" | "REJECTED",
  ) => {
    if (updatingId) return;

    if (status === "REJECTED" && !rejectReason.trim()) {
      setErrorMessage("Please enter a rejection reason before rejecting.");
      return;
    }

    const confirmMessage =
      status === "APPROVED"
        ? `Approve registration for ${getFullName(request)}?`
        : `Reject registration for ${getFullName(request)}?`;

    if (!confirm(confirmMessage)) return;

    setUpdatingId(request.id);
    setErrorMessage("");
    setSuccessMessage("");

    let error: any = null;

if (status === "APPROVED") {
  const response = await fetch(
    "/api/hr/approve-registration",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration_id: request.id,
        reviewed_by: getCurrentSystemUserId(),
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    error = {
      message: result.error || "Approve failed.",
    };
  }
} else {
  const payload: Partial<RegistrationRequest> = {
    status: "REJECTED",
    reviewed_by: getCurrentSystemUserId() || null,
    reviewed_at: new Date().toISOString(),
    rejection_reason: rejectReason.trim(),
    updated_at: new Date().toISOString(),
  };

  const response = await supabase
    .from("employee_registration_requests")
    .update(payload)
    .eq("id", request.id);

  error = response.error;
}
    setUpdatingId("");

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      status === "APPROVED"
        ? "Registration approved. Auto employee creation will be added in the next phase."
        : "Registration rejected successfully.",
    );

    setRejectReason("");
    setSelectedRequest(null);
    await loadRequests();
  };

  /// EFFECTS
  useEffect(() => {
    loadRequests();
  }, []);

  /// CALCULATIONS
  const pendingCount = requests.filter((item) => item.status === "PENDING").length;
  const approvedCount = requests.filter((item) => item.status === "APPROVED").length;
  const rejectedCount = requests.filter((item) => item.status === "REJECTED").length;

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const statusMatch =
        statusFilter === "ALL" || item.status === statusFilter;

      const searchableText = `
        ${item.first_name || ""}
        ${item.middle_name || ""}
        ${item.last_name || ""}
        ${item.email || ""}
        ${item.mobile_number || ""}
        ${item.status || ""}
      `.toLowerCase();

      const searchMatch = searchableText.includes(searchTerm.toLowerCase());

      return statusMatch && searchMatch;
    });
  }, [requests, searchTerm, statusFilter]);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="HR / EMPLOYEE ONBOARDING" />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
        <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              HR
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Employee Onboarding Queue
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              Review pending 201 registration submissions before creating
              official employee records and portal accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading || Boolean(updatingId)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCcw size={17} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Pending" value={pendingCount} tone="amber" />
          <MetricCard label="Approved" value={approvedCount} tone="emerald" />
          <MetricCard label="Rejected" value={rejectedCount} tone="red" />
          <MetricCard label="Total" value={requests.length} tone="slate" />
        </section>

        {(errorMessage || successMessage) && (
          <section className="mb-5">
            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                {successMessage}
              </div>
            )}
          </section>
        )}

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search applicant name, email, or mobile..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-9 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All Statuses" : status}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-black text-slate-950">
              Registration Requests
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {filteredRequests.length} request
              {filteredRequests.length === 1 ? "" : "s"} shown.
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Government IDs</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-slate-100 transition-all duration-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-black text-slate-950">
                        {getFullName(request)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {request.birth_date || "No birth date"}
                      </p>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-slate-700">
                        {request.mobile_number || "No mobile"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {request.email || "No email"}
                      </p>
                    </td>

                    <td className="px-4 py-3 align-top">
                      {request.sss_no ||
                      request.philhealth_no ||
                      request.pagibig_no ||
                      request.tin_no ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          Partially Provided
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          Not Provided
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top text-sm font-semibold text-slate-600">
                      {formatDateTime(request.submitted_at)}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <StatusBadge status={request.status} />
                    </td>

                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectReason("");
                            setErrorMessage("");
                            setSuccessMessage("");
                          }}
                          className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                        >
                          <Eye size={13} />
                          Review
                        </button>

                        {request.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(request, "APPROVED")}
                              disabled={updatingId === request.id}
                              className="inline-flex h-9 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />
                              Approve
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredRequests.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-14 text-center text-sm font-semibold text-slate-500"
                    >
                      No registration requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedRequest && (
          <ReviewDrawer
            request={selectedRequest}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            updatingId={updatingId}
            onClose={() => setSelectedRequest(null)}
            onApprove={() => updateRequestStatus(selectedRequest, "APPROVED")}
            onReject={() => updateRequestStatus(selectedRequest, "REJECTED")}
          />
        )}
      </main>
    </div>
  );
}

function ReviewDrawer({
  request,
  rejectReason,
  setRejectReason,
  updatingId,
  onClose,
  onApprove,
  onReject,
}: {
  request: RegistrationRequest;
  rejectReason: string;
  setRejectReason: (value: string) => void;
  updatingId: string;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = request.status === "PENDING";
  const isUpdating = updatingId === request.id;

  return (
    <div className="fixed inset-0 z-[10080] flex justify-end bg-black/40 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <aside className="relative z-[10081] flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Review Registration
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {[
                  request.first_name,
                  request.middle_name,
                  request.last_name,
                  request.suffix,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Submitted {formatStaticDateTime(request.submitted_at)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
            >
              <XCircle size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          <InfoPanel title="Personal Information">
            <InfoRow label="First Name" value={request.first_name} />
            <InfoRow label="Middle Name" value={request.middle_name} />
            <InfoRow label="Last Name" value={request.last_name} />
            <InfoRow label="Suffix" value={request.suffix} />
            <InfoRow label="Birth Date" value={request.birth_date} />
            <InfoRow label="Gender" value={request.gender} />
            <InfoRow label="Civil Status" value={request.civil_status} />
            <InfoRow label="Nationality" value={request.nationality} />
          </InfoPanel>

          <InfoPanel title="Contact Information">
            <InfoRow label="Mobile Number" value={request.mobile_number} />
            <InfoRow label="Email" value={request.email} />
            <InfoRow label="Address" value={request.address} />
          </InfoPanel>

          <InfoPanel title="Government Information">
            <InfoRow label="SSS No." value={request.sss_no} />
            <InfoRow label="PhilHealth No." value={request.philhealth_no} />
            <InfoRow label="Pag-IBIG No." value={request.pagibig_no} />
            <InfoRow label="TIN No." value={request.tin_no} />
          </InfoPanel>

          <InfoPanel title="Emergency Contact">
            <InfoRow label="Name" value={request.emergency_contact_name} />
            <InfoRow
              label="Relationship"
              value={request.emergency_contact_relationship}
            />
            <InfoRow label="Contact Number" value={request.emergency_contact_number} />
            <InfoRow
              label="Contact Address"
              value={request.emergency_contact_address}
            />
          </InfoPanel>

          {request.rejection_reason && (
            <InfoPanel title="Rejection Reason">
              <p className="text-sm font-bold text-red-700">
                {request.rejection_reason}
              </p>
            </InfoPanel>
          )}

          {isPending && (
            <InfoPanel title="Reject Registration">
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={3}
                placeholder="Enter rejection reason..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </InfoPanel>
          )}
        </div>

        {isPending && (
          <div className="grid grid-cols-2 gap-3 border-t border-slate-200 p-5">
            <button
              type="button"
              onClick={onReject}
              disabled={isUpdating}
              className="h-11 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition-all duration-200 hover:bg-red-100 disabled:opacity-50"
            >
              Reject
            </button>

            <button
              type="button"
              onClick={onApprove}
              disabled={isUpdating}
              className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "red" | "slate";
}) {
  const styles =
    tone === "amber"
      ? "border-amber-200 text-amber-700"
      : tone === "emerald"
        ? "border-emerald-200 text-emerald-700"
        : tone === "red"
          ? "border-red-200 text-red-700"
          : "border-slate-200 text-slate-950";

  return (
    <div className={`rounded-3xl border bg-white p-5 shadow-sm ${styles}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();

  const style =
    normalized === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "REJECTED"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${style}`}
    >
      {status || "PENDING"}
    </span>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value?: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value || "-"}
      </p>
    </div>
  );
}

function formatStaticDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}