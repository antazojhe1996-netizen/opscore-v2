"use client";

import Sidebar from "@/components/Sidebar";

export default function UserRolesPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
          System Settings
        </p>

        <h1 className="mt-2 text-4xl font-black">User Roles</h1>

        <p className="mt-2 text-sm text-slate-400">
          Recovery page loaded. We will restore the full User Roles page after this compiles.
        </p>
      </main>
    </div>
  );
}