import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const employeeId = String(body?.employee_id || "").trim();
    const currentEmployeeId = String(body?.current_employee_id || "").trim();
    const currentSystemUserId = String(
      body?.current_system_user_id || "",
    ).trim();

    if (!employeeId || !currentSystemUserId) {
      return NextResponse.json(
        { error: "Missing required delete fields." },
        { status: 400 },
      );
    }

    if (currentEmployeeId && employeeId === currentEmployeeId) {
      return NextResponse.json(
        { error: "You cannot delete your own employee profile." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const { data: currentSystemUser, error: currentSystemUserError } =
      await supabaseAdmin
        .from("system_users")
        .select("id, username, employee_id, is_active")
        .eq("id", currentSystemUserId)
        .eq("is_active", true)
        .maybeSingle();

    if (currentSystemUserError || !currentSystemUser) {
      return NextResponse.json(
        { error: "Unable to verify current system user." },
        { status: 403 },
      );
    }

    const { data: currentAccess, error: accessError } = await supabaseAdmin
      .from("company_users")
      .select("id, role_id, system_roles(role_name)")
      .eq("user_id", currentSystemUserId)
      .eq("is_active", true)
      .maybeSingle();

    if (accessError || !currentAccess) {
      return NextResponse.json(
        { error: "Unable to verify current admin access." },
        { status: 403 },
      );
    }

    const roleName = String(
      (currentAccess as any)?.system_roles?.role_name || "",
    )
      .trim()
      .toLowerCase();

    if (!["super admin", "superadmin"].includes(roleName)) {
      return NextResponse.json(
        { error: "Only Super Admin can permanently delete employees." },
        { status: 403 },
      );
    }

    const { data: targetEmployee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id, first_name, last_name, employee_no")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError || !targetEmployee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 },
      );
    }

    const { data: linkedTargetSystemUsers, error: linkedTargetUserError } =
      await supabaseAdmin
        .from("system_users")
        .select("id, auth_user_id, username")
        .eq("employee_id", employeeId);

    if (linkedTargetUserError) {
      return NextResponse.json(
        {
          error: `System user lookup failed: ${linkedTargetUserError.message}`,
        },
        { status: 400 },
      );
    }

    const targetSystemUserIds = (linkedTargetSystemUsers || []).map(
      (user) => user.id,
    );

    if (targetSystemUserIds.includes(currentSystemUserId)) {
      return NextResponse.json(
        { error: "You cannot delete the employee profile linked to your own login." },
        { status: 400 },
      );
    }

    const linkedChecks = [
      { table: "attendance_entries", column: "employee_id" },
      { table: "leave_requests", column: "employee_id" },
      { table: "employee_leave_credits", column: "employee_id" },
      { table: "payroll_records", column: "employee_id" },
      { table: "payroll_snapshots", column: "employee_id" },
      { table: "released_payroll_items", column: "employee_id" },
      { table: "approval_requests", column: "employee_id" },
    ];

    for (const check of linkedChecks) {
      const { count, error } = await supabaseAdmin
        .from(check.table)
        .select("id", { count: "exact", head: true })
        .eq(check.column, employeeId);

      if (!error && Number(count || 0) > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete employee. Linked records found in ${check.table}. Archive instead.`,
          },
          { status: 400 },
        );
      }
    }

    if (targetSystemUserIds.length > 0) {
      const { error: companyDeleteError } = await supabaseAdmin
        .from("company_users")
        .delete()
        .in("user_id", targetSystemUserIds);

      if (companyDeleteError) {
        return NextResponse.json(
          {
            error: `Company access delete failed: ${companyDeleteError.message}`,
          },
          { status: 400 },
        );
      }

      const { error: systemDeleteError } = await supabaseAdmin
        .from("system_users")
        .delete()
        .in("id", targetSystemUserIds);

      if (systemDeleteError) {
        return NextResponse.json(
          { error: `System user delete failed: ${systemDeleteError.message}` },
          { status: 400 },
        );
      }

      for (const user of linkedTargetSystemUsers || []) {
        if (user.auth_user_id) {
          await supabaseAdmin.auth.admin.deleteUser(user.auth_user_id);
        }
      }
    }

    const { error: deleteEmployeeError } = await supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", employeeId);

    if (deleteEmployeeError) {
      return NextResponse.json(
        { error: deleteEmployeeError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      deleted_employee_id: employeeId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed." },
      { status: 500 },
    );
  }
}





