"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type BackupTable = {
  key: string;
  label: string;
  table: string;
  group: string;
};

export default function BackupCenterPage() {
  /// STATES
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [exporting, setExporting] = useState("");

  /// DATA
  const todayKey = new Date().toISOString().slice(0, 10);

  const backupTables: BackupTable[] = [
    { key: "employees", label: "Employees", table: "employees", group: "HR" },
    { key: "schedules", label: "Schedules", table: "schedules", group: "Operations" },
    { key: "attendance", label: "Attendance", table: "attendance_entries", group: "Payroll" },
    { key: "leaves", label: "Leave Requests", table: "leave_requests", group: "HR" },

    { key: "payroll_periods", label: "Payroll Periods", table: "payroll_periods", group: "Payroll" },
    { key: "payroll_records", label: "Payroll Records", table: "payroll_records", group: "Payroll" },
    { key: "payroll_adjustments", label: "Payroll Adjustments", table: "payroll_adjustments", group: "Payroll" },
    { key: "employee_balances", label: "Employee Balances", table: "employee_balances", group: "Payroll" },

    { key: "expenses", label: "Expenses", table: "expenses", group: "Finance" },
    { key: "cash_drawers", label: "Cash Drawers", table: "cash_drawers", group: "Finance" },
    { key: "cash_drawer_entries", label: "Cash Drawer Entries", table: "cash_drawer_entries", group: "Finance" },

    { key: "occupancy", label: "Occupancy Data", table: "occupancy_data", group: "Operations" },
    { key: "events", label: "Event Add-ons", table: "event_addons", group: "Operations" },
    { key: "hc_rules", label: "HC Rule Settings", table: "hc_rule_settings", group: "Settings" },
    { key: "shift_templates", label: "Shift Templates", table: "shift_templates", group: "Settings" },
    { key: "payroll_settings", label: "Payroll Settings", table: "payroll_settings", group: "Settings" },
  ];

  const groups = Array.from(new Set(backupTables.map((item) => item.group)));

  /// HELPERS
  const safeSheetName = (name: string) =>
    name.replace(/[\\/?*[\]:]/g, "").slice(0, 31);

  const getRows = async (tableName: string) => {
    const { data, error } = await supabase.from(tableName).select("*");

    if (error) {
      console.log(`BACKUP ERROR ${tableName}:`, error.message);
      return {
        data: [],
        error: error.message,
      };
    }

    return {
      data: data || [],
      error: "",
    };
  };

  const writeWorkbook = (workbook: XLSX.WorkBook, fileName: string) => {
    XLSX.writeFile(workbook, fileName);
  };

  /// FUNCTIONS
  const loadCounts = async () => {
    setLoadingCounts(true);

    const nextCounts: Record<string, number> = {};

    for (const item of backupTables) {
      const { data } = await getRows(item.table);
      nextCounts[item.key] = data.length;
    }

    setCounts(nextCounts);
    setLoadingCounts(false);
  };

  const exportSingleTable = async (item: BackupTable) => {
    setExporting(item.key);

    const { data, error } = await getRows(item.table);

    const workbook = XLSX.utils.book_new();

    const rows =
      data.length > 0
        ? data
        : [
            {
              message: error
                ? `Table export failed: ${error}`
                : "No records found.",
            },
          ];

    const worksheet = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      safeSheetName(item.label)
    );

    writeWorkbook(
      workbook,
      `${item.table}_backup_${todayKey}.xlsx`
    );

    setExporting("");
  };

  const exportGroup = async (group: string) => {
    setExporting(group);

    const workbook = XLSX.utils.book_new();
    const groupTables = backupTables.filter((item) => item.group === group);

    for (const item of groupTables) {
      const { data, error } = await getRows(item.table);

      const rows =
        data.length > 0
          ? data
          : [
              {
                message: error
                  ? `Table export failed: ${error}`
                  : "No records found.",
              },
            ];

      const worksheet = XLSX.utils.json_to_sheet(rows);

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        safeSheetName(item.label)
      );
    }

    writeWorkbook(
      workbook,
      `opscore_${group.toLowerCase()}_backup_${todayKey}.xlsx`
    );

    setExporting("");
  };

  const exportAll = async () => {
    const confirmed = confirm(
      "Export full OPSCORE backup? This may take a few seconds depending on data size."
    );

    if (!confirmed) return;

    setExporting("ALL");

    const workbook = XLSX.utils.book_new();

    const summaryRows: any[] = [];

    for (const item of backupTables) {
      const { data, error } = await getRows(item.table);

      summaryRows.push({
        group: item.group,
        label: item.label,
        table: item.table,
        records: data.length,
        status: error ? "Error" : "OK",
        error,
        exported_at: new Date().toISOString(),
      });

      const rows =
        data.length > 0
          ? data
          : [
              {
                message: error
                  ? `Table export failed: ${error}`
                  : "No records found.",
              },
            ];

      const worksheet = XLSX.utils.json_to_sheet(rows);

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        safeSheetName(item.label)
      );
    }

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Backup Summary");

    writeWorkbook(workbook, `opscore_full_backup_${todayKey}.xlsx`);

    setExporting("");
  };

  /// EFFECTS
  useEffect(() => {
    loadCounts();
  }, []);

  /// CALCULATIONS
  const totalRecords = Object.values(counts).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              System Safety
            </p>

            <h1 className="mt-2 text-4xl font-black">Backup Center</h1>

            <p className="mt-2 max-w-5xl text-sm text-slate-400">
              Export critical OPSCORE data before imports, payroll processing,
              deployments, or major edits.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadCounts}
              disabled={loadingCounts || !!exporting}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCcw size={16} />
              {loadingCounts ? "Refreshing..." : "Refresh Counts"}
            </button>

            <button
              onClick={exportAll}
              disabled={!!exporting}
              className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <Download size={16} />
              {exporting === "ALL" ? "Exporting..." : "Export Full Backup"}
            </button>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <SummaryCard
            icon={<Database size={24} />}
            title="Backup Tables"
            value={backupTables.length}
          />

          <SummaryCard
            icon={<FileSpreadsheet size={24} />}
            title="Total Records"
            value={totalRecords}
          />

          <SummaryCard
            icon={<ShieldCheck size={24} />}
            title="Backup Date"
            value={todayKey}
          />
        </section>

        <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
          <p className="font-black text-yellow-300">Recommended usage</p>
          <p className="mt-1 text-sm text-yellow-100/80">
            Run Full Backup before uploading attendance, generating payroll,
            importing schedules, or editing live data.
          </p>
        </section>

        {groups.map((group) => {
          const groupTables = backupTables.filter((item) => item.group === group);
          const groupCount = groupTables.reduce(
            (sum, item) => sum + Number(counts[item.key] || 0),
            0
          );

          return (
            <section
              key={group}
              className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-2xl font-black">{group}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {groupTables.length} table(s) • {groupCount} record(s)
                  </p>
                </div>

                <button
                  onClick={() => exportGroup(group)}
                  disabled={!!exporting}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {exporting === group ? "Exporting..." : `Export ${group}`}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {groupTables.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <p className="text-sm text-slate-400">{item.label}</p>

                    <h3 className="mt-2 text-3xl font-black">
                      {counts[item.key] ?? 0}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Table: {item.table}
                    </p>

                    <button
                      onClick={() => exportSingleTable(item)}
                      disabled={!!exporting}
                      className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {exporting === item.key ? "Exporting..." : "Export"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
}: {
  icon: any;
  title: string;
  value: any;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-amber-400">
          {icon}
        </div>

        <p className="text-sm text-slate-400">{title}</p>
      </div>

      <h2 className="text-3xl font-black">{value}</h2>
    </div>
  );
}