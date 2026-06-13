import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CleanupTable = {
  key: string;
  label: string;
  table: string;
  group: string;
};

const cleanupTables: CleanupTable[] = [
  { key: "pos_order_items", label: "POS Order Items", table: "pos_order_items", group: "POS" },
  { key: "pos_payments", label: "POS Payments", table: "pos_payments", group: "POS" },
  { key: "pos_voids", label: "POS Voids", table: "pos_voids", group: "POS" },
  { key: "pos_orders", label: "POS Orders", table: "pos_orders", group: "POS" },
  { key: "pos_sessions", label: "POS Sessions", table: "pos_sessions", group: "POS" },

  { key: "released_payroll_items", label: "Released Payroll Items", table: "released_payroll_items", group: "Payroll" },
  { key: "released_payrolls", label: "Released Payrolls", table: "released_payrolls", group: "Payroll" },
  { key: "payroll_release_transactions", label: "Payroll Release Transactions", table: "payroll_release_transactions", group: "Payroll" },
  { key: "payroll_release_history", label: "Payroll Release History", table: "payroll_release_history", group: "Payroll" },
  { key: "payroll_snapshot_items", label: "Payroll Snapshot Items", table: "payroll_snapshot_items", group: "Payroll" },
  { key: "payroll_records", label: "Payroll Records", table: "payroll_records", group: "Payroll" },
  { key: "payroll_adjustments", label: "Payroll Adjustments", table: "payroll_adjustments", group: "Payroll" },
  { key: "payroll_snapshots", label: "Payroll Snapshots", table: "payroll_snapshots", group: "Payroll" },
  { key: "payroll_periods", label: "Payroll Periods", table: "payroll_periods", group: "Payroll" },

  { key: "attendance_entries", label: "Attendance Entries", table: "attendance_entries", group: "Attendance" },
  { key: "schedules", label: "Schedules", table: "schedules", group: "Scheduling" },
  { key: "schedule_publications", label: "Schedule Publications", table: "schedule_publications", group: "Scheduling" },

  { key: "leave_requests", label: "Leave Requests", table: "leave_requests", group: "Leave" },
  { key: "approval_requests", label: "Approval Requests", table: "approval_requests", group: "Approvals" },

  { key: "cash_advance_requests", label: "Cash Advance Requests", table: "cash_advance_requests", group: "Finance" },
  { key: "employee_balances", label: "Employee Balances", table: "employee_balances", group: "Finance" },
  { key: "expense_requests", label: "Expense Requests", table: "expense_requests", group: "Finance" },
  { key: "expenses", label: "Expenses", table: "expenses", group: "Finance" },
  { key: "finance_bills", label: "Finance Bills", table: "finance_bills", group: "Finance" },
  { key: "finance_cash_counts", label: "Cash Counts", table: "finance_cash_counts", group: "Finance" },
  { key: "finance_cash_drawers", label: "Cash Drawers", table: "finance_cash_drawers", group: "Finance" },
  { key: "finance_cash_management", label: "Cash Management", table: "finance_cash_management", group: "Finance" },
  { key: "finance_cash_movements", label: "Cash Movements", table: "finance_cash_movements", group: "Finance" },
  { key: "finance_hotel_reservations", label: "Hotel Reservations Revenue", table: "finance_hotel_reservations", group: "Finance" },
  { key: "finance_hotel_revenue", label: "Hotel Revenue", table: "finance_hotel_revenue", group: "Finance" },
  { key: "restaurant_sales", label: "Restaurant Sales", table: "restaurant_sales", group: "Finance" },

  { key: "activity_logs", label: "Activity Logs", table: "activity_logs", group: "Audit" },
  { key: "audit_logs", label: "Audit Logs", table: "audit_logs", group: "Audit" },
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
  "employee_leave_credits",
  "leave_settings",
  "payroll_settings",
  "finance_settings",
];

const CONFIRM_TEXT = "PRODUCTION GO-LIVE RESET";

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

export async function GET() {
  try {
    const supabaseAdmin = getAdminClient();

    const results = await Promise.all(
      cleanupTables.map(async (item) => {
        const { count, error } = await supabaseAdmin
          .from(item.table)
          .select("id", { count: "exact", head: true });

        return {
          ...item,
          count: error ? 0 : count || 0,
          available: !error,
          error: error?.message || null,
        };
      }),
    );

    return NextResponse.json({
      mode: "PRODUCTION_GO_LIVE_RESET",
      confirmation_phrase: CONFIRM_TEXT,
      tables: results,
      protected_tables: protectedTables,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const confirmation = String(body?.confirmation || "");

    if (confirmation !== CONFIRM_TEXT) {
      return NextResponse.json(
        { error: `Invalid confirmation phrase. Type: ${CONFIRM_TEXT}` },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();
    const deleted: Record<string, number> = {};
    const skipped: Record<string, string> = {};

    const deleteStandardTable = async (table: string) => {
      const { count: beforeCount, error: countError } = await supabaseAdmin
        .from(table)
        .select("id", { count: "exact", head: true });

      if (countError) {
        skipped[table] = countError.message;
        return;
      }

      if (!beforeCount || beforeCount <= 0) {
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

      deleted[table] = beforeCount;
    };

    for (const item of cleanupTables) {
      await deleteStandardTable(item.table);
    }

    return NextResponse.json({
      success: true,
      mode: "PRODUCTION_GO_LIVE_RESET",
      deleted,
      skipped,
      protected_tables: protectedTables,
      message:
        "Production go-live reset completed. Master data, employees, system users, company users, roles, and settings were protected.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed." },
      { status: 500 },
    );
  }
}