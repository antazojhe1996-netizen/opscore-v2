import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      employee_id,
      email,
      first_name,
      last_name,
      company_id: incomingCompanyId,
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

    let companyId = incomingCompanyId;

    if (!companyId) {
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from("employees")
        .select("company_id")
        .eq("id", employee_id)
        .maybeSingle();

      if (employeeError) {
        return NextResponse.json(
          { error: `Employee company lookup failed: ${employeeError.message}` },
          { status: 400 },
        );
      }

      companyId = employeeData?.company_id || null;
    }

    if (!companyId) {
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (companyError) {
        return NextResponse.json(
          { error: `Company fallback lookup failed: ${companyError.message}` },
          { status: 400 },
        );
      }

      companyId = companyData?.id || null;
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "No company_id found. Please create or link a company first." },
        { status: 400 },
      );
    }

    const temporaryPassword = "Temp123!";

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          employee_id,
          first_name,
          last_name,
          company_id: companyId,
        },
      });

    if (authError) {
      console.error("AUTH ERROR:", authError);

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
        username: email,
        is_active: true,
        must_change_password: true,
        company_id: companyId,
        auth_user_id: authUserId,
      })
      .select("id")
      .single();

    if (systemUserError) {
      console.error("SYSTEM USER ERROR:", systemUserError);

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
        role_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (companyUserError) {
      console.error("COMPANY USER ERROR:", companyUserError);

      await supabaseAdmin.from("system_users").delete().eq("id", systemUserId);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        { error: `Company access create failed: ${companyUserError.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      auth_user_id: authUserId,
      system_user_id: systemUserId,
      company_id: companyId,
      temporary_password: temporaryPassword,
    });
  } catch (error: any) {
    console.error("UNEXPECTED ACCOUNT CREATE ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}