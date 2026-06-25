import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function generateNextEmployeeNo(existingNumbers: string[]) {
  const prefix = "EMP-";

  const highest = existingNumbers.reduce((max, value) => {
    const text = String(value || "").trim();

    if (!text.startsWith(prefix)) return max;

    const numberPart = Number(text.replace(prefix, ""));

    if (Number.isNaN(numberPart)) return max;

    return Math.max(max, numberPart);
  }, 0);

  return `${prefix}${String(highest + 1).padStart(6, "0")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const registrationId = String(body?.registration_id || "");
    const reviewedBy = String(body?.reviewed_by || "");

    if (!registrationId) {
      return NextResponse.json(
        { error: "Missing registration_id." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const { data: registration, error: registrationError } =
      await supabaseAdmin
        .from("employee_registration_requests")
        .select("*")
        .eq("id", registrationId)
        .maybeSingle();

    if (registrationError || !registration) {
      return NextResponse.json(
        { error: "Registration request not found." },
        { status: 404 },
      );
    }

    if (registration.status !== "PENDING") {
      return NextResponse.json(
        { error: `Registration is already ${registration.status}.` },
        { status: 400 },
      );
    }

    const { data: duplicateEmployee } = await supabaseAdmin
      .from("employees")
      .select("id, employee_no, first_name, last_name")
      .eq("company_id", registration.company_id)
      .ilike("first_name", registration.first_name)
      .ilike("last_name", registration.last_name)
      .maybeSingle();

    if (duplicateEmployee) {
      return NextResponse.json(
        {
          error: `Possible duplicate found: ${duplicateEmployee.employee_no} ${duplicateEmployee.first_name} ${duplicateEmployee.last_name}.`,
        },
        { status: 409 },
      );
    }

    const { data: existingEmployees, error: employeeNoError } =
      await supabaseAdmin
        .from("employees")
        .select("employee_no")
        .eq("company_id", registration.company_id);

    if (employeeNoError) {
      return NextResponse.json(
        { error: employeeNoError.message },
        { status: 400 },
      );
    }

    const nextEmployeeNo = generateNextEmployeeNo(
      (existingEmployees || []).map((item) => item.employee_no),
    );

    const employeePayload = {
      company_id: registration.company_id,
      employee_no: nextEmployeeNo,

      first_name: registration.first_name,
      last_name: registration.last_name,

      email: registration.email || "",
      contact_number: registration.mobile_number || "",

      department: "Unassigned",
      position: "Unassigned",

      employment_status: "Active",
      employment_type: "Pending Assignment",

      daily_rate: 0,
      basic_rate: 0,
      rate_type: "Daily",

      payroll_active: false,
      payroll_notes: "Created from employee onboarding registration.",

      portal_enabled: false,
      attendance_source_preference: "Biometrics",

      hire_date: null,
      birth_date: registration.birth_date || null,
      gender: registration.gender || "",
      civil_status: registration.civil_status || "",
      address: registration.address || "",

      emergency_contact_name: registration.emergency_contact_name || "",
      emergency_contact_number: registration.emergency_contact_number || "",
      emergency_contact_relationship:
        registration.emergency_contact_relationship || "",

      sss_no: registration.sss_no || "",
      philhealth_no: registration.philhealth_no || "",
      pagibig_no: registration.pagibig_no || "",
      tin_no: registration.tin_no || "",

      has_resume: false,
      has_valid_id: false,
      has_contract: false,
      has_nbi_clearance: false,
      has_medical: false,
      has_training_records: false,

      can_access_pos: false,
      created_at: new Date().toISOString(),
    };

    const { data: createdEmployee, error: createEmployeeError } =
      await supabaseAdmin
        .from("employees")
        .insert(employeePayload)
        .select("*")
        .single();

    if (createEmployeeError) {
      return NextResponse.json(
        { error: createEmployeeError.message },
        { status: 400 },
      );
    }

    const { error: updateRegistrationError } = await supabaseAdmin
      .from("employee_registration_requests")
      .update({
        status: "APPROVED",
        reviewed_by: reviewedBy || null,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);

    if (updateRegistrationError) {
      return NextResponse.json(
        {
          error: `Employee was created, but registration approval update failed: ${updateRegistrationError.message}`,
          employee: createdEmployee,
        },
        { status: 207 },
      );
    }

    return NextResponse.json({
      success: true,
      employee: createdEmployee,
      employee_no: nextEmployeeNo,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Approve registration failed.",
      },
      { status: 500 },
    );
  }
}


