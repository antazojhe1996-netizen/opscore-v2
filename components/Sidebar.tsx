"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  Activity,
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
  Receipt,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";

const menuSections = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    moduleKey: "dashboard",
    items: [],
  },
  {
    title: "Human Resources",
    icon: Users,
    items: [
      {
        label: "Employee 201",
        href: "/human-resources/employees",
        icon: FileText,
        moduleKey: "employees",
      },
      {
        label: "Pending Registration",
        href: "/human-resources/pending-registration",
        icon: ClipboardList,
        moduleKey: "employees",
      },
      {
        label: "Leave Management",
        href: "/leave-management",
        icon: ClipboardList,
        moduleKey: "leave_management",
      },
      {
        label: "Employee Portal",
        href: "/employee-portal",
        icon: Users,
        moduleKey: "employees",
      },
    ],
  },
  {
    title: "Workforce",
    icon: Users,
    items: [
      {
        label: "Workforce Dashboard",
        href: "/workforce",
        icon: Users,
        moduleKey: "workforce",
      },
      {
        label: "Scheduling",
        href: "/scheduling",
        icon: CalendarDays,
        moduleKey: "scheduling",
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
        label: "Payroll Register",
        href: "/finance/payroll/register",
        icon: FileText,
        moduleKey: "payroll_register",
      },
      {
        label: "Payroll Manager",
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
        label: "Employee Balances",
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
        label: "Payroll Settings",
        href: "/finance/payroll/settings",
        icon: Settings,
        moduleKey: "payroll_settings",
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
        label: "Restaurant Sales",
        href: "/finance/restaurant-import",
        icon: Receipt,
        moduleKey: "restaurant_sales",
      },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    items: [
      {
        label: "Finance Dashboard",
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
        label: "Finance Settings",
        href: "/finance/settings",
        icon: Settings,
        moduleKey: "finance_settings",
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
        icon: Users,
        moduleKey: "approval_assignments",
      },
    ],
  },
  {
    title: "Audit",
    icon: ShieldCheck,
    items: [
      {
        label: "Operations Audit",
        href: "/audit",
        icon: ShieldCheck,
        moduleKey: "audit_center",
      },
      {
        label: "Activity Logs",
        href: "/activity-logs",
        icon: Activity,
        moduleKey: "activity_logs",
      },
      {
        label: "Audit Trail",
        href: "/admin/audit-logs",
        icon: ClipboardList,
        moduleKey: "audit_center",
      },
      {
        label: "Database Health",
        href: "/admin/database-health",
        icon: Database,
        moduleKey: "database_health",
      },
    ],
  },
  {
    title: "HR Settings",
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
        label: "Employment Types",
        href: "/settings/employment-types",
        icon: ClipboardList,
        moduleKey: "employment_settings",
      },
      {
        label: "Employment Statuses",
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
    title: "System",
    icon: Settings,
    items: [
      {
        label: "General Settings",
        href: "/settings",
        icon: Settings,
        moduleKey: "settings",
      },
      {
        label: "Registration Settings",
        href: "/settings/registration-settings",
        icon: UserPlus,
        moduleKey: "settings",
      },
      {
        label: "Session Inspector",
        href: "/settings/current-user",
        icon: UserCheck,
        moduleKey: "user_credentials",
      },
      {
        label: "Property Settings",
        href: "/settings/property",
        icon: Hotel,
        moduleKey: "property_settings",
      },
      {
        label: "User Credentials",
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
        label: "Data Cleanup",
        href: "/admin/data-cleanup",
        icon: Database,
        moduleKey: "database_health",
      },
      {
        label: "Backup",
        href: "/backup",
        icon: Database,
        moduleKey: "backup_restore",
      },
      {
        label: "Shift Settings",
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
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileSection, setOpenMobileSection] = useState<string | null>(null);
  const [approvalBadgeCount, setApprovalBadgeCount] = useState(0);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    loadSidebarPermissions();
    getAssignedApprovalBadgeCount();
  }, []);

  const loadSidebarPermissions = async () => {
    if (typeof window === "undefined") return;

    const systemUserId = localStorage.getItem("opscore_current_system_user_id");
    const companyId = localStorage.getItem("opscore_current_company_id");
    const fallbackRoleId = localStorage.getItem("opscore_current_role_id");

    if (!systemUserId || !companyId) {
      setAllowedModules([]);
      setPermissionsLoaded(true);
      return;
    }

    const { data: companyUser, error: companyUserError } = await supabase
      .from("company_users")
      .select("role_id, is_active")
      .eq("user_id", systemUserId)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .maybeSingle();

    if (companyUserError) {
      console.log("SIDEBAR COMPANY USER PERMISSION ERROR:", companyUserError.message);
      setAllowedModules([]);
      setPermissionsLoaded(true);
      return;
    }

    const activeRoleId = companyUser?.role_id || fallbackRoleId;

    if (!activeRoleId) {
      setAllowedModules([]);
      setPermissionsLoaded(true);
      return;
    }

    const { data: permissionData, error: permissionError } = await supabase
      .from("role_permissions")
      .select("module_key")
      .eq("role_id", activeRoleId)
      .eq("can_view", true);

    if (permissionError) {
      console.log("SIDEBAR ROLE PERMISSION ERROR:", permissionError.message);
      setAllowedModules([]);
      setPermissionsLoaded(true);
      return;
    }

    setAllowedModules(
      (permissionData || [])
        .map((permission: any) => String(permission.module_key || "").trim())
        .filter(Boolean),
    );

    setPermissionsLoaded(true);
  };

  const canViewModule = (moduleKey?: string) => {
    if (!moduleKey) return false;
    return allowedModules.includes(moduleKey);
  };

  const visibleMenuSections = useMemo(() => {
    if (!permissionsLoaded) return [];

    return menuSections
      .map((section: any) => {
        if (section.href) {
          return canViewModule(section.moduleKey) ? section : null;
        }

        const visibleItems = (section.items || []).filter((item: any) =>
          canViewModule(item.moduleKey),
        );

        if (visibleItems.length === 0) return null;

        return {
          ...section,
          items: visibleItems,
        };
      })
      .filter(Boolean);
  }, [allowedModules, permissionsLoaded]);

  const getWorkflowKeyForRequest = (request: any) => {
    if (!request?.request_type) return "";

    if (request.request_type === "EXPENSE_REQUEST") return "CASH_DRAWER_OUT";
    if (request.request_type === "CASH_EXPENSE_RELEASE") return "CASH_DRAWER_OUT";
    if (request.request_type === "CASH_ADVANCE_RELEASE") return "CASH_DRAWER_OUT";
    if (request.request_type === "REFUND_OUT") return "CASH_DRAWER_OUT";
    if (request.request_type === "ADJUSTMENT_OUT") return "CASH_DRAWER_OUT";
    if (request.request_type === "LEAVE_CANCELLATION") return "LEAVE_REQUEST";
    if (request.request_type === "PAYROLL_REOPEN") return "PAYROLL_ADJUSTMENT";

    return request.request_type;
  };

  const getAssignedApprovalBadgeCount = async () => {
    if (typeof window === "undefined") return;

    const storedCurrentUser = localStorage.getItem("opscore_current_user");

    let parsedCurrentUser: any = null;

    if (storedCurrentUser) {
      try {
        parsedCurrentUser = JSON.parse(storedCurrentUser);
      } catch {
        parsedCurrentUser = null;
      }
    }

    const currentEmployeeId = String(
      localStorage.getItem("opscore_current_employee_id") ||
        parsedCurrentUser?.employee_id ||
        "",
    ).trim();

    const currentSystemUserId = String(
      localStorage.getItem("opscore_current_system_user_id") ||
        parsedCurrentUser?.system_user_id ||
        "",
    ).trim();

    const currentEmployeeName = String(
      localStorage.getItem("opscore_current_employee_name") ||
        parsedCurrentUser?.name ||
        parsedCurrentUser?.username ||
        "",
    ).trim();

    const { data: requestData, error: requestError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("status", "PENDING");

    if (requestError) {
      console.log("SIDEBAR APPROVAL REQUEST BADGE ERROR:", requestError.message);
      setApprovalBadgeCount(0);
      return;
    }

    const { data: workflowData, error: workflowError } = await supabase
      .from("approval_workflows")
      .select("*")
      .eq("is_active", true);

    if (workflowError) {
      console.log("SIDEBAR APPROVAL WORKFLOW BADGE ERROR:", workflowError.message);
      setApprovalBadgeCount(0);
      return;
    }

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("approval_assignments")
      .select("*")
      .eq("is_active", true);

    if (assignmentError) {
      console.log("SIDEBAR APPROVAL ASSIGNMENT BADGE ERROR:", assignmentError.message);
      setApprovalBadgeCount(0);
      return;
    }

    const getWorkflowForRequest = (request: any) => {
      const workflowKey = getWorkflowKeyForRequest(request);

      return (
        workflowData?.find(
          (workflow: any) =>
            String(workflow.workflow_key || "") === String(workflowKey),
        ) || null
      );
    };

    const getApproverRoleForRequest = (request: any) => {
      const workflow = getWorkflowForRequest(request);
      return workflow?.approver_role || "MANAGER";
    };

    const getAssignedApproversForRequest = (request: any) => {
      const approverRole = getApproverRoleForRequest(request);

      return (assignmentData || []).filter((assignment: any) => {
        const assignmentActive = assignment.is_active ?? assignment.active ?? true;
        const status = String(assignment.status || "Active").toLowerCase();

        return (
          String(assignment.approval_role || "") === String(approverRole) &&
          assignmentActive !== false &&
          !["inactive", "disabled", "archived"].includes(status)
        );
      });
    };

    const assignmentMatchesCurrentUser = (assignment: any) => {
      const assignmentEmployeeIds = [
        assignment.employee_id,
        assignment.approver_employee_id,
        assignment.assigned_employee_id,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      const assignmentSystemUserIds = [
        assignment.system_user_id,
        assignment.approver_user_id,
        assignment.user_id,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      const assignmentNames = [
        assignment.approver_name,
        assignment.employee_name,
        assignment.username,
        assignment.approver_username,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      return (
        (!!currentEmployeeId && assignmentEmployeeIds.includes(currentEmployeeId)) ||
        (!!currentSystemUserId && assignmentSystemUserIds.includes(currentSystemUserId)) ||
        (!!currentEmployeeName && assignmentNames.includes(currentEmployeeName))
      );
    };

    const canCurrentUserApproveRequest = (request: any) => {
      const assignedApprovers = getAssignedApproversForRequest(request);

      if (assignedApprovers.length === 0) return false;

      return assignedApprovers.some((assignment: any) =>
        assignmentMatchesCurrentUser(assignment),
      );
    };

    const assignedPendingCount = (requestData || []).filter((request: any) =>
      canCurrentUserApproveRequest(request),
    ).length;

    setApprovalBadgeCount(assignedPendingCount);
  };

  const normalizePath = (value: string) =>
    value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;

  const currentPath = normalizePath(pathname || "/");

  const isActive = (href: string) => {
    const path = normalizePath(href);
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const isSectionActive = (section: any) => {
    if (section.href) return isActive(section.href);
    return section.items?.some((item: any) => isActive(item.href));
  };

  const getSectionBadge = (section: any) => {
    if (section.title !== "Approvals") return null;
    if (approvalBadgeCount <= 0) return null;
    return String(approvalBadgeCount);
  };

  const Badge = ({ value }: { value: string }) => (
    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
      {value}
    </span>
  );

  const renderFlyoutItem = (section: any, item: any) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        key={`${section.title}-${item.href}`}
        href={item.href}
        className={[
          "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition-all duration-200",
          active
            ? "border-blue-300/20 bg-blue-600 text-white shadow-lg shadow-blue-600/10"
            : "border-transparent text-slate-300 hover:border-blue-300/10 hover:bg-blue-500/10 hover:text-white",
        ].join(" ")}
      >
        <span
          className={
            active
              ? "rounded-lg bg-white/10 p-1.5"
              : "rounded-lg bg-slate-900/70 p-1.5"
          }
        >
          <Icon size={14} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    );
  };

  const renderDesktopSections = () => (
    <nav className="min-h-0 flex-1 space-y-0.5 overflow-visible px-2.5 pb-4">
      {visibleMenuSections.map((section: any) => {
        const Icon = section.icon;
        const sectionActive = isSectionActive(section);
        const sectionBadge = getSectionBadge(section);

        if (section.href) {
          return (
            <Link
              key={section.title}
              href={section.href}
              className={[
                "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition-all duration-200",
                sectionActive
                  ? "border-blue-300/20 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "border-transparent text-slate-400 hover:border-blue-300/10 hover:bg-white/[0.04] hover:text-white",
              ].join(" ")}
            >
              <span
                className={
                  sectionActive
                    ? "rounded-xl bg-white/10 p-1.5"
                    : "rounded-xl bg-slate-900/60 p-1.5"
                }
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
            </Link>
          );
        }

        return (
          <div key={section.title} className="group relative">
            <button
              type="button"
              className={[
                "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-[11px] font-bold transition-all duration-200",
                sectionActive
                  ? "border-blue-300/20 bg-white/[0.06] text-blue-100 shadow-lg shadow-black/10"
                  : "border-transparent text-slate-400 hover:border-blue-300/10 hover:bg-white/[0.04] hover:text-white",
              ].join(" ")}
            >
              <span
                className={
                  sectionActive
                    ? "rounded-xl bg-blue-500/15 p-1.5"
                    : "rounded-xl bg-slate-900/60 p-1.5"
                }
              >
                <Icon size={15} />
              </span>

              <span className="min-w-0 flex-1 truncate">{section.title}</span>

              {sectionBadge && <Badge value={sectionBadge} />}

              <ChevronRight
                size={13}
                className="shrink-0 opacity-60 transition-all duration-200 group-hover:translate-x-0.5"
              />
            </button>

            <div className="pointer-events-none absolute left-full top-0 h-full w-4" />

            <div className="invisible absolute left-full top-1/2 z-[10050] ml-2 w-[280px] -translate-y-1/2 translate-x-2 rounded-2xl border border-slate-200/10 bg-[#08111f]/98 p-2 opacity-0 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100">
              <div className="mb-2 rounded-xl border border-slate-200/10 bg-white/[0.04] px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {section.title}
                </p>
                <p className="mt-1 text-sm font-black text-white">Open module</p>
              </div>

              <div className="max-h-[58vh] space-y-1 overflow-y-auto pr-1">
                {section.items.map((item: any) => renderFlyoutItem(section, item))}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );

  const renderMobileSections = () => (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
      {visibleMenuSections.map((section: any) => {
        const Icon = section.icon;
        const sectionActive = isSectionActive(section);
        const expanded = openMobileSection === section.title;
        const sectionBadge = getSectionBadge(section);

        if (section.href) {
          return (
            <Link
              key={section.title}
              href={section.href}
              onClick={() => setMobileOpen(false)}
              className={[
                "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition-all duration-200",
                sectionActive
                  ? "border-blue-300/20 bg-blue-600 text-white"
                  : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white",
              ].join(" ")}
            >
              <Icon size={15} />
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
            </Link>
          );
        }

        return (
          <div key={section.title} className="space-y-1">
            <button
              type="button"
              onClick={() => setOpenMobileSection(expanded ? null : section.title)}
              className={[
                "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-[11px] font-bold transition-all duration-200",
                sectionActive || expanded
                  ? "border-blue-300/20 bg-white/[0.06] text-blue-100"
                  : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white",
              ].join(" ")}
            >
              <Icon size={15} />
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
              {sectionBadge && <Badge value={sectionBadge} />}
              <ChevronRight
                size={13}
                className={expanded ? "rotate-90 transition" : "transition"}
              />
            </button>

            {expanded && (
              <div className="ml-5 space-y-1 border-l border-blue-300/10 pl-2">
                {section.items.map((item: any) => {
                  const ItemIcon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-blue-500/10 hover:text-white"
                    >
                      <ItemIcon size={13} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const LogoBlock = () => (
    <div className="shrink-0 px-3 pb-3 pt-3">
      <div className="rounded-2xl border border-slate-200/10 bg-[#0b1220] px-3 py-3 shadow-xl shadow-black/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-600 text-[13px] font-black text-white shadow-lg shadow-blue-950/30">
            O
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-white">
              OPSCORE
            </p>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Enterprise Suite
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-[10000] flex items-center gap-2 rounded-xl border border-slate-200/10 bg-[#0b1220]/95 px-3 py-2.5 text-xs font-black text-blue-100 shadow-2xl shadow-black/40 backdrop-blur lg:hidden"
      >
        <Menu size={16} />
        OPSCORE
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[10001] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside className="relative z-[10002] flex h-full w-[86vw] max-w-[310px] flex-col overflow-hidden border-r border-blue-300/15 bg-[#070d19] text-white shadow-2xl shadow-black">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>

            <LogoBlock />
            {renderMobileSections()}
          </aside>
        </div>
      )}

      <aside className="hidden h-screen w-[220px] shrink-0 overflow-visible border-r border-slate-200/10 bg-[#070d19]/95 text-white shadow-xl shadow-black/20 backdrop-blur lg:sticky lg:top-0 lg:z-[9999] lg:flex lg:flex-col">
        <LogoBlock />
        {renderDesktopSections()}
      </aside>
    </>
  );
}