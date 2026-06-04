"use client";

import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { Download, Database, ShieldCheck } from "lucide-react";

/// DATA

const backupItems = [
  {
    title: "Employees",
    description: "Export employee master list.",
    table: "employees",
    fileName: "employees_backup",
  },
  {
    title: "Attendance",
    description: "Export attendance entries.",
    table: "attendance_entries",
    fileName: "attendance_backup",
  },
  {
    title: "Payroll Records",
    description: "Export payroll computations.",
    table: "payroll_records",
    fileName: "payroll_records_backup",
  },
  {
    title: "Payroll Snapshots",
    description: "Export frozen payroll history.",
    table: "payroll_snapshots",
    fileName: "payroll_snapshots_backup",
  },
  {
    title: "Expenses",
    description: "Export expense records.",
    table: "expenses",
    fileName: "expenses_backup",
  },
];


/// FUNCTIONS

const exportTable = async (tableName: string, fileName: string) => {
  const { data, error } = await supabase.from(tableName).select("*");

  if (error) {
    alert(`Failed to export ${tableName}`);
    return;
  }

  if (!data || data.length === 0) {
    alert("No data found.");
    return;
  }

  const headers = Object.keys(data[0]);

  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((field) => `"${String(row[field] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`;

  link.click();
};


//// UI 

export default function BackupPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
              System Safety
            </p>

            <h1 className="mt-2 text-4xl font-black">Backup Center</h1>

            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Export important OPSCORE data before payroll testing, imports, or major edits.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck size={18} />
              <span className="font-black">Backup Ready</span>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
          <p className="font-black text-yellow-300">Recommended</p>
          <p className="mt-1 text-sm text-yellow-100/80">
            Export backups before employee testing, payroll generation, or attendance import.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {backupItems.map((item) => (
            <BackupCard
              key={item.table}
              title={item.title}
              description={item.description}
              onClick={() => exportTable(item.table, item.fileName)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

/// HELPER COMPONENETS

function BackupCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-emerald-500 hover:bg-slate-800/70"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
        <Download size={24} />
      </div>

      <h3 className="text-lg font-black">{title}</h3>

      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </button>
  );
}
