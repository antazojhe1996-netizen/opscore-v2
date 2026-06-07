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
  employee_id: string;
  username: string;
  password: string;
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
  system_role_id?: string | null;
};

export default function LoginPage() {
  const router = useRouter();

  /// STATES
  const [username, setUsername] = useState("");
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

  /// HELPERS
  const normalize = (value: string) => value.trim().toLowerCase();

  const clearSession = () => {
    localStorage.removeItem(employeeSessionKey);
    localStorage.removeItem(employeeIdKey);
    localStorage.removeItem(employeeNameKey);
    localStorage.removeItem(currentUserKey);
    localStorage.removeItem(systemUserIdKey);
    localStorage.removeItem(mustChangePasswordKey);
  };

  /// EFFECTS
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

  /// FUNCTIONS
  const login = async () => {
    if (isLoading) return;

    const normalizedUsername = normalize(username);
    const passwordInput = password.trim();

    if (!normalizedUsername || !passwordInput) {
      setErrorMessage("Enter your username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const { data: userData, error: userError } = await supabase
      .from("system_users")
      .select("*")
      .ilike("username", normalizedUsername)
      .limit(1)
      .maybeSingle();

    if (userError) {
      console.log("LOGIN USER ERROR:", userError.message);
      setIsLoading(false);
      setErrorMessage("Login failed. Please try again.");
      return;
    }

    const systemUser = userData as SystemUser | null;

    if (!systemUser) {
      setIsLoading(false);
      setErrorMessage("No user account found.");
      return;
    }

    if (!systemUser.is_active) {
      setIsLoading(false);
      setErrorMessage("This user account is inactive.");
      return;
    }

    if (String(systemUser.password || "") !== passwordInput) {
      setIsLoading(false);
      setErrorMessage("Invalid username or password.");
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", systemUser.employee_id)
      .maybeSingle();

    if (employeeError) {
      console.log("LOGIN EMPLOYEE ERROR:", employeeError.message);
      setIsLoading(false);
      setErrorMessage("Employee profile not found. Contact administrator.");
      return;
    }

    const employee = employeeData as LoginEmployee | null;

    if (!employee) {
      setIsLoading(false);
      setErrorMessage("Employee profile not found. Contact administrator.");
      return;
    }

    if (String(employee.employment_status || "").toLowerCase() !== "active") {
      setIsLoading(false);
      setErrorMessage("This employee account is not active.");
      return;
    }

    clearSession();

    const employeeName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
    const mustChangePassword = Boolean(systemUser.must_change_password);

    const sessionEmployee = {
      ...employee,
      system_user_id: systemUser.id,
      username: systemUser.username,
      must_change_password: mustChangePassword,
    };

    localStorage.setItem(employeeIdKey, employee.id);
    localStorage.setItem(employeeNameKey, employeeName);
    localStorage.setItem(employeeSessionKey, JSON.stringify(sessionEmployee));
    localStorage.setItem(systemUserIdKey, systemUser.id);
    localStorage.setItem(mustChangePasswordKey, String(mustChangePassword));
    localStorage.setItem(
      currentUserKey,
      JSON.stringify({
        id: employee.id,
        system_user_id: systemUser.id,
        name: employeeName,
        username: systemUser.username,
        email: employee.email || null,
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

    router.replace("/dashboard");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login();
  };

  /// UI
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_30%)]" />
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <section className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/90 shadow-2xl shadow-black/50 backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-[720px] overflow-hidden border-r border-slate-800 bg-slate-900/70 p-10 xl:block">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),transparent_40%),linear-gradient(315deg,rgba(34,197,94,0.08),transparent_40%)]" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <img
                  src="/images/vincent-logo.png"
                  alt="Vincent Resort Hotel"
                  className="h-50 w-auto object-contain"
                />

                <h2 className="mt-3 text-3xl font-black text-white">
                  Hotel Operations & Financial Solutions
                </h2>

                <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
                  OPSCORE V2 Beta access is controlled by employee credentials,
                  system roles, and module permissions.
                </p>
              </div>

              <div className="space-y-4">
                <FeatureCard
                  icon={<Users size={20} />}
                  title="Workforce Management"
                  description="Scheduling, attendance, leave, and employee records."
                />

                <FeatureCard
                  icon={<Wallet size={20} />}
                  title="Financial Oversight"
                  description="Track revenue, expenses, payroll, and cash accountability."
                />

                <FeatureCard
                  icon={<ShieldCheck size={20} />}
                  title="Approval Management"
                  description="Controlled approval center, approval controls, and assigned approvers."
                />

                <FeatureCard
                  icon={<BarChart3 size={20} />}
                  title="Audit & Performance"
                  description="Monitor access, actions, operational risks, and staff performance."
                />
              </div>
            </div>
          </div>

          <div className="relative p-6 sm:p-10 xl:p-12">
            <div className="mx-auto flex min-h-[600px] max-w-md flex-col justify-center">
              <div className="mb-8 xl:hidden">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-300">
                  <Hotel size={22} />
                  <span className="text-sm font-black tracking-wide">
                    Vincent Resort Hotel
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-400">
                  OPSCORE V2 Beta
                </p>
                <h2 className="mt-3 text-4xl font-black">Welcome back</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Sign in using the username and temporary password provided by the system administrator.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Username
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 focus-within:border-amber-400">
                    <UserCheck size={18} className="text-slate-500" />
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="ex. princess"
                      autoComplete="username"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 focus-within:border-amber-400">
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
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-amber-400/10 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Checking access..." : "Sign In"}
                  {!isLoading && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-center text-xs text-white/50">
                  <p>Need access? Contact the system administrator.</p>
                  <p className="mt-1 font-semibold text-white/80">
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-amber-400/10 p-3 text-amber-300">
          {icon}
        </div>

        <div>
          <h3 className="font-black">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
