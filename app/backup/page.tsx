"use client";

import Sidebar from "@/components/Sidebar";
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

const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
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
      module: "Backup Center", // V1 Hardening Complete
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
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
              System Safety
            </p>

            <h1 className="mt-2 text-4xl font-black">Backup Center</h1>

            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Export important OPSCORE data before payroll testing, imports, deployment,
              database edits, or major system changes.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck size={18} />
              <span className="font-black">Backup Ready</span>
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 xl:col-span-2">
            <p className="font-black text-yellow-300">Recommended</p>
            <p className="mt-1 text-sm leading-6 text-yellow-100/80">
              Export a full OPSCORE backup before employee testing, payroll generation,
              attendance import, SQL migrations, deployment, or major edits.
            </p>
          </div>

          <button
            onClick={exportFullBackup}
            className="flex items-center justify-center gap-3 rounded-2xl border border-emerald-500 bg-emerald-500 px-5 py-5 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
          >
            <FileArchive size={22} />
            Export Full OPSCORE Backup
          </button>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {backupGroups.map((group) => {
            const Icon = group.icon;

            return (
              <button
                key={group.group}
                onClick={() => exportBackupGroup(group.group as BackupItem["group"])}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-emerald-500 hover:bg-slate-800/70"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <Icon size={24} />
                </div>

                <h3 className="text-lg font-black">{group.title} Backup</h3>

                <p className="mt-2 text-sm text-slate-400">
                  Export all {group.title.toLowerCase()} related tables as one JSON backup file.
                </p>
              </button>
            );
          })}
        </section>

        <section className="space-y-8">
          {backupGroups.map((group) => {
            const items = backupItems.filter((item) => item.group === group.group);
            const Icon = group.icon;

            return (
              <section
                key={group.group}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-full bg-slate-800 p-3 text-emerald-400">
                    <Icon size={22} />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black">{group.title}</h2>
                    <p className="text-sm text-slate-400">
                      Individual CSV exports for {group.title.toLowerCase()} tables.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <BackupCard
                      key={item.table}
                      title={item.title}
                      description={item.description}
                      onClick={() => exportTable(item.table, item.fileName)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </section>
      </main>
    </div>
  );
}

/// HELPER COMPONENTS
function BackupCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-emerald-500 hover:bg-slate-800/70"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
        <Download size={24} />
      </div>

      <h3 className="text-lg font-black">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </button>
  );
}
