"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  DollarSign,
  Eye,
  FileText,
  Printer,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import OpscoreAssistant from "@/components/OpscoreAssistant";
import { supabase } from "@/lib/supabase";

export default function PayrollReleaseHistoryPage() {
  /// STATES
  const [releaseRows, setReleaseRows] = useState<any[]>([]);
  const [releaseItems, setReleaseItems] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [activeRelease, setActiveRelease] = useState<any | null>(null);

  /// HELPERS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDateTime = (value: any) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCurrentCompanyId = () => {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("opscore_current_company_id") ||
      localStorage.getItem("opscore_company_id") ||
      localStorage.getItem("company_id") ||
      ""
    );
  };

  const getPeriodLabel = (row: any) =>
    row?.period_name ||
    row?.period_label ||
    row?.payroll_period ||
    row?.snapshot_no ||
    row?.release_no ||
    "Payroll Period";

  const mapById = (rows: any[] = []) =>
    new Map(rows.map((row) => [String(row.id), row]));

  /// DATA LOADERS
  const getHistory = async () => {
    setIsLoading(true);

    const currentCompanyId = getCurrentCompanyId();

    let releaseQuery = supabase
      .from("released_payrolls")
      .select("*")
      .order("released_at", { ascending: false });

    if (currentCompanyId) {
      releaseQuery = releaseQuery.eq("company_id", currentCompanyId);
    }

    const { data: releasedPayrolls, error: releaseError } = await releaseQuery;

    if (releaseError) {
      setIsLoading(false);
      console.log("GET RELEASED PAYROLLS ERROR:", releaseError.message);
      alert("Failed to load released payroll history.");
      return;
    }

    const releases = releasedPayrolls || [];
    const releaseIds = releases.map((release) => release.id).filter(Boolean);
    const snapshotIds = releases.map((release) => release.snapshot_id).filter(Boolean);

    let items: any[] = [];
    let snapshots: any[] = [];
    let periodRows: any[] = [];
    let logs: any[] = [];

    if (releaseIds.length > 0) {
      const { data: itemRows, error: itemError } = await supabase
        .from("released_payroll_items")
        .select("*")
        .in("release_id", releaseIds)
        .order("created_at", { ascending: false });

      if (itemError) {
        console.log("GET RELEASED PAYROLL ITEMS ERROR:", itemError.message);
      } else {
        items = itemRows || [];
      }
    }

    if (snapshotIds.length > 0) {
      const { data: snapshotRows, error: snapshotError } = await supabase
        .from("payroll_snapshots")
        .select("*")
        .in("id", snapshotIds);

      if (snapshotError) {
        console.log("GET SNAPSHOTS FOR HISTORY ERROR:", snapshotError.message);
      } else {
        snapshots = snapshotRows || [];
      }
    }

    const periodIds = Array.from(
      new Set(snapshots.map((snapshot) => snapshot.period_id).filter(Boolean)),
    );

    if (periodIds.length > 0) {
      const { data: payrollPeriods, error: periodsError } = await supabase
        .from("payroll_periods")
        .select("*")
        .in("id", periodIds)
        .order("created_at", { ascending: false });

      if (periodsError) {
        console.log("GET PERIODS FOR HISTORY ERROR:", periodsError.message);
      } else {
        periodRows = payrollPeriods || [];
      }
    }

    const auditSearchIds = [...releaseIds, ...snapshotIds, ...periodIds].filter(Boolean);

    if (auditSearchIds.length > 0) {
      const { data: auditRows, error: auditError } = await supabase
        .from("audit_logs")
        .select("*")
        .in("record_id", auditSearchIds)
        .order("created_at", { ascending: false })
        .limit(300);

      if (auditError) {
        console.log("GET PAYROLL AUDIT LOGS ERROR:", auditError.message);
      } else {
        logs = auditRows || [];
      }
    }

    const snapshotsById = mapById(snapshots);
    const periodsById = mapById(periodRows);

    const mappedReleases = releases.map((release) => {
      const snapshot = snapshotsById.get(String(release.snapshot_id || "")) || {};
      const period = periodsById.get(String(snapshot.period_id || "")) || {};
      const releaseEmployeeItems = items.filter(
        (item) => String(item.release_id) === String(release.id),
      );

      return {
        ...release,
        snapshot,
        period,
        period_id: snapshot.period_id || null,
        period_label: getPeriodLabel(period) || snapshot.snapshot_no || release.release_no,
        snapshot_no: snapshot.snapshot_no || "-",
        employee_count: releaseEmployeeItems.length,
        gross_total: releaseEmployeeItems.reduce(
          (sum, item) => sum + Number(item.gross_pay || 0),
          0,
        ),
        deduction_total: releaseEmployeeItems.reduce(
          (sum, item) => sum + Number(item.deductions || 0),
          0,
        ),
        net_total: releaseEmployeeItems.reduce(
          (sum, item) => sum + Number(item.net_pay || 0),
          0,
        ),
        released_total: releaseEmployeeItems.reduce(
          (sum, item) => sum + Number(item.released_amount || 0),
          0,
        ),
      };
    });

    setReleaseRows(mappedReleases);
    setReleaseItems(items);
    setPeriods(periodRows);
    setAuditLogs(logs);
    setIsLoading(false);
  };

  useEffect(() => {
    getHistory();
  }, []);

  /// CALCULATIONS
  const filteredRows = useMemo(() => {
    return releaseRows.filter((row) => {
      const matchesSearch = `${row.release_no} ${row.period_label} ${row.snapshot_no} ${row.released_by} ${row.status}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesPeriod =
        periodFilter === "ALL" || String(row.period_id) === String(periodFilter);

      const matchesStatus =
        statusFilter === "ALL" || String(row.status || "").toUpperCase() === statusFilter;

      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }, [releaseRows, searchTerm, periodFilter, statusFilter]);

  const totalReleases = filteredRows.length;
  const totalEmployees = filteredRows.reduce(
    (sum, row) => sum + Number(row.employee_count || 0),
    0,
  );
  const totalReleased = filteredRows.reduce(
    (sum, row) => sum + Number(row.released_total || 0),
    0,
  );
  const totalNet = filteredRows.reduce(
    (sum, row) => sum + Number(row.net_total || 0),
    0,
  );

  const activeItems = activeRelease
    ? releaseItems.filter((item) => String(item.release_id) === String(activeRelease.id))
    : [];

  const activeAuditLogs = activeRelease
    ? auditLogs.filter((log) => {
        const ids = [
          String(activeRelease.id || ""),
          String(activeRelease.snapshot_id || ""),
          String(activeRelease.period_id || ""),
        ];
        return ids.includes(String(log.record_id || ""));
      })
    : [];

  const assistantReminders = [
    {
      type: "Information" as const,
      tone: "info" as const,
      text:
        totalReleases > 0
          ? `${totalReleases} released payroll batch(es) found in History.`
          : "No released payroll history found yet.",
    },
    ...(totalReleased > 0
      ? [
          {
            type: "Information" as const,
            tone: "info" as const,
            text: `Total released payroll in view: ${formatMoney(totalReleased)}.`,
          },
        ]
      : []),
  ];

  /// UI
  return (
    <PageGuard moduleKey="release_history">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />
        <TopNavbar breadcrumb="PAYROLL / RELEASE HISTORY" />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Payroll Audit Layer
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Payroll Release History
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  Immutable release history sourced from released payroll headers,
                  released payroll items, snapshots, payroll periods, and audit logs.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                <Printer size={16} /> Print
              </button>
            </div>
          </section>

          <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={<FileText size={20} />} title="Total Releases" value={totalReleases} />
            <KpiCard icon={<Users size={20} />} title="Employees Paid" value={totalEmployees} />
            <KpiCard icon={<DollarSign size={20} />} title="Net Payroll" value={formatMoney(totalNet)} />
            <KpiCard icon={<DollarSign size={20} />} title="Released Amount" value={formatMoney(totalReleased)} success />
          </section>

          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px_220px_auto] lg:items-center">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search release no., period, snapshot, released by, or status..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All Periods</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {getPeriodLabel(period)}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All Status</option>
                <option value="RELEASED">Released</option>
                <option value="VOIDED">Voided</option>
                <option value="CORRECTED">Corrected</option>
              </select>

              <button
                onClick={getHistory}
                disabled={isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} /> {isLoading ? "Loading" : "Refresh"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Release Batches</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {isLoading ? "Loading release history..." : `${filteredRows.length} release batch(es) found.`}
                </p>
              </div>
            </div>

            <div className="overflow-auto p-6 pt-0">
              <table className="w-full min-w-[1180px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Release No.</th>
                    <th className="px-4 py-3">Payroll Period</th>
                    <th className="px-4 py-3">Snapshot</th>
                    <th className="px-4 py-3 text-right">Employees</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-right">Released</th>
                    <th className="px-4 py-3">Released By</th>
                    <th className="px-4 py-3">Released At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="transition-all duration-200 hover:bg-slate-50">
                      <td className="px-4 py-4 font-black text-slate-950">{row.release_no || row.id}</td>
                      <td className="px-4 py-4">{row.period_label || "-"}</td>
                      <td className="px-4 py-4 text-slate-500">{row.snapshot_no || "-"}</td>
                      <td className="px-4 py-4 text-right font-black text-slate-950">{row.employee_count}</td>
                      <td className="px-4 py-4 text-right font-black text-slate-950">{formatMoney(row.net_total)}</td>
                      <td className="px-4 py-4 text-right font-black text-emerald-700">{formatMoney(row.released_total)}</td>
                      <td className="px-4 py-4">{row.released_by || "-"}</td>
                      <td className="px-4 py-4">{formatDateTime(row.released_at)}</td>
                      <td className="px-4 py-4"><StatusBadge value={row.status || "RELEASED"} /></td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setActiveRelease(row)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-14 text-center text-sm font-semibold text-slate-500">
                        No released payroll history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {activeRelease && (
          <ReleaseHistoryDrawer
            release={activeRelease}
            items={activeItems}
            auditLogs={activeAuditLogs}
            onClose={() => setActiveRelease(null)}
            formatMoney={formatMoney}
            formatDateTime={formatDateTime}
          />
        )}

        <OpscoreAssistant reminders={assistantReminders} />
      </div>
    </PageGuard>
  );
}

function ReleaseHistoryDrawer({ release, items, auditLogs, onClose, formatMoney, formatDateTime }: any) {
  const gross = items.reduce((sum: number, item: any) => sum + Number(item.gross_pay || 0), 0);
  const deductions = items.reduce((sum: number, item: any) => sum + Number(item.deductions || 0), 0);
  const net = items.reduce((sum: number, item: any) => sum + Number(item.net_pay || 0), 0);
  const released = items.reduce((sum: number, item: any) => sum + Number(item.released_amount || 0), 0);

  return (
    <>
      <div className="fixed left-0 right-0 top-16 z-40 h-[calc(100vh-64px)] bg-slate-950/35" onClick={onClose} />
      <aside className="fixed right-0 top-16 z-50 flex h-[calc(100vh-64px)] w-full max-w-[900px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Release Batch</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{release.release_no || "Released Payroll"}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {release.period_label} • {formatDateTime(release.released_at)}
            </p>
          </div>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F5F7FB] p-6">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <MiniStat label="Employees" value={items.length} />
            <MiniStat label="Gross" value={formatMoney(gross)} />
            <MiniStat label="Deductions" value={formatMoney(deductions)} />
            <MiniStat label="Released" value={formatMoney(released)} success />
          </div>

          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Release Details</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <InfoLine label="Release No." value={release.release_no || release.id} />
              <InfoLine label="Snapshot No." value={release.snapshot_no || "-"} />
              <InfoLine label="Released By" value={release.released_by || "-"} />
              <InfoLine label="Released At" value={formatDateTime(release.released_at)} />
              <InfoLine label="Net Total" value={formatMoney(net)} />
              <InfoLine label="Status" value={release.status || "RELEASED"} />
            </div>
          </section>

          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Employee Breakdown</h3>
            <div className="mt-4 overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-right">Released</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-black text-slate-950">{item.employee_name}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(item.gross_pay)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(item.deductions)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(item.net_pay)}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700">{formatMoney(item.released_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Audit Timeline</h3>
            <div className="mt-4 space-y-3">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-black text-slate-950">{log.action || "Audit Event"}</p>
                  <p className="mt-1 text-slate-600">{log.description || "No description."}</p>
                  <p className="mt-2 text-xs font-bold text-slate-500">{formatDateTime(log.created_at)}</p>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  No matching audit logs found yet for this release.
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function KpiCard({ icon, title, value, success }: { icon: React.ReactNode; title: string; value: any; success?: boolean }) {
  return (
    <div className={success ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700" : "rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm"}>
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-100 p-3 text-slate-700">{icon}</div>
        <p className="text-sm font-bold text-slate-500">{title}</p>
      </div>
      <h2 className="text-2xl font-black tracking-tight">{value}</h2>
    </div>
  );
}

function MiniStat({ label, value, success }: any) {
  return (
    <div className={success ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700" : "rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm"}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ value }: any) {
  const normalized = String(value || "").toUpperCase();
  const color =
    normalized === "RELEASED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "VOIDED"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${color}`}>{normalized}</span>;
}


