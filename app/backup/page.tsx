"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  FileCog,
  Layers3,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

type BackupGroup =
  | "Master Data"
  | "Security"
  | "HR"
  | "Payroll"
  | "Finance"
  | "Approvals"
  | "Workforce"
  | "POS"
  | "Settings"
  | "Audit";

type BackupRowData = Record<string, unknown>;

type FailedTable = {
  table: string;
  error: string;
};

type BackupItem = {
  title: string;
  description: string;
  table: string;
  fileName: string;
  group: BackupGroup;
  critical?: boolean;
};

type HealthSnapshot = {
  companies: number;
  employees: number;
  systemUsers: number;
  companyUsers: number;
  rolePermissions: number;
  loading: boolean;
};

type HealthManifest = Omit<HealthSnapshot, "loading">;

type BackupGroupConfig = {
  title: string;
  group: BackupGroup;
  icon: LucideIcon;
  description: string;
};

const backupItems: BackupItem[] = [
  { title: "Companies", description: "Export SaaS company records and tenant foundation.", table: "companies", fileName: "companies_backup", group: "Master Data", critical: true },
  { title: "Employees", description: "Export employee master list and HR profile data.", table: "employees", fileName: "employees_backup", group: "Master Data", critical: true },
  { title: "Departments", description: "Export department master data.", table: "departments", fileName: "departments_backup", group: "Master Data", critical: true },
  { title: "Employment Statuses", description: "Export employment status setup.", table: "employment_statuses", fileName: "employment_statuses_backup", group: "Master Data", critical: true },
  { title: "Employment Types", description: "Export employment type setup.", table: "employment_types", fileName: "employment_types_backup", group: "Master Data", critical: true },
  { title: "Document Sequences", description: "Export reference number and document numbering engine.", table: "document_sequences", fileName: "document_sequences_backup", group: "Master Data", critical: true },

  { title: "System Users", description: "Export OPSCORE admin/system user records.", table: "system_users", fileName: "system_users_backup", group: "Security", critical: true },
  { title: "Company Users", description: "Export tenant-user access links.", table: "company_users", fileName: "company_users_backup", group: "Security", critical: true },
  { title: "System Roles", description: "Export system role definitions.", table: "system_roles", fileName: "system_roles_backup", group: "Security", critical: true },
  { title: "Role Permissions", description: "Export permission matrix and module access rules.", table: "role_permissions", fileName: "role_permissions_backup", group: "Security", critical: true },

  { title: "Approval Assignments", description: "Export employee-based approval routing assignments.", table: "approval_assignments", fileName: "approval_assignments_backup", group: "Approvals", critical: true },
  { title: "Approval Workflows", description: "Export approval workflow configuration.", table: "approval_workflows", fileName: "approval_workflows_backup", group: "Approvals", critical: true },
  { title: "Approval Requests", description: "Export UAT/live approval request history.", table: "approval_requests", fileName: "approval_requests_backup", group: "Approvals" },

  { title: "Leave Requests", description: "Export leave request history.", table: "leave_requests", fileName: "leave_requests_backup", group: "HR" },
  { title: "Employee Registration Requests", description: "Export onboarding registration queue/history.", table: "employee_registration_requests", fileName: "employee_registration_requests_backup", group: "HR" },
  { title: "Employee Coaching Logs", description: "Export coaching and performance notes.", table: "employee_coaching_logs", fileName: "employee_coaching_logs_backup", group: "HR" },
  { title: "Performance History", description: "Export employee performance history.", table: "performance_history", fileName: "performance_history_backup", group: "HR" },

  { title: "Attendance Entries", description: "Export attendance entries used for payroll computation.", table: "attendance_entries", fileName: "attendance_entries_backup", group: "Workforce" },
  { title: "Schedules", description: "Export employee schedules and shifts.", table: "schedules", fileName: "schedules_backup", group: "Workforce" },
  { title: "Schedule Publications", description: "Export published schedule locks and publication history.", table: "schedule_publications", fileName: "schedule_publications_backup", group: "Workforce" },
  { title: "Shift Templates", description: "Export shift template setup.", table: "shift_templates", fileName: "shift_templates_backup", group: "Workforce" },
  { title: "Occupancy Data", description: "Export occupancy forecasting import data.", table: "occupancy_data", fileName: "occupancy_data_backup", group: "Workforce" },
  { title: "Event Add-ons", description: "Export event add-ons used for HC forecasting.", table: "event_addons", fileName: "event_addons_backup", group: "Workforce" },

  { title: "Payroll Periods", description: "Export payroll cut-off periods.", table: "payroll_periods", fileName: "payroll_periods_backup", group: "Payroll" },
  { title: "Payroll Records", description: "Export payroll computations and payroll register rows.", table: "payroll_records", fileName: "payroll_records_backup", group: "Payroll" },
  { title: "Payroll Snapshots", description: "Export frozen payroll snapshots.", table: "payroll_snapshots", fileName: "payroll_snapshots_backup", group: "Payroll" },
  { title: "Payroll Snapshot Items", description: "Export payroll snapshot line items.", table: "payroll_snapshot_items", fileName: "payroll_snapshot_items_backup", group: "Payroll" },
  { title: "Payroll Release Transactions", description: "Export payroll release transaction history.", table: "payroll_release_transactions", fileName: "payroll_release_transactions_backup", group: "Payroll" },
  { title: "Payroll Release History", description: "Export released payroll audit/history records.", table: "payroll_release_history", fileName: "payroll_release_history_backup", group: "Payroll" },
  { title: "Payroll Holidays", description: "Export holiday list and payroll multipliers.", table: "payroll_holidays", fileName: "payroll_holidays_backup", group: "Payroll", critical: true },
  { title: "Payroll Deduction Types", description: "Export payroll deduction type setup.", table: "payroll_deduction_types", fileName: "payroll_deduction_types_backup", group: "Payroll", critical: true },

  { title: "Employee Balances", description: "Export employee balance monitor records.", table: "employee_balances", fileName: "employee_balances_backup", group: "Finance" },
  { title: "Cash Advance Requests", description: "Export cash advance request records.", table: "cash_advance_requests", fileName: "cash_advance_requests_backup", group: "Finance" },
  { title: "Expense Requests", description: "Export expense approval requests.", table: "expense_requests", fileName: "expense_requests_backup", group: "Finance" },
  { title: "Expenses", description: "Export posted expense ledger records.", table: "expenses", fileName: "expenses_backup", group: "Finance" },
  { title: "Finance Bills", description: "Export bills monitoring records.", table: "finance_bills", fileName: "finance_bills_backup", group: "Finance" },
  { title: "Cash Management", description: "Export cash drawer/session management records.", table: "finance_cash_management", fileName: "finance_cash_management_backup", group: "Finance" },
  { title: "Cash Counts", description: "Export physical cash count records.", table: "finance_cash_counts", fileName: "finance_cash_counts_backup", group: "Finance" },
  { title: "Cash Movements", description: "Export cash in, cash out, remittance, and release records.", table: "finance_cash_movements", fileName: "finance_cash_movements_backup", group: "Finance" },
  { title: "Hotel Reservations", description: "Export hotel reservations / room sales records.", table: "finance_hotel_reservations", fileName: "finance_hotel_reservations_backup", group: "Finance" },
  { title: "Hotel Revenue", description: "Export hotel payment/revenue ledger data.", table: "finance_hotel_revenue", fileName: "finance_hotel_revenue_backup", group: "Finance" },
  { title: "Apartment Units", description: "Export apartment unit setup and tenant data.", table: "apartment_units", fileName: "apartment_units_backup", group: "Finance", critical: true },
  { title: "Apartment Bills", description: "Export apartment monthly billing records.", table: "apartment_bills", fileName: "apartment_bills_backup", group: "Finance" },
  { title: "Apartment Payments", description: "Export apartment payment records.", table: "apartment_payments", fileName: "apartment_payments_backup", group: "Finance" },

  { title: "POS Categories", description: "Export POS category setup.", table: "pos_categories", fileName: "pos_categories_backup", group: "POS", critical: true },
  { title: "POS Menu Groups", description: "Export POS menu group setup.", table: "pos_menu_groups", fileName: "pos_menu_groups_backup", group: "POS", critical: true },
  { title: "POS Menu Items", description: "Export POS menu items and prices.", table: "pos_menu_items", fileName: "pos_menu_items_backup", group: "POS", critical: true },
  { title: "POS Sessions", description: "Export POS cashier sessions.", table: "pos_sessions", fileName: "pos_sessions_backup", group: "POS" },
  { title: "POS Orders", description: "Export POS orders.", table: "pos_orders", fileName: "pos_orders_backup", group: "POS" },
  { title: "POS Order Items", description: "Export POS order line items.", table: "pos_order_items", fileName: "pos_order_items_backup", group: "POS" },

  { title: "Payroll Settings", description: "Export payroll rules, defaults, and compliance settings.", table: "payroll_settings", fileName: "payroll_settings_backup", group: "Settings", critical: true },
  { title: "Leave Settings", description: "Export leave rules and credit configuration.", table: "leave_settings", fileName: "leave_settings_backup", group: "Settings", critical: true },
  { title: "Finance Settings", description: "Export finance module configuration.", table: "finance_settings", fileName: "finance_settings_backup", group: "Settings", critical: true },
  { title: "Finance Workflow Settings", description: "Export finance workflow and approval settings.", table: "finance_workflow_settings", fileName: "finance_workflow_settings_backup", group: "Settings", critical: true },
  { title: "Finance Cash Settings", description: "Export cash management rules and limits.", table: "finance_cash_settings", fileName: "finance_cash_settings_backup", group: "Settings", critical: true },
  { title: "Forecasting Settings", description: "Export forecasting configuration.", table: "forecasting_settings", fileName: "forecasting_settings_backup", group: "Settings", critical: true },
  { title: "HC Rule Settings", description: "Export headcount rule settings.", table: "hc_rule_settings", fileName: "hc_rule_settings_backup", group: "Settings", critical: true },
  { title: "Onboarding Settings", description: "Export onboarding/public registration settings.", table: "onboarding_settings", fileName: "onboarding_settings_backup", group: "Settings", critical: true },
  { title: "Performance KPI Settings", description: "Export performance KPI rules.", table: "performance_kpi_settings", fileName: "performance_kpi_settings_backup", group: "Settings", critical: true },
  { title: "Attendance Geofence Settings", description: "Export portal attendance geofence settings.", table: "attendance_geofence_settings", fileName: "attendance_geofence_settings_backup", group: "Settings", critical: true },

  { title: "Audit Logs", description: "Export unified audit trail.", table: "audit_logs", fileName: "audit_logs_backup", group: "Audit" },
  { title: "Activity Logs", description: "Export activity log history.", table: "activity_logs", fileName: "activity_logs_backup", group: "Audit" },
  { title: "Legacy Payroll Snapshots", description: "Export legacy payroll snapshot table before archive/drop decision.", table: "payroll_snapshots_old_wrong", fileName: "payroll_snapshots_old_wrong_backup", group: "Audit" },
];

