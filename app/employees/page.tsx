"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  employee_no: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  employment_status: string;
};

export default function EmployeesPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");

  /// FUNCTIONS
  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("EMPLOYEES:", data);
    console.log("GET ERROR:", error);

    if (!error && data) {
      setEmployees(data);
    }
  };

  const addEmployee = async () => {
    const employeeNo = "EMP-" + Date.now();

    const { data, error } = await supabase
      .from("employees")
      .insert([
        {
  employee_no: employeeNo,
  first_name: firstName,
  last_name: lastName,
  department,
  position,
  employment_status: "Active",
  daily_rate: 0,
  hire_date: new Date().toISOString().split("T")[0],
  contact_number: "",
  created_at: new Date().toISOString(),
}
      ])
      .select();

    console.log("ADDED:", data);
    console.log("ADD ERROR:", error);

    if (!error) {
      setFirstName("");
      setLastName("");
      setDepartment("");
      setPosition("");
      getEmployees();
    }
  };

  useEffect(() => {
    getEmployees();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#050514] text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Employee Details</h1>
        <p className="mt-2 text-slate-400">
          Manage employee records and basic 201 information
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Add Employee</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className="rounded bg-slate-800 p-2 text-white outline-none"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              className="rounded bg-slate-800 p-2 text-white outline-none"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />

            <input
              className="rounded bg-slate-800 p-2 text-white outline-none"
              placeholder="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />

            <input
              className="rounded bg-slate-800 p-2 text-white outline-none"
              placeholder="Position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>

          <button
            onClick={addEmployee}
            className="mt-4 rounded bg-yellow-400 px-4 py-2 font-bold text-black"
          >
            Save Employee
          </button>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Employee List</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#08081a] text-slate-300">
                <tr>
                  <th className="p-4">Employee No</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Position</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.employee_no} className="border-t border-slate-800">
                    <td className="p-4">{emp.employee_no}</td>
                    <td className="p-4 font-bold">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="p-4">{emp.department}</td>
                    <td className="p-4">{emp.position}</td>
                    <td className="p-4 text-green-400">
                      {emp.employment_status}
                    </td>
                  </tr>
                ))}

                {employees.length === 0 && (
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={5}>
                      No employees yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}