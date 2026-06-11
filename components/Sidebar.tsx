"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
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
  Menu,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { ChefHat } from "lucide-react";

const menuSections = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    moduleKey: "dashboard",
    items: [],
  },
  {
    title: "Reservations",
    icon: Hotel,
    items: [
      {
        label: "Dashboard",
        href: "/reservations",
        icon: Hotel,
        moduleKey: "dashboard",
      },
      {
        label: "Board",
        href: "/reservations/board",
        icon: CalendarDays,
        moduleKey: "dashboard",
      },
      {
        label: "Ledger",
        href: "/reservations/ledger",
        icon: ClipboardList,
        moduleKey: "dashboard",
      },
      {
        label: "Analytics",
        href: "/reservations/analytics",
        icon: BarChart3,
        moduleKey: "dashboard",
      },
    ],
  },
  {
    title: "Audit",
    icon: ShieldCheck,
    items: [
      {
        label: "Operations",
        href: "/audit",
        icon: ShieldCheck,
        moduleKey: "audit_center",
      },
      {
        label: "Audit Trail",
        href: "/admin/audit-logs",
        icon: ClipboardList,
        moduleKey: "activity_logs",
      },
      {
        label: "Database",
        href: "/admin/database-health",
        icon: Database,
        moduleKey: "database_health",
      },
    ],
  },
  {
    title: "Sales",
    icon: Hotel,
    items: [
      {
        label: "Room Sales",
        href: "/finance/room-sales",
        icon: Hotel,
        moduleKey: "hotel_room_sales",
      },
      {
        label: "Apartment",
        href: "/finance/apartment",
        icon: Building2,
        moduleKey: "apartment_sales",
      },
      {
        label: "Restaurant",
        href: "/finance/restaurant-import",
        icon: Receipt,
        moduleKey: "restaurant_sales",
      },
    ],
  },
  {
    title: "POS",
    icon: ShoppingCart,
    items: [
      {
        label: "POS Dashboard",
        href: "/pos",
        icon: BarChart3,
        moduleKey: "pos_dashboard",
      },
      {
        label: "Terminal",
        href: "/pos/terminal",
        icon: Store,
        moduleKey: "pos_terminal",
      },
      {
        label: "Orders",
        href: "/pos/orders",
        icon: Receipt,
        moduleKey: "pos_orders",
      },
      {
        label: "Sessions",
        href: "/pos/sessions",
        icon: UserCheck,
        moduleKey: "pos_sessions",
      },

    
      {
        label: "Sales",
        href: "/pos/sales",
        icon: BadgeDollarSign,
        moduleKey: "pos_sales",
      },
      {
  label: "Cashiers",
  href: "/pos/cashiers",
  icon: UserCheck,
  moduleKey: "pos_cashiers",
},

      {
        label: "Categories",
        href: "/pos/categories",
        icon: ClipboardList,
        moduleKey: "pos_categories",
      },
      {
        label: "Menu Items",
        href: "/pos/menu-items",
        icon: Package,
        moduleKey: "pos_menu_items",
      },
      {
  label: "Production Queue",
  href: "/pos/production",
  icon: ChefHat,
  moduleKey: "pos_terminal",
},
      {
  label: "Settings",
  href: "/pos/settings",
  icon: Settings,
  moduleKey: "pos_settings",
},
      
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    items: [
      {
        label: "Dashboard",
        href: "/finance",
        icon: BarChart3,
        moduleKey: "finance_dashboard",
      },
      {
        label: "Expenses",
        href: "/finance/expenses",
        icon: Receipt,
        moduleKey: "expenses",
      },
      {
        label: "Expense Requests",
        href: "/finance/expense-requests",
        icon: ClipboardList,
        moduleKey: "expense_requests",
      },
      {
        label: "Bills",
        href: "/finance/bills",
        icon: ClipboardList,
        moduleKey: "bills_monitoring",
      },
      {
        label: "Cash Management",
        href: "/finance/cash-management",
        icon: Wallet,
        moduleKey: "cash_management",
      },
      {
        label: "Allocation",
        href: "/finance/settings/expense-allocation",
        icon: Wallet,
        moduleKey: "expense_allocation",
      },
      {
        label: "Finance Settings",
        href: "/finance/settings",
        icon: Settings,
        moduleKey: "finance_settings",
      },
    ],
  },
  {
    title: "Payroll",
    icon: FileText,
    items: [
      {
        label: "Attendance Audit",
        href: "/finance/payroll/attendance",
        icon: Clock,
        moduleKey: "attendance",
      },
      {
        label: "Register",
        href: "/finance/payroll/register",
        icon: FileText,
        moduleKey: "payroll_register",
      },
      {
        label: "Manager",
        href: "/finance/payroll/manager",
        icon: Wallet,
        moduleKey: "payroll_manager",
      },
      {
        label: "Payslips",
        href: "/finance/payroll/payslips",
        icon: Receipt,
        moduleKey: "payslips",
      },
      {
        label: "Balances",
        href: "/finance/payroll/employee-balances",
        icon: Wallet,
        moduleKey: "employee_balances",
      },
      {
        label: "Release History",
        href: "/finance/payroll/history",
        icon: BarChart3,
        moduleKey: "release_history",
      },
      {
        label: "Snapshots",
        href: "/finance/payroll/snapshots",
        icon: Database,
        moduleKey: "payroll_snapshots",
      },
      {
        label: "Payroll Settings",
        href: "/finance/payroll/settings",
        icon: Settings,
        moduleKey: "payroll_settings",
      },
    ],
  },
  {
    title: "Workforce",
    icon: Users,
    items: [
      {
        label: "Workforce",
        href: "/workforce",
        icon: Users,
        moduleKey: "workforce",
      },
      {
        label: "Employee 201",
        href: "/employees",
        icon: FileText,
        moduleKey: "employees",
      },
      {
        label: "Scheduling",
        href: "/scheduling",
        icon: CalendarDays,
        moduleKey: "scheduling",
      },
      {
        label: "Leave Management",
        href: "/leave-management",
        icon: ClipboardList,
        moduleKey: "leave_management",
      },
      {
        label: "Forecasting",
        href: "/forecasting",
        icon: BarChart3,
        moduleKey: "forecasting",
      },
      {
        label: "Performance",
        href: "/performance",
        icon: BarChart3,
        moduleKey: "performance",
      },
      {
        label: "Employee Portal",
        href: "/employee-portal",
        icon: User,
        moduleKey: "employees",
      },
    ],
  },
  {
    title: "HR",
    icon: Users,
    items: [
      {
        label: "Departments",
        href: "/settings/departments",
        icon: Users,
        moduleKey: "departments_settings",
      },
      {
        label: "Positions",
        href: "/settings/positions",
        icon: Users,
        moduleKey: "positions_settings",
      },
      {
        label: "Types",
        href: "/settings/employment-types",
        icon: ClipboardList,
        moduleKey: "employment_settings",
      },
      {
        label: "Statuses",
        href: "/settings/employment-statuses",
        icon: ClipboardList,
        moduleKey: "employment_settings",
      },
      {
        label: "Leave Settings",
        href: "/settings/leave-settings",
        icon: ClipboardList,
        moduleKey: "leave_settings",
      },
      {
        label: "Leave Credits",
        href: "/settings/leave-credits",
        icon: ClipboardList,
        moduleKey: "leave_settings",
      },
    ],
  },
  {
    title: "Approvals",
    icon: ShieldCheck,
    items: [
      {
        label: "Approval Center",
        href: "/manager/approval-center",
        icon: ClipboardList,
        moduleKey: "approval_center",
      },
      {
        label: "Controls",
        href: "/settings/approval-controls",
        icon: ShieldCheck,
        moduleKey: "approval_controls",
      },
      {
        label: "Assignments",
        href: "/settings/approval-assignments",
        icon: UserCheck,
        moduleKey: "approval_assignments",
      },
    ],
  },
  {
    title: "Reports",
    icon: FileText,
    items: [
      {
        label: "Reports Center",
        href: "/finance/reports",
        icon: BarChart3,
        moduleKey: "reports_center",
      },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      {
        label: "General",
        href: "/settings",
        icon: Settings,
        moduleKey: "settings",
      },
      {
        label: "Property",
        href: "/settings/property",
        icon: Hotel,
        moduleKey: "property_settings",
      },
      {
        label: "Credentials",
        href: "/settings/user-credentials",
        icon: KeyRound,
        moduleKey: "user_credentials",
      },
      {
        label: "User Roles",
        href: "/settings/user-roles",
        icon: ShieldCheck,
        moduleKey: "user_roles",
      },
      {
        label: "Backup",
        href: "/backup",
        icon: Database,
        moduleKey: "backup_restore",
      },
      {
        label: "Shifts",
        href: "/settings/shifts",
        icon: Clock,
        moduleKey: "shift_settings",
      },
      {
        label: "HC Rules",
        href: "/settings/hc-rules",
        icon: BarChart3,
        moduleKey: "hc_rules",
      },
      {
        label: "Forecast Rules",
        href: "/settings/forecasting-rules",
        icon: BarChart3,
        moduleKey: "forecasting_rules",
      },
      {
        label: "Performance KPI",
        href: "/settings/performance-kpi",
        icon: BarChart3,
        moduleKey: "performance_kpi",
      },
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
  const [fallbackEmployeeName, setFallbackEmployeeName] =
    useState("No user loaded");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      localStorage.getItem("opscore_current_employee_name") || "No user loaded",
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

    const localRoleId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_role_id")
        : null;

    const currentRoleId = localRoleId || storedUser?.role_id || null;

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
        localStorage.getItem("opscore_current_employee_name") ||
          "No user loaded",
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

    const roleText = String(currentRoleName || "").toLowerCase();

    if (roleText.includes("super admin") || roleText.includes("admin")) {
      return true;
    }

    return permissions.some(
      (permission) =>
        String(permission.module_key) === String(moduleKey) &&
        permission.can_view === true,
    );
  };

  const normalizePath = (value: string) => {
    if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
    return value;
  };

  const currentPath = normalizePath(pathname || "/");

  const isExactActive = (href: string) => normalizePath(href) === currentPath;

  const isChildActive = (href: string) => {
    const normalizedHref = normalizePath(href);

    return (
      currentPath === normalizedHref ||
      currentPath.startsWith(`${normalizedHref}/`)
    );
  };

  const isSectionActive = (section: any) => {
    if (section.href) return isExactActive(section.href);

    return section.items?.some((item: any) => isChildActive(item.href));
  };

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
    localStorage.removeItem("opscore_current_role_name");

    window.location.href = "/login";
  };

  const visibleSections = menuSections
    .map((section: any) => {
      if (section.href) {
        return canView(section.moduleKey) ? section : null;
      }

      const visibleItems = section.items.filter((item: any) =>
        canView(item.moduleKey),
      );

      if (visibleItems.length === 0) return null;

      return { ...section, items: visibleItems };
    })
    .filter(Boolean);

  useEffect(() => {
    if (!mounted || visibleSections.length === 0) return;

    const activeSection = visibleSections.find(
      (section: any) => !section.href && isSectionActive(section),
    );

    if (activeSection) {
      setOpenSection(activeSection.title);
    }
  }, [mounted, pathname, loadingAccess]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const renderMenuSections = (isMobile = false) => (
    <nav
      className={
        isMobile
          ? "min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 pb-4"
          : "min-h-0 flex-1 space-y-1 overflow-visible px-3 pb-4"
      }
    >
      {visibleSections.map((section: any) => {
        const Icon = section.icon;

        if (section.href) {
          const active = isExactActive(section.href);

          return (
            <Link
              key={section.title}
              href={section.href}
              title={section.title}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-xs font-black transition ${
                active
                  ? "border-blue-300/20 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "border-transparent text-slate-400 hover:border-blue-300/10 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span
                className={`rounded-xl p-1.5 ${
                  active ? "bg-white/10" : "bg-slate-900/60"
                }`}
              >
                <Icon size={15} />
              </span>

              <span className="min-w-0 flex-1 truncate">{section.title}</span>
            </Link>
          );
        }

        const sectionActive = isSectionActive(section);
        const expanded = openSection === section.title;

        if (isMobile) {
          return (
            <div key={section.title} className="space-y-1">
              <button
                type="button"
                title={section.title}
                onClick={() => setOpenSection(expanded ? null : section.title)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-xs font-black transition ${
                  sectionActive || expanded
                    ? "border-blue-300/20 bg-white/[0.06] text-blue-100 shadow-lg shadow-black/10"
                    : "border-transparent text-slate-400 hover:border-blue-300/10 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span
                  className={`rounded-xl p-1.5 ${
                    sectionActive || expanded
                      ? "bg-blue-500/15"
                      : "bg-slate-900/60"
                  }`}
                >
                  <Icon size={15} />
                </span>

                <span className="min-w-0 flex-1 truncate">
                  {section.title}
                </span>

                {section.title === "Approvals" && pendingApprovals > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {pendingApprovals}
                  </span>
                )}

                <ChevronRight
                  size={13}
                  className={`shrink-0 opacity-60 transition ${
                    expanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {expanded && (
                <div className="ml-5 space-y-1 border-l border-blue-300/10 pl-2">
                  {section.items.map((item: any) => {
                    const ItemIcon = item.icon;
                    const itemActive = isExactActive(item.href);

                    return (
                      <Link
                        key={`${section.title}-${item.href}-${item.label}`}
                        href={item.href}
                        title={item.label}
                        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
                          itemActive
                            ? "border-blue-300/20 bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                            : "border-transparent text-slate-400 hover:bg-blue-500/10 hover:text-white"
                        }`}
                      >
                        <ItemIcon size={13} />

                        <span className="flex-1">{item.label}</span>

                        {item.href === "/manager/approval-center" &&
                          pendingApprovals > 0 && (
                            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                              {pendingApprovals}
                            </span>
                          )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={section.title} className="group relative">
            <button
              type="button"
              title={section.title}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-xs font-black transition ${
                sectionActive
                  ? "border-blue-300/20 bg-white/[0.06] text-blue-100 shadow-lg shadow-black/10"
                  : "border-transparent text-slate-400 hover:border-blue-300/10 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span
                className={`rounded-xl p-1.5 ${
                  sectionActive ? "bg-blue-500/15" : "bg-slate-900/60"
                }`}
              >
                <Icon size={15} />
              </span>

              <span className="min-w-0 flex-1 truncate">{section.title}</span>

              {section.title === "Approvals" && pendingApprovals > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                  {pendingApprovals}
                </span>
              )}

              <ChevronRight
                size={13}
                className="shrink-0 opacity-60 transition group-hover:translate-x-0.5"
              />
            </button>

            <div className="pointer-events-none absolute left-full top-0 h-full w-4" />

            <div className="invisible absolute left-full top-1/2 z-[10050] ml-3 w-[300px] -translate-y-1/2 translate-x-2 rounded-[1.35rem] border border-blue-300/15 bg-[#08111f]/98 p-2.5 opacity-0 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100">
              <div className="mb-2 rounded-2xl border border-blue-300/10 bg-gradient-to-br from-blue-500/10 to-white/[0.03] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/70">
                  {section.title}
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  Open module
                </p>
              </div>

              <div className="max-h-[58vh] space-y-1 overflow-y-auto pr-1">
                {section.items.map((item: any) => {
                  const ItemIcon = item.icon;
                  const itemActive = isExactActive(item.href);

                  return (
                    <Link
                      key={`${section.title}-${item.href}-${item.label}`}
                      href={item.href}
                      title={item.label}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-[12px] font-bold transition ${
                        itemActive
                          ? "border-blue-300/20 bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                          : "border-transparent text-slate-300 hover:border-blue-300/10 hover:bg-blue-500/10 hover:text-white"
                      }`}
                    >
                      <span
                        className={`rounded-lg p-1.5 ${
                          itemActive ? "bg-white/10" : "bg-slate-900/70"
                        }`}
                      >
                        <ItemIcon size={14} />
                      </span>

                      <span className="min-w-0 flex-1 whitespace-normal leading-4">
                        {item.label}
                      </span>

                      {item.href === "/manager/approval-center" &&
                        pendingApprovals > 0 && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                            {pendingApprovals}
                          </span>
                        )}
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
  );

  const sidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-3 pb-4 pt-4">
        <div className="relative overflow-hidden rounded-[1.35rem] border border-blue-300/15 bg-gradient-to-br from-[#111a31] via-[#0d1629] to-[#070d19] px-4 py-4 shadow-2xl shadow-black/25">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-400/15 blur-2xl" />

          <p className="relative truncate text-[13px] font-black tracking-wide text-blue-100">
            VINCENT RESORT HOTEL
          </p>

          <p className="relative mt-1 truncate text-[11px] text-slate-500">
            Powered by OPSCORE Intelligence
          </p>
        </div>

        <div className="mt-3 rounded-[1.35rem] border border-blue-300/10 bg-white/[0.035] px-4 py-4 shadow-xl shadow-black/20">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/80">
            Executive Session
          </p>

          <p className="mt-2 truncate text-sm font-black text-white">
            {employeeName}
          </p>

          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-300">
            {currentRoleName}
          </p>

          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {employeeDepartment} • #{employeeNo}
          </p>

          <Link
            href="/employee-portal"
            title="My Portal"
            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
              portalActive
                ? "border border-blue-300/20 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "border border-white/10 bg-slate-950/70 text-blue-200 hover:border-blue-300/25 hover:bg-blue-500/10"
            }`}
          >
            <User size={14} />
            <span className="min-w-0 flex-1 truncate">My Portal</span>
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {loadingAccess ? (
        <div className="mx-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">
          Loading access...
        </div>
      ) : (
        renderMenuSections(isMobile)
      )}

      <div className="shrink-0 px-3 pb-4 pt-3">
        <button
          onClick={logout}
          className="w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-xs font-black text-red-200 transition hover:bg-red-500/20"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-[10000] flex items-center gap-2 rounded-2xl border border-blue-300/20 bg-[#0b1220]/95 px-4 py-3 text-xs font-black text-blue-100 shadow-2xl shadow-black/40 backdrop-blur lg:hidden"
      >
        <Menu size={16} />
        VINCENT
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[10001] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside className="relative z-[10002] h-full w-[86vw] max-w-[330px] overflow-hidden border-r border-blue-300/15 bg-[#070d19] text-white shadow-2xl shadow-black">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>

            {sidebarContent(true)}
          </aside>
        </div>
      )}

      <aside className="hidden h-screen w-[260px] shrink-0 overflow-visible border-r border-blue-300/10 bg-[#070d19]/95 text-white shadow-2xl shadow-black/30 backdrop-blur lg:sticky lg:top-0 lg:z-[9999] lg:flex lg:flex-col">
        {sidebarContent(false)}
      </aside>
    </>
  );
}