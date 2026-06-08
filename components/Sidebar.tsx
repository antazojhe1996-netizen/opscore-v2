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
  KeyRound,
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
      { label: "Operations Audit", href: "/audit", icon: ShieldCheck, moduleKey: "audit_center" },
      { label: "Audit Trail", href: "/admin/audit-logs", icon: ClipboardList, moduleKey: "activity_logs" },
      { label: "Database Health", href: "/admin/database-health", icon: Database, moduleKey: "database_health" },
    ],
  },
  {
    title: "Sales",
    icon: Hotel,
    items: [
      { label: "Hotel Room Sales", href: "/finance/room-sales", icon: Hotel, moduleKey: "hotel_room_sales" },
      { label: "Apartment Sales", href: "/finance/apartment", icon: Building2, moduleKey: "apartment_sales" },
      { label: "Restaurant / Sports Bar", href: "/finance/restaurant-import", icon: Receipt, moduleKey: "restaurant_sales" },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    items: [
      { label: "Finance Dashboard", href: "/finance", icon: BarChart3, moduleKey: "finance_dashboard" },
      { label: "Expenses", href: "/finance/expenses", icon: Receipt, moduleKey: "expenses" },
      { label: "Expense Requests", href: "/finance/expense-requests", icon: ClipboardList, moduleKey: "expense_requests" },
      { label: "Bills Monitoring", href: "/finance/bills", icon: ClipboardList, moduleKey: "bills_monitoring" },
      { label: "Cash Management", href: "/finance/cash-management", icon: Wallet, moduleKey: "cash_management" },
      { label: "Expense Allocation", href: "/finance/settings/expense-allocation", icon: Wallet, moduleKey: "expense_allocation" },
      { label: "Finance Settings", href: "/finance/settings", icon: Settings, moduleKey: "finance_settings" },
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
      { label: "Employee Balances", href: "/finance/payroll/employee-balances", icon: Wallet, moduleKey: "employee_balances" },
      { label: "Release History", href: "/finance/payroll/history", icon: BarChart3, moduleKey: "release_history" },
      { label: "Snapshot History", href: "/finance/payroll/snapshots", icon: Database, moduleKey: "payroll_snapshots" },
      { label: "Payroll Settings", href: "/finance/payroll/settings", icon: Settings, moduleKey: "payroll_settings" },
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
      { label: "Performance Monitoring", href: "/performance", icon: BarChart3, moduleKey: "performance" },
      { label: "Employee Portal", href: "/employee-portal", icon: User, moduleKey: "employees" },
    ],
  },
  {
    title: "HR",
    icon: Users,
    items: [
      { label: "Departments", href: "/settings/departments", icon: Users, moduleKey: "departments_settings" },
      { label: "Positions", href: "/settings/positions", icon: Users, moduleKey: "positions_settings" },
      { label: "Employment Types", href: "/settings/employment-types", icon: ClipboardList, moduleKey: "employment_settings" },
      { label: "Employment Statuses", href: "/settings/employment-statuses", icon: ClipboardList, moduleKey: "employment_settings" },
      { label: "Leave Settings", href: "/settings/leave-settings", icon: ClipboardList, moduleKey: "leave_settings" },
      { label: "Leave Credits", href: "/settings/leave-credits", icon: ClipboardList, moduleKey: "leave_settings" },
    ],
  },
  {
    title: "Approvals",
    icon: ShieldCheck,
    items: [
      { label: "Approval Center", href: "/manager/approval-center", icon: ClipboardList, moduleKey: "approval_center" },
      { label: "Approval Controls", href: "/settings/approval-controls", icon: ShieldCheck, moduleKey: "approval_controls" },
      { label: "Approval Assignments", href: "/settings/approval-assignments", icon: UserCheck, moduleKey: "approval_assignments" },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      { label: "General Settings", href: "/settings", icon: Settings, moduleKey: "settings" },
      { label: "Property", href: "/settings/property", icon: Hotel, moduleKey: "property_settings" },
      { label: "User Credentials", href: "/settings/user-credentials", icon: KeyRound, moduleKey: "user_credentials" },
      { label: "User Roles", href: "/settings/user-roles", icon: ShieldCheck, moduleKey: "user_roles" },
      { label: "Backup & Restore", href: "/backup", icon: Database, moduleKey: "backup_restore" },
      { label: "Shifts", href: "/settings/shifts", icon: Clock, moduleKey: "shift_settings" },
      { label: "HC Rules", href: "/settings/hc-rules", icon: BarChart3, moduleKey: "hc_rules" },
      { label: "Forecasting Rules", href: "/settings/forecasting-rules", icon: BarChart3, moduleKey: "forecasting_rules" },
      { label: "Performance KPI", href: "/settings/performance-kpi", icon: BarChart3, moduleKey: "performance_kpi" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [currentRoleName, setCurrentRoleName] = useState("Employee");
  const [fallbackEmployeeName, setFallbackEmployeeName] = useState("No user loaded");

  useEffect(() => {
    setMounted(true);
  }, []);

  const getStoredCurrentUser = () => {
    if (typeof window === "undefined") return null;

    const savedUser = localStorage.getItem("opscore_current_user");

    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    setFallbackEmployeeName(
      localStorage.getItem("opscore_current_employee_name") || "No user loaded"
    );
  }, [mounted]);

  const getPendingApprovals = async () => {
    const { count, error } = await supabase
      .from("approval_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING");

    if (error) {
      console.log("GET PENDING APPROVALS ERROR:", error.message);
      setPendingApprovals(0);
      return;
    }

    setPendingApprovals(count || 0);
  };

  const getCurrentUserPermissions = async () => {
    setLoadingAccess(true);

    const storedUser = getStoredCurrentUser();
    const currentEmployeeId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_id")
        : null;

    const currentRoleId =
      storedUser?.role_id ||
      (typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_role_id")
        : null);

    if (!currentEmployeeId || !currentRoleId) {
      setCurrentEmployee(null);
      setCurrentRoleName("Employee");
      setPermissions([]);
      setLoadingAccess(false);
      await getPendingApprovals();
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, employee_no, first_name, last_name, department, position")
      .eq("id", currentEmployeeId)
      .maybeSingle();

    if (employeeError || !employee) {
      setCurrentEmployee(null);
      setCurrentRoleName("Employee");
      setPermissions([]);
      setLoadingAccess(false);
      await getPendingApprovals();
      return;
    }

    setCurrentEmployee(employee);

    const { data: roleData } = await supabase
      .from("system_roles")
      .select("role_name")
      .eq("id", currentRoleId)
      .maybeSingle();

    setCurrentRoleName(roleData?.role_name || employee.position || "Employee");

    const { data: rolePermissions, error: permissionError } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", currentRoleId);

    if (permissionError) {
      console.log("GET SIDEBAR PERMISSIONS ERROR:", permissionError.message);
      setPermissions([]);
      setLoadingAccess(false);
      await getPendingApprovals();
      return;
    }

    setPermissions(rolePermissions || []);
    setLoadingAccess(false);
    await getPendingApprovals();
  };

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    getCurrentUserPermissions();

    const handleStorageChange = () => {
      setFallbackEmployeeName(
        localStorage.getItem("opscore_current_employee_name") || "No user loaded"
      );
      getCurrentUserPermissions();
      getPendingApprovals();
    };

    window.addEventListener("storage", handleStorageChange);

    const interval = window.setInterval(() => {
      getPendingApprovals();
    }, 15000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.clearInterval(interval);
    };
  }, [mounted]);

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

  const employeeName = currentEmployee
    ? `${currentEmployee.first_name || ""} ${currentEmployee.last_name || ""}`.trim()
    : fallbackEmployeeName;

  const employeeDepartment =
    currentEmployee?.department || currentEmployee?.position || "OPSCORE User";

  const employeeNo = currentEmployee?.employee_no || currentEmployee?.id || "-";
  const portalActive = isExactActive("/employee-portal");

  const logout = async () => {
    if (typeof window === "undefined") return;

    await supabase.auth.signOut();

    localStorage.removeItem("opscore_current_employee");
    localStorage.removeItem("opscore_current_employee_id");
    localStorage.removeItem("opscore_current_employee_name");
    localStorage.removeItem("opscore_current_user");
    localStorage.removeItem("opscore_current_system_user_id");
    localStorage.removeItem("opscore_must_change_password");
    localStorage.removeItem("opscore_current_company_id");
    localStorage.removeItem("opscore_current_role_id");

    window.location.href = "/login";
  };

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

  if (!mounted) {
    return null;
  }

  return (
    <aside className="sticky top-0 z-[9999] h-screen w-56 shrink-0 border-r border-slate-800 bg-slate-950 px-3 py-4 text-white">
      <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 shadow-lg shadow-black/20">
        <p className="truncate text-base font-black text-amber-400">● OPSCORE</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Hotel Operations
        </p>
      </div>

      <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
          Logged in as
        </p>
        <p className="mt-1 truncate text-sm font-black text-white">{employeeName}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-300">{currentRoleName}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {employeeDepartment} • #{employeeNo}
        </p>

        <Link
          href="/employee-portal"
          title="My Portal"
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
            portalActive
              ? "bg-amber-400 text-slate-950"
              : "border border-slate-700 bg-slate-950 text-amber-300 hover:bg-slate-900"
          }`}
        >
          <User size={14} />
          <span className="min-w-0 flex-1 truncate">My Portal</span>
          <ChevronRight size={12} />
        </Link>
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
              <div key={section.title} className="group relative">
                <button
                  type="button"
                  title={section.title}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  <Icon size={16} />
                  <span className="min-w-0 flex-1 truncate">{section.title}</span>

                  {section.title === "Approvals" && pendingApprovals > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                      {pendingApprovals}
                    </span>
                  )}

                  <ChevronRight size={13} className="opacity-60" />
                </button>

                <div className="pointer-events-none absolute left-full top-0 h-full w-3" />
                <div className="invisible absolute left-full top-0 z-[99999] ml-2 max-h-[82vh] w-72 translate-x-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-2.5 opacity-0 shadow-2xl shadow-black/60 transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100">
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

                          {item.href === "/manager/approval-center" &&
                            pendingApprovals > 0 && (
                              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                                {pendingApprovals}
                              </span>
                            )}

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
        onClick={logout}
        className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/20"
      >
        Logout
      </button>
    </aside>
  );
}