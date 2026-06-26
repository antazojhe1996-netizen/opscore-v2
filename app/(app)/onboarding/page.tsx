"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PublicOnboardingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/human-resources/onboarding");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-6 text-slate-900">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
          OPSCORE Onboarding
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          Redirecting...
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Opening employee onboarding form.
        </p>
      </div>
    </main>
  );
}



