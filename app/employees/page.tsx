"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type Employee = {
  id: string;
  employee_no: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  employment_status: string;
  employment_type: string;
  daily_rate: number;
  hire_date: string;
  contact_number: string;
};

export default function EmployeesPage() {
  /// STATES
  
  const [employees, setEmployees] = useState<Employee[]>([]);
const [departments, setDepartments] = useState<any[]>([]);
const [positions, setPositions] = useState<any[]>([]);
const [employmentStatuses, setEmploymentStatuses] = useState<any[]>([]);
const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [editingEmployeeId, setEditingEmployeeId] = useState("");
const [contactNumber, setContactNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [hireDate, setHireDate] = useState("");
  

  /// FUNCTIONS

  

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
      return;
    }

    setEmployees(data || []);
  };

  const clearForm = () => {
    setEditingEmployeeId("");
    setFirstName("");
    setLastName("");
    setDepartment("");
    setPosition("");
    setEmploymentStatus("Active");
    setEmploymentType("");
    setDailyRate("");
    setHireDate("");
  };

  const addEmployee = async () => {
    if (!firstName.trim() || !lastName.trim()) return;

    const employeeNo = "EMP-" + Date.now();

    const { error } = await supabase.from("employees").insert({
      employee_no: employeeNo,
      first_name: firstName,
      last_name: lastName,
      department,
      position,
      employment_status: employmentStatus,
      employment_type: employmentType,
      daily_rate: Number(dailyRate) || 0,
      contact_number: contactNumber,
hire_date: hireDate || "2026-05-29",
created_at: new Date().toISOString(),
    });

    if (error) {
      console.log("ADD EMPLOYEE ERROR:", error.message);
      return;
    }

    clearForm();
    getEmployees();
  };

  const updateEmployee = async () => {
    if (!editingEmployeeId) return;

    const { error } = await supabase
      .from("employees")
      .update({
        first_name: firstName,
        last_name: lastName,
        department,
        position,
        employment_status: employmentStatus,
        employment_type: employmentType,
        daily_rate: Number(dailyRate) || 0,
        hire_date: hireDate || null,
        contact_number: contactNumber,
      })
      .eq("id", editingEmployeeId);

    if (error) {
      console.log("UPDATE EMPLOYEE ERROR:", error.message);
      return;
    }

    clearForm();
    getEmployees();
  };

  const editEmployee = (employee: Employee) => {
  console.log("EDITING EMPLOYEE:", employee);

  setEditingEmployeeId(employee.id);
  setFirstName(employee.first_name || "");
  setLastName(employee.last_name || "");
  setDepartment(employee.department || "");
  setPosition(employee.position || "");
  setEmploymentStatus(employee.employment_status || "Active");
  setEmploymentType(employee.employment_type || "");
  setDailyRate(String(employee.daily_rate || ""));
  setHireDate(employee.hire_date || "");
};


  useEffect(() => {
  getEmployees();
  getDropdownData();
}, []);

const getDropdownData = async () => {
  const { data: departmentsData } = await supabase
    .from("departments")
    .select("*")
    .order("name");

  const { data: positionsData } = await supabase
    .from("positions")
    .select("*")
    .order("name");

  const { data: statusesData } = await supabase
    .from("employment_statuses")
    .select("*")
    .order("name");

  const { data: typesData } = await supabase
  .from("employment_types")
  .select("*")
  .order("name");
  

console.log("EMPLOYMENT TYPES:", typesData);

  setDepartments(departmentsData || []);
  setPositions(positionsData || []);
  setEmploymentStatuses(statusesData || []);
  setEmploymentTypes(typesData || []);
};

  /// CaLCULATIONS

const totalEmployees = employees.length;

const activeEmployees = employees.filter(
  (emp) => emp.employment_status === "Active"
).length;

const inactiveEmployees = employees.filter(
  (emp) => emp.employment_status === "Inactive"
).length;

const resignedEmployees = employees.filter(
  (emp) => emp.employment_status === "Resigned"
).length;
  

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
          <h2 className="text-xl font-bold">
            {editingEmployeeId ? "Edit Employee" : "Add Employee"}
          </h2>

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

            <select
              className="rounded bg-slate-800 p-2 text-white outline-none"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
              {dept.name}
              </option>
              ))}
            </select>

            <select
              className="rounded bg-slate-800 p-2 text-white outline-none"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">Select Position</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.name}>
                  {pos.name}
                </option>
              ))}
            </select>

            <select
                className="rounded bg-slate-800 p-2 text-white outline-none"
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
              >
                <option value="">Select Status</option>
                {employmentStatuses.map((status) => (
                  <option key={status.id} value={status.name}>
                    {status.name}
                  </option>
                ))}
              </select>

            <select
                className="rounded bg-slate-800 p-2 text-white outline-none"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
              >
                <option value="">Select Employment Type</option>
                {employmentTypes.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>

            <input
              type="number"
              className="rounded bg-slate-800 p-2 text-white outline-none"
              placeholder="Daily Rate"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
            />

            <input
              type="date"
              className="rounded bg-slate-800 p-2 text-white outline-none"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={editingEmployeeId ? updateEmployee : addEmployee}
              className="rounded bg-yellow-400 px-4 py-2 font-bold text-black"
            >
              {editingEmployeeId ? "Update Employee" : "Save Employee"}
            </button>

            {editingEmployeeId && (
              <button
                onClick={clearForm}
                className="rounded bg-slate-700 px-4 py-2 font-bold text-white"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">

<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">

  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
    <p className="text-slate-400 text-sm">Total Employees</p>
    <h3 className="text-3xl font-bold">{totalEmployees}</h3>
  </div>

  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
    <p className="text-slate-400 text-sm">Active</p>
    <h3 className="text-3xl font-bold text-green-400">
      {activeEmployees}
    </h3>
  </div>

  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
    <p className="text-slate-400 text-sm">Inactive</p>
    <h3 className="text-3xl font-bold text-yellow-400">
      {inactiveEmployees}
    </h3>
  </div>

  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
    <p className="text-slate-400 text-sm">Resigned</p>
    <h3 className="text-3xl font-bold text-red-400">
      {resignedEmployees}
    </h3>
  </div>

</div>

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
                  <th className="p-4">Type</th>
                  <th className="p-4">Daily Rate</th>
                  <th className="p-4">Hire Date</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-t border-slate-800">
                    <td className="p-4">{emp.employee_no}</td>

                    <td className="p-4 font-bold">
                      {emp.first_name} {emp.last_name}
                    </td>

                    <td className="p-4">{emp.department}</td>
                    <td className="p-4">{emp.position}</td>

                    <td className="p-4 text-green-400">
                      {emp.employment_status}
                    </td>

                    <td className="p-4">{emp.employment_type || "-"}</td>

                    <td className="p-4">
                      ₱{Number(emp.daily_rate || 0).toLocaleString()}
                    </td>

                    <td className="p-4">{emp.hire_date || "-"}</td>

                    <td className="p-4">
                      <button
                        onClick={() => editEmployee(emp)}
                        className="rounded bg-slate-700 px-3 py-1 text-xs font-bold hover:bg-slate-600"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {employees.length === 0 && (
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={9}>
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