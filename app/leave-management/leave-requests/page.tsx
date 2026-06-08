"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeaveRequestsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/leave-management");
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        Redirecting to Leave Management...
      </div>
    </main>
  );
}