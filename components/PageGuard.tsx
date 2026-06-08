"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { canAccessPage } from "@/app/lib/pageAccess";

type PageGuardProps = {
  moduleKey: string;
  children: React.ReactNode;
};

export default function PageGuard({ moduleKey, children }: PageGuardProps) {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const access = await canAccessPage(moduleKey);

      if (!access.allowed) {
        setAccessMessage(access.reason || "Access denied.");
        setHasPageAccess(false);
        setCheckingAccess(false);
        return;
      }

      setHasPageAccess(true);
      setCheckingAccess(false);
    };

    checkAccess();
  }, [moduleKey]);

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-300">
            Checking page access...
          </div>
        </main>
      </div>
    );
  }

  if (!hasPageAccess) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <Lock className="mx-auto text-red-300" size={36} />
            <h1 className="mt-4 text-2xl font-black text-red-200">
              Access Denied
            </h1>
            <p className="mt-2 text-sm text-red-100/80">
              {accessMessage}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}