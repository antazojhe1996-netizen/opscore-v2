"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

type TopNavbarProps = {
  breadcrumb?: string;
};

export default function TopNavbar({
  breadcrumb = "OPSCORE",
}: TopNavbarProps) {
  const [open, setOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState("OPSCORE User");
  const [companyName, setCompanyName] = useState("Vincent Resort");

  useEffect(() => {
    if (typeof window === "undefined") return;

    setEmployeeName(
      localStorage.getItem("opscore_current_employee_name") ||
        "OPSCORE User"
    );

    setCompanyName(
      localStorage.getItem("opscore_current_company_name") ||
        "Vincent Resort"
    );
  }, []);

  const initials =
    employeeName
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "OP";

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <header className="fixed left-[220px] right-0 top-0 z-[99999] flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
        {breadcrumb}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
              {initials}
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-[180px] truncate text-sm font-black leading-4 text-slate-950">
                {employeeName}
              </p>
              <p className="max-w-[180px] truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {companyName}
              </p>
            </div>

            <ChevronDown size={14} className="text-slate-500" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <Link
                href="/employee-portal"
                className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50"
              >
                <User size={15} /> My Portal
              </Link>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-bold text-red-600 transition-all duration-200 hover:bg-red-50"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


