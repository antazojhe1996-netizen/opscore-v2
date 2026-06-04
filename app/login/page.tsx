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
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import Image from "next/image";

type LoginEmployee = {
  id: string;
  employee_no: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  employment_status: string | null;
  system_role_id: string | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [emailOrEmployeeNo, setEmailOrEmployeeNo] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [showEmployeeNo, setShowEmployeeNo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const currentEmployeeId = localStorage.getItem("opscore_current_employee_id");
    if (currentEmployeeId) router.replace("/dashboard");
  }, [router]);

  const normalize = (value: string) => value.trim().toLowerCase();

  const login = async () => {
    if (isLoading) return;

    const identifier = normalize(emailOrEmployeeNo);
    const employeeNoInput = employeeNo.trim();

    if (!identifier || !employeeNoInput) {
      setErrorMessage("Enter your email or employee number, then your employee number.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .or(`email.ilike.${identifier},employee_no.ilike.${identifier}`)
      .limit(1)
      .maybeSingle();

    setIsLoading(false);

    if (error) {
      console.log("LOGIN ERROR:", error.message);
      setErrorMessage("Login failed. Please try again.");
      return;
    }

    const employee = data as LoginEmployee | null;

    if (!employee) {
      setErrorMessage("No employee account found.");
      return;
    }

    const savedEmployeeNo = String(employee.employee_no || "").trim().toLowerCase();

    if (savedEmployeeNo !== employeeNoInput.toLowerCase()) {
      setErrorMessage("Employee number does not match this account.");
      return;
    }

    if (String(employee.employment_status || "").toLowerCase() !== "active") {
      setErrorMessage("This employee account is not active.");
      return;
    }

    if (!employee.system_role_id) {
      setErrorMessage("No system role assigned. Ask admin to assign access first.");
      return;
    }

    localStorage.setItem("opscore_current_employee_id", employee.id);
    localStorage.setItem(
      "opscore_current_employee_name",
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
    );

    window.dispatchEvent(new Event("storage"));
    router.replace("/dashboard");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login();
  };

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
                <div>
                <img
                    src="/images/vincent-logo.png"
                    alt="Vincent Resort Hotel"
                    className="h-50 w-auto object-contain"
                />
                </div>

        

                <h2 className="mt-3 text-3xl font-black text-white-400">
                  Hotel Operations & Financial Solutions
                </h2>

                <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
                  Built for owners and managers who need complete visibility over
                  operations.
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
                  icon={<BarChart3 size={20} />}
                  title="Audit & Performance"
                  description="Monitor operational risks and business performance in real time."
                />

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">
                    Coming Soon
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-300">
                    <p>🏨 Reservation Management</p>
                    <p>🧾 Point of Sale (POS)</p>
                    <p>🔧 Maintenance Tracker</p>
                    <p>🤖 AI Forecasting</p>
                  </div>
                </div>
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
                  Secure Access
                </p>
                <h2 className="mt-3 text-4xl font-black">Welcome back</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Sign in to continue to your hotel operations dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Email or Employee Number
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 focus-within:border-amber-400">
                    <UserCheck size={18} className="text-slate-500" />
                    <input
                      value={emailOrEmployeeNo}
                      onChange={(event) => setEmailOrEmployeeNo(event.target.value)}
                      placeholder="ex. admin@hotel.com or EMP-001"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Employee Number
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 focus-within:border-amber-400">
                    <LockKeyhole size={18} className="text-slate-500" />
                    <input
                      value={employeeNo}
                      onChange={(event) => setEmployeeNo(event.target.value)}
                      type={showEmployeeNo ? "text" : "password"}
                      placeholder="Enter your employee number"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmployeeNo((prev) => !prev)}
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
                    >
                      {showEmployeeNo ? <EyeOff size={17} /> : <Eye size={17} />}
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
                  {isLoading ? "Checking access..." : "Enter Dashboard"}
                  {!isLoading && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-center text-xs text-white/60">
                 <div className="text-center text-xs text-white/50">
                    <p>Powered by OPSCORE</p>

                    <p className="mt-1 font-semibold text-white/80">
                        Developed & Designed by Jherome Antazo
                    </p>
                    </div>
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