"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "@/components/Sidebar";

export default function WorkforcePage() {
  /// STATES
useEffect(() => {
  const testConnection = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*");

    console.log("EMPLOYEES:", data);
    console.log("ERROR:", error);
  };

  testConnection();
}, []);

  /// DATA
  const workforceData = [
    { department: "Housekeeping", requiredHC: 12, actualHC: 10 },
    { department: "Front Desk", requiredHC: 4, actualHC: 4 },
    { department: "Restaurant", requiredHC: 8, actualHC: 10 },
    { department: "Kitchen", requiredHC: 5, actualHC: 4 },
    { department: "Maintenance", requiredHC: 2, actualHC: 1 },
  ];

  /// CALCULATIONS
  const workforceSummary = workforceData.map((dept) => {
    const gap = dept.actualHC - dept.requiredHC;

    return {
      ...dept,
      gap,
      status: gap < 0 ? "LOW STAFF" : gap > 0 ? "OVER STAFF" : "NORMAL",
      suggestedAction:
        gap < 0
          ? "Call extra manpower"
          : gap > 0
          ? "Reduce scheduled staff"
          : "No action needed",
    };
  });

  const totalRequiredHC = workforceSummary.reduce(
    (sum, dept) => sum + dept.requiredHC,
    0
  );

  const totalActualHC = workforceSummary.reduce(
    (sum, dept) => sum + dept.actualHC,
    0
  );

  const lowStaffDepartments = workforceSummary.filter(
    (dept) => dept.gap < 0
  ).length;

  const overStaffDepartments = workforceSummary.filter(
    (dept) => dept.gap > 0
  ).length;

  /// FUNCTIONS

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Workforce</h1>
          <p className="mt-1 text-slate-400">
            Department manpower and staffing analysis
          </p>
        </section>

        <section className="mt-8 grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Required HC</p>
            <p className="mt-2 text-3xl font-bold">{totalRequiredHC}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Actual HC</p>
            <p className="mt-2 text-3xl font-bold">{totalActualHC}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Low Staff Departments</p>
            <p className="mt-2 text-3xl font-bold text-red-400">
              {lowStaffDepartments}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Over Staff Departments</p>
            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {overStaffDepartments}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Department Workforce Status</h2>
          <p className="mt-1 text-sm text-slate-400">
            Current staffing requirement by department
          </p>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-6 bg-slate-950 px-6 py-4 text-sm font-bold text-slate-400">
              <div>Department</div>
              <div>Required</div>
              <div>Actual</div>
              <div>Gap</div>
              <div>Status</div>
              <div>Action</div>
            </div>

            {workforceSummary.map((dept) => (
              <div
                key={dept.department}
                className="grid grid-cols-6 border-t border-slate-800 px-6 py-4 text-sm"
              >
                <div className="font-semibold">{dept.department}</div>
                <div>{dept.requiredHC}</div>
                <div>{dept.actualHC}</div>

                <div
                  className={
                    dept.gap < 0
                      ? "font-bold text-red-400"
                      : dept.gap > 0
                      ? "font-bold text-yellow-400"
                      : "font-bold text-green-400"
                  }
                >
                  {dept.gap > 0 ? `+${dept.gap}` : dept.gap}
                </div>

                <div
                  className={
                    dept.status === "LOW STAFF"
                      ? "font-bold text-red-400"
                      : dept.status === "OVER STAFF"
                      ? "font-bold text-yellow-400"
                      : "font-bold text-green-400"
                  }
                >
                  {dept.status}
                </div>

                <div className="text-slate-300">{dept.suggestedAction}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}