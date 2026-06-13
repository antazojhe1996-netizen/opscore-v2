import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CleanupTable = {
  key: string;
  label: string;
  table: string;
  group: string;
};

const cleanupTables: CleanupTable[] = [
  {
    key: "released_payroll_items",
    label: "Released Payroll Items",
    table: "released_payroll_items",
    group: "Payroll",
  },
  {
    key: "released_payrolls",
    label: "Released Payrolls",
    table: "released_payrolls",
    group: "Payroll",
  },
  {
    key: "payroll_records",
    label: "Payroll Records",
    table: "payroll_records",
    group: "Payroll",
  },
  {
    key: "payroll_snapshots",
    label: "Payroll Snapshots",
    table: "payroll_snapshots",
    group: "Payroll",
  },
  {
    key: "payroll_periods",
    label: "Payroll Periods",
    table: "payroll_periods",
    group: "Payroll",
  },
  {
    key: "attendance_entries",
    label: "Attendance Entries",
    table: "attendance_entries",
    group: "Attendance",
  },
  {
    key: "leave_requests",
    label: "Leave Requests",
    table: "leave_requests",
    group: "Leave",
  },
  {
    key: "employee_leave_credits",
    label: "Leave Credits",
    table: "employee_leave_credits",
    group: "Leave",
  },
  {
    key: "approval_requests",
    label: "Approval Requests",
    table: "approval_requests",
    group: "Approvals",
  },
  {
    key: "activity_logs",
    label: "Activity Logs",
    table: "activity_logs",
    group: "Audit",
  },
  {
    key: "audit_logs",
    label: "Audit Logs",
    table: "audit_logs",
    group: "Audit",
  },
  {
    key: "company_users",
    label: "Company Users",
    table: "company_users",
    group: "Accounts",
  },
  {
    key: "system_users",
    label: "System Users",
    table: "system_users",
    group: "Accounts",
  },
  {
    key: "employees",
    label: "Employees",
    table: "employees",
    group: "Employees",
  },
];

const CONFIRM_TEXT = "DELETE OPSCORE TEST DATA";

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

    return NextResponse.json({ tables: results });
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
    const keepCurrentSuperAdmin = Boolean(body?.keep_current_super_admin);

    const protectedEmployeeId = String(body?.protected_employee_id || "");
    const protectedSystemUserId = String(body?.protected_system_user_id || "");
    const protectedCompanyUserId = String(body?.protected_company_user_id || "");

    if (confirmation !== CONFIRM_TEXT) {
      return NextResponse.json(
        { error: "Invalid confirmation phrase." },
        { status: 400 },
      );
    }

    if (
      keepCurrentSuperAdmin &&
      (!protectedEmployeeId || !protectedSystemUserId || !protectedCompanyUserId)
    ) {
      return NextResponse.json(
        {
          error:
            "Current Super Admin protection is enabled, but protected IDs are incomplete.",
        },
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

      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .not("id", "is", null);

      if (error) {
        skipped[table] = error.message;
        return;
      }

      deleted[table] = beforeCount || 0;
    };

    const deleteCompanyUsers = async () => {
      const { count: beforeCount, error: countError } = await supabaseAdmin
        .from("company_users")
        .select("id", { count: "exact", head: true });

      if (countError) {
        skipped.company_users = countError.message;
        return;
      }

      let query = supabaseAdmin.from("company_users").delete().not("id", "is", null);

      if (keepCurrentSuperAdmin) {
        query = query.neq("id", protectedCompanyUserId);
      }

      const { error } = await query;

      if (error) {
        skipped.company_users = error.message;
        return;
      }

      deleted.company_users = keepCurrentSuperAdmin
        ? Math.max((beforeCount || 0) - 1, 0)
        : beforeCount || 0;
    };

    const deleteSystemUsers = async () => {
      const { count: beforeCount, error: countError } = await supabaseAdmin
        .from("system_users")
        .select("id", { count: "exact", head: true });

      if (countError) {
        skipped.system_users = countError.message;
        return;
      }

      let query = supabaseAdmin.from("system_users").delete().not("id", "is", null);

      if (keepCurrentSuperAdmin) {
        query = query.neq("id", protectedSystemUserId);
      }

      const { error } = await query;

      if (error) {
        skipped.system_users = error.message;
        return;
      }

      deleted.system_users = keepCurrentSuperAdmin
        ? Math.max((beforeCount || 0) - 1, 0)
        : beforeCount || 0;
    };

    const deleteEmployees = async () => {
      const { count: beforeCount, error: countError } = await supabaseAdmin
        .from("employees")
        .select("id", { count: "exact", head: true });

      if (countError) {
        skipped.employees = countError.message;
        return;
      }

      let query = supabaseAdmin.from("employees").delete().not("id", "is", null);

      if (keepCurrentSuperAdmin) {
        query = query.neq("id", protectedEmployeeId);
      }

      const { error } = await query;

      if (error) {
        skipped.employees = error.message;
        return;
      }

      deleted.employees = keepCurrentSuperAdmin
        ? Math.max((beforeCount || 0) - 1, 0)
        : beforeCount || 0;
    };

    for (const item of cleanupTables) {
      if (item.table === "company_users") {
        await deleteCompanyUsers();
        continue;
      }

      if (item.table === "system_users") {
        await deleteSystemUsers();
        continue;
      }

      if (item.table === "employees") {
        await deleteEmployees();
        continue;
      }

      await deleteStandardTable(item.table);
    }

    return NextResponse.json({
      success: true,
      keep_current_super_admin: keepCurrentSuperAdmin,
      protected: keepCurrentSuperAdmin
        ? {
            employee_id: protectedEmployeeId,
            system_user_id: protectedSystemUserId,
            company_user_id: protectedCompanyUserId,
          }
        : null,
      deleted,
      skipped,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed." },
      { status: 500 },
    );
  }
}