"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  Hotel,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
  Wallet,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

type SystemUser = {
  id: string;
  auth_user_id: string | null;
  employee_id: string | null;
  username: string;
  company_id: string | null;
  is_active: boolean;
  must_change_password?: boolean | null;
  last_login_at?: string | null;
};

type LoginEmployee = {
  id: string;
  employee_no: string | null;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  employment_status: string | null;
  portal_enabled?: boolean | null;
};

type CompanyUser = {
  id: string;
  company_id: string;
  user_id: string;
  role_id: string | null;
  is_active: boolean | null;
};

export default function PortalLoginPage() {
  const router = useRouter();

  /// STATES
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /// DATA
  const employeeSessionKey = "opscore_current_employee";
  const employeeIdKey = "opscore_current_employee_id";
  const employeeNameKey = "opscore_current_employee_name";
  const currentUserKey = "opscore_current_user";
  const systemUserIdKey = "opscore_current_system_user_id";
  const mustChangePasswordKey = "opscore_must_change_password";
  const companyIdKey = "opscore_current_company_id";
  const roleIdKey = "opscore_current_role_id";

  /// FUNCTIONS
  const normalize = (value: string) => value.trim().toLowerCase();

  const clearSession = () => {
    localStorage.removeItem(employeeSessionKey);
    localStorage.removeItem(employeeIdKey);
    localStorage.removeItem(employeeNameKey);
    localStorage.removeItem(currentUserKey);
    localStorage.removeItem(systemUserIdKey);
    localStorage.removeItem(mustChangePasswordKey);
    localStorage.removeItem(companyIdKey);
    localStorage.removeItem(roleIdKey);
  };

  useEffect(() => {
    const currentSystemUserId = localStorage.getItem(systemUserIdKey);
    const mustChangePassword = localStorage.getItem(mustChangePasswordKey);

    if (currentSystemUserId && mustChangePassword === "true") {
      router.replace("/change-password");
      return;
    }

    if (currentSystemUserId) {
      const existingEmployeeSession = localStorage.getItem(employeeSessionKey);

      if (existingEmployeeSession) {
        router.replace("/employee-portal");
        return;
      }

      clearSession();
    }
  }, [router]);

  const login = async () => {
    if (isLoading) return;

    const emailInput = normalize(email);
    const passwordInput = password.trim();

    if (!emailInput || !passwordInput) {
      setErrorMessage("Enter your email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });

    if (authError || !authData.user) {
      setIsLoading(false);
      setErrorMessage("Invalid email or password.");
      return;
    }

    const authUserId = authData.user.id;

    const { data: userData, error: userError } = await supabase
      .from("system_users")
      .select("*")
      .eq("auth_user_id", authUserId)
      .limit(1)
      .maybeSingle();

    if (userError || !userData) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("No OPSCORE user profile linked to this account.");
      return;
    }

    const systemUser = userData as SystemUser;

    if (!systemUser.is_active) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("This user account is inactive.");
      return;
    }

    if (!systemUser.company_id) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("No company assigned to this user.");
      return;
    }

    // EMPLOYEE PORTAL RULE:
    // Portal login is employee-first. company_users / role_id are optional and only used
    // for manager/admin-style portal permissions. Portal-only staff must NOT be blocked
    // just because they do not have Admin/System User Access.
    const { data: companyUserData, error: companyUserError } = await supabase
      .from("company_users")
      .select("*")
      .eq("user_id", systemUser.id)
      .eq("company_id", systemUser.company_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (companyUserError) {
      console.log("PORTAL COMPANY USER LOOKUP ERROR:", companyUserError.message);
    }

    const companyUser = (companyUserData || null) as CompanyUser | null;

    let employee: LoginEmployee | null = null;
    let employeeName = systemUser.username || "System User";

    if (systemUser.employee_id) {
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", systemUser.employee_id)
        .maybeSingle();

      if (employeeError || !employeeData) {
        await supabase.auth.signOut();
        setIsLoading(false);
        setErrorMessage("Linked employee profile not found. Contact administrator.");
        return;
      }

      employee = employeeData as LoginEmployee;

      if (String(employee.employment_status || "").toLowerCase() !== "active") {
        await supabase.auth.signOut();
        setIsLoading(false);
        setErrorMessage("This employee account is not active.");
        return;
      }

      if (employee.portal_enabled === false) {
        await supabase.auth.signOut();
        setIsLoading(false);
        setErrorMessage("Employee portal access is disabled for this account.");
        return;
      }

      employeeName = `${employee.first_name || ""} ${
        employee.last_name || ""
      }`.trim();
    }

    const mustChangePassword = Boolean(systemUser.must_change_password);

    clearSession();

    localStorage.setItem(systemUserIdKey, systemUser.id);
    localStorage.setItem(companyIdKey, systemUser.company_id);
    if (companyUser?.role_id) {
      localStorage.setItem(roleIdKey, companyUser.role_id);
    } else {
      localStorage.removeItem(roleIdKey);
    }
    localStorage.setItem(mustChangePasswordKey, String(mustChangePassword));

    if (employee) {
      const sessionEmployee = {
        ...employee,
        auth_user_id: authUserId,
        system_user_id: systemUser.id,
        company_user_id: companyUser?.id || null,
        company_id: systemUser.company_id,
        role_id: companyUser?.role_id || null,
        username: systemUser.username,
        must_change_password: mustChangePassword,
      };

      localStorage.setItem(employeeIdKey, employee.id);
      localStorage.setItem(employeeNameKey, employeeName);
      localStorage.setItem(employeeSessionKey, JSON.stringify(sessionEmployee));
    }

    localStorage.setItem(
      currentUserKey,
      JSON.stringify({
        id: systemUser.id,
        auth_user_id: authUserId,
        system_user_id: systemUser.id,
        company_user_id: companyUser?.id || null,
        company_id: systemUser.company_id,
        role_id: companyUser?.role_id || null,
        employee_id: employee?.id || null,
        name: employeeName,
        username: systemUser.username,
        email: authData.user.email || employee?.email || null,
      })
    );

    await supabase
      .from("system_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", systemUser.id);

    window.dispatchEvent(new Event("storage"));
    setIsLoading(false);

    if (mustChangePassword) {
      router.replace("/change-password");
      return;
    }

    if (!employee) {
      await supabase.auth.signOut();
      clearSession();
      setErrorMessage("No employee portal profile linked to this account. Please use Operations Login or contact HR.");
      return;
    }

    router.replace("/employee-portal");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login();
  };

  /// UI
  return (
    <main className="min-h-screen overflow-hidden bg-[#080D1A] text-white">
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.88),transparent_42%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.92),rgba(49,46,129,0.28))]" />
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-slate-400/10 blur-3xl" />

        <section className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/60 backdrop-blur-xl xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden min-h-[720px] overflow-hidden border-r border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 p-10 xl:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.12),transparent_38%)]" />
            <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-indigo-950/50 to-transparent" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-300/20 bg-white/10 text-indigo-200 shadow-lg shadow-indigo-950/30">
                    <Hotel size={30} />
                  </div>

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-200">
                      OPSCORE V3
                    </p>
                    <h1 className="text-2xl font-black text-white">
                      Vincent Resort Hotel
                    </h1>
                  </div>
                </div>

                <h2 className="mt-12 text-5xl font-black leading-tight tracking-tight text-white">
                  Employee Self-Service
                  <span className="block bg-gradient-to-r from-blue-200 to-slate-300 bg-clip-text text-transparent">
                    Portal
                  </span>
                </h2>

                <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-300">
                  Access your schedule, attendance, leave requests, payslips, announcements, and mobile approvals in one secure portal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FeatureCard
                  icon={<CalendarDays size={22} />}
                  title="Schedule"
                  description="View your assigned shifts and weekly schedule."
                />

                <FeatureCard
                  icon={<UserCheck size={22} />}
                  title="Attendance"
                  description="Time in, time out, and monitor attendance history."
                />

                <FeatureCard
                  icon={<ShieldCheck size={22} />}
                  title="Leave"
                  description="File sick leave, vacation leave, and view request status."
                />

                <FeatureCard
                  icon={<Wallet size={22} />}
                  title="Payslips"
                  description="View payroll history and downloadable payslips."
                />
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-slate-950/55 p-4 shadow-lg shadow-black/20">
                <Metric value="1" label="Platform" />
                <Metric value="Mobile" label="Ready" />
                <Metric value="Secure" label="Access" />
              </div>
            </div>
          </div>

          <div className="relative bg-slate-950/55 p-6 sm:p-10 xl:p-12">
            <div className="mx-auto flex min-h-[620px] max-w-md flex-col justify-center">
              <div className="mb-8">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-200">
                  Employee Portal
                </p>

                <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
                  Welcome back
                </h2>

                <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
                  Sign in to access your OPSCORE employee workspace.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Email
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 transition-all duration-200 focus-within:border-indigo-300/60 focus-within:ring-4 focus-within:ring-indigo-500/10">
                    <UserCheck size={18} className="text-slate-500" />

                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter employee email"
                      autoComplete="email"
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Password
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 transition-all duration-200 focus-within:border-indigo-300/60 focus-within:ring-4 focus-within:ring-indigo-500/10">
                    <LockKeyhole size={18} className="text-slate-500" />

                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-600"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-white/10 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="flex gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold leading-5 text-red-200">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-5 text-sm font-black text-slate-950 shadow-lg shadow-black/25 transition-all duration-200 hover:bg-indigo-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Checking access..." : "Sign In"}
                  {!isLoading && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="text-center text-xs font-medium leading-5 text-slate-400">
                  <p>Need portal access? Contact HR or the system administrator.</p>
                  <p className="mt-1 font-bold text-slate-200">
                    Powered by OPSCORE · Developed & Designed by Jherome Antazo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-lg shadow-black/10 transition-all duration-200 hover:border-indigo-300/30 hover:bg-white/[0.08]">
      <div className="flex items-start gap-4">
        <div className="rounded-xl border border-white/10 bg-indigo-400/10 p-3 text-indigo-200">
          {icon}
        </div>

        <div>
          <h3 className="font-black text-white">{title}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-black text-indigo-200">{value}</p>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}
