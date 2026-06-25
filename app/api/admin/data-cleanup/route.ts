import { supabase } from '@/lib/supabase';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
type CleanupTable = {
  key: string;
  label: string;
  table: string;
  group: string;
  mode: "delete";
};

const CONFIRM_TEXT = "PRODUCTION GO-LIVE RESET";
const BACKUP_CONFIRM_TEXT = "BACKUP FILES VERIFIED";

const cleanupTables: CleanupTable[] = [
  // POS children first
  { key: "pos_order_items", label: "POS Order Items", table: "pos_order_items", group: "POS", mode: "delete" },
  { key: "pos_orders", label: "POS Orders", table: "pos_orders", group: "POS", mode: "delete" },
  { key: "pos_sessions", label: "POS Sessions", table: "pos_sessions", group: "POS", mode: "delete" },

  // Payroll children first
  { key: "payroll_release_transactions", label: "Payroll Release Transactions", table: "payroll_release_transactions", group: "Payroll", mode: "delete" },
  { key: "payroll_release_history", label: "Payroll Release History", table: "payroll_release_history", group: "Payroll", mode: "delete" },
  { key: "payroll_snapshot_items", label: "Payroll Snapshot Items", table: "payroll_snapshot_items", group: "Payroll", mode: "delete" },
  { key: "payroll_records", label: "Payroll Records", table: "payroll_records", group: "Payroll", mode: "delete" },
  { key: "payroll_snapshots", label: "Payroll Snapshots", table: "payroll_snapshots", group: "Payroll", mode: "delete" },
  { key: "payroll_periods", label: "Payroll Periods", table: "payroll_periods", group: "Payroll", mode: "delete" },

  // Attendance / scheduling
  { key: "attendance_entries", label: "Attendance Entries", table: "attendance_entries", group: "Attendance", mode: "delete" },
  { key: "schedules", label: "Schedules", table: "schedules", group: "Scheduling", mode: "delete" },
  { key: "schedule_publications", label: "Schedule Publications", table: "schedule_publications", group: "Scheduling", mode: "delete" },

  // HR / approvals
  { key: "leave_requests", label: "Leave Requests", table: "leave_requests", group: "HR", mode: "delete" },
  { key: "employee_registration_requests", label: "Employee Registration Requests", table: "employee_registration_requests", group: "HR", mode: "delete" },
  { key: "employee_coaching_logs", label: "Employee Coaching Logs", table: "employee_coaching_logs", group: "HR", mode: "delete" },
  { key: "performance_history", label: "Performance History", table: "performance_history", group: "HR", mode: "delete" },
  { key: "approval_requests", label: "Approval Requests", table: "approval_requests", group: "Approvals", mode: "delete" },

  // Finance
  { key: "cash_advance_requests", label: "Cash Advance Requests", table: "cash_advance_requests", group: "Finance", mode: "delete" },
  { key: "expense_requests", label: "Expense Requests", table: "expense_requests", group: "Finance", mode: "delete" },
  { key: "expenses", label: "Expenses", table: "expenses", group: "Finance", mode: "delete" },
  { key: "finance_bills", label: "Finance Bills", table: "finance_bills", group: "Finance", mode: "delete" },
  { key: "finance_cash_counts", label: "Cash Counts", table: "finance_cash_counts", group: "Finance", mode: "delete" },
  { key: "finance_cash_management", label: "Cash Management", table: "finance_cash_management", group: "Finance", mode: "delete" },
  { key: "finance_cash_movements", label: "Cash Movements", table: "finance_cash_movements", group: "Finance", mode: "delete" },
  { key: "finance_hotel_reservations", label: "Hotel Reservations", table: "finance_hotel_reservations", group: "Finance", mode: "delete" },
  { key: "finance_hotel_revenue", label: "Hotel Revenue", table: "finance_hotel_revenue", group: "Finance", mode: "delete" },

  // Apartment transactional only
  { key: "apartment_payments", label: "Apartment Payments", table: "apartment_payments", group: "Apartment", mode: "delete" },
  { key: "apartment_bills", label: "Apartment Bills", table: "apartment_bills", group: "Apartment", mode: "delete" },
];

const protectedTables = [
  "companies",
  "employees",
  "system_users",
  "company_users",
  "system_roles",
  "role_permissions",
  "departments",
  "positions",
  "employment_statuses",
  "employment_types",
  "document_sequences",

  "approval_assignments",
  "approval_workflows",

  "payroll_settings",
  "payroll_holidays",
  "payroll_deduction_types",

  "leave_settings",
  "employee_leave_credits",

  "finance_settings",
  "finance_workflow_settings",
  "finance_cash_settings",
  "finance_payment_methods",
  "finance_revenue_sources",
  "finance_expense_categories",
  "finance_expense_sources",
  "finance_cash_sources",

  "forecasting_settings",
  "hc_rule_settings",
  "onboarding_settings",
  "performance_kpi_settings",
  "attendance_geofence_settings",

  "shift_templates",
  "occupancy_data",
  "event_addons",

  "apartment_units",

  "pos_categories",
  "pos_menu_groups",
  "pos_menu_items",

  "audit_logs",
  "activity_logs",
  "payroll_snapshots_old_wrong",
];

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function createResetAuditLog({
  supabaseAdmin,
  action,
  description,
  payload,
  severity = "warning",
}: {
  supabaseAdmin: any;
  action: string;
  description: string;
  payload: unknown;
  severity?: "info" | "warning" | "critical";
}) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      module: "Production Reset Center",
      action,
      description,
      severity,
      old_value: null,
      new_value: payload,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Do not block reset preview/reset if audit insert fails.
  }
}

