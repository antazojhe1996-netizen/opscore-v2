"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  Database,
  FileText,
  Hotel,
  LayoutDashboard,
  Receipt,
  Settings,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

const menuSections = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    moduleKey: "dashboard",
    items: [],
  },
  {
    title: "Audit",
    icon: ShieldCheck,
    items: [
      { label: "Operations Audit", href: "/audit", icon: ShieldCheck, moduleKey: "always_allow" },
      { label: "Audit Trail", href: "/admin/audit-logs", icon: ClipboardList, moduleKey: "always_allow" },
      { label: "Database Health", href: "/admin/database-health", icon: Database, moduleKey: "always_allow" },
    ],
  },
  {
    title: "Workforce",
    icon: Users,
    items: [
      { label: "Workforce", href: "/workforce", icon: Users, moduleKey: "workforce" },
      { label: "Employee 201", href: "/employees", icon: FileText, moduleKey: "employees" },
      { label: "Scheduling", href: "/scheduling", icon: CalendarDays, moduleKey: "scheduling" },
      { label: "Leave Management", href: "/leave-management", icon: ClipboardList, moduleKey: "leave_management" },
      { label: "Forecasting", href: "/forecasting", icon: BarChart3, moduleKey: "forecasting" },
      { label: "Performance Monitoring", href: "/performance", icon: BarChart3, moduleKey: "always_allow" },
      { label: "Employee Portal", href: "/employee-portal", icon: User, moduleKey: "employees" },
    ],
  },
  {
    title: "Sales",
    icon: Hotel,
    items: [
      { label: "Hotel Room Sales", href: "/finance/room-sales", icon: Hotel, moduleKey: "hotel_room_sales" },
      { label: "Apartment Sales", href: "/finance/apartment", icon: Building2, moduleKey: "apartment_sales" },
      { label: "Restaurant / Sports Bar", href: "/finance/restaurant-import", icon: Receipt, moduleKey: "restaurant_sales" },
      { label: "Sales Settings", href: "/finance/settings", icon: Settings, moduleKey: "settings" },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    items: [
      { label: "Finance Dashboard", href: "/finance", icon: BarChart3, moduleKey: "finance_dashboard" },
      { label: "Expenses", href: "/finance/expenses", icon: Receipt, moduleKey: "expenses" },
      { label: "Bills Monitoring", href: "/finance/bills", icon: ClipboardList, moduleKey: "bills_monitoring" },
      { label: "Cash Management", href: "/finance/cash-management", icon: Wallet, moduleKey: "cash_management" },
      { label: "Expense Allocation", href: "/finance/settings/expense-allocation", icon: Wallet, moduleKey: "settings" },
      { label: "Finance Settings", href: "/finance/settings", icon: Settings, moduleKey: "settings" },
    ],
  },
  {
    title: "Payroll",
    icon: FileText,
    items: [
      { label: "Attendance Audit", href: "/finance/payroll/attendance", icon: Clock, moduleKey: "attendance" },
      { label: "Payroll Register", href: "/finance/payroll/register", icon: FileText, moduleKey: "payroll_register" },
      { label: "Payroll Manager", href: "/finance/payroll/manager", icon: Wallet, moduleKey: "payroll_manager" },
      { label: "Payslips", href: "/finance/payroll/payslips", icon: Receipt, moduleKey: "payslips" },
      { label: "Release History", href: "/finance/payroll/history", icon: BarChart3, moduleKey: "release_history" },
      { label: "Snapshot History", href: "/finance/payroll/snapshots", icon: Database, moduleKey: "payroll_snapshots" },
      { label: "Payroll Settings", href: "/finance/payroll/settings", icon: Settings, moduleKey: "settings" },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      { label: "General Settings", href: "/settings", icon: Settings, moduleKey: "settings" },
      { label: "Backup & Restore", href: "/backup", icon: Database, moduleKey: "backup_restore" },
      { label: "User Roles", href: "/settings/user-roles", icon: ShieldCheck, moduleKey: "user_roles" },
      { label: "Current User", href: "/settings/current-user", icon: UserCheck, moduleKey: "always_allow" },
      { label: "Departments", href: "/settings/departments", icon: Users, moduleKey: "settings" },
      { label: "Positions", href: "/settings/positions", icon: Users, moduleKey: "settings" },
      { label: "Employment Statuses", href: "/settings/employment-statuses", icon: ClipboardList, moduleKey: "settings" },
      { label: "Employment Types", href: "/settings/employment-types", icon: ClipboardList, moduleKey: "settings" },
      { label: "Shifts", href: "/settings/shifts", icon: Clock, moduleKey: "settings" },
      { label: "HC Rules", href: "/settings/hc-rules", icon: BarChart3, moduleKey: "settings" },
      { label: "Forecasting Rules", href: "/settings/forecasting-rules", icon: BarChart3, moduleKey: "settings" },
      { label: "Performance KPI", href: "/settings/performance-kpi", icon: BarChart3, moduleKey: "settings" },
      { label: "Leave Settings", href: "/settings/leave-settings", icon: ClipboardList, moduleKey: "settings" },
      { label: "Leave Credits", href: "/settings/leave-credits", icon: ClipboardList, moduleKey: "settings" },
      { label: "Property", href: "/settings/property", icon: Hotel, moduleKey: "settings" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);

  const getCurrentUserPermissions = async () => {
    setLoadingAccess(true);

    const currentEmployeeId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_id")
        : null;

    if (!currentEmployeeId) {
      setPermissions([]);
      setLoadingAccess(false);
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, system_role_id")
      .eq("id", currentEmployeeId)
      .maybeSingle();

    if (employeeError || !employee?.system_role_id) {
      setPermissions([]);
      setLoadingAccess(false);
      return;
    }

    const { data: rolePermissions, error: permissionError } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", employee.system_role_id);

    if (permissionError) {
      console.log("GET SIDEBAR PERMISSIONS ERROR:", permissionError.message);
      setPermissions([]);
      setLoadingAccess(false);
      return;
    }

    setPermissions(rolePermissions || []);
    setLoadingAccess(false);
  };

  useEffect(() => {
    getCurrentUserPermissions();

    const handleStorageChange = () => {
      getCurrentUserPermissions();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const canView = (moduleKey: string) => {
    if (moduleKey === "always_allow") return true;

    return permissions.some(
      (permission) =>
        permission.module_key === moduleKey && permission.can_view === true
    );
  };

  const normalizePath = (value: string) => {
    if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
    return value;
  };

  const currentPath = normalizePath(pathname || "/");

  const isExactActive = (href: string) => normalizePath(href) === currentPath;

  const visibleSections = menuSections
    .map((section: any) => {
      if (section.href) {
        return canView(section.moduleKey) ? section : null;
      }

      const visibleItems = section.items.filter((item: any) =>
        canView(item.moduleKey)
      );

      if (visibleItems.length === 0) return null;

      return { ...section, items: visibleItems };
    })
    .filter(Boolean);

  return (
    <aside className="sticky top-0 z-[9999] h-screen w-56 shrink-0 border-r border-slate-800 bg-slate-950 px-3 py-4 text-white">
      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 shadow-lg shadow-black/20">
        <p className="truncate text-base font-black text-amber-400">● OPSCORE</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Hotel Operations
        </p>
      </div>

      {loadingAccess ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">
          Loading access...
        </div>
      ) : (
        <nav className="space-y-1.5">
          {visibleSections.map((section: any) => {
            const Icon = section.icon;

            if (section.href) {
              const active = isExactActive(section.href);

              return (
                <Link
                  key={section.title}
                  href={section.href}
                  title={section.title}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                    active
                      ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/10"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  <span className="min-w-0 flex-1 truncate">{section.title}</span>
                </Link>
              );
            }

            return (
              <div key={section.title} className="group">
                <button
                  type="button"
                  title={section.title}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  <Icon size={16} />
                  <span className="min-w-0 flex-1 truncate">{section.title}</span>
                  <ChevronRight size={13} className="opacity-60" />
                </button>

                <div className="invisible fixed left-[232px] top-20 z-[99999] max-h-[82vh] w-72 translate-x-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-2.5 opacity-0 shadow-2xl shadow-black/60 transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100">
                  <div className="mb-2 border-b border-slate-800 px-3 pb-2.5">
                    <p className="text-sm font-black text-amber-400">{section.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Select module
                    </p>
                  </div>

                  <div className="space-y-1">
                    {section.items.map((item: any) => {
                      const ItemIcon = item.icon;
                      const itemActive = isExactActive(item.href);

                      return (
                        <Link
                          key={`${section.title}-${item.href}-${item.label}`}
                          href={item.href}
                          title={item.label}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs transition ${
                            itemActive
                              ? "bg-amber-400 font-black text-slate-950 shadow-lg shadow-amber-400/10"
                              : "text-slate-400 hover:bg-slate-900 hover:text-white"
                          }`}
                        >
                          <ItemIcon size={14} />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <ChevronRight size={12} className="opacity-25" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {visibleSections.length === 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
              No access assigned.
            </div>
          )}
        </nav>
      )}

      <button
        onClick={() => {
          localStorage.removeItem("opscore_current_employee_id");
          localStorage.removeItem("opscore_current_employee_name");
          localStorage.removeItem("opscore_current_user");
          window.location.href = "/login";
        }}
        className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/20"
      >
        Logout
      </button>
    </aside>
  );
}
