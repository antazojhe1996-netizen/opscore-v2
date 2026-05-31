"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../lib/supabase";

export default function LeaveManagementPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveSettings, setLeaveSettings] = useState<any[]>([]);

  const [statusFilter, setStatusFilter] = useState("All");
  const [employeeNo, setEmployeeNo] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  /// CALCULATIONS
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");

    if (end < start) return 0;

    return (
      Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );
  };

  const filteredLeaveRequests =
    statusFilter === "All"
      ? leaveRequests
      : leaveRequests.filter((leave) => leave.status === statusFilter);

  /// FUNCTIONS
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

  const getLeaveRequests = async () => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET LEAVE REQUESTS ERROR:", error);
      return;
    }

    setLeaveRequests(data || []);
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

    if (data && data.length > 0 && !leaveType) {
      setLeaveType(data[0].leave_type);
    }
  };

  const submitLeave = async () => {
    const days = calculateDays();

    if (!employeeNo || !leaveType || !startDate || !endDate || !reason.trim()) {
      alert("Please complete all fields.");
      return;
    }

    if (days < 1) {
      alert("End date must be same or after start date.");
      return;
    }

    const { error } = await supabase.from("leave_requests").insert([
      {
        employee_id: employeeNo,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days,
        reason,
        status: "Pending",
      },
    ]);

    if (error) {
      console.log("SUBMIT LEAVE ERROR:", error);
      alert("Failed to submit leave request.");
      return;
    }

    setEmployeeNo("");
    setStartDate("");
    setEndDate("");
    setReason("");

    getLeaveRequests();
  };

  const updateStatus = async (id: number, status: string) => {
    const leaveRequest = leaveRequests.find((leave) => leave.id === id);

    if (!leaveRequest) {
      alert("Leave request not found.");
      return;
    }

    if (status === "Approved") {
      const leavePolicy = leaveSettings.find(
        (setting) => setting.leave_type === leaveRequest.leave_type
      );

      const shouldDeductCredits = leavePolicy?.requires_credits === true;

      if (shouldDeductCredits) {
        const { data: creditData, error: creditError } = await supabase
          .from("employee_leave_credits")
          .select("*")
          .eq("employee_no", leaveRequest.employee_id)
          .eq("leave_type", leaveRequest.leave_type)
          .single();

        if (creditError || !creditData) {
          alert("No leave credits found for this employee and leave type.");
          return;
        }

        const leaveDays = Number(leaveRequest.days || 0);
        const remainingCredits = Number(creditData.remaining_credits || 0);
        const usedCredits = Number(creditData.used_credits || 0);

        if (remainingCredits < leaveDays) {
          alert(
            `Insufficient leave credits.\n\nRemaining: ${remainingCredits}\nRequested: ${leaveDays}`
          );
          return;
        }

        const { error: deductError } = await supabase
          .from("employee_leave_credits")
          .update({
            used_credits: usedCredits + leaveDays,
            remaining_credits: remainingCredits - leaveDays,
          })
          .eq("id", creditData.id);

        if (deductError) {
          console.log("DEDUCT CREDIT ERROR:", deductError);
          alert("Failed to deduct leave credits.");
          return;
        }
      }
    }

    const { error } = await supabase
      .from("leave_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.log("UPDATE STATUS ERROR:", error);
      alert("Failed to update leave status.");
      return;
    }

    getLeaveRequests();
  };

  const deleteLeave = async (id: number) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this leave request?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE LEAVE ERROR:", error);
      return;
    }

    getLeaveRequests();
  };

  const getEmployeeName = (employeeNo: any) => {
    const employee = employees.find(
      (emp) => String(emp.employee_no) === String(employeeNo)
    );

    if (!employee) return "Unknown Employee";

    return `${employee.first_name} ${employee.last_name}`;
  };

  const statusStyle = (status: string) => {
    if (status === "Approved") {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    }

    if (status === "Rejected") {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  useEffect(() => {
    getEmployees();
    getLeaveRequests();
    getLeaveSettings();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-sm text-slate-400">
            Submit, approve, and monitor employee leave requests.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-6 text-2xl font-bold">Submit Leave Request</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Employee
                </label>

                <select
                  value={employeeNo}
                  onChange={(e) => setEmployeeNo(e.target.value)}
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

              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Leave Type
                </label>

                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                >
                  {leaveSettings.length === 0 && (
                    <option value="">No enabled leave types</option>
                  )}

                  {leaveSettings.map((leave) => (
                    <option
                      key={leave.id}
                      value={leave.leave_type}
                      className="bg-slate-950 text-white"
                    >
                      {leave.leave_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-400">
                    End Date
                  </label>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Reason
                </label>

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Enter reason..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                Total Days:{" "}
                <span className="font-semibold text-white">
                  {calculateDays()}
                </span>
              </div>

              <button
                onClick={submitLeave}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
              >
                Submit Leave
              </button>
            </div>
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Leave Requests</h2>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none"
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="py-3 pr-4">Employee</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Date Range</th>
                    <th className="py-3 pr-4">Days</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLeaveRequests.map((leave) => (
                    <tr
                      key={leave.id}
                      className="border-b border-slate-800/70 text-slate-200"
                    >
                      <td className="py-3 pr-4">
                        {getEmployeeName(leave.employee_id)}
                      </td>

                      <td className="py-3 pr-4">{leave.leave_type}</td>

                      <td className="py-3 pr-4">
                        {leave.start_date} to {leave.end_date}
                      </td>

                      <td className="py-3 pr-4">{leave.days}</td>

                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                            leave.status
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          {leave.status === "Pending" && (
                            <>
                              <button
                                onClick={() =>
                                  updateStatus(leave.id, "Approved")
                                }
                                className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold hover:bg-green-500"
                              >
                                Approve
                              </button>

                              <button
                                onClick={() =>
                                  updateStatus(leave.id, "Rejected")
                                }
                                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-500"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {leave.status !== "Pending" && (
                            <button
                              onClick={() => deleteLeave(leave.id)}
                              className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-semibold hover:bg-slate-500"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredLeaveRequests.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-500"
                      >
                        No leave requests found.
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
  );
}