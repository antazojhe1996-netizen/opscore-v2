"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

export default function TopNavbar() {
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
<header className="fixed left-[220px] right-0 top-0 z-[99999] flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
        Finance / Cash Management
      </p>

      <div className="flex items-center gap-2">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
              JA
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-black leading-4 text-slate-950">
                Jherome Antazo
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Vincent Resort
              </p>
            </div>

            <ChevronDown size={14} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <Link href="/employee-portal" className="flex gap-2 px-4 py-3 text-sm font-bold hover:bg-slate-50">
                <User size={15} /> My Portal
              </Link>

              <button onClick={logout} className="flex w-full gap-2 border-t px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}