async function getTableCount({
  supabaseAdmin,
  table,
}: {
  supabaseAdmin: any;
  table: string;
}) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("*", { count: "exact", head: true });

  return {
    count: error ? 0 : count || 0,
    available: !error,
    error: error?.message || null,
  };
}

export async function GET() {
  try {
    const supabaseAdmin = getAdminClient();

    const results = await Promise.all(
      cleanupTables.map(async (item) => {
        const result = await getTableCount({
          supabaseAdmin,
          table: item.table,
        });

        return {
          ...item,
          count: result.count,
          available: result.available,
          error: result.error,
        };
      })
    );

    const totalRows = results.reduce((sum, item) => sum + Number(item.count || 0), 0);

    return NextResponse.json({
      mode: "PRODUCTION_RESET_CENTER_V2",
      status: "PREVIEW_ONLY",
      confirmation_phrase: CONFIRM_TEXT,
      backup_confirmation_phrase: BACKUP_CONFIRM_TEXT,
      total_resettable_rows: totalRows,
      tables: results,
      protected_tables: protectedTables,
      safety_rules: [
        "No reset without verified backup.",
        "Master data is protected.",
        "Users, roles, permissions, settings, and POS menu setup are protected.",
        "Audit logs are protected and not deleted by this endpoint.",
        "Legacy payroll_snapshots_old_wrong is archive-only and not deleted.",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const confirmation = String(body?.confirmation || "");
    const backupConfirmation = String(body?.backup_confirmation || "");
    const backupVerified = Boolean(body?.backup_verified);
    const backupFileNames = Array.isArray(body?.backup_file_names)
      ? body.backup_file_names
      : [];

    if (confirmation !== CONFIRM_TEXT) {
      return NextResponse.json(
        { error: `Invalid confirmation phrase. Type exactly: ${CONFIRM_TEXT}` },
        { status: 400 }
      );
    }

    if (!backupVerified || backupConfirmation !== BACKUP_CONFIRM_TEXT) {
      return NextResponse.json(
        {
          error: `Backup verification required. Export and verify backups, then type exactly: ${BACKUP_CONFIRM_TEXT}`,
        },
        { status: 400 }
      );
    }

    if (backupFileNames.length < 4) {
      return NextResponse.json(
        {
          error:
            "At least 4 backup file names must be provided: Master Data, Settings, SaaS Foundation, and Full OPSCORE Backup.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();

    const deleted: Record<string, number> = {};
    const skipped: Record<string, string> = {};

    await createResetAuditLog({
      supabaseAdmin,
      action: "PRODUCTION_RESET_STARTED",
      description: "Production reset started after backup verification.",
      severity: "critical",
      payload: {
        confirmation,
        backupConfirmation,
        backupVerified,
        backupFileNames,
        startedAt: new Date().toISOString(),
      },
    });

    const deleteStandardTable = async (table: string) => {
      const countResult = await getTableCount({
        supabaseAdmin,
        table,
      });

      if (!countResult.available) {
        skipped[table] = countResult.error || "Table unavailable.";
        return;
      }

      if (!countResult.count || countResult.count <= 0) {
        deleted[table] = 0;
        return;
      }

      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .not("id", "is", null);

      if (error) {
        skipped[table] = error.message;
        return;
      }

      deleted[table] = countResult.count;
    };

    for (const item of cleanupTables) {
      await deleteStandardTable(item.table);
    }

    const totalDeletedRows = Object.values(deleted).reduce(
      (sum, count) => sum + Number(count || 0),
      0
    );

    const resultPayload = {
      success: Object.keys(skipped).length === 0,
      mode: "PRODUCTION_RESET_CENTER_V2",
      deleted,
      skipped,
      totalDeletedRows,
      protected_tables: protectedTables,
      backupFileNames,
      completedAt: new Date().toISOString(),
    };

    await createResetAuditLog({
      supabaseAdmin,
      action:
        Object.keys(skipped).length === 0
          ? "PRODUCTION_RESET_COMPLETED"
          : "PRODUCTION_RESET_COMPLETED_WITH_SKIPS",
      description:
        Object.keys(skipped).length === 0
          ? "Production reset completed successfully."
          : "Production reset completed with skipped tables.",
      severity: Object.keys(skipped).length === 0 ? "warning" : "critical",
      payload: resultPayload,
    });

    return NextResponse.json({
      ...resultPayload,
      message:
        Object.keys(skipped).length === 0
          ? "Production reset completed. Master data, users, roles, permissions, settings, POS menu setup, apartment units, and audit logs were protected."
          : "Production reset completed with skipped tables. Review skipped results before proceeding.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed." },
      { status: 500 }
    );
  }
}





