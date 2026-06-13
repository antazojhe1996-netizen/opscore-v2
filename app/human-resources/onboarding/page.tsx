"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Send,
  ShieldCheck,
} from "lucide-react";

type OnboardingSettings = {
  id: string;
  company_id: string;
  is_registration_open: boolean;
  closed_message: string;
};

const DEFAULT_CLOSED_MESSAGE =
  "Employee onboarding is currently closed. Please contact HR.";

export default function PublicOnboardingPage() {
  /// STATES
  const [settings, setSettings] = useState<OnboardingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");

  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [nationality, setNationality] = useState("Filipino");

  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [sssNo, setSssNo] = useState("");
  const [philhealthNo, setPhilhealthNo] = useState("");
  const [pagibigNo, setPagibigNo] = useState("");
  const [tinNo, setTinNo] = useState("");

  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState("");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState("");
  const [emergencyContactAddress, setEmergencyContactAddress] = useState("");

  /// FUNCTIONS
  const loadSettings = async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("onboarding_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSettings(data || null);
  };

  const validateForm = () => {
    if (!settings?.company_id) {
      setErrorMessage("Company onboarding settings not found.");
      return false;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage("Please enter your first name and last name.");
      return false;
    }

    if (!birthDate) {
      setErrorMessage("Please enter your birth date.");
      return false;
    }

    if (!mobileNumber.trim()) {
      setErrorMessage("Please enter your mobile number.");
      return false;
    }

    if (!address.trim()) {
      setErrorMessage("Please enter your address.");
      return false;
    }

    if (!emergencyContactName.trim() || !emergencyContactNumber.trim()) {
      setErrorMessage("Please complete your emergency contact details.");
      return false;
    }

    if (email.trim() && !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return false;
    }

    setErrorMessage("");
    return true;
  };

  const submitRegistration = async () => {
    if (submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setErrorMessage("");

    const payload = {
      company_id: settings?.company_id,

      first_name: firstName.trim(),
      middle_name: middleName.trim() || null,
      last_name: lastName.trim(),
      suffix: suffix.trim() || null,

      birth_date: birthDate || null,
      gender: gender || null,
      civil_status: civilStatus || null,
      nationality: nationality.trim() || null,

      mobile_number: mobileNumber.trim(),
      email: email.trim() || null,
      address: address.trim(),

      sss_no: sssNo.trim() || null,
      philhealth_no: philhealthNo.trim() || null,
      pagibig_no: pagibigNo.trim() || null,
      tin_no: tinNo.trim() || null,

      emergency_contact_name: emergencyContactName.trim(),
      emergency_contact_relationship:
        emergencyContactRelationship.trim() || null,
      emergency_contact_number: emergencyContactNumber.trim(),
      emergency_contact_address: emergencyContactAddress.trim() || null,

      status: "PENDING",
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("employee_registration_requests")
      .insert(payload);

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSubmitted(true);
  };

  /// EFFECTS
  useEffect(() => {
    loadSettings();
  }, []);

  /// UI
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 text-slate-900">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
          Loading onboarding form...
        </div>
      </main>
    );
  }

  if (!settings || !settings.is_registration_open) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-10 text-slate-900">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <ShieldCheck size={25} />
          </div>

          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
            OPSCORE Employee Onboarding
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Registration Closed
          </h1>

          <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
            {settings?.closed_message || DEFAULT_CLOSED_MESSAGE}
          </p>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-10 text-slate-900">
        <section className="w-full max-w-xl rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <CheckCircle2 size={26} />
          </div>

          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">
            Submitted For HR Review
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Registration Submitted
          </h1>

          <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
            Your employee information has been submitted. HR will review your
            details before creating your official 201 record and portal access.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                OPSCORE Employee Onboarding
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Employee Registration Form
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                Complete your employee information for HR review. Government ID
                numbers are optional if not yet available. Attachments are not
                required in this version.
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ClipboardList size={25} />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <FormPanel title="Personal Information">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="First Name *" value={firstName} setValue={setFirstName} />
              <Input label="Middle Name" value={middleName} setValue={setMiddleName} />
              <Input label="Last Name *" value={lastName} setValue={setLastName} />
              <Input label="Suffix" value={suffix} setValue={setSuffix} />
              <Input
                label="Birth Date *"
                type="date"
                value={birthDate}
                setValue={setBirthDate}
              />
              <Select
                label="Gender"
                value={gender}
                setValue={setGender}
                options={["Male", "Female", "Prefer not to say"]}
              />
              <Select
                label="Civil Status"
                value={civilStatus}
                setValue={setCivilStatus}
                options={["Single", "Married", "Widowed", "Separated"]}
              />
              <Input
                label="Nationality"
                value={nationality}
                setValue={setNationality}
              />
            </div>
          </FormPanel>

          <FormPanel title="Contact Information">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Mobile Number *"
                value={mobileNumber}
                setValue={setMobileNumber}
              />
              <Input label="Email" type="email" value={email} setValue={setEmail} />
              <div className="md:col-span-2">
                <Input label="Address *" value={address} setValue={setAddress} />
              </div>
            </div>
          </FormPanel>

          <FormPanel title="Government Information Optional">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="SSS No." value={sssNo} setValue={setSssNo} />
              <Input
                label="PhilHealth No."
                value={philhealthNo}
                setValue={setPhilhealthNo}
              />
              <Input label="Pag-IBIG No." value={pagibigNo} setValue={setPagibigNo} />
              <Input label="TIN No." value={tinNo} setValue={setTinNo} />
            </div>
          </FormPanel>

          <FormPanel title="Emergency Contact">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Contact Person *"
                value={emergencyContactName}
                setValue={setEmergencyContactName}
              />
              <Input
                label="Relationship"
                value={emergencyContactRelationship}
                setValue={setEmergencyContactRelationship}
              />
              <Input
                label="Contact Number *"
                value={emergencyContactNumber}
                setValue={setEmergencyContactNumber}
              />
              <Input
                label="Contact Address"
                value={emergencyContactAddress}
                setValue={setEmergencyContactAddress}
              />
            </div>
          </FormPanel>

          <div className="border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={submitRegistration}
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
            >
              <Send size={17} />
              {submitting ? "Submitting..." : "Submit For HR Review"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function FormPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  setValue,
  type = "text",
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

function Select({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}