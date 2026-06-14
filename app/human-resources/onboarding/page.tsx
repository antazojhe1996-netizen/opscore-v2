"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Hotel,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

type OnboardingSettings = {
  id: string;
  company_id: string;
  is_registration_open: boolean;
  closed_message: string;
};

const DEFAULT_CLOSED_MESSAGE =
  "Employee onboarding is currently closed. Please contact HR.";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const currentYear = new Date().getFullYear();

const YEARS = Array.from({ length: currentYear - 1949 }, (_, index) =>
  String(currentYear - index),
);

const DAYS = Array.from({ length: 31 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);

const getDaysInMonth = (year: string, month: string) => {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
};

const buildBirthDate = (year: string, month: string, day: string) => {
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};

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

  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");

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

  const birthDate = useMemo(
    () => buildBirthDate(birthYear, birthMonth, birthDay),
    [birthYear, birthMonth, birthDay],
  );

  const availableDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(birthYear, birthMonth);
    return DAYS.slice(0, daysInMonth);
  }, [birthYear, birthMonth]);

  const completionItems = [
    Boolean(firstName.trim() && lastName.trim()),
    Boolean(birthDate),
    Boolean(mobileNumber.trim()),
    Boolean(address.trim()),
    Boolean(emergencyContactName.trim() && emergencyContactNumber.trim()),
  ];

  const completionRate = Math.round(
    (completionItems.filter(Boolean).length / completionItems.length) * 100,
  );

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
      setErrorMessage("Please complete your birth month, day, and year.");
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

  useEffect(() => {
    if (!birthDay) return;

    const daysInMonth = getDaysInMonth(birthYear, birthMonth);
    if (Number(birthDay) > daysInMonth) {
      setBirthDay("");
    }
  }, [birthYear, birthMonth, birthDay]);

  /// UI
  if (loading) {
    return (
      <PublicShell compact>
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-7 text-center shadow-2xl shadow-slate-950/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#070d19] text-white shadow-lg shadow-blue-950/20">
            <Sparkles size={24} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
            Vincent Employee Onboarding
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Loading form
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Preparing your employee registration page.
          </p>
        </section>
      </PublicShell>
    );
  }

  if (!settings || !settings.is_registration_open) {
    return (
      <PublicShell compact>
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white p-7 text-center shadow-2xl shadow-slate-950/10 sm:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#070d19] text-white shadow-lg shadow-blue-950/20">
            <ShieldCheck size={25} />
          </div>

          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">
            Vincent Employee Onboarding
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Registration Closed
          </h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            {settings?.closed_message || DEFAULT_CLOSED_MESSAGE}
          </p>
        </section>
      </PublicShell>
    );
  }

  if (submitted) {
    return (
      <PublicShell compact>
        <section className="w-full max-w-xl rounded-[2rem] border border-emerald-200 bg-white p-7 text-center shadow-2xl shadow-emerald-950/10 sm:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/20">
            <CheckCircle2 size={26} />
          </div>

          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">
            Submitted For HR Review
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Registration Submitted
          </h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            Your employee information has been submitted. HR will review your
            details before creating your official employee record and portal access.
          </p>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[#070d19] text-white shadow-2xl shadow-slate-950/20">
          <div className="relative p-6 sm:p-8 lg:p-9">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-600/30 blur-3xl" />
            <div className="absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
                  <Hotel size={13} /> Vincent Resort Hotel
                </div>

                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-blue-200">
                  Employee Onboarding
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Employee Registration Form
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300 sm:text-base">
                  Complete your employee information for HR review. Government
                  ID numbers are optional if not yet available.
                </p>
              </div>

              <div className="relative flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl md:w-[290px]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/30">
                  <ClipboardList size={25} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    HR Review
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    Submit once only
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Your record goes to Pending Registration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="order-2 h-fit rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm lg:order-1 lg:sticky lg:top-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Registration Progress
            </p>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-700 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <p className="mt-2 text-xs font-bold text-slate-500">
              {completionRate}% required details completed
            </p>

            <div className="mt-5 space-y-3">
              <StepItem
                label="Personal Information"
                active={Boolean(firstName.trim() && lastName.trim() && birthDate)}
              />
              <StepItem
                label="Contact Details"
                active={Boolean(mobileNumber.trim() && address.trim())}
              />
              <StepItem label="Government IDs" active={false} optional />
              <StepItem
                label="Emergency Contact"
                active={Boolean(
                  emergencyContactName.trim() && emergencyContactNumber.trim(),
                )}
              />
              <StepItem label="HR Review" active={false} />
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-950">Reminder</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-blue-700">
                Use your correct mobile number. HR may contact you after review.
              </p>
            </div>
          </aside>

          <section className="order-1 space-y-5 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-2">
            <FormPanel
              title="Personal Information"
              icon={<UserRound size={17} />}
              description="Tell us your basic employee profile details."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="First Name *" value={firstName} setValue={setFirstName} />
                <Input label="Middle Name" value={middleName} setValue={setMiddleName} />
                <Input label="Last Name *" value={lastName} setValue={setLastName} />
                <Input label="Suffix" value={suffix} setValue={setSuffix} />

                <BirthDateField
                  birthMonth={birthMonth}
                  setBirthMonth={setBirthMonth}
                  birthDay={birthDay}
                  setBirthDay={setBirthDay}
                  birthYear={birthYear}
                  setBirthYear={setBirthYear}
                  availableDays={availableDays}
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

            <FormPanel
              title="Contact Information"
              icon={<ShieldCheck size={17} />}
              description="Provide contact details HR can verify."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Mobile Number *"
                  value={mobileNumber}
                  setValue={setMobileNumber}
                  inputMode="tel"
                  placeholder="09XX XXX XXXX"
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  setValue={setEmail}
                  inputMode="email"
                  placeholder="Optional"
                />
                <div className="md:col-span-2">
                  <Input label="Address *" value={address} setValue={setAddress} />
                </div>
              </div>
            </FormPanel>

            <FormPanel
              title="Government Information Optional"
              icon={<ClipboardList size={17} />}
              description="You may leave these blank if not yet available."
            >
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

            <FormPanel
              title="Emergency Contact"
              icon={<AlertCircle size={17} />}
              description="This person may be contacted in case of emergency."
            >
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
                  inputMode="tel"
                  placeholder="09XX XXX XXXX"
                />
                <Input
                  label="Contact Address"
                  value={emergencyContactAddress}
                  setValue={setEmergencyContactAddress}
                />
              </div>
            </FormPanel>

            <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
              <button
                type="button"
                onClick={submitRegistration}
                disabled={submitting}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#070d19] px-5 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              >
                <Send size={17} />
                {submitting ? "Submitting..." : "Submit For HR Review"}
                {!submitting && (
                  <ArrowRight
                    size={16}
                    className="transition-all duration-200 group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </div>
          </section>
        </section>
      </section>
    </PublicShell>
  );
}

function PublicShell({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <main
      className={[
        "min-h-screen overflow-x-hidden bg-[#F5F7FB] text-slate-900",
        compact ? "flex items-center justify-center px-5 py-10" : "",
      ].join(" ")}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>
      <div className="relative w-full">{children}</div>
    </main>
  );
}

function StepItem({
  label,
  active,
  optional,
}: {
  label: string;
  active?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-xs font-black",
          active
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-slate-50 text-slate-400",
        ].join(" ")}
      >
        {active ? <CheckCircle2 size={14} /> : "•"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        {optional && (
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Optional
          </p>
        )}
      </div>
    </div>
  );
}

function FormPanel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-sm">
          {icon}
        </div>
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
            {title}
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function BirthDateField({
  birthMonth,
  setBirthMonth,
  birthDay,
  setBirthDay,
  birthYear,
  setBirthYear,
  availableDays,
}: {
  birthMonth: string;
  setBirthMonth: (value: string) => void;
  birthDay: string;
  setBirthDay: (value: string) => void;
  birthYear: string;
  setBirthYear: (value: string) => void;
  availableDays: string[];
}) {
  return (
    <div className="md:col-span-2">
      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        Birth Date *
      </label>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_0.8fr_1fr]">
        <select
          value={birthMonth}
          onChange={(event) => setBirthMonth(event.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">Month</option>
          {MONTHS.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>

        <select
          value={birthDay}
          onChange={(event) => setBirthDay(event.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">Day</option>
          {availableDays.map((day) => (
            <option key={day} value={day}>
              {Number(day)}
            </option>
          ))}
        </select>

        <select
          value={birthYear}
          onChange={(event) => setBirthYear(event.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">Year</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500">
        Select month, day, and year. No calendar scrolling needed.
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  setValue,
  type = "text",
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
