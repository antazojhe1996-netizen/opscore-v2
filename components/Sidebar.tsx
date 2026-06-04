"use client";

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
  Users,
  Wallet,
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
      { label: "Workforce", href: "/workforce", icon: Users },
      { label: "Employee 201", href: "/employees", icon: FileText },
      { label: "Scheduling", href: "/scheduling", icon: CalendarDays },
      { label: "Leave Management", href: "/leave-management", icon: ClipboardList },
      { label: "Forecasting", href: "/forecasting", icon: BarChart3 },
      { label: "Workforce Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    title: "Sales",
    icon: Hotel,
    items: [
      { label: "Hotel Room Sales", href: "/finance/room-sales", icon: Hotel },
      { label: "Apartment Sales", href: "/finance/apartment", icon: Building2 },
      { label: "Restaurant / Sports Bar Sales", href: "/finance/restaurant-import", icon: Receipt },
      { label: "Sales Settings", href: "/finance/settings", icon: Settings },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    items: [
      { label: "Finance Dashboard", href: "/finance", icon: BarChart3 },
      { label: "Expenses", href: "/finance/expenses", icon: Receipt },
      { label: "Bills Monitoring", href: "/finance/bills", icon: ClipboardList },
      { label: "Billing", href: "/finance/bills", icon: FileText },
      { label: "Payment", href: "/finance/bills", icon: Wallet },
      { label: "Cash Management", href: "/finance/cash-management", icon: Wallet },
      { label: "Finance Settings", href: "/finance/settings", icon: Settings },
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
      { label: "Release History", href: "/finance/payroll/history", icon: BarChart3 },
      { label: "Payroll Settings", href: "/finance/payroll/settings", icon: Settings },
      {label: "Snapshot History",href: "/finance/payroll/snapshots",icon: Database,},
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      { label: "General Settings", href: "/settings", icon: Settings },
      { label: "Departments", href: "/settings/departments", icon: Users },
      { label: "Employment Status", href: "/settings/employment-status", icon: ClipboardList },
      { label: "Employment Types", href: "/settings/employment-types", icon: ClipboardList },
      { label: "HC Rules", href: "/settings/hc-rules", icon: BarChart3 },
      { label: "Forecasting Rules", href: "/settings/forecasting-rules", icon: BarChart3 },
      { label: "Leave Settings", href: "/settings/leave-settings", icon: ClipboardList },
      { label: "Leave Credits", href: "/settings/leave-credits", icon: ClipboardList },
      { label: "Positions", href: "/settings/positions", icon: Users },
      { label: "Property", href: "/settings/property", icon: Hotel },
      { label: "Shifts", href: "/settings/shifts", icon: Clock },
      { label: "Activity Logs", href: "/settings", icon: ClipboardList },
      { label: "Backup & Restore", href: "/backup", icon: Database },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/finance") return pathname === "/finance";
    if (href === "/settings") return pathname === "/settings";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isSectionActive = (section: any) => {
    if (section.href) return isItemActive(section.href);
    return section.items.some((item: any) => isItemActive(item.href));
  };

  return (
    <aside className="sticky top-0 z-50 h-screen w-72 shrink-0 border-r border-slate-800 bg-slate-950 p-5 text-white">
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
        <p className="text-lg font-black text-amber-400">● OPSCORE</p>
        <p className="mt-1 text-xs text-slate-500">Hotel Operations System</p>
      </div>

      <nav className="space-y-2">
        {menuSections.map((section) => {
          const Icon = section.icon;
          const active = isSectionActive(section);

          if (section.href) {
            return (
              <Link
                key={section.title}
                href={section.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-slate-900 text-amber-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={17} />
                <span className="flex-1">{section.title}</span>
              </Link>
            );
          }

          return (
            <div key={section.title} className="group relative">
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? "bg-slate-900 text-amber-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={17} />
                <span className="min-w-0 flex-1 truncate">{section.title}</span>
                <ChevronRight size={15} className="opacity-50" />
              </button>

              <div className="invisible absolute left-[calc(100%+12px)] top-0 z-[999] max-h-[80vh] w-80 translate-x-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-3 opacity-0 shadow-2xl shadow-black/50 transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100">
                <div className="mb-3 border-b border-slate-800 px-3 pb-3">
                  <p className="text-sm font-black text-amber-400">
                    {section.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Select {section.title.toLowerCase()} module
                  </p>
                </div>

                <div className="space-y-1">
                  {section.items.map((item: any) => {
                    const ItemIcon = item.icon;
                    const itemActive = isItemActive(item.href);

                    return (
                      <Link
                        key={`${section.title}-${item.href}-${item.label}`}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                          itemActive
                            ? "bg-slate-900 font-semibold text-amber-400"
                            : "text-slate-400 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <ItemIcon size={15} />
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        <ChevronRight size={13} className="opacity-30" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}