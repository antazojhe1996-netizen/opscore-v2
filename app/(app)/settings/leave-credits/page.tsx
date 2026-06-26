"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import { createAuditLog } from "@/lib/audit";
import PageGuard from "@/components/PageGuard";

type Employee = {
  employee_no: string | number;
  first_name: string;
  last_name: string;
  department?: string | null;
  position?: string | null;
};

type LeaveSetting = {
  id: string | number;
  leave_type: string;
  is_enabled?: boolean;
};

type LeaveCredit = {
  id: string | number;
  employee_no: string | number;
  leave_type: string;
  credits: number;
  used_credits: number;
  remaining_credits: number;
  created_at?: string;
};

export default function LeaveCreditsPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveSettings, setLeaveSettings] = useState<LeaveSetting[]>([]);
  const [leaveCredits, setLeaveCredits] = useState<LeaveCredit[]>([]);

  const [selectedEmployeeNo, setSelectedEmployeeNo] = useState("");
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  /// CALCULATIONS
  const selectedEmployee = employees.find(
    (employee) => String(employee.employee_no) === String(selectedEmployeeNo)
  );

  const totalEmployeesWithCredits = useMemo(() => {
    const uniqueEmployees = new Set(
      leaveCredits.map((credit) => String(credit.employee_no))
    );

    return uniqueEmployees.size;
  }, [leaveCredits]);

  const totalRemainingCredits = useMemo(() => {
    return leaveCredits.reduce(
      (total, credit) => total + Number(credit.remaining_credits || 0),
      0
    );
  }, [leaveCredits]);

  const lowCreditCount = useMemo(() => {
    return leaveCredits.filter(
      (credit) => Number(credit.remaining_credits || 0) <= 0
    ).length;
  }, [leaveCredits]);

  /// FUNCTIONS
  const getCurrentUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email || "System User";
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error);
      return;
    }

    setEmployees((data || []) as Employee[]);
  };

  const getLeaveSettings = async () => {
    const { data, error } = await supabase
      .from("leave_settings")
      .select("*")
      .eq("is_enabled", true)
      .order("id", { ascending: true });

    if (error) {
      console.log("GET LEAVE SETTINGS ERROR:", error);
      return;
    }

    setLeaveSettings((data || []) as LeaveSetting[]);
  };

  const getLeaveCredits = async () => {
    const { data, error } = await supabase
      .from("employee_leave_credits")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET LEAVE CREDITS ERROR:", error);
      return;
    }

    setLeaveCredits((data || []) as LeaveCredit[]);
  };

  const getEmployeeName = (employeeNo: string | number) => {
    const employee = employees.find(
      (emp) => String(emp.employee_no) === String(employeeNo)
    );

    if (!employee) return "Unknown Employee";

    return `${employee.first_name} ${employee.last_name}`;
  };

  const getCreditRecord = (employeeNo: string | number, leaveType: string) => {
    return leaveCredits.find(
      (item) =>
        String(item.employee_no) === String(employeeNo) &&
        item.leave_type === leaveType
    );
  };

  const loadEmployeeCredits = (employeeNo: string) => {
    setSelectedEmployeeNo(employeeNo);

    const newInputs: Record<string, string> = {};

    leaveSettings.forEach((leave) => {
      const existingCredit = getCreditRecord(employeeNo, leave.leave_type);
      newInputs[leave.leave_type] = existingCredit
        ? String(existingCredit.credits)
        : "0";
    });

    setCreditInputs(newInputs);
  };

  const updateCreditInput = (leaveType: string, value: string) => {
    setCreditInputs((previous) => ({
      ...previous,
      [leaveType]: value,
    }));
  };

  const saveAllCredits = async () => {
    if (!selectedEmployeeNo) {
      alert("Please select an employee.");
      return;
    }

    setIsSaving(true);

    const oldCredits = leaveCredits.filter(
      (item) => String(item.employee_no) === String(selectedEmployeeNo)
    );

    const newCreditPayload = leaveSettings.map((leave) => ({
      employee_no: selectedEmployeeNo,
      leave_type: leave.leave_type,
      credits: Number(creditInputs[leave.leave_type] || 0),
    }));

    for (const leave of leaveSettings) {
      const creditValue = Number(creditInputs[leave.leave_type] || 0);

      if (creditValue < 0) {
        alert("Credits cannot be negative.");
        setIsSaving(false);
        return;
      }

      const existingCredit = getCreditRecord(selectedEmployeeNo, leave.leave_type);

      if (existingCredit) {
        const usedCredits = Number(existingCredit.used_credits || 0);
        const remainingCredits = creditValue - usedCredits;

        const { error } = await supabase
          .from("employee_leave_credits")
          .update({
            credits: creditValue,
            remaining_credits: remainingCredits < 0 ? 0 : remainingCredits,
          })
          .eq("id", existingCredit.id);

        if (error) {
          console.log("UPDATE CREDIT ERROR:", error);
          alert("Failed to update credits.");
          setIsSaving(false);
          return;
        }
      } else {
        const { error } = await supabase.from("employee_leave_credits").insert([
          {
            employee_no: selectedEmployeeNo,
            leave_type: leave.leave_type,
            credits: creditValue,
            used_credits: 0,
            remaining_credits: creditValue,
          },
        ]);

        if (error) {
          console.log("INSERT CREDIT ERROR:", error);
          alert("Failed to create credits.");
          setIsSaving(false);
          return;
        }
      }
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Leave Credits",
      action: "UPSERT_LEAVE_CREDITS",
      description: `Created/updated leave credits for ${getEmployeeName(
        selectedEmployeeNo
      )}`,
      severity: "warning",
      recordId: String(selectedEmployeeNo),
      oldValue: oldCredits,
      newValue: newCreditPayload,
    });

    await getLeaveCredits();
    setIsSaving(false);
    alert("Leave credits saved.");
  };

  const deleteLeaveCredit = async (credit: LeaveCredit) => {
    const confirmDelete = confirm(
      `Delete ${credit.leave_type} credit record for ${getEmployeeName(
        credit.employee_no
      )}?`
    );

    if (!confirmDelete) return;

    const oldValue = { ...credit };

    const { error } = await supabase
      .from("employee_leave_credits")
      .delete()
      .eq("id", credit.id);

    if (error) {
      console.log("DELETE CREDIT ERROR:", error);
      alert("Failed to delete leave credit.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Leave Credits",
      action: "DELETE_LEAVE_CREDIT",
      description: `Deleted ${credit.leave_type} credit record for ${getEmployeeName(
        credit.employee_no
      )}`,
      severity: "critical",
      recordId: String(credit.id),
      oldValue,
      newValue: null,
    });

    await getLeaveCredits();

    if (String(credit.employee_no) === String(selectedEmployeeNo)) {
      setCreditInputs((previous) => ({
        ...previous,
        [credit.leave_type]: "0",
      }));
    }
  };

  const deleteAllCreditsForSelectedEmployee = async () => {
    if (!selectedEmployeeNo) {
      alert("Please select an employee.");
      return;
    }

    const employeeCredits = leaveCredits.filter(
      (item) => String(item.employee_no) === String(selectedEmployeeNo)
    );

    if (employeeCredits.length === 0) {
      alert("No leave credit records to delete.");
      return;
    }

    const confirmDelete = confirm(
      `Delete all leave credit records for ${getEmployeeName(selectedEmployeeNo)}?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("employee_leave_credits")
      .delete()
      .eq("employee_no", selectedEmployeeNo);

    if (error) {
      console.log("DELETE ALL CREDITS ERROR:", error);
      alert("Failed to delete leave credits.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Leave Credits",
      action: "DELETE_EMPLOYEE_LEAVE_CREDITS",
      description: `Deleted all leave credits for ${getEmployeeName(
        selectedEmployeeNo
      )}`,
      severity: "critical",
      recordId: String(selectedEmployeeNo),
      oldValue: employeeCredits,
      newValue: null,
    });

    const resetInputs: Record<string, string> = {};
    leaveSettings.forEach((leave) => {
      resetInputs[leave.leave_type] = "0";
    });

    setCreditInputs(resetInputs);
    await getLeaveCredits();
  };

  const getRemainingBadgeClass = (remaining: number) => {
    if (remaining >= 3) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (remaining >= 1) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-red-200 bg-red-50 text-red-700";
  };

  useEffect(() => {
    getEmployees();
    getLeaveSettings();
    getLeaveCredits();
  }, []);

  /// UI
  return (
    <PageGuard moduleKey="leave_settings">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Workforce
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Leave Credits Management
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Create, update, and monitor employee leave credit balances by
                  enabled leave type.
                </p>
              </div>

              <button
                onClick={() => {
                  getEmployees();
                  getLeaveSettings();
                  getLeaveCredits();
                }}
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                Refresh Records
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Employees
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {employees.length}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Active employee records loaded
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Leave Types
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {leaveSettings.length}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Enabled leave credit categories
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  With Credits
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {totalEmployeesWithCredits}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Employees with existing balances
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Remaining Credits
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {totalRemainingCredits}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {lowCreditCount} records need review
                </p>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Credit Setup
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Employee Leave Credit Editor
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Save creates missing records and updates existing credit
                    balances.
                  </p>
                </div>

                <div className="p-6">
                  {!selectedEmployeeNo ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
                      <h3 className="text-sm font-black text-slate-950">
                        Select an employee to manage leave credits.
                      </h3>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        Choose from the employee selector panel to load editable
                        leave balances.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-auto rounded-3xl border border-slate-200">
                        <table className="w-full min-w-[760px]">
                          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            <tr>
                              <th className="px-6 py-4">Leave Type</th>
                              <th className="px-6 py-4">Credits</th>
                              <th className="px-6 py-4">Used</th>
                              <th className="px-6 py-4">Remaining</th>
                              <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                            {leaveSettings.map((leave) => {
                              const existingCredit = getCreditRecord(
                                selectedEmployeeNo,
                                leave.leave_type
                              );

                              const remaining = Number(
                                existingCredit?.remaining_credits || 0
                              );

                              return (
                                <tr
                                  key={leave.id}
                                  className="transition-all duration-200 hover:bg-slate-50"
                                >
                                  <td className="px-6 py-4 font-black text-slate-950">
                                    {leave.leave_type}
                                  </td>

                                  <td className="px-6 py-4">
                                    <input
                                      type="number"
                                      min="0"
                                      value={
                                        creditInputs[leave.leave_type] || "0"
                                      }
                                      onChange={(e) =>
                                        updateCreditInput(
                                          leave.leave_type,
                                          e.target.value
                                        )
                                      }
                                      className="h-11 w-28 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                  </td>

                                  <td className="px-6 py-4">
                                    {existingCredit?.used_credits || 0}
                                  </td>

                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getRemainingBadgeClass(
                                        remaining
                                      )}`}
                                    >
                                      {existingCredit?.remaining_credits || 0}
                                    </span>
                                  </td>

                                  <td className="px-6 py-4 text-right">
                                    {existingCredit ? (
                                      <button
                                        onClick={() =>
                                          deleteLeaveCredit(existingCredit)
                                        }
                                        className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                                      >
                                        Delete
                                      </button>
                                    ) : (
                                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                        New on Save
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {leaveSettings.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-6 py-14 text-center"
                                >
                                  <h3 className="text-sm font-black text-slate-950">
                                    No enabled leave types found.
                                  </h3>
                                  <p className="mt-2 text-sm font-medium text-slate-500">
                                    Enable leave types first before assigning
                                    credits.
                                  </p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex flex-col justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row">
                        <button
                          onClick={deleteAllCreditsForSelectedEmployee}
                          className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                        >
                          Delete All Credits
                        </button>

                        <button
                          onClick={saveAllCredits}
                          disabled={isSaving}
                          className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save All Credits"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Employee Selector
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Select Employee
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Load existing credits by employee number.
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Employee
                    </label>

                    <select
                      value={selectedEmployeeNo}
                      onChange={(e) => loadEmployeeCredits(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="">Select employee</option>

                      {employees.map((employee) => (
                        <option
                          key={employee.employee_no}
                          value={employee.employee_no}
                        >
                          {employee.first_name} {employee.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedEmployee ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Selected Employee
                      </p>
                      <h3 className="mt-2 text-xl font-black text-slate-950">
                        {selectedEmployee.first_name}{" "}
                        {selectedEmployee.last_name}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {selectedEmployee.employee_no}
                      </p>

                      {(selectedEmployee.department ||
                        selectedEmployee.position) && (
                        <div className="mt-4 grid grid-cols-1 gap-3">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                              Department
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-950">
                              {selectedEmployee.department || "Unassigned"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                              Position
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-950">
                              {selectedEmployee.position || "Unassigned"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-bold text-slate-700">
                        No employee selected.
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Select an employee to begin credit setup.
                      </p>
                    </div>
                  )}
                </div>
              </aside>
            </div>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Credit Matrix
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Leave Credit Matrix
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  One row per employee with remaining balances by leave type.
                </p>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Employee</th>

                      {leaveSettings.map((leave) => (
                        <th key={leave.id} className="px-6 py-4">
                          {leave.leave_type}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {employees.map((employee) => (
                      <tr
                        key={employee.employee_no}
                        className="transition-all duration-200 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-950">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {employee.employee_no}
                          </p>
                        </td>

                        {leaveSettings.map((leave) => {
                          const credit = getCreditRecord(
                            employee.employee_no,
                            leave.leave_type
                          );

                          const remaining = Number(
                            credit?.remaining_credits || 0
                          );

                          return (
                            <td key={leave.id} className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getRemainingBadgeClass(
                                  remaining
                                )}`}
                              >
                                {remaining}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {employees.length === 0 && (
                      <tr>
                        <td
                          colSpan={leaveSettings.length + 1}
                          className="px-6 py-14 text-center"
                        >
                          <h3 className="text-sm font-black text-slate-950">
                            No employees found.
                          </h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">
                            Employee records will appear here once loaded.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}