const backupGroups: BackupGroupConfig[] = [
  { title: "Master Data", group: "Master Data", icon: Building2, description: "Companies, employees, departments, and numbering engine." },
  { title: "Security", group: "Security", icon: ShieldCheck, description: "System users, company users, roles, and permissions." },
  { title: "Approvals", group: "Approvals", icon: CheckCircle2, description: "Approval workflows, assignments, and request history." },
  { title: "HR", group: "HR", icon: Users, description: "Leave, onboarding, coaching, and performance history." },
  { title: "Workforce", group: "Workforce", icon: CalendarDays, description: "Attendance, schedules, shift templates, and forecasting inputs." },
  { title: "Payroll", group: "Payroll", icon: Receipt, description: "Payroll periods, records, snapshots, release data, and rules." },
  { title: "Finance", group: "Finance", icon: Wallet, description: "Expenses, cash management, hotel revenue, and apartment billing." },
  { title: "POS", group: "POS", icon: Database, description: "POS menu setup, sessions, orders, and order items." },
  { title: "Settings", group: "Settings", icon: FileCog, description: "Critical OPSCORE settings that must survive reset." },
  { title: "Audit", group: "Audit", icon: Layers3, description: "Audit trails and legacy review tables." },
];

const todayKey = () => new Date().toISOString().slice(0, 10);

const safeFileName = (fileName: string, extension: "csv" | "json") =>
  `${fileName}_${todayKey()}.${extension}`.replace(/[^a-zA-Z0-9_.-]/g, "_");

const stringifyCell = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const objectToCsv = (rows: BackupRowData[]) => {
  if (rows.length === 0) return "";

  const headerSet = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => headerSet.add(key));
  });

  const headers = Array.from(headerSet);

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((field) => `"${stringifyCell(row[field]).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  return csvRows.join("\n");
};

const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
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
  oldValue?: unknown;
  newValue?: unknown;
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
  let allRows: BackupRowData[] = [];

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) return { rows: allRows, error };

    const batch = (data || []) as BackupRowData[];
    allRows = [...allRows, ...batch];

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return { rows: allRows, error: null };
};

const fetchCount = async (tableName: string) => {
  const { count, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (error) return 0;
  return count || 0;
};

const buildManifest = ({
  backupType,
  tables,
  health,
}: {
  backupType: string;
  tables: Record<string, BackupRowData[]>;
  health?: HealthManifest;
}) => {
  const tableNames = Object.keys(tables);

  return {
    app: "OPSCORE",
    version: "V3",
    backupType,
    exportedAt: new Date().toISOString(),
    environment: "Production / UAT Reset Preparation",
    tableCount: tableNames.length,
    totalRows: tableNames.reduce(
      (sum, tableName) => sum + (tables[tableName]?.length || 0),
      0
    ),
    healthSnapshot: health || null,
    tables: tableNames.map((tableName) => ({
      tableName,
      rows: tables[tableName]?.length || 0,
    })),
  };
};

const formatFailedTables = (failedTables: FailedTable[]) =>
  failedTables.map((item) => `â€¢ ${item.table}: ${item.error}`).join("\n");

const exportTable = async (tableName: string, fileName: string) => {
  const { rows, error } = await fetchAllRows(tableName);

  if (error) {
    await createAuditLog({
      action: "EXPORT_TABLE_FAILED",
      description: `Failed to export table: ${tableName}`,
      severity: "critical",
      newValue: { tableName, fileName, error: error.message },
    });

    alert(`Failed to export ${tableName}: ${error.message}`);
    return;
  }

  if (rows.length === 0) {
    await createAuditLog({
      action: "EXPORT_TABLE_EMPTY",
      description: `No data found for table export: ${tableName}`,
      severity: "warning",
      newValue: { tableName, fileName, rows: 0 },
    });

    alert(`No data found in ${tableName}.`);
    return;
  }

  downloadTextFile(objectToCsv(rows), safeFileName(fileName, "csv"), "text/csv");

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

const exportItemsAsJson = async ({
  exportName,
  items,
  fileName,
  health,
}: {
  exportName: string;
  items: BackupItem[];
  fileName: string;
  health?: HealthManifest;
}) => {
  const backupPayload: Record<string, BackupRowData[]> = {};
  const failedTables: FailedTable[] = [];

  for (const item of items) {
    const { rows, error } = await fetchAllRows(item.table);

    if (error) {
      failedTables.push({ table: item.table, error: error.message });
    } else {
      backupPayload[item.table] = rows;
    }
  }

  if (failedTables.length > 0) {
    console.error("OPSCORE BACKUP FAILED TABLES:", failedTables);

    await createAuditLog({
      action: "EXPORT_BACKUP_FAILED",
      description: `Failed to export ${exportName}.`,
      severity: "critical",
      newValue: { exportName, failedTables },
    });

    alert(
      `${exportName} failed.\n\nFailed tables:\n\n${formatFailedTables(
        failedTables
      )}\n\nNo reset allowed until all backup errors are fixed.`
    );

    return;
  }

  const manifest = buildManifest({
    backupType: exportName,
    tables: backupPayload,
    health,
  });

  downloadTextFile(
    JSON.stringify({ manifest, tables: backupPayload }, null, 2),
    safeFileName(fileName, "json"),
    "application/json"
  );

  await createAuditLog({
    action: "CREATE_BACKUP",
    description: `Exported ${exportName}.`,
    severity: "warning",
    newValue: {
      exportName,
      tableCount: items.length,
      tables: items.map((item) => item.table),
      exportedAt: new Date().toISOString(),
    },
  });
};

export default function BackupPage() {
  const [health, setHealth] = useState<HealthSnapshot>({
    companies: 0,
    employees: 0,
    systemUsers: 0,
    companyUsers: 0,
    rolePermissions: 0,
    loading: true,
  });

  const healthForManifest = useMemo<HealthManifest>(
    () => ({
      companies: health.companies,
      employees: health.employees,
      systemUsers: health.systemUsers,
      companyUsers: health.companyUsers,
      rolePermissions: health.rolePermissions,
    }),
    [health]
  );

  const masterDataItems = useMemo(
    () => backupItems.filter((item) => item.group === "Master Data"),
    []
  );

  const settingsItems = useMemo(
    () => backupItems.filter((item) => item.group === "Settings"),
    []
  );

  const saasFoundationItems = useMemo(
    () =>
      backupItems.filter((item) =>
        [
          "companies",
          "system_users",
          "company_users",
          "system_roles",
          "role_permissions",
          "approval_assignments",
          "approval_workflows",
          "document_sequences",
        ].includes(item.table)
      ),
    []
  );

  const criticalItems = useMemo(
    () => backupItems.filter((item) => item.critical),
    []
  );

  const loadHealth = useCallback(async () => {
    const [companies, employees, systemUsers, companyUsers, rolePermissions] =
      await Promise.all([
        fetchCount("companies"),
        fetchCount("employees"),
        fetchCount("system_users"),
        fetchCount("company_users"),
        fetchCount("role_permissions"),
      ]);

    setHealth({
      companies,
      employees,
      systemUsers,
      companyUsers,
      rolePermissions,
      loading: false,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHealth();
  }, [loadHealth]);

  const exportFullBackup = async () => {
    const confirmExport = confirm(
      "Export full OPSCORE backup? This may take longer if tables are large."
    );

    if (!confirmExport) return;

    await exportItemsAsJson({
      exportName: "Full OPSCORE Backup",
      items: backupItems,
      fileName: "opscore_full_backup",
      health: healthForManifest,
    });
  };

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
                  Export production-critical OPSCORE data before UAT reset, real data onboarding, SQL migrations, deployment, or major database changes.
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

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Production Readiness Snapshot
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Database Health
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Verify critical SaaS foundation counts before export or reset.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-5">
                <HealthCard label="Companies" value={health.companies} loading={health.loading} />
                <HealthCard label="Employees" value={health.employees} loading={health.loading} />
                <HealthCard label="System Users" value={health.systemUsers} loading={health.loading} />
                <HealthCard label="Company Users" value={health.companyUsers} loading={health.loading} />
                <HealthCard label="Role Permissions" value={health.rolePermissions} loading={health.loading} />
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-700">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
                Required Before Reset
              </p>
              <p className="mt-2">
                Export Master Data, Settings, SaaS Foundation, and Full OPSCORE Backup before deleting UAT payroll, attendance, finance, leave, approval, POS, or apartment transactions.
              </p>
            </section>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Production Backup Actions
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Pre-Reset Export Checklist
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  These exports preserve the foundation required for Vincent Resort real data go-live.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                <ActionCard
                  title="Master Data"
                  description="Companies, employees, departments, statuses, types, and document sequences."
                  icon={Building2}
                  onClick={() =>
                    exportItemsAsJson({
                      exportName: "Master Data Backup",
                      items: masterDataItems,
                      fileName: "opscore_master_data_backup",
                      health: healthForManifest,
                    })
                  }
                />

                <ActionCard
                  title="Settings"
                  description="Payroll, leave, finance, onboarding, forecasting, attendance, and KPI settings."
                  icon={FileCog}
                  onClick={() =>
                    exportItemsAsJson({
                      exportName: "Settings Backup",
                      items: settingsItems,
                      fileName: "opscore_settings_backup",
                      health: healthForManifest,
                    })
                  }
                />

                <ActionCard
                  title="SaaS Foundation"
                  description="Companies, users, roles, permissions, approval routes, and numbering engine."
                  icon={ShieldCheck}
                  onClick={() =>
                    exportItemsAsJson({
                      exportName: "SaaS Foundation Backup",
                      items: saasFoundationItems,
                      fileName: "opscore_saas_foundation_backup",
                      health: healthForManifest,
                    })
                  }
                />

                <ActionCard
                  title="Critical Backup"
                  description="All production-critical master, settings, access, POS setup, and rule tables."
                  icon={FileArchive}
                  onClick={() =>
                    exportItemsAsJson({
                      exportName: "Critical Production Backup",
                      items: criticalItems,
                      fileName: "opscore_critical_production_backup",
                      health: healthForManifest,
                    })
                  }
                />
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Backup Groups
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Module Backup Actions
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Export module groups as JSON backup files with backup manifest.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                {backupGroups.map((group) => {
                  const Icon = group.icon;
                  const items = backupItems.filter((item) => item.group === group.group);

                  return (
                    <button
                      key={group.group}
                      onClick={() =>
                        exportItemsAsJson({
                          exportName: `${group.title} Backup`,
                          items,
                          fileName: `opscore_${group.group.toLowerCase().replace(/\s+/g, "_")}_backup`,
                          health: healthForManifest,
                        })
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                        <Icon size={19} />
                      </div>

                      <h3 className="text-sm font-black text-slate-950">{group.title} Backup</h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{group.description}</p>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {items.length} tables
                        </p>

                        <p className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                          Export
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              {backupGroups.map((group) => {
                const items = backupItems.filter((item) => item.group === group.group);
                const Icon = group.icon;

                return (
                  <section key={group.group} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                        <Icon size={19} />
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Individual CSV Exports
                        </p>
                        <h2 className="mt-2 text-xl font-black text-slate-950">{group.title}</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">{group.description}</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <BackupRow
                          key={item.table}
                          title={item.title}
                          description={item.description}
                          table={item.table}
                          critical={item.critical}
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

function HealthCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-black text-slate-950">{loading ? "â€”" : value}</p>
        <CheckCircle2 className="text-emerald-600" size={20} />
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
        <Icon size={19} />
      </div>

      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{description}</p>

      <p className="mt-4 inline-flex h-10 items-center rounded-xl bg-slate-950 px-4 text-xs font-bold uppercase tracking-[0.16em] text-white">
        Export JSON
      </p>
    </button>
  );
}

function BackupRow({
  title,
  description,
  table,
  critical,
  onClick,
}: {
  title: string;
  description: string;
  table: string;
  critical?: boolean;
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

          {critical ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Critical
            </span>
          ) : null}
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





