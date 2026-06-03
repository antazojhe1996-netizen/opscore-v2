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
      { label: "Workforce Settings", href: "/settings/workforce", icon: Settings },
    ],
  },
  {
    title: "Sales",
    icon: Hotel,
    items: [
      { label: "Hotel Room Sales", href: "/sales/hotel-rooms", icon: Hotel },
      { label: "Apartment Sales", href: "/sales/apartments", icon: Building2 },
      { label: "Restaurant / Sports Bar Sales", href: "/sales/restaurant", icon: Receipt },
      { label: "Sales Audit", href: "/sales/audit", icon: ClipboardList },
      { label: "Sales Settings", href: "/settings/sales", icon: Settings },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    items: [
      { label: "Finance Dashboard", href: "/finance", icon: BarChart3 },
      { label: "Expenses", href: "/expenses", icon: Receipt },
      { label: "Bills Monitoring", href: "/finance/bills", icon: ClipboardList },
      { label: "Billing", href: "/finance/billing", icon: FileText },
      { label: "Payment", href: "/finance/payment", icon: Wallet },
      { label: "Cash Management", href: "/cash-management", icon: Wallet },
      { label: "Finance Settings", href: "/settings/finance", icon: Settings },
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
      { label: "Payroll Settings", href: "/settings/payroll", icon: Settings },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      { label: "General Settings", href: "/settings", icon: Settings },
      { label: "Activity Logs", href: "/activity-logs", icon: ClipboardList },
      { label: "Backup & Restore", href: "/backup", icon: Database },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isSectionActive = (section: any) => {
  if (section.href) return pathname === section.href;

  if (section.title === "Finance" && pathname.startsWith("/finance/payroll")) {
    return false;
  }

  return section.items.some(
    (item: any) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
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
                className={`flex items-center gap-3 rounded-xl border-l-4 px-4 py-3 text-sm font-bold transition ${
                  active
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
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
                className={`flex w-full items-center gap-3 rounded-xl border-l-4 px-4 py-3 text-left text-sm font-bold transition ${
                  active
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={17} />
                <span className="min-w-0 flex-1 truncate">{section.title}</span>
                <ChevronRight size={15} className="opacity-60" />
              </button>

              <div className="invisible absolute left-[calc(100%+12px)] top-0 z-[999] w-80 translate-x-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 opacity-0 shadow-2xl shadow-black/50 transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100">
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
                    const itemActive =
  item.href === "/finance"
    ? pathname === "/finance"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl border-l-4 px-3 py-2.5 text-sm transition ${
                          itemActive
                            ? "border-amber-400 bg-amber-400/10 font-bold text-amber-400"
                            : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
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