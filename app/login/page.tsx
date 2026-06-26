"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError || !data.user) {
        setError("Invalid email or password.");
        return;
      }

      const { data: systemUser, error: systemUserError } = await supabase
        .from("system_users")
        .select("*")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (systemUserError || !systemUser) {
        setError("User profile not found.");
        setLoading(false);
        return;
      }

      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_users")
        .select("*")
        .eq("user_id", systemUser.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (companyUserError || !companyUser) {
        setError("No active company access found.");
        setLoading(false);
        return;
      }

      localStorage.setItem("opscore_current_system_user_id", systemUser.id);
      localStorage.setItem("opscore_current_user_id", systemUser.id);
      localStorage.setItem("opscore_current_company_id", companyUser.company_id);
      localStorage.setItem("opscore_current_role_id", companyUser.role_id || "");
      localStorage.setItem(
        "opscore_current_employee_id",
        systemUser.employee_id || "",
      );
      localStorage.setItem(
        "opscore_current_employee_name",
        systemUser.full_name ||
          systemUser.name ||
          systemUser.email ||
          "OPSCORE User",
      );
      localStorage.setItem("opscore_current_company_name", "Vincent Resort");

      localStorage.setItem(
        "opscore_current_user",
        JSON.stringify({
          system_user_id: systemUser.id,
          employee_id: systemUser.employee_id,
          name:
            systemUser.full_name ||
            systemUser.name ||
            systemUser.email ||
            "OPSCORE User",
          email: systemUser.email,
          company_id: companyUser.company_id,
          role_id: companyUser.role_id,
        }),
      );

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen grid lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-r border-white/10">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              <ShieldCheck size={16} className="text-indigo-300" />
              OPSCORE V3
            </div>

            <div className="mt-20 max-w-xl">
              <h1 className="text-5xl font-black tracking-tight leading-tight">
                Operations command center for Vincent Resort.
              </h1>

              <p className="mt-6 text-lg text-slate-300 leading-relaxed">
                Cash, approvals, payroll, POS, and executive monitoring in one
                stabilized system.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/20">
                <LockKeyhole className="text-indigo-300" />
              </div>

              <h2 className="text-3xl font-bold">Welcome back</h2>
              <p className="mt-2 text-slate-400">
                Sign in to continue to OPSCORE.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-12 pr-4 text-white outline-none focus:border-indigo-400/60"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") login();
                    }}
                  />
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-12 pr-12 text-white outline-none focus:border-indigo-400/60"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") login();
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={login}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              OPSCORE V3 · Vincent Resort Hotel Operations System
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}