"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileArchive,
  RefreshCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";

const Sidebar = dynamic(() => import("@/components/Sidebar"), { ssr: false });

type CleanupRow = {
  key: string;
  label: string;
  table: string;
  group: string;
  count: number;
  available: boolean;
  error: string | null;
};

type ScanResponse = {
  confirmation_phrase: string;
  backup_confirmation_phrase: string;
  total_resettable_rows: number;
  tables: CleanupRow[];
  protected_tables: string[];
  safety_rules: string[];
};

const CONFIRM_TEXT = "PRODUCTION GO-LIVE RESET";
const BACKUP_CONFIRM_TEXT = "BACKUP FILES VERIFIED";

export default function DataCleanupPage() {
  const [rows, setRows] = useState<CleanupRow[]>([]);
  const [protectedTables, setProtectedTables] = useState<string[]>([]);
  const [safetyRules, setSafetyRules] = useState<string[]>([]);

  const [backupVerified, setBackupVerified] = useState(false);
  const [backupConfirmation, setBackupConfirmation] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [masterBackupName, setMasterBackupName] = useState("");
  const [settingsBackupName, setSettingsBackupName] = useState("");
  const [saasBackupName, setSaasBackupName] = useState("");
  const [fullBackupName, setFullBackupName] = useState("");

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const backupFileNames = useMemo(
    () =>
      [masterBackupName, settingsBackupName, saasBackupName, fullBackupName]
        .map((value) => value.trim())
        .filter(Boolean),
    [masterBackupName, settingsBackupName, saasBackupName, fullBackupName]
  );

  const backupReady =
    backupVerified &&
    backupConfirmation === BACKUP_CONFIRM_TEXT &&
    backupFileNames.length >= 4;

  const resetReady =
    backupReady && confirmation === CONFIRM_TEXT && rows.length > 0 && !loading;

  const totalRows = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
    [rows]
  );

  const groupedRows = useMemo(() => {
    return rows.reduce<Record<string, CleanupRow[]>>((acc, row) => {
      if (!acc[row.group]) acc[row.group] = [];
      acc[row.group].push(row);
      return acc;
    }, {});
  }, [rows]);

  const scanDatabase = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/data-cleanup");
      const result = (await response.json()) as Partial<ScanResponse> & {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(result.error || "Unable to scan database.");
        return;
      }

      setRows(result.tables || []);
      setProtectedTables(result.protected_tables || []);
      setSafetyRules(result.safety_rules || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to scan database."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteData = async () => {
    if (!backupReady) {
      setErrorMessage("Backup verification is required before reset.");
      return;
    }

    if (confirmation !== CONFIRM_TEXT) {
      setErrorMessage(`Type exactly: ${CONFIRM_TEXT}`);
      return;
    }

    setDeleting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/data-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation,
          backup_verified: backupVerified,
          backup_confirmation: backupConfirmation,
          backup_file_names: backupFileNames,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error || "Production reset failed.");
        return;
      }

      setMessage(result.message || "Production reset completed.");
      setConfirmation("");
      await scanDatabase();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Production reset failed."
      );
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  void scanDatabase();
}, [scanDatabase]);

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-7">
        <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              System Safety / Production Reset
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Production Reset Center
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              Preview and reset UAT transaction data only. Master data, users,
              roles, permissions, settings, audit logs, POS menu setup, and
              apartment units are protected.
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
            label="Resettable Rows"
            value={String(totalRows)}
            helper="UAT transaction rows detected."
          />
          <SummaryCard
            icon={<FileArchive size={20} />}
            label="Backup"
            value={backupReady ? "Verified" : "Required"}
            helper="Four backup files must be verified."
          />
          <SummaryCard
            icon={<CheckCircle2 size={20} />}
            label="Protected Tables"
            value={String(protectedTables.length)}
            helper="Master/config tables protected."
          />
          <SummaryCard
            icon={<ShieldAlert size={20} />}
            label="Reset Status"
            value={resetReady ? "Ready" : "Locked"}
            helper="Requires backup and confirmation phrase."
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Reset Preview
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                UAT transactions that will be reset
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Review these tables before running reset.
              </p>
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
                          {row.error ? (
                            <p className="mt-1 text-xs font-bold text-red-600">
                              {row.error}
                            </p>
                          ) : null}
                        </div>

                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {row.available ? row.count : "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {rows.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-black text-slate-700">
                    No scan result yet.
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Click Scan Database to preview reset impact.
                  </p>
                </div>
              ) : null}
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
                    Locked Control
                  </p>
                  <h2 className="text-xl font-black text-red-950">
                    Production Reset
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-900">
                  Backup Verification Required
                </p>
                <p className="mt-2 text-xs font-bold leading-5 text-amber-800">
                  Reset is disabled until all required backups are exported and
                  verified.
                </p>
              </div>

              <BackupInput
                label="Master Data Backup File"
                value={masterBackupName}
                onChange={setMasterBackupName}
                placeholder="opscore_master_data_backup_YYYY-MM-DD.json"
              />
              <BackupInput
                label="Settings Backup File"
                value={settingsBackupName}
                onChange={setSettingsBackupName}
                placeholder="opscore_settings_backup_YYYY-MM-DD.json"
              />
              <BackupInput
                label="SaaS Foundation Backup File"
                value={saasBackupName}
                onChange={setSaasBackupName}
                placeholder="opscore_saas_foundation_backup_YYYY-MM-DD.json"
              />
              <BackupInput
                label="Full OPSCORE Backup File"
                value={fullBackupName}
                onChange={setFullBackupName}
                placeholder="opscore_full_backup_YYYY-MM-DD.json"
              />

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <input
                  type="checkbox"
                  checked={backupVerified}
                  onChange={(event) => setBackupVerified(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-emerald-300"
                />
                <span>
                  <span className="block text-sm font-black text-emerald-800">
                    I verified the backup files
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-5 text-emerald-700">
                    I confirm the files downloaded successfully and are stored
                    locally before reset.
                  </span>
                </span>
              </label>

              <PhraseInput
                label="Backup Confirmation"
                value={backupConfirmation}
                onChange={setBackupConfirmation}
                placeholder={BACKUP_CONFIRM_TEXT}
              />

              <PhraseInput
                label="Reset Confirmation"
                value={confirmation}
                onChange={setConfirmation}
                placeholder={CONFIRM_TEXT}
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-950">
                  Safety Rules
                </p>
                <div className="mt-2 space-y-1">
                  {safetyRules.map((rule) => (
                    <p
                      key={rule}
                      className="text-xs font-bold leading-5 text-slate-600"
                    >
                      • {rule}
                    </p>
                  ))}
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm font-bold text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  {message}
                </div>
              ) : null}

              <button
                onClick={deleteData}
                disabled={deleting || loading || !resetReady}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={17} />
                {deleting ? "Resetting..." : "Run Production Reset"}
              </button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function BackupInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10"
      />
    </div>
  );
}

function PhraseInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
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


