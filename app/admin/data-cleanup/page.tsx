"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  UserCheck,
} from "lucide-react";

const Sidebar = dynamic(() => import("@/components/Sidebar"), {
  ssr: false,
});

type CleanupRow = {
  key: string;
  label: string;
  table: string;
  group: string;
  count: number;
  available: boolean;
  error: string | null;
};

const CONFIRM_TEXT = "DELETE OPSCORE TEST DATA";

export default function DataCleanupPage() {
  const [rows, setRows] = useState<CleanupRow[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [keepCurrentSuperAdmin, setKeepCurrentSuperAdmin] = useState(true);

  const [currentEmployeeId, setCurrentEmployeeId] = useState("");
  const [currentSystemUserId, setCurrentSystemUserId] = useState("");
  const [currentCompanyUserId, setCurrentCompanyUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Current Super Admin");

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const totalRows = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
    [rows],
  );

  const groupedRows = useMemo(() => {
    return rows.reduce<Record<string, CleanupRow[]>>((acc, row) => {
      if (!acc[row.group]) acc[row.group] = [];
      acc[row.group].push(row);
      return acc;
    }, {});
  }, [rows]);

  const protectionReady =
    !keepCurrentSuperAdmin ||
    Boolean(currentSystemUserId && currentCompanyUserId);

  const scanDatabase = async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const response = await fetch("/api/admin/data-cleanup");
    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      setErrorMessage(result.error || "Unable to scan database.");
      return;
    }

    setRows(result.tables || []);
  };

  const loadCurrentSession = () => {
    const employeeSessionKey = "opscore_current_employee";
    const employeeIdKey = "opscore_current_employee_id";
    const systemUserIdKey = "opscore_current_system_user_id";
    const currentUserKey = "opscore_current_user";

    const employeeId = localStorage.getItem(employeeIdKey) || "";
    const systemUserId = localStorage.getItem(systemUserIdKey) || "";

    let companyUserId = "";
    let displayName = "Current Super Admin";

    const savedEmployee = localStorage.getItem(employeeSessionKey);
    const savedUser = localStorage.getItem(currentUserKey);

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        companyUserId = parsed?.company_user_id || "";
        displayName = parsed?.name || parsed?.username || displayName;
      } catch {
        // ignore invalid local session
      }
    }

    if (!companyUserId && savedEmployee) {
      try {
        const parsed = JSON.parse(savedEmployee);
        companyUserId = parsed?.company_user_id || "";
        displayName =
          `${parsed?.first_name || ""} ${parsed?.last_name || ""}`.trim() ||
          parsed?.username ||
          displayName;
      } catch {
        // ignore invalid local session
      }
    }

    setCurrentEmployeeId(employeeId);
    setCurrentSystemUserId(systemUserId);
    setCurrentCompanyUserId(companyUserId);
    setCurrentUserName(displayName);
  };

  const deleteData = async () => {
    if (keepCurrentSuperAdmin && !protectionReady) {
      setErrorMessage(
        "Current Super Admin protection is enabled, but your system user or company access ID is missing. Logout and login again, then retry.",
      );
      return;
    }

    setDeleting(true);
    setMessage("");
    setErrorMessage("");

    const response = await fetch("/api/admin/data-cleanup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        confirmation,
        keep_current_super_admin: keepCurrentSuperAdmin,
        protected_employee_id: currentEmployeeId || null,
        protected_system_user_id: currentSystemUserId,
        protected_company_user_id: currentCompanyUserId,
      }),
    });

    const result = await response.json();

    setDeleting(false);

    if (!response.ok) {
      setErrorMessage(result.error || "Cleanup failed.");
      return;
    }

    setMessage(
      keepCurrentSuperAdmin
        ? "Test data cleanup completed. Current Super Admin system access was protected."
        : "Test data cleanup completed. Tables are still intact.",
    );
    setConfirmation("");
    scanDatabase();
  };

  useEffect(() => {
    loadCurrentSession();
    scanDatabase();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-7">
        <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              SYSTEM / DATA MAINTENANCE
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Data Cleanup Center
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              Preview and remove test records before production encoding. This
              deletes data rows only, not tables.
            </p>
          </div>

          <button
            onClick={scanDatabase}
            disabled={loading || deleting}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCcw size={17} />
            {loading ? "Scanning..." : "Scan Database"}
          </button>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard
            icon={<Database size={20} />}
            label="Rows Detected"
            value={String(totalRows)}
            helper="Total rows found in cleanup preview."
          />
          <SummaryCard
            icon={<CheckCircle2 size={20} />}
            label="Tables Safe"
            value="Yes"
            helper="Cleanup uses DELETE only. No DROP TABLE."
          />
          <SummaryCard
            icon={<UserCheck size={20} />}
            label="Admin Protection"
            value={keepCurrentSuperAdmin ? "On" : "Off"}
            helper={
              protectionReady
                ? "Current system access can be excluded."
                : "System access IDs incomplete."
            }
          />
          <SummaryCard
            icon={<ShieldAlert size={20} />}
            label="Confirmation"
            value={confirmation === CONFIRM_TEXT ? "Ready" : "Locked"}
            helper="Type the exact phrase before delete is enabled."
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Cleanup Preview
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Records that will be deleted
              </h2>
            </div>

            <div className="space-y-5 p-6">
              {Object.entries(groupedRows).map(([group, groupRows]) => (
                <div
                  key={group}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                >
                  <h3 className="text-sm font-black text-slate-950">{group}</h3>

                  <div className="mt-4 space-y-2">
                    {groupRows.map((row) => (
                      <div
                        key={row.key}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {row.label}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {row.table}
                          </p>
                        </div>

                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {rows.length === 0 && (
                <div className="py-14 text-center">
                  <p className="text-sm font-black text-slate-700">
                    No scan result yet.
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Click Scan Database to preview cleanup impact.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-red-200 bg-red-50 shadow-sm xl:sticky xl:top-8">
            <div className="border-b border-red-100 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-red-200 bg-white p-3 text-red-600">
                  <AlertTriangle size={22} />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
                    Danger Zone
                  </p>
                  <h2 className="text-xl font-black text-red-950">
                    Delete Test Data
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={keepCurrentSuperAdmin}
                    onChange={(event) =>
                      setKeepCurrentSuperAdmin(event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-emerald-300"
                  />
                  <span>
                    <span className="block text-sm font-black text-emerald-800">
                      Keep Current Super Admin Access
                    </span>
                    <span className="mt-1 block text-xs font-bold leading-5 text-emerald-700">
                      Protects your current system user and company access
                      record. Employee link is optional.
                    </span>
                  </span>
                </label>

                <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-emerald-800">
                  Protected: {currentUserName}
                  <br />
                  System User: {currentSystemUserId || "Missing"}
                  <br />
                  Company User: {currentCompanyUserId || "Missing"}
                  <br />
                  Employee: {currentEmployeeId || "NULL / Not linked"}
                </div>
              </div>

              <p className="text-sm font-bold leading-6 text-red-800">
                This will permanently delete previewed test rows. Tables and
                columns will remain intact.
              </p>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
                  Type Confirmation
                </label>

                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={CONFIRM_TEXT}
                  className="h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm font-bold text-red-700">
                  {errorMessage}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  {message}
                </div>
              )}

              <button
                onClick={deleteData}
                disabled={
                  deleting ||
                  loading ||
                  confirmation !== CONFIRM_TEXT ||
                  totalRows === 0 ||
                  !protectionReady
                }
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={17} />
                {deleting ? "Deleting..." : "Delete Test Data"}
              </button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}