import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CleanupTable = {
  key: string;
  label: string;
  table: string;
  group: string;
};

const cleanupTables: CleanupTable[] = [
  { key: "released_payroll_items", label: "Released Payroll Items", table: "released_payroll_items", group: "Payroll" },
  { key: "released_payrolls", label: "Released Payrolls", table: "released_payrolls", group: "Payroll" },
  { key: "payroll_records", label: "Payroll Records", table: "payroll_records", group: "Payroll" },
  { key: "payroll_snapshots", label: "Payroll Snapshots", table: "payroll_snapshots", group: "Payroll" },
  { key: "payroll_periods", label: "Payroll Periods", table: "payroll_periods", group: "Payroll" },

  { key: "attendance_entries", label: "Attendance Entries", table: "attendance_entries", group: "Attendance" },
  { key: "leave_requests", label: "Leave Requests", table: "leave_requests", group: "Leave" },
  { key: "employee_leave_credits", label: "Leave Credits", table: "employee_leave_credits", group: "Leave" },

  { key: "approval_requests", label: "Approval Requests", table: "approval_requests", group: "Approvals" },
  { key: "activity_logs", label: "Activity Logs", table: "activity_logs", group: "Audit" },
  { key: "audit_logs", label: "Audit Logs", table: "audit_logs", group: "Audit" },

  { key: "company_users", label: "Company Users", table: "company_users", group: "Accounts" },
  { key: "system_users", label: "System Users", table: "system_users", group: "Accounts" },
  { key: "employees", label: "Employees", table: "employees", group: "Employees" },
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
      })
    );

    return NextResponse.json({ tables: results });
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

    if (confirmation !== "DELETE OPSCORE TEST DATA") {
      return NextResponse.json(
        { error: "Invalid confirmation phrase." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();
    const deleted: Record<string, number> = {};

    for (const item of cleanupTables) {
      const { count: beforeCount } = await supabaseAdmin
        .from(item.table)
        .select("id", { count: "exact", head: true });

      const { error } = await supabaseAdmin
        .from(item.table)
        .delete()
        .not("id", "is", null);

      if (!error) {
        deleted[item.table] = beforeCount || 0;
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed." },
      { status: 500 }
    );
  }
}