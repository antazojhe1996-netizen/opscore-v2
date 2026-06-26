import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
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
      .select(
        "id, company_id, system_role_id, admin_access_enabled, portal_enabled",
      )
      .eq("id", employee_id)
      .maybeSingle();

    if (employeeError || !employeeData) {
      return NextResponse.json(
        { error: employeeError?.message || "Employee not found." },
        { status: 404 },
      );
    }

    const companyId = incomingCompanyId || employeeData.company_id;
    const adminAccessEnabled = employeeData.admin_access_enabled === true;
    const resolvedRoleId =
      incomingRoleId || employeeData.system_role_id || null;

    if (!companyId) {
      return NextResponse.json(
        { error: "Employee has no company_id. Complete employee profile first." },
        { status: 400 },
      );
    }

    if (adminAccessEnabled && !resolvedRoleId) {
      return NextResponse.json(
        {
          error:
            "Admin/System User Access is enabled, but no role is assigned. Assign a role first in User Roles.",
        },
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
          account_type: adminAccessEnabled
            ? "admin_system_user"
            : "employee_portal",
          admin_access_enabled: adminAccessEnabled,
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

    if (adminAccessEnabled) {
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
    }

    const employeeUpdatePayload: any = {
      portal_enabled: true,
    };

    if (adminAccessEnabled) {
      employeeUpdatePayload.system_role_id = resolvedRoleId;
    }

    const { error: employeeUpdateError } = await supabaseAdmin
      .from("employees")
      .update(employeeUpdatePayload)
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
      role_id: adminAccessEnabled ? resolvedRoleId : null,
      admin_access_enabled: adminAccessEnabled,
      company_user_created: adminAccessEnabled,
      temporary_password: temporaryPassword,
      message: adminAccessEnabled
        ? "Admin/system user account created successfully."
        : "Employee portal account created successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}





