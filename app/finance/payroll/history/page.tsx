"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  DollarSign,
  FileText,
  Printer,
  Search,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import PageGuard from "@/components/PageGuard";

export default function PayrollReleaseHistoryPage() {
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);

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

  const getHistory = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("payroll_release_history")
      .select("*")
      .order("released_at", { ascending: false })
      .order("employee_name", { ascending: true });

    setIsLoading(false);

    if (error) {
      console.log("GET PAYROLL RELEASE HISTORY ERROR:", error.message);
      alert("Failed to load payroll release history.");
      return;
    }

    setHistoryRows(data || []);
  };

  const getPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("id, period_name")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET PERIODS ERROR:", error.message);
      return;
    }

    setPeriods(data || []);
  };

  useEffect(() => {
    getHistory();
    getPeriods();
  }, []);

  const departments = useMemo(() => {
    return Array.from(
      new Set(historyRows.map((row) => row.department).filter(Boolean))
    ).sort();
  }, [historyRows]);

  const filteredRows = useMemo(() => {
    return historyRows.filter((row) => {
      const matchesSearch = `${row.employee_no} ${row.employee_name} ${row.department} ${row.cutoff_label} ${row.released_by}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesPeriod =
        periodFilter === "ALL" || String(row.period_id) === String(periodFilter);

      const matchesDepartment =
        departmentFilter === "ALL" || row.department === departmentFilter;

      return matchesSearch && matchesPeriod && matchesDepartment;
    });
  }, [historyRows, searchTerm, periodFilter, departmentFilter]);

  const totalEmployees = filteredRows.length;
  const totalGross = filteredRows.reduce(
    (sum, row) => sum + Number(row.gross_pay || 0),
    0
  );
  const totalDeductions = filteredRows.reduce(
    (sum, row) => sum + Number(row.total_deductions || 0),
    0
  );
  const totalReleased = filteredRows.reduce(
    (sum, row) => sum + Number(row.released_amount || 0),
    0
  );
  const totalCarryForward = filteredRows.reduce(
    (sum, row) => sum + Number(row.carry_forward_amount || 0),
    0
  );

  return (
  <PageGuard moduleKey="payroll_history">
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Payroll
            </p>
            <h1 className="mt-2 text-3xl font-black">Payroll Release History</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Permanent release snapshots for payroll audit, owner verification,
              employee disputes, and future payslip reprints.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
          >
            <Printer size={16} /> Print
          </button>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={<Users size={22} />} title="Released Records" value={totalEmployees} />
          <KpiCard icon={<DollarSign size={22} />} title="Gross Pay" value={formatMoney(totalGross)} />
          <KpiCard icon={<FileText size={22} />} title="Deductions" value={formatMoney(totalDeductions)} danger={totalDeductions > 0} />
          <KpiCard icon={<DollarSign size={22} />} title="Released Amount" value={formatMoney(totalReleased)} success />
          <KpiCard icon={<CalendarDays size={22} />} title="Carry Forward" value={formatMoney(totalCarryForward)} danger={totalCarryForward > 0} />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee, cutoff, released by..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none"
              />
            </div>

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">All Cutoffs</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.period_name}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Release Records</h2>
              <p className="mt-1 text-sm text-slate-400">
                {isLoading ? "Loading release history..." : `${filteredRows.length} record(s) found.`}
              </p>
            </div>

            <button
              onClick={getHistory}
              disabled={isLoading}
              className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-[680px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1450px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Released At</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Cutoff</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3 text-right">Released</th>
                  <th className="px-4 py-3 text-right">Carry Forward</th>
                  <th className="px-4 py-3">Released By</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-300">
                      {formatDateTime(row.released_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-black">{row.employee_name}</p>
                      <p className="text-xs text-slate-500">{row.employee_no || "-"}</p>
                    </td>
                    <td className="px-4 py-3">{row.department || "-"}</td>
                    <td className="px-4 py-3">{row.cutoff_label || "-"}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(row.gross_pay)}</td>
                    <td className="px-4 py-3 text-right text-red-300">
                      {formatMoney(row.total_deductions)}
                    </td>
                    <td className={`px-4 py-3 text-right font-black ${
                      Number(row.net_pay || 0) < 0 ? "text-red-400" : "text-emerald-400"
                    }`}>
                      {formatMoney(row.net_pay)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-300">
                      {formatMoney(row.released_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-yellow-300">
                      {formatMoney(row.carry_forward_amount)}
                    </td>
                    <td className="px-4 py-3">{row.released_by || "-"}</td>
                    <td className="px-4 py-3 text-slate-400">{row.remarks || "-"}</td>
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                      No release history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
       </div>
  </PageGuard>
  );
}

function KpiCard({
  icon,
  title,
  value,
  success,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/20 bg-red-500/10"
          : success
          ? "border-green-500/20 bg-green-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-yellow-400">
          {icon}
        </div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>

      <h2 className="text-2xl font-black">{value}</h2>
    </div>
  );
}
