"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, UserCheck } from "lucide-react";

export default function CurrentUserPage() {
  const [session, setSession] = useState<any>(null);
  const [systemUser, setSystemUser] = useState<any>(null);
  const [companyUser, setCompanyUser] = useState<any>(null);
  const [role, setRole] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);

  const loadSession = async () => {
    const systemUserId = localStorage.getItem("opscore_current_system_user_id");
    const employeeId = localStorage.getItem("opscore_current_employee_id");
    const companyId = localStorage.getItem("opscore_current_company_id");
    const roleId = localStorage.getItem("opscore_current_role_id");
    const mustChangePassword = localStorage.getItem("opscore_must_change_password");

    setSession({
      systemUserId,
      employeeId,
      companyId,
      roleId,
      mustChangePassword,
    });

    if (systemUserId) {
      const { data } = await supabase
        .from("system_users")
        .select("*")
        .eq("id", systemUserId)
        .maybeSingle();

      setSystemUser(data || null);
    }

    if (systemUserId && companyId) {
      const { data } = await supabase
        .from("company_users")
        .select("*")
        .eq("user_id", systemUserId)
        .eq("company_id", companyId)
        .maybeSingle();

      setCompanyUser(data || null);
    }

    if (roleId) {
      const { data } = await supabase
        .from("system_roles")
        .select("*")
        .eq("id", roleId)
        .maybeSingle();

      setRole(data || null);
    }

    if (employeeId) {
      const { data } = await supabase
        .from("employees")
        .select("id, employee_no, first_name, last_name, department, position, employment_status")
        .eq("id", employeeId)
        .maybeSingle();

      setEmployee(data || null);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="SYSTEM / SESSION INSPECTOR" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              System
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Session Inspector
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
              Read-only view of the active OPSCORE login session. Employee link is optional for SaaS owner and system accounts.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <InfoCard title="System Identity" icon={<ShieldCheck size={20} />}>
              <InfoRow label="System User ID" value={session?.systemUserId} />
              <InfoRow label="Username" value={systemUser?.username} />
              <InfoRow label="Active" value={String(systemUser?.is_active ?? "-")} />
              <InfoRow label="Must Change Password" value={String(systemUser?.must_change_password ?? session?.mustChangePassword ?? "-")} />
              <InfoRow label="Last Login" value={systemUser?.last_login_at || "-"} />
            </InfoCard>

            <InfoCard title="Company Access" icon={<UserCheck size={20} />}>
              <InfoRow label="Company ID" value={session?.companyId} />
              <InfoRow label="Company User ID" value={companyUser?.id} />
              <InfoRow label="Role ID" value={session?.roleId || companyUser?.role_id} />
              <InfoRow label="Role Name" value={role?.role_name || "-"} />
              <InfoRow label="Company Access Active" value={String(companyUser?.is_active ?? "-")} />
            </InfoCard>

            <InfoCard title="Employee Link Optional" icon={<UserCheck size={20} />}>
              <InfoRow label="Employee ID" value={session?.employeeId || "NULL / Not linked"} />
              <InfoRow label="Employee No" value={employee?.employee_no || "-"} />
              <InfoRow label="Employee Name" value={employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() : "No employee profile linked"} />
              <InfoRow label="Department" value={employee?.department || "-"} />
              <InfoRow label="Status" value={employee?.employment_status || "-"} />
            </InfoCard>

            <InfoCard title="Architecture Status" icon={<ShieldCheck size={20} />}>
              <InfoRow label="Primary Session Source" value="system_user_id" />
              <InfoRow label="Permission Source" value="company_users.role_id" />
              <InfoRow label="Employee Requirement" value="Optional" />
              <InfoRow label="SaaS Owner Ready" value={session?.systemUserId && !session?.employeeId ? "Yes" : "Ready after employee_id detach"} />
            </InfoCard>
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
          {icon}
        </div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-black text-slate-950">
        {value || "-"}
      </p>
    </div>
  );
}


