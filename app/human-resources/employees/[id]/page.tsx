"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  Pencil,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  company_id?: string;
  system_role_id?: string | null;
  admin_access_enabled?: boolean;
  employee_no: string;
  first_name: string;
  last_name: string;
  email?: string;
  contact_number?: string;
  department?: string;
  position?: string;
  employment_status?: string;
  employment_type?: string;
  hire_date?: string;
  birth_date?: string;
  gender?: string;
  civil_status?: string;
  address?: string;
  sss_no?: string;
  philhealth_no?: string;
  pagibig_no?: string;
  tin_no?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  emergency_contact_relationship?: string;
  has_resume?: boolean;
  has_valid_id?: boolean;
  has_contract?: boolean;
  has_nbi_clearance?: boolean;
  has_medical?: boolean;
  has_training_records?: boolean;
  payroll_active?: boolean;
  portal_enabled?: boolean;
  attendance_source_preference?: string;
  rate_type?: string;
  basic_rate?: number;
  daily_rate?: number;
  payroll_notes?: string;
};

type PortalAccount = {
  id: string;
  username?: string;
  is_active?: boolean;
};

export default function Employee201ProfilePage() {
  const router = useRouter();
  const params = useParams();

  const employeeId = Array.isArray(params?.id)
    ? String(params?.id?.[0] || "")
    : String(params?.id || "");

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [portalAccount, setPortalAccount] = useState<PortalAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [saveError, setSaveError] = useState("");

  const loadPortalAccount = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("system_users")
        .select("id, username, is_active")
        .eq("employee_id", id)
        .maybeSingle();

      if (error) {
        console.log("GET PORTAL ACCOUNT ERROR:", error.message);
        setPortalAccount(null);
        return;
      }

      setPortalAccount(data || null);
    } catch (error: any) {
      console.log("GET PORTAL ACCOUNT UNEXPECTED ERROR:", error?.message || error);
      setPortalAccount(null);
    }
  };

  const getEmployee = async () => {
    setLoading(true);
    setSaveError("");
    setTemporaryPassword("");

    if (!employeeId || employeeId === "undefined" || employeeId === "null") {
      setEmployee(null);
      setForm({});
      setPortalAccount(null);
      setSaveError("Invalid employee ID.");
      setLoading(false);
      return;
    }

    try {
      let employeeData: Employee | null = null;

      const { data: byId, error: byIdError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employeeId)
        .maybeSingle();

      if (byIdError) {
        console.log("GET EMPLOYEE BY ID ERROR:", byIdError.message);
      }

      if (byId) {
        employeeData = byId as Employee;
      }

      if (!employeeData) {
        const { data: byEmployeeNo, error: byEmployeeNoError } = await supabase
          .from("employees")
          .select("*")
          .eq("employee_no", employeeId)
          .maybeSingle();

        if (byEmployeeNoError) {
          console.log("GET EMPLOYEE BY EMPLOYEE NO ERROR:", byEmployeeNoError.message);
        }

        if (byEmployeeNo) {
          employeeData = byEmployeeNo as Employee;
        }
      }

      if (!employeeData) {
        setEmployee(null);
        setForm({});
        setPortalAccount(null);
        setSaveError("Employee record not found.");
        setLoading(false);
        return;
      }

      setEmployee(employeeData);
      setForm(employeeData);
      setLoading(false);

      loadPortalAccount(employeeData.id);
    } catch (error: any) {
      console.log("GET EMPLOYEE 201 UNEXPECTED ERROR:", error?.message || error);
      setEmployee(null);
      setForm({});
      setPortalAccount(null);
      setSaveError(error?.message || "Unexpected loading error.");
      setLoading(false);
    }
  };

  useEffect(() => {
    getEmployee();
  }, [employeeId]);

  const updateForm = (key: keyof Employee, value: any) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const cancelEdit = () => {
    setForm(employee || {});
    setIsEditing(false);
    setSaveError("");
  };

  const saveEmployee201 = async () => {
    if (!employee || isSaving) return;

    if (!String(form.first_name || "").trim() || !String(form.last_name || "").trim()) {
      setSaveError("First name and last name are required.");
      return;
    }

    setIsSaving(true);
    setSaveError("");

    const rateValue = Number(form.basic_rate || form.daily_rate || 0);

    const payload = {
      first_name: String(form.first_name || "").trim(),
      last_name: String(form.last_name || "").trim(),
      email: String(form.email || "").trim(),
      contact_number: String(form.contact_number || "").trim(),
      department: String(form.department || "").trim() || "Unassigned",
      position: String(form.position || "").trim() || "Unassigned",
      employment_status: String(form.employment_status || "").trim() || "Active",
      employment_type: String(form.employment_type || "").trim() || "Pending Assignment",
      hire_date: form.hire_date || null,
      birth_date: form.birth_date || null,
      gender: String(form.gender || "").trim(),
      civil_status: String(form.civil_status || "").trim(),
      address: String(form.address || "").trim(),
      sss_no: String(form.sss_no || "").trim(),
      philhealth_no: String(form.philhealth_no || "").trim(),
      pagibig_no: String(form.pagibig_no || "").trim(),
      tin_no: String(form.tin_no || "").trim(),
      emergency_contact_name: String(form.emergency_contact_name || "").trim(),
      emergency_contact_number: String(form.emergency_contact_number || "").trim(),
      emergency_contact_relationship: String(
        form.emergency_contact_relationship || "",
      ).trim(),
      has_resume: form.has_resume === true,
      has_valid_id: form.has_valid_id === true,
      has_contract: form.has_contract === true,
      has_nbi_clearance: form.has_nbi_clearance === true,
      has_medical: form.has_medical === true,
      has_training_records: form.has_training_records === true,
      payroll_active: form.payroll_active !== false,
      portal_enabled: form.portal_enabled !== false,
      admin_access_enabled: form.admin_access_enabled === true,
      attendance_source_preference:
        String(form.attendance_source_preference || "").trim() || "Biometrics",
      rate_type: String(form.rate_type || "").trim() || "Daily",
      basic_rate: rateValue,
      daily_rate: rateValue,
      payroll_notes: String(form.payroll_notes || "").trim(),
    };

    const { data, error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", employee.id)
      .select("*")
      .single();

    setIsSaving(false);

    if (error) {
      console.log("SAVE EMPLOYEE 201 ERROR:", error.message);
      setSaveError(error.message);
      return;
    }

    setEmployee(data);
    setForm(data);
    setIsEditing(false);
  };

  const createPortalAccount = async () => {
    if (!employee || creatingAccount) return;

    if (!employee.email) {
      setSaveError("Email is required before creating a portal account.");
      return;
    }

    const confirmed = confirm(
      `Create portal account for ${employee.first_name} ${employee.last_name}?`,
    );

    if (!confirmed) return;

    setCreatingAccount(true);
    setSaveError("");
    setTemporaryPassword("");

    const response = await fetch("/api/hr/create-employee-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employee_id: employee.id,
        email: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
        company_id: employee.company_id,
        account_type: "employee_portal",
        create_admin_access: false,
      }),
    });

    const result = await response.json();

    setCreatingAccount(false);

    if (!response.ok) {
      setSaveError(result.error || "Failed to create portal account.");
      return;
    }

    setTemporaryPassword(result.temporary_password || "");
    alert(
      `Portal account created successfully.\n\nTemporary Password:\n${
        result.temporary_password || "Not returned"
      }`,
    );

    await getEmployee();
  };

  const source = isEditing ? form : employee;

  const checklist = useMemo(() => {
    if (!source) return [];

    return [
      { label: "Email", done: Boolean(source.email) },
      { label: "Contact Number", done: Boolean(source.contact_number) },
      {
        label: "Department",
        done: Boolean(source.department && source.department !== "Unassigned"),
      },
      {
        label: "Position",
        done: Boolean(source.position && source.position !== "Unassigned"),
      },
      {
        label: "Employment Type",
        done: Boolean(
          source.employment_type &&
            source.employment_type !== "Pending Assignment",
        ),
      },
      { label: "Hire Date", done: Boolean(source.hire_date) },
      {
        label: "Basic Rate",
        done: Number(source.basic_rate || source.daily_rate || 0) > 0,
      },
      { label: "SSS", done: Boolean(source.sss_no) },
      { label: "PhilHealth", done: Boolean(source.philhealth_no) },
      { label: "Pag-IBIG", done: Boolean(source.pagibig_no) },
      { label: "TIN", done: Boolean(source.tin_no) },
      {
        label: "Emergency Contact",
        done: Boolean(
          source.emergency_contact_name && source.emergency_contact_number,
        ),
      },
      { label: "Valid ID", done: source.has_valid_id === true },
      { label: "Contract", done: source.has_contract === true },
      { label: "Resume", done: source.has_resume === true },
      { label: "NBI Clearance", done: source.has_nbi_clearance === true },
      { label: "Medical", done: source.has_medical === true },
      {
        label: "Training Records",
        done: source.has_training_records === true,
      },
    ];
  }, [source]);

  const completedCount = checklist.filter((item) => item.done).length;
  const completionRate =
    checklist.length > 0
      ? Math.round((completedCount / checklist.length) * 100)
      : 0;
  const missingItems = checklist.filter((item) => !item.done);

  if (loading) {
    return (
      <Shell>
        <p className="text-sm font-bold text-slate-500">
          Loading employee profile...
        </p>
      </Shell>
    );
  }

  if (!employee) {
    return (
      <Shell>
        <button
          onClick={() => router.push("/human-resources/employees")}
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {saveError && (
          <p className="text-sm font-bold text-red-700">{saveError}</p>
        )}
      </Shell>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="HR / EMPLOYEE 201" />

      <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-8 pt-20 sm:px-6 lg:px-7">
        <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <button
              onClick={() => router.push("/human-resources/employees")}
              className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back to Employee 201
            </button>

            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Employee 201 Profile
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {source?.first_name} {source?.last_name}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {employee.employee_no} • {source?.department || "Unassigned"} •{" "}
              {source?.position || "Unassigned"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={source?.employment_status || "Active"} />

            {!isEditing && !portalAccount && (
              <button
                onClick={createPortalAccount}
                disabled={creatingAccount || !employee.email}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <KeyRound size={15} />
                {creatingAccount ? "Creating..." : "Create Portal Account"}
              </button>
            )}

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
              >
                <Pencil size={15} /> Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={saveEmployee201}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                >
                  <Save size={15} /> {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X size={15} /> Cancel
                </button>
              </>
            )}
          </div>
        </section>

        {saveError && (
          <section className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {saveError}
          </section>
        )}

        {temporaryPassword && (
          <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            Portal account created. Temporary password:{" "}
            <span className="font-black">{temporaryPassword}</span>
          </section>
        )}

        <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-700">
                <UserRound size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  201 Completion
                </p>
                <h2 className="text-3xl font-black text-slate-950">
                  {completionRate}%
                </h2>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-950"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-600">
              {completedCount} of {checklist.length} requirements completed.
            </p>

            {missingItems.length > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-800">
                  Missing Items
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missingItems.slice(0, 8).map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-bold text-amber-700"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard
              label="Payroll"
              value={source?.payroll_active === false ? "Inactive" : "Active"}
            />
            <SummaryCard
              label="Portal"
              value={
                portalAccount
                  ? "Account Created"
                  : source?.portal_enabled === false
                    ? "Disabled"
                    : "Enabled"
              }
            />
            <SummaryCard
              label="Admin Access"
              value={source?.admin_access_enabled === true ? "Enabled" : "No"}
            />
            <SummaryCard
              label="Attendance"
              value={source?.attendance_source_preference || "Biometrics"}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <InfoPanel title="Personal Information">
            <ProfileField label="First Name" value={source?.first_name} editing={isEditing} onChange={(value) => updateForm("first_name", value)} />
            <ProfileField label="Last Name" value={source?.last_name} editing={isEditing} onChange={(value) => updateForm("last_name", value)} />
            <ProfileField label="Birth Date" type="date" value={source?.birth_date} editing={isEditing} onChange={(value) => updateForm("birth_date", value)} />
            <ProfileField label="Gender" value={source?.gender} editing={isEditing} onChange={(value) => updateForm("gender", value)} />
            <ProfileField label="Civil Status" value={source?.civil_status} editing={isEditing} onChange={(value) => updateForm("civil_status", value)} />
          </InfoPanel>

          <InfoPanel title="Contact Information">
            <ProfileField label="Email" type="email" value={source?.email} editing={isEditing} onChange={(value) => updateForm("email", value)} />
            <ProfileField label="Contact Number" value={source?.contact_number} editing={isEditing} onChange={(value) => updateForm("contact_number", value)} />
            <ProfileField label="Address" value={source?.address} editing={isEditing} onChange={(value) => updateForm("address", value)} />
          </InfoPanel>

          <InfoPanel title="Employment Information">
            <ProfileField label="Department" value={source?.department} editing={isEditing} onChange={(value) => updateForm("department", value)} />
            <ProfileField label="Position" value={source?.position} editing={isEditing} onChange={(value) => updateForm("position", value)} />
            <ProfileField label="Employment Status" value={source?.employment_status} editing={isEditing} onChange={(value) => updateForm("employment_status", value)} />
            <ProfileField label="Employment Type" value={source?.employment_type} editing={isEditing} onChange={(value) => updateForm("employment_type", value)} />
            <ProfileField label="Hire Date" type="date" value={source?.hire_date} editing={isEditing} onChange={(value) => updateForm("hire_date", value)} />
            <ProfileField label="Rate Type" value={source?.rate_type} editing={isEditing} onChange={(value) => updateForm("rate_type", value)} />
            <ProfileField
              label="Basic Rate"
              type="number"
              value={source?.basic_rate || source?.daily_rate || 0}
              editing={isEditing}
              onChange={(value) => updateForm("basic_rate", Number(value || 0))}
              displayValue={`₱${Number(source?.basic_rate || source?.daily_rate || 0).toLocaleString("en-PH")}`}
            />
          </InfoPanel>

          <InfoPanel title="Government Information">
            <ProfileField label="SSS" value={source?.sss_no} editing={isEditing} onChange={(value) => updateForm("sss_no", value)} />
            <ProfileField label="PhilHealth" value={source?.philhealth_no} editing={isEditing} onChange={(value) => updateForm("philhealth_no", value)} />
            <ProfileField label="Pag-IBIG" value={source?.pagibig_no} editing={isEditing} onChange={(value) => updateForm("pagibig_no", value)} />
            <ProfileField label="TIN" value={source?.tin_no} editing={isEditing} onChange={(value) => updateForm("tin_no", value)} />
          </InfoPanel>

          <InfoPanel title="Emergency Contact">
            <ProfileField label="Contact Person" value={source?.emergency_contact_name} editing={isEditing} onChange={(value) => updateForm("emergency_contact_name", value)} />
            <ProfileField label="Contact Number" value={source?.emergency_contact_number} editing={isEditing} onChange={(value) => updateForm("emergency_contact_number", value)} />
            <ProfileField label="Relationship" value={source?.emergency_contact_relationship} editing={isEditing} onChange={(value) => updateForm("emergency_contact_relationship", value)} />
          </InfoPanel>

          <InfoPanel title="Requirements Tracker">
            <RequirementField label="Resume" done={source?.has_resume === true} editing={isEditing} onChange={(value) => updateForm("has_resume", value)} />
            <RequirementField label="Valid ID" done={source?.has_valid_id === true} editing={isEditing} onChange={(value) => updateForm("has_valid_id", value)} />
            <RequirementField label="NBI Clearance" done={source?.has_nbi_clearance === true} editing={isEditing} onChange={(value) => updateForm("has_nbi_clearance", value)} />
            <RequirementField label="Medical" done={source?.has_medical === true} editing={isEditing} onChange={(value) => updateForm("has_medical", value)} />
            <RequirementField label="Contract" done={source?.has_contract === true} editing={isEditing} onChange={(value) => updateForm("has_contract", value)} />
            <RequirementField label="Training Records" done={source?.has_training_records === true} editing={isEditing} onChange={(value) => updateForm("has_training_records", value)} />
          </InfoPanel>

          <InfoPanel title="Payroll, Portal & Attendance">
            <RequirementField
              label="Admin / System User Access"
              done={source?.admin_access_enabled === true}
              editing={isEditing}
              onChange={(value) => updateForm("admin_access_enabled", value)}
            />
            <RequirementField label="Payroll Active" done={source?.payroll_active !== false} editing={isEditing} onChange={(value) => updateForm("payroll_active", value)} />
            <RequirementField label="Portal Enabled" done={source?.portal_enabled !== false} editing={isEditing} onChange={(value) => updateForm("portal_enabled", value)} />
            <ProfileField label="Attendance Source" value={source?.attendance_source_preference} editing={isEditing} onChange={(value) => updateForm("attendance_source_preference", value)} />
            <ProfileField label="Payroll Notes" value={source?.payroll_notes} editing={isEditing} onChange={(value) => updateForm("payroll_notes", value)} />
          </InfoPanel>

          <InfoPanel title="Portal Access">
            <ProfileField label="Portal Status" value={source?.portal_enabled === false ? "Disabled" : "Enabled"} editing={false} onChange={() => undefined} />
            <ProfileField label="Admin Access Eligibility" value={source?.admin_access_enabled === true ? "Enabled" : "No"} editing={false} onChange={() => undefined} />
            <ProfileField label="Account Creation" value={portalAccount ? "Created" : "Not Created"} editing={false} onChange={() => undefined} />
            <ProfileField label="Username" value={portalAccount?.username || source?.email || "Missing Email"} editing={false} onChange={() => undefined} />
            <ProfileField label="Password Setup" value={portalAccount ? "Temporary Password Issued" : "Pending Account Creation"} editing={false} onChange={() => undefined} />

            {!isEditing && !portalAccount && (
              <button
                onClick={createPortalAccount}
                disabled={creatingAccount || !employee.email}
                className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <KeyRound size={15} />
                {creatingAccount ? "Creating Portal Account..." : "Create Portal Account"}
              </button>
            )}

            {!employee.email && !portalAccount && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                Add employee email before creating a portal account.
              </div>
            )}
          </InfoPanel>

          <InfoPanel title="Audit History">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              Audit timeline will be connected in the next phase.
            </div>
          </InfoPanel>
        </section>
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="HR / EMPLOYEE 201" />
      <main className="flex-1 px-6 pt-24">{children}</main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ProfileField({
  label,
  value,
  editing,
  onChange,
  type = "text",
  displayValue,
}: {
  label: string;
  value: any;
  editing: boolean;
  onChange: (value: any) => void;
  type?: string;
  displayValue?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-bold text-slate-500">{label}</p>

      {editing ? (
        <input
          type={type}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-[55%] rounded-xl border border-slate-300 bg-white px-3 text-right text-sm font-bold text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
      ) : (
        <p className="text-right text-sm font-black text-slate-950">
          {displayValue || value || "Missing"}
        </p>
      )}
    </div>
  );
}

function RequirementField({
  label,
  done,
  editing,
  onChange,
}: {
  label: string;
  done: boolean;
  editing: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-bold text-slate-700">{label}</p>

      {editing ? (
        <select
          value={done ? "Yes" : "No"}
          onChange={(event) => onChange(event.target.value === "Yes")}
          className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ) : (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
            done
              ? "border border-blue-200 bg-blue-50 text-blue-700"
              : "border border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          {done ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
          {done ? "Enabled" : "No"}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const style =
    normalized === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "probationary"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : normalized === "resigned" ||
            normalized === "terminated" ||
            normalized === "inactive" ||
            normalized === "archived" ||
            normalized === "awol"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${style}`}
    >
      <ShieldCheck size={14} />
      {status}
    </span>
  );
}