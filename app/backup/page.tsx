"use client";

import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  CalendarDays,
  Database,
  Download,
  FileArchive,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

type BackupItem = {
  title: string;
  description: string;
  table: string;
  fileName: string;
  group: "HR" | "Payroll" | "Finance" | "Sales" | "Scheduling" | "System";
};

/// DATA
const backupItems: BackupItem[] = [
  {
    title: "Employees",
    description: "Export employee master list and HR profile data.",
    table: "employees",
    fileName: "employees_backup",
    group: "HR",
  },
  {
    title: "Attendance",
    description: "Export attendance entries used for payroll computation.",
    table: "attendance_entries",
    fileName: "attendance_backup",
    group: "Payroll",
  },
  {
    title: "Payroll Records",
    description: "Export payroll computations and payroll register rows.",
    table: "payroll_records",
    fileName: "payroll_records_backup",
    group: "Payroll",
  },
  {
    title: "Payroll Snapshots",
    description: "Export frozen payroll history and released records.",
    table: "payroll_snapshots",
    fileName: "payroll_snapshots_backup",
    group: "Payroll",
  },
  {
    title: "Payroll Settings",
    description: "Export payroll rules, defaults, and compliance settings.",
    table: "payroll_settings",
    fileName: "payroll_settings_backup",
    group: "Payroll",
  },
  {
    title: "Payroll Holidays",
    description: "Export holiday list and payroll multipliers.",
    table: "payroll_holidays",
    fileName: "payroll_holidays_backup",
    group: "Payroll",
  },
  {
    title: "Expenses",
    description: "Export expense records and linked cash releases.",
    table: "expenses",
    fileName: "expenses_backup",
    group: "Finance",
  },
  {
    title: "Cash Drawers",
    description: "Export cash drawer opening, closing, and variance records.",
    table: "finance_cash_drawers",
    fileName: "cash_drawers_backup",
    group: "Finance",
  },
  {
    title: "Cash Movements",
    description: "Export cash in, cash out, remittance, and release records.",
    table: "finance_cash_movements",
    fileName: "cash_movements_backup",
    group: "Finance",
  },
  {
    title: "Hotel Reservations",
    description: "Export imported Cloudbeds room sales reservations.",
    table: "finance_hotel_reservations",
    fileName: "hotel_reservations_backup",
    group: "Sales",
  },
  {
    title: "Hotel Revenue",
    description: "Export hotel payment/revenue ledger data.",
    table: "finance_hotel_revenue",
    fileName: "hotel_revenue_backup",
    group: "Sales",
  },
  {
    title: "Restaurant Sales",
    description: "Export Poster POS restaurant sales imports.",
    table: "restaurant_sales",
    fileName: "restaurant_sales_backup",
    group: "Sales",
  },
  {
    title: "Apartment Units",
    description: "Export apartment unit setup, tenants, and default rent.",
    table: "apartment_units",
    fileName: "apartment_units_backup",
    group: "Finance",
  },
  {
    title: "Apartment Bills",
    description: "Export apartment monthly billing records.",
    table: "apartment_bills",
    fileName: "apartment_bills_backup",
    group: "Finance",
  },
  {
    title: "Apartment Payments",
    description: "Export apartment payment records.",
    table: "apartment_payments",
    fileName: "apartment_payments_backup",
    group: "Finance",
  },
  {
    title: "Schedules",
    description: "Export employee schedules and shifts.",
    table: "schedules",
    fileName: "schedules_backup",
    group: "Scheduling",
  },
  {
    title: "Schedule Publications",
    description: "Export published schedule locks and publication history.",
    table: "schedule_publications",
    fileName: "schedule_publications_backup",
    group: "Scheduling",
  },
  {
    title: "Shift Templates",
    description: "Export shift template setup.",
    table: "shift_templates",
    fileName: "shift_templates_backup",
    group: "Scheduling",
  },
  {
    title: "Occupancy Data",
    description: "Export occupancy forecasting import data.",
    table: "occupancy_data",
    fileName: "occupancy_data_backup",
    group: "Scheduling",
  },
  {
    title: "Event Add-ons",
    description: "Export event add-ons used for HC forecasting.",
    table: "event_addons",
    fileName: "event_addons_backup",
    group: "Scheduling",
  },
  {
    title: "System Roles",
    description: "Export system roles.",
    table: "system_roles",
    fileName: "system_roles_backup",
    group: "System",
  },
  {
    title: "Role Permissions",
    description: "Export role permission matrix.",
    table: "role_permissions",
    fileName: "role_permissions_backup",
    group: "System",
  },
  {
    title: "Audit Logs",
    description: "Export unified audit trail.",
    table: "audit_logs",
    fileName: "audit_logs_backup",
    group: "System",
  },
];

const backupGroups = [
  {
    title: "HR",
    icon: Users,
    group: "HR",
  },
  {
    title: "Payroll",
    icon: Receipt,
    group: "Payroll",
  },
  {
    title: "Finance",
    icon: Wallet,
    group: "Finance",
  },
  {
    title: "Sales",
    icon: Database,
    group: "Sales",
  },
  {
    title: "Scheduling",
    icon: CalendarDays,
    group: "Scheduling",
  },
  {
    title: "System",
    icon: ShieldCheck,
    group: "System",
  },
];

/// HELPERS
const todayKey = () => new Date().toISOString().slice(0, 10);

const safeFileName = (fileName: string) =>
  `${fileName}_${todayKey()}.csv`.replace(/[^a-zA-Z0-9_.-]/g, "_");

const objectToCsv = (rows: any[]) => {
  if (!rows || rows.length === 0) return "";

  const headerSet = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => headerSet.add(key));
  });

  const headers = Array.from(headerSet);

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((field) => {
          const value = row?.[field];

          const cleanValue =
            value === null || value === undefined
              ? ""
              : typeof value === "object"
              ? JSON.stringify(value)
              : String(value);

          return `"${cleanValue.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
};

const downloadTextFile = (
  content: string,
  fileName: string,
  mimeType: string
) => {
  const blob = new Blob([content], {
    type: `${mimeType};charset=utf-8;`,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const createAuditLog = async ({
  action,
  description,
  severity = "info",
  oldValue = null,
  newValue = null,
}: {
  action: string;
  description: string;
  severity?: "info" | "warning" | "critical";
  oldValue?: any;
  newValue?: any;
}) => {
  try {
    await supabase.from("audit_logs").insert({
      module: "Backup Center",
      action,
      description,
      severity,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.log("BACKUP AUDIT ERROR:", error);
  }
};

const fetchAllRows = async (tableName: string) => {
  const pageSize = 1000;
  let from = 0;
  let allRows: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) {
      return {
        rows: allRows,
        error,
      };
    }

    const batch = data || [];
    allRows = [...allRows, ...batch];

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return {
    rows: allRows,
    error: null,
  };
};

const exportTable = async (tableName: string, fileName: string) => {
  const { rows, error } = await fetchAllRows(tableName);

  if (error) {
    await createAuditLog({
      action: "EXPORT_TABLE_FAILED",
      description: `Failed to export table: ${tableName}`,
      severity: "critical",
      newValue: {
        tableName,
        fileName,
        error: error.message,
      },
    });

    alert(`Failed to export ${tableName}: ${error.message}`);
    return;
  }

  if (!rows || rows.length === 0) {
    await createAuditLog({
      action: "EXPORT_TABLE_EMPTY",
      description: `No data found for table export: ${tableName}`,
      severity: "warning",
      newValue: {
        tableName,
        fileName,
        rows: 0,
      },
    });

    alert("No data found.");
    return;
  }

  const csv = objectToCsv(rows);

  downloadTextFile(csv, safeFileName(fileName), "text/csv");

  await createAuditLog({
    action: "BACKUP_DOWNLOAD",
    description: `Exported ${tableName} backup.`,
    severity: "info",
    newValue: {
      tableName,
      fileName,
      rows: rows.length,
      exportedAt: new Date().toISOString(),
    },
  });
};

const exportBackupGroup = async (groupName: BackupItem["group"]) => {
  const groupItems = backupItems.filter((item) => item.group === groupName);
  const backupPayload: Record<string, any[]> = {};
  const failedTables: any[] = [];

  for (const item of groupItems) {
    const { rows, error } = await fetchAllRows(item.table);

    if (error) {
      failedTables.push({
        table: item.table,
        error: error.message,
      });
    } else {
      backupPayload[item.table] = rows;
    }
  }

  if (failedTables.length > 0) {
    await createAuditLog({
      action: "EXPORT_GROUP_FAILED",
      description: `Failed to export ${groupName} backup group.`,
      severity: "critical",
      newValue: {
        groupName,
        failedTables,
      },
    });

    alert(`Some ${groupName} tables failed to export. Check console/audit logs.`);
    return;
  }

  downloadTextFile(
    JSON.stringify(
      {
        backupType: `${groupName} Backup`,
        exportedAt: new Date().toISOString(),
        tables: backupPayload,
      },
      null,
      2
    ),
    `opscore_${groupName.toLowerCase()}_backup_${todayKey()}.json`,
    "application/json"
  );

  await createAuditLog({
    action: "CREATE_BACKUP",
    description: `Exported ${groupName} backup group.`,
    severity: "warning",
    newValue: {
      groupName,
      tables: groupItems.map((item) => item.table),
      tableCount: groupItems.length,
      exportedAt: new Date().toISOString(),
    },
  });
};

const exportFullBackup = async () => {
  const confirmExport = confirm(
    "Export full OPSCORE backup? This may take longer if tables are large."
  );

  if (!confirmExport) return;

  const backupPayload: Record<string, any[]> = {};
  const failedTables: any[] = [];

  for (const item of backupItems) {
    const { rows, error } = await fetchAllRows(item.table);

    if (error) {
      failedTables.push({
        table: item.table,
        error: error.message,
      });
    } else {
      backupPayload[item.table] = rows;
    }
  }

  if (failedTables.length > 0) {
    await createAuditLog({
      action: "EXPORT_FULL_BACKUP_FAILED",
      description: "Failed to export full OPSCORE backup.",
      severity: "critical",
      newValue: {
        failedTables,
      },
    });

    alert("Some tables failed to export. Check audit logs.");
    return;
  }

  downloadTextFile(
    JSON.stringify(
      {
        backupType: "Full OPSCORE Backup",
        exportedAt: new Date().toISOString(),
        app: "OPSCORE",
        version: "V2",
        tables: backupPayload,
      },
      null,
      2
    ),
    `opscore_full_backup_${todayKey()}.json`,
    "application/json"
  );

  await createAuditLog({
    action: "EXPORT_BACKUP",
    description: "Exported full OPSCORE backup.",
    severity: "warning",
    newValue: {
      tableCount: backupItems.length,
      tables: backupItems.map((item) => item.table),
      exportedAt: new Date().toISOString(),
    },
  });
};

//// UI
export default function BackupPage() {
  return (
    <PageGuard moduleKey="backup_restore">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="SYSTEM SAFETY / BACKUP CENTER" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  System Safety
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Backup Center
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Export important OPSCORE data before payroll testing, imports,
                  deployment, database edits, or major system changes.
                </p>
              </div>

              <button
                onClick={exportFullBackup}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
              >
                <FileArchive size={17} />
                Export Full OPSCORE Backup
              </button>
            </section>

            <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-700">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
                Recommended
              </p>
              <p className="mt-2">
                Export a full OPSCORE backup before employee testing, payroll
                generation, attendance import, SQL migrations, deployment, or
                major edits.
              </p>
            </section>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Backup Groups
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Group Backup Actions
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Export full module groups as JSON backup files.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                {backupGroups.map((group) => {
                  const Icon = group.icon;

                  return (
                    <button
                      key={group.group}
                      onClick={() =>
                        exportBackupGroup(group.group as BackupItem["group"])
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                        <Icon size={19} />
                      </div>

                      <h3 className="text-sm font-black text-slate-950">
                        {group.title} Backup
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        Export all {group.title.toLowerCase()} related tables
                        as one JSON backup file.
                      </p>

                      <p className="mt-4 inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                        Export Group
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              {backupGroups.map((group) => {
                const items = backupItems.filter(
                  (item) => item.group === group.group
                );

                const Icon = group.icon;

                return (
                  <section
                    key={group.group}
                    className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                        <Icon size={19} />
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Individual CSV Exports
                        </p>
                        <h2 className="mt-2 text-xl font-black text-slate-950">
                          {group.title}
                        </h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Individual CSV exports for{" "}
                          {group.title.toLowerCase()} tables.
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <BackupRow
                          key={item.table}
                          title={item.title}
                          description={item.description}
                          table={item.table}
                          onClick={() => exportTable(item.table, item.fileName)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

/// HELPER COMPONENTS
function BackupRow({
  title,
  description,
  table,
  onClick,
}: {
  title: string;
  description: string;
  table: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 transition-all duration-200 hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-black text-slate-950">{title}</h3>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {table}
          </span>
        </div>

        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <button
        onClick={onClick}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
      >
        <Download size={16} />
        Export CSV
      </button>
    </div>
  );
}