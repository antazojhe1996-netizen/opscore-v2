"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  ChefHat,
  ClipboardList,
  Clock,
  Database,
  FileText,
  Hotel,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Menu,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";

const menuSections = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    items: [],
  },
  {
    title: "Workforce",
    icon: Users,
    items: [
      { label: "Employee 201", href: "/employees", icon: FileText },
      { label: "Scheduling", href: "/scheduling", icon: CalendarDays },
      { label: "Leave Management", href: "/leave-management", icon: ClipboardList },
      { label: "Employee Portal", href: "/employee-portal", icon: Users },
      { label: "Workforce Dashboard", href: "/workforce", icon: Users },
    ],
  },
  {
    title: "Payroll",
    icon: FileText,
    items: [
      { label: "Attendance Audit", href: "/finance/payroll/attendance", icon: Clock },
      { label: "Payroll Register", href: "/finance/payroll/register", icon: FileText },
      { label: "Payroll Manager", href: "/finance/payroll/manager", icon: Wallet },
      { label: "Payslips", href: "/finance/payroll/payslips", icon: Receipt },
      { label: "Employee Balances", href: "/finance/payroll/employee-balances", icon: Wallet },
      { label: "Release History", href: "/finance/payroll/history", icon: BarChart3 },
      { label: "Payroll Settings", href: "/finance/payroll/settings", icon: Settings },
    ],
  },
  {
    title: "Sales",
    icon: Hotel,
    items: [
      { label: "Room Sales", href: "/finance/room-sales", icon: Hotel },
      { label: "Apartment", href: "/finance/apartment", icon: Building2 },
      { label: "Restaurant Sales", href: "/finance/restaurant-import", icon: Receipt },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    items: [
      { label: "Finance Dashboard", href: "/finance", icon: BarChart3 },
      { label: "Expenses", href: "/finance/expenses", icon: Receipt },
      { label: "Expense Requests", href: "/finance/expense-requests", icon: ClipboardList },
      { label: "Bills", href: "/finance/bills", icon: ClipboardList },
      { label: "Cash Management", href: "/finance/cash-management", icon: Wallet },
      { label: "Finance Settings", href: "/finance/settings", icon: Settings },
    ],
  },
  {
    title: "Approvals",
    icon: ShieldCheck,
    badge: "2",
    items: [
      { label: "Approval Center", href: "/manager/approval-center", icon: ClipboardList },
      { label: "Controls", href: "/settings/approval-controls", icon: ShieldCheck },
      { label: "Assignments", href: "/settings/approval-assignments", icon: Users },
    ],
  },
  {
    title: "Audit",
    icon: ShieldCheck,
    items: [
      { label: "Operations Audit", href: "/audit", icon: ShieldCheck },
      { label: "Activity Logs", href: "/activity-logs", icon: Activity },
      { label: "Audit Trail", href: "/admin/audit-logs", icon: ClipboardList },
      { label: "Database Health", href: "/admin/database-health", icon: Database },
    ],
  },
  {
    title: "Reservations",
    icon: Hotel,
    items: [
      { label: "Dashboard", href: "/reservations", icon: Hotel, soon: true },
      { label: "Board", href: "/reservations/board", icon: CalendarDays, soon: true },
      { label: "Ledger", href: "/reservations/ledger", icon: ClipboardList, soon: true },
      { label: "Analytics", href: "/reservations/analytics", icon: BarChart3, soon: true },
    ],
  },
  {
    title: "Marketing",
    icon: Megaphone,
    items: [
      { label: "Marketing Center", href: "/marketing", icon: Megaphone, soon: true },
    ],
  },
  {
    title: "POS",
    icon: ShoppingCart,
    items: [
      { label: "POS Dashboard", href: "/pos", icon: BarChart3, soon: true },
      { label: "POS Terminal", href: "/pos/terminal", icon: Store, soon: true },
      { label: "Parked Orders", href: "/pos/parked-orders", icon: ClipboardList, soon: true },
      { label: "Production Queue", href: "/pos/production", icon: ChefHat, soon: true },
      { label: "POS Transactions", href: "/pos/transactions", icon: Receipt, soon: true },
      { label: "POS Reports", href: "/pos/reports", icon: BarChart3, soon: true },
    ],
  },
  {
    title: "Maintenance",
    icon: Wrench,
    items: [
      { label: "Maintenance Tracker", href: "/maintenance-tracker", icon: Wrench, soon: true },
    ],
  },
  {
    title: "HR Settings",
    icon: Users,
    items: [
      { label: "Departments", href: "/settings/departments", icon: Users },
      { label: "Positions", href: "/settings/positions", icon: Users },
      { label: "Employment Types", href: "/settings/employment-types", icon: ClipboardList },
      { label: "Employment Statuses", href: "/settings/employment-statuses", icon: ClipboardList },
      { label: "Leave Settings", href: "/settings/leave-settings", icon: ClipboardList },
      { label: "Leave Credits", href: "/settings/leave-credits", icon: ClipboardList },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      { label: "General Settings", href: "/settings", icon: Settings },
      { label: "Session Inspector", href: "/settings/current-user", icon: UserCheck },
      { label: "Property Settings", href: "/settings/property", icon: Hotel },
      { label: "User Credentials", href: "/settings/user-credentials", icon: KeyRound },
      { label: "User Roles", href: "/settings/user-roles", icon: ShieldCheck },
      { label: "Data Cleanup", href: "/admin/data-cleanup", icon: Database },
      { label: "Backup", href: "/backup", icon: Database },
      { label: "Shift Settings", href: "/settings/shifts", icon: Clock },
      { label: "HC Rules", href: "/settings/hc-rules", icon: BarChart3 },
    ],
  },
  {
    title: "Future Tools",
    icon: Sparkles,
    items: [
      { label: "Forecasting", href: "/forecasting", icon: BarChart3, soon: true },
      { label: "Performance", href: "/performance", icon: BarChart3, soon: true },
      { label: "Reports Center", href: "/finance/reports", icon: FileText, soon: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileSection, setOpenMobileSection] = useState<string | null>(null);

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

  const SoonBadge = () => (
    <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
      Soon
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
        <span className={active ? "rounded-lg bg-white/10 p-1.5" : "rounded-lg bg-slate-900/70 p-1.5"}>
          <Icon size={14} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.soon && <SoonBadge />}
      </Link>
    );
  };

  const renderDesktopSections = () => (
    <nav className="min-h-0 flex-1 space-y-0.5 overflow-visible px-2.5 pb-4">
      {menuSections.map((section: any) => {
        const Icon = section.icon;
        const sectionActive = isSectionActive(section);

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
              <span className={sectionActive ? "rounded-xl bg-white/10 p-1.5" : "rounded-xl bg-slate-900/60 p-1.5"}>
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
              <span className={sectionActive ? "rounded-xl bg-blue-500/15 p-1.5" : "rounded-xl bg-slate-900/60 p-1.5"}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate">{section.title}</span>

              {section.badge && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                  {section.badge}
                </span>
              )}

              <ChevronRight size={13} className="shrink-0 opacity-60 transition-all duration-200 group-hover:translate-x-0.5" />
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
      {menuSections.map((section: any) => {
        const Icon = section.icon;
        const sectionActive = isSectionActive(section);
        const expanded = openMobileSection === section.title;

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
              <ChevronRight size={13} className={expanded ? "rotate-90 transition" : "transition"} />
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
                      {item.soon && <SoonBadge />}
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