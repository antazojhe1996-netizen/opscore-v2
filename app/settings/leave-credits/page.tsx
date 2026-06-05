"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";

export default function LeaveCreditsPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveSettings, setLeaveSettings] = useState<any[]>([]);
  const [leaveCredits, setLeaveCredits] = useState<any[]>([]);

  const [selectedEmployeeNo, setSelectedEmployeeNo] = useState("");
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});

  /// CALCULATIONS
  const selectedEmployee = employees.find(
    (employee) => String(employee.employee_no) === String(selectedEmployeeNo)
  );

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

    setEmployees(data || []);
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

    setLeaveSettings(data || []);
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

    setLeaveCredits(data || []);
  };

  const getEmployeeName = (employeeNo: any) => {
    const employee = employees.find(
      (emp) => String(emp.employee_no) === String(employeeNo)
    );

    if (!employee) return "Unknown Employee";

    return `${employee.first_name} ${employee.last_name}`;
  };

  const getCreditRecord = (employeeNo: any, leaveType: string) => {
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

    alert("Leave credits saved.");
    getLeaveCredits();
  };

  const deleteLeaveCredit = async (credit: any) => {
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

    getLeaveCredits();

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
    getLeaveCredits();
  };

  useEffect(() => {
    getEmployees();
    getLeaveSettings();
    getLeaveCredits();
  }, []);

  /// UI

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Leave Credits Management</h1>
          <p className="text-sm text-slate-400">
            Create, update, and delete leave credits per employee.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-6 text-xl font-bold">Select Employee</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Employee
                </label>

                <select
                  value={selectedEmployeeNo}
                  onChange={(e) => loadEmployeeCredits(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">Select employee</option>

                  {employees.map((employee) => (
                    <option
                      key={employee.employee_no}
                      value={employee.employee_no}
                      className="bg-slate-950 text-white"
                    >
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Selected Employee</p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedEmployee.employee_no}
                  </p>
                </div>
              )}

              {selectedEmployeeNo && (
                <button
                  onClick={deleteAllCreditsForSelectedEmployee}
                  className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20"
                >
                  Delete All Credits for Employee
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Credit Setup</h2>
              <p className="text-sm text-slate-400">
                Save creates new records if missing, or updates existing leave credit records.
              </p>
            </div>

            {!selectedEmployeeNo ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
                Select an employee to manage leave credits.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-slate-400">
                        <th className="py-3 pr-4">Leave Type</th>
                        <th className="py-3 pr-4">Credits</th>
                        <th className="py-3 pr-4">Used</th>
                        <th className="py-3 pr-4">Remaining</th>
                        <th className="py-3 pr-4 text-right">CRUD</th>
                      </tr>
                    </thead>

                    <tbody>
                      {leaveSettings.map((leave) => {
                        const existingCredit = getCreditRecord(
                          selectedEmployeeNo,
                          leave.leave_type
                        );

                        return (
                          <tr
                            key={leave.id}
                            className="border-b border-slate-800/70 text-slate-200"
                          >
                            <td className="py-3 pr-4 font-medium">
                              {leave.leave_type}
                            </td>

                            <td className="py-3 pr-4">
                              <input
                                type="number"
                                min="0"
                                value={creditInputs[leave.leave_type] || "0"}
                                onChange={(e) =>
                                  updateCreditInput(
                                    leave.leave_type,
                                    e.target.value
                                  )
                                }
                                className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
                              />
                            </td>

                            <td className="py-3 pr-4">
                              {existingCredit?.used_credits || 0}
                            </td>

                            <td className="py-3 pr-4">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                  Number(
                                    existingCredit?.remaining_credits || 0
                                  ) > 0
                                    ? "border-green-500/30 bg-green-500/20 text-green-400"
                                    : "border-slate-600 bg-slate-700 text-slate-300"
                                }`}
                              >
                                {existingCredit?.remaining_credits || 0}
                              </span>
                            </td>

                            <td className="py-3 pr-4 text-right">
                              {existingCredit ? (
                                <button
                                  onClick={() => deleteLeaveCredit(existingCredit)}
                                  className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                                >
                                  Delete
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500">
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
                            className="py-8 text-center text-slate-500"
                          >
                            No enabled leave types found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={saveAllCredits}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
                >
                  Save All Credits
                </button>
              </>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Leave Credit Matrix</h2>
            <p className="text-sm text-slate-400">
              One row per employee with all leave credits shown by type.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="py-3 pr-4">Employee</th>

                  {leaveSettings.map((leave) => (
                    <th key={leave.id} className="py-3 pr-4">
                      {leave.leave_type}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr
                    key={employee.employee_no}
                    className="border-b border-slate-800/70 text-slate-200"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {employee.first_name} {employee.last_name}
                    </td>

                    {leaveSettings.map((leave) => {
                      const credit = getCreditRecord(
                        employee.employee_no,
                        leave.leave_type
                      );

                      const remaining = Number(credit?.remaining_credits || 0);

                      return (
                        <td key={leave.id} className="py-3 pr-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              remaining >= 3
                                ? "border-green-500/30 bg-green-500/20 text-green-400"
                                : remaining >= 1
                                ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                                : "border-red-500/30 bg-red-500/20 text-red-400"
                            }`}
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
                      className="py-8 text-center text-slate-500"
                    >
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
