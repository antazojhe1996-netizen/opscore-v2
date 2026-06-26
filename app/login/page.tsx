"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";const isMaintenance =
  process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    if (isMaintenance) {
      setError("System is under maintenance.");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !data.user) {
      setLoading(false);
      setError("Invalid credentials");
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 text-white">
      
      <div className="w-full max-w-md p-6 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur">

        {/* TITLE */}
        <h1 className="text-2xl font-bold text-center mb-6">
          OPSCORE Login
        </h1>

        {/* MAINTENANCE BANNER */}
        {isMaintenance && (
          <div className="mb-4 p-4 rounded-lg border border-yellow-500 bg-yellow-500/10 text-yellow-300 flex gap-2 items-start">
            <AlertCircle className="mt-0.5" />
            <div>
              <p className="font-semibold">SYSTEM UNDER MAINTENANCE</p>
              <p className="text-sm opacity-80">
                Login is temporarily disabled
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-3 text-red-400 flex gap-2 items-center">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* EMAIL */}
        <input
          className="w-full mb-3 p-3 rounded bg-black/40 border border-white/10 outline-none"
          placeholder="Email"
          value={email}
          disabled={isMaintenance}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* PASSWORD */}
        <div className="relative mb-4">
          <input
            className="w-full p-3 rounded bg-black/40 border border-white/10 outline-none"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            disabled={isMaintenance}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* BUTTON */}
        <button
          disabled={loading || isMaintenance}
          onClick={login}
          className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
        >
          {isMaintenance
            ? "UNDER MAINTENANCE"
            : loading
            ? "Logging in..."
            : "Login"}
        </button>

      </div>
    </main>
  );
}


