"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Hotel,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

type SystemUser = {
  id: string;
  auth_user_id: string | null;
  employee_id: string;
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
};

type CompanyUser = {
  id: string;
  company_id: string;
  user_id: string;
  role_id: string | null;
  is_active: boolean | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const employeeSessionKey = "opscore_current_employee";
  const employeeIdKey = "opscore_current_employee_id";
  const employeeNameKey = "opscore_current_employee_name";
  const currentUserKey = "opscore_current_user";
  const systemUserIdKey = "opscore_current_system_user_id";
  const mustChangePasswordKey = "opscore_must_change_password";
  const companyIdKey = "opscore_current_company_id";
  const roleIdKey = "opscore_current_role_id";

  const normalize = (value: string) => value.trim().toLowerCase();

  useEffect(() => {
    const currentEmployeeId = localStorage.getItem(employeeIdKey);
    const mustChangePassword = localStorage.getItem(mustChangePasswordKey);

    if (currentEmployeeId && mustChangePassword === "true") {
      router.replace("/change-password");
      return;
    }

    if (currentEmployeeId) {
      router.replace("/dashboard");
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

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", systemUser.employee_id)
      .maybeSingle();

    if (employeeError || !employeeData) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("Employee profile not found. Contact administrator.");
      return;
    }

    const employee = employeeData as LoginEmployee;

    if (String(employee.employment_status || "").toLowerCase() !== "active") {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("This employee account is not active.");
      return;
    }

    const { data: companyUserData, error: companyUserError } = await supabase
      .from("company_users")
      .select("*")
      .eq("user_id", systemUser.id)
      .eq("company_id", systemUser.company_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (companyUserError || !companyUserData) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("No active company access found for this user.");
      return;
    }

    const companyUser = companyUserData as CompanyUser;
    const employeeName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
    const mustChangePassword = Boolean(systemUser.must_change_password);

    localStorage.removeItem(employeeSessionKey);
    localStorage.removeItem(employeeIdKey);
    localStorage.removeItem(employeeNameKey);
    localStorage.removeItem(currentUserKey);
    localStorage.removeItem(systemUserIdKey);
    localStorage.removeItem(mustChangePasswordKey);
    localStorage.removeItem(companyIdKey);
    localStorage.removeItem(roleIdKey);

    const sessionEmployee = {
      ...employee,
      auth_user_id: authUserId,
      system_user_id: systemUser.id,
      company_user_id: companyUser.id,
      company_id: systemUser.company_id,
      role_id: companyUser.role_id,
      username: systemUser.username,
      must_change_password: mustChangePassword,
    };

    localStorage.setItem(employeeIdKey, employee.id);
    localStorage.setItem(employeeNameKey, employeeName);
    localStorage.setItem(employeeSessionKey, JSON.stringify(sessionEmployee));
    localStorage.setItem(systemUserIdKey, systemUser.id);
    localStorage.setItem(companyIdKey, String(systemUser.company_id || ""));
    localStorage.setItem(roleIdKey, String(companyUser.role_id || ""));
    localStorage.setItem(mustChangePasswordKey, String(mustChangePassword));
    localStorage.setItem(
      currentUserKey,
      JSON.stringify({
        id: employee.id,
        auth_user_id: authUserId,
        system_user_id: systemUser.id,
        company_user_id: companyUser.id,
        company_id: systemUser.company_id,
        role_id: companyUser.role_id,
        name: employeeName,
        username: systemUser.username,
        email: authData.user.email || employee.email || null,
      }),
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

    router.replace("/dashboard");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login();
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_32%)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-blue-950/40 to-transparent" />

        <section className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-blue-500/20 bg-slate-950/95 shadow-2xl shadow-black/60 backdrop-blur xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden min-h-[720px] overflow-hidden border-r border-blue-500/20 bg-slate-900/70 p-10 xl:block">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.24),transparent_42%),linear-gradient(315deg,rgba(14,165,233,0.12),transparent_38%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.25),transparent_65%)]" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10 text-blue-300">
                    <Hotel size={30} />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
                      OPSCORE V3
                    </p>
                    <h1 className="text-2xl font-black text-white">
                      Vincent Resort Hotel
                    </h1>
                  </div>
                </div>

                <h2 className="mt-12 text-5xl font-black leading-tight tracking-tight text-white">
                  Business Operations
                  <span className="block text-blue-400">Command Center</span>
                </h2>

                <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
                  Centralized access for workforce, payroll, finance,
                  approvals, apartment operations, and audit control.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FeatureCard
                  icon={<Users size={22} />}
                  title="Workforce"
                  description="Employees, schedules, attendance, and leave."
                />

                <FeatureCard
                  icon={<Wallet size={22} />}
                  title="Finance"
                  description="Cash drawer, bills, room sales, and reports."
                />

                <FeatureCard
                  icon={<ShieldCheck size={22} />}
                  title="Approvals"
                  description="Controlled requests with clear accountability."
                />

                <FeatureCard
                  icon={<BarChart3 size={22} />}
                  title="Audit"
                  description="Logs, database health, and business controls."
                />
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-3xl border border-blue-500/20 bg-slate-950/70 p-4">
                <div>
                  <p className="text-2xl font-black text-blue-300">1</p>
                  <p className="text-xs text-slate-400">Platform</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-blue-300">100%</p>
                  <p className="text-xs text-slate-400">Controlled Access</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-blue-300">Pilot</p>
                  <p className="text-xs text-slate-400">Ready</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative p-6 sm:p-10 xl:p-12">
            <div className="mx-auto flex min-h-[620px] max-w-md flex-col justify-center">
              <div className="mb-8">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
                  Secure Login
                </p>

                <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
                  Welcome back
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Sign in to access the OPSCORE operations dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Email
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 focus-within:border-blue-400">
                    <UserCheck size={18} className="text-slate-500" />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter OPSCORE email"
                      autoComplete="email"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 focus-within:border-blue-400">
                    <LockKeyhole size={18} className="text-slate-500" />
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Checking access..." : "Sign In"}
                  {!isLoading && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="text-center text-xs text-blue-100/70">
                  <p>Need access? Contact the system administrator.</p>
                  <p className="mt-1 font-semibold text-blue-100">
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
    <div className="rounded-2xl border border-blue-500/20 bg-slate-950/70 p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
          {icon}
        </div>

        <div>
          <h3 className="font-black text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}