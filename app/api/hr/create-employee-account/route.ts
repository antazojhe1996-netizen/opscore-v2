import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SystemRole = {
  id: string;
  role_name?: string | null;
  name?: string | null;
};

function generateTemporaryPassword() {
  return "Welcome123!";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      employee_id,
      email,
      first_name,
      last_name,
      company_id: incomingCompanyId,
      role_id: incomingRoleId,
    } = body;

    if (!employee_id || !email || !first_name || !last_name) {
      return NextResponse.json(
        { error: "Missing required account fields." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase server environment variables." },
        { status: 500 },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id, company_id, system_role_id, portal_enabled")
      .eq("id", employee_id)
      .maybeSingle();

    if (employeeError || !employeeData) {
      return NextResponse.json(
        { error: employeeError?.message || "Employee not found." },
        { status: 404 },
      );
    }

    const companyId = incomingCompanyId || employeeData.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Employee has no company_id. Complete employee profile first." },
        { status: 400 },
      );
    }

    const { data: existingEmployeeAccount } = await supabaseAdmin
      .from("system_users")
      .select("id")
      .eq("employee_id", employee_id)
      .maybeSingle();

    if (existingEmployeeAccount?.id) {
      return NextResponse.json(
        { error: "This employee already has a portal account." },
        { status: 409 },
      );
    }

    const { data: existingEmailAccount } = await supabaseAdmin
      .from("system_users")
      .select("id")
      .eq("username", normalizedEmail)
      .maybeSingle();

    if (existingEmailAccount?.id) {
      return NextResponse.json(
        { error: "This email is already linked to another system user." },
        { status: 409 },
      );
    }

    let resolvedRoleId = incomingRoleId || employeeData.system_role_id || null;

    if (!resolvedRoleId) {
      const { data: rolesData, error: rolesError } = await supabaseAdmin
        .from("system_roles")
        .select("id, role_name, name");

      if (rolesError) {
        return NextResponse.json(
          { error: `Role lookup failed: ${rolesError.message}` },
          { status: 400 },
        );
      }

      const roles = (rolesData || []) as SystemRole[];

      const employeeRole = roles.find((role) => {
        const roleLabel = String(role.role_name || role.name || "")
          .trim()
          .toLowerCase();

        return (
          roleLabel === "employee" ||
          roleLabel === "staff" ||
          roleLabel === "employee portal" ||
          roleLabel === "employee self service"
        );
      });

      resolvedRoleId = employeeRole?.id || null;
    }

    if (!resolvedRoleId) {
      return NextResponse.json(
        {
          error:
            "No Employee role found. Assign a System Role in Employee 201 or create a role named Employee.",
        },
        { status: 400 },
      );
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          employee_id,
          first_name,
          last_name,
          company_id: companyId,
          role_id: resolvedRoleId,
          account_type: "employee_portal",
        },
      });

    if (authError) {
      return NextResponse.json(
        { error: `Auth create failed: ${authError.message}` },
        { status: 400 },
      );
    }

    const authUserId = authData.user?.id;

    if (!authUserId) {
      return NextResponse.json(
        { error: "Auth user was not created." },
        { status: 500 },
      );
    }

    const { data: systemUserData, error: systemUserError } = await supabaseAdmin
      .from("system_users")
      .insert({
        employee_id,
        username: normalizedEmail,
        is_active: true,
        must_change_password: true,
        company_id: companyId,
        auth_user_id: authUserId,
      })
      .select("id")
      .single();

    if (systemUserError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        { error: `System user create failed: ${systemUserError.message}` },
        { status: 400 },
      );
    }

    const systemUserId = systemUserData.id;

    const { error: companyUserError } = await supabaseAdmin
      .from("company_users")
      .insert({
        company_id: companyId,
        user_id: systemUserId,
        role_id: resolvedRoleId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (companyUserError) {
      await supabaseAdmin.from("system_users").delete().eq("id", systemUserId);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        { error: `Company access create failed: ${companyUserError.message}` },
        { status: 400 },
      );
    }

    const { error: employeeUpdateError } = await supabaseAdmin
      .from("employees")
      .update({
        portal_enabled: true,
        system_role_id: resolvedRoleId,
      })
      .eq("id", employee_id);

    if (employeeUpdateError) {
      return NextResponse.json(
        {
          error: `Portal account was created, but employee update failed: ${employeeUpdateError.message}`,
          temporary_password: temporaryPassword,
        },
        { status: 207 },
      );
    }

    return NextResponse.json({
      success: true,
      auth_user_id: authUserId,
      system_user_id: systemUserId,
      company_id: companyId,
      role_id: resolvedRoleId,
      temporary_password: temporaryPassword,
      message: "Employee portal account created successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}