"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import * as XLSX from "xlsx";

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
  rate_type: string;
  basic_rate: number;
  payroll_active: boolean;
  payroll_notes: string;
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

  const [editingEmployeeNo, setEditingEmployeeNo] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("Active");
  const [employmentType, setEmploymentType] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [hireDate, setHireDate] = useState("");

  const [rateType, setRateType] = useState("Daily");
  const [basicRate, setBasicRate] = useState("");
  const [payrollActive, setPayrollActive] = useState("Yes");
  const [payrollNotes, setPayrollNotes] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  /// DATA
  const rateTypes = ["Daily", "Weekly", "Monthly"];

  /// FUNCTIONS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getValue = (row: any, keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
        return row[key];
      }
    }

    return "";
  };

  const cleanMoney = (value: any) => {
    return Number(String(value || "").replace("₱", "").replace(/,/g, "").trim()) || 0;
  };

  const cleanDate = (value: any) => {
    if (!value) return null;

    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return null;

      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;

    return parsed.toISOString().split("T")[0];
  };

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

  const getDropdownData = async () => {
    const { data: departmentsData } = await supabase.from("departments").select("*").order("name");
    const { data: positionsData } = await supabase.from("positions").select("*").order("name");
    const { data: statusesData } = await supabase.from("employment_statuses").select("*").order("name");
    const { data: typesData } = await supabase.from("employment_types").select("*").order("name");

    setDepartments(departmentsData || []);
    setPositions(positionsData || []);
    setEmploymentStatuses(statusesData || []);
    setEmploymentTypes(typesData || []);
  };

  const clearForm = () => {
    setEditingEmployeeNo("");
    setEmployeeNo("");
    setFirstName("");
    setLastName("");
    setDepartment("");
    setPosition("");
    setEmploymentStatus("Active");
    setEmploymentType("");
    setContactNumber("");
    setHireDate("");
    setRateType("Daily");
    setBasicRate("");
    setPayrollActive("Yes");
    setPayrollNotes("");
    setFormError("");
  };

  const validateForm = () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !department ||
      !position ||
      !employmentStatus ||
      !employmentType ||
      !rateType ||
      !basicRate
    ) {
      setFormError("Please complete all required fields.");
      return false;
    }

    setFormError("");
    return true;
  };

  const saveEmployee = async () => {
    if (isSaving) return;
    if (!validateForm()) return;

    setIsSaving(true);

    const payload = {
      employee_no: employeeNo.trim() || `EMP-${Date.now()}`,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      department,
      position,
      employment_status: employmentStatus,
      employment_type: employmentType,
      contact_number: contactNumber.trim(),
      hire_date: hireDate || null,
      daily_rate: Number(basicRate || 0),
      rate_type: rateType,
      basic_rate: Number(basicRate || 0),
      payroll_active: payrollActive === "Yes",
      payroll_notes: payrollNotes.trim(),
    };

    const query = editingEmployeeNo
      ? supabase.from("employees").update(payload).eq("employee_no", editingEmployeeNo)
      : supabase.from("employees").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

    const { error } = await query;

    setIsSaving(false);

    if (error) {
      console.log("SAVE EMPLOYEE ERROR:", error.message);
      alert("Failed to save employee.");
      return;
    }

    clearForm();
    getEmployees();
  };

  const editEmployee = (employee: Employee) => {
    setEditingEmployeeNo(employee.employee_no);
    setEmployeeNo(employee.employee_no || "");
    setFirstName(employee.first_name || "");
    setLastName(employee.last_name || "");
    setDepartment(employee.department || "");
    setPosition(employee.position || "");
    setEmploymentStatus(employee.employment_status || "Active");
    setEmploymentType(employee.employment_type || "");
    setContactNumber(employee.contact_number || "");
    setHireDate(employee.hire_date || "");
    setRateType(employee.rate_type || "Daily");
    setBasicRate(String(employee.basic_rate || employee.daily_rate || ""));
    setPayrollActive(employee.payroll_active === false ? "No" : "Yes");
    setPayrollNotes(employee.payroll_notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEmployee = async (employeeNoValue: string) => {
    const confirmDelete = confirm("Are you sure you want to permanently delete this employee?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("employees").delete().eq("employee_no", employeeNoValue);

    if (error) {
      console.log("DELETE EMPLOYEE ERROR:", error.message);
      alert("Failed to delete employee.");
      return;
    }

    getEmployees();
  };

  const handleImportFile = async (file: File) => {
    setFileName(file.name);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    const cleanedRows = rawRows
      .map((row: any, index: number) => {
        const first = String(getValue(row, ["First Name", "first_name", "FirstName"])).trim();
        const last = String(getValue(row, ["Last Name", "last_name", "LastName"])).trim();

        const fullName = String(getValue(row, ["Name", "Employee Name", "Full Name"])).trim();

        let firstNameValue = first;
        let lastNameValue = last;

        if (!firstNameValue && !lastNameValue && fullName) {
          const parts = fullName.split(" ");
          firstNameValue = parts.slice(0, -1).join(" ") || fullName;
          lastNameValue = parts.slice(-1).join(" ");
        }

        const employeeNoValue =
          String(getValue(row, ["Employee No", "Employee Number", "Employee ID", "ID"])).trim() ||
          `EMP-${Date.now()}-${index}`;

        const rateTypeValue =
          String(getValue(row, ["Rate Type", "rate_type"])).trim() || "Daily";

        const basicRateValue = cleanMoney(
          getValue(row, ["Basic Rate", "basic_rate", "Daily Rate", "daily_rate", "Rate"])
        );

        return {
          employee_no: employeeNoValue,
          first_name: firstNameValue,
          last_name: lastNameValue,
          department: String(getValue(row, ["Department", "department"])).trim(),
          position: String(getValue(row, ["Position", "position"])).trim(),
          employment_status:
            String(getValue(row, ["Status", "Employment Status", "employment_status"])).trim() ||
            "Active",
          employment_type:
            String(getValue(row, ["Employment Type", "employment_type"])).trim() || "Regular",
          contact_number: String(getValue(row, ["Contact", "Contact Number", "contact_number"])).trim(),
          hire_date:
  cleanDate(getValue(row, ["Hire Date", "Date Hired", "hire_date"])) ||
  "2026-06-02",
          daily_rate: basicRateValue,
          rate_type: rateTypes.includes(rateTypeValue) ? rateTypeValue : "Daily",
          basic_rate: basicRateValue,
          payroll_active:
            String(getValue(row, ["Payroll Active", "payroll_active"])).toLowerCase() === "no"
              ? false
              : true,
          payroll_notes: String(getValue(row, ["Payroll Notes", "Notes", "payroll_notes"])).trim(),
          created_at: new Date().toISOString(),
        };
      })
      .filter((row) => row.first_name && row.last_name);

    setPreviewRows(cleanedRows);
  };

  const importEmployees = async () => {
    if (previewRows.length === 0) {
      alert("No rows to import.");
      return;
    }

    setIsImporting(true);

    const { error } = await supabase
  .from("employees")
  .insert(previewRows);


    if (error) {
      console.log("IMPORT EMPLOYEES ERROR:", error.message);
      alert("Import failed. Check console.");
      return;
    }

    alert("Employees imported successfully.");
    setPreviewRows([]);
    setFileName("");
    getEmployees();
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getDropdownData();
  }, []);

  /// CALCULATIONS
  const totalEmployees = employees.length;

  const activeEmployees = employees.filter((emp) => emp.employment_status === "Active").length;

  const payrollActiveCount = employees.filter((emp) => emp.payroll_active !== false).length;

  const totalMonthlyPayrollEstimate = employees.reduce((sum, emp) => {
    const rate = Number(emp.basic_rate || emp.daily_rate || 0);

    if ((emp.rate_type || "Daily") === "Daily") return sum + rate * 26;
    if ((emp.rate_type || "Daily") === "Weekly") return sum + rate * 4;
    if ((emp.rate_type || "Daily") === "Monthly") return sum + rate;

    return sum;
  }, 0);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const search = `${emp.employee_no} ${emp.first_name} ${emp.last_name} ${emp.department} ${emp.position} ${emp.employment_status} ${emp.rate_type}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesDepartment = departmentFilter === "ALL" || emp.department === departmentFilter;
      const matchesStatus = statusFilter === "ALL" || emp.employment_status === statusFilter;

      return search && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Workforce
          </p>
          <h1 className="mt-2 text-4xl font-black">Employee Masterlist</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage employee records, payroll profile, rates, and import bulk employee data.
          </p>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Employees" value={totalEmployees} />
          <SummaryCard title="Active Employees" value={activeEmployees} color="text-emerald-400" />
          <SummaryCard title="Payroll Active" value={payrollActiveCount} color="text-blue-400" />
          <SummaryCard
            title="Est. Monthly Payroll"
            value={formatMoney(totalMonthlyPayrollEstimate)}
            color="text-amber-400"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">
              {editingEmployeeNo ? "Edit Employee" : "Add Employee"}
            </h2>

            {formError && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
                {formError}
              </p>
            )}

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Employee No" value={employeeNo} setValue={setEmployeeNo} placeholder="Auto if blank" />
                <Input label="Contact Number" value={contactNumber} setValue={setContactNumber} />
                <Input label="First Name *" value={firstName} setValue={setFirstName} />
                <Input label="Last Name *" value={lastName} setValue={setLastName} />
              </div>

              <Select label="Department *" value={department} setValue={setDepartment} options={departments.map((d) => d.name)} />
              <Select label="Position *" value={position} setValue={setPosition} options={positions.map((p) => p.name)} />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select label="Status *" value={employmentStatus} setValue={setEmploymentStatus} options={employmentStatuses.map((s) => s.name)} />
                <Select label="Employment Type *" value={employmentType} setValue={setEmploymentType} options={employmentTypes.map((t) => t.name)} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select label="Rate Type *" value={rateType} setValue={setRateType} options={rateTypes} />
                <Input label="Basic Rate *" type="number" value={basicRate} setValue={setBasicRate} />
                <Input label="Hire Date" type="date" value={hireDate} setValue={setHireDate} />
                <Select label="Payroll Active" value={payrollActive} setValue={setPayrollActive} options={["Yes", "No"]} />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300">Payroll Notes</label>
                <textarea
                  value={payrollNotes}
                  onChange={(e) => setPayrollNotes(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />
              </div>

              <button
                onClick={saveEmployee}
                disabled={isSaving}
                className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : editingEmployeeNo ? "Update Employee" : "Save Employee"}
              </button>

              {editingEmployeeNo && (
                <button
                  onClick={clearForm}
                  className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-2xl font-black">Import Employees</h2>
              <p className="mt-2 text-sm text-slate-400">
                Upload Excel/CSV. Supported headers: Employee No, First Name, Last Name, Department,
                Position, Status, Employment Type, Rate Type, Basic Rate, Contact, Hire Date.
              </p>

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                  }}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
                />

                <button
                  onClick={importEmployees}
                  disabled={isImporting || previewRows.length === 0}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isImporting ? "Importing..." : "Import"}
                </button>
              </div>

              {fileName && (
                <p className="mt-3 text-sm text-slate-400">
                  Selected file: <span className="font-bold text-white">{fileName}</span>
                </p>
              )}

              {previewRows.length > 0 && (
                <div className="mt-5 max-h-[260px] overflow-auto rounded-xl border border-slate-800">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Employee No</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Position</th>
                        <th className="px-4 py-3">Rate Type</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 50).map((row, index) => (
                        <tr key={`${row.employee_no}-${index}`} className="border-t border-slate-800">
                          <td className="px-4 py-3">{row.employee_no}</td>
                          <td className="px-4 py-3 font-bold">{row.first_name} {row.last_name}</td>
                          <td className="px-4 py-3">{row.department}</td>
                          <td className="px-4 py-3">{row.position}</td>
                          <td className="px-4 py-3">{row.rate_type}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(row.basic_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Employee List</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Payroll-ready employee master data.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                  />

                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                  >
                    <option value="ALL">All Status</option>
                    {employmentStatuses.map((status) => (
                      <option key={status.id} value={status.name}>{status.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 max-h-[620px] overflow-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[1300px] text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Rate Type</th>
                      <th className="px-4 py-3 text-right">Basic Rate</th>
                      <th className="px-4 py-3">Payroll</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <p className="font-black">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-slate-500">{emp.employee_no}</p>
                        </td>
                        <td className="px-4 py-3">{emp.department}</td>
                        <td className="px-4 py-3">{emp.position}</td>
                        <td className="px-4 py-3">{emp.employment_status}</td>
                        <td className="px-4 py-3">{emp.employment_type}</td>
                        <td className="px-4 py-3 text-amber-400">{emp.rate_type || "Daily"}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatMoney(emp.basic_rate || emp.daily_rate)}</td>
                        <td className="px-4 py-3">
                          {emp.payroll_active === false ? (
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">Inactive</span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editEmployee(emp)}
                              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold hover:bg-blue-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteEmployee(emp.employee_no)}
                              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                          No employees found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 text-2xl font-black ${color}`}>{value}</h2>
    </div>
  );
}

function Input({ label, value, setValue, type = "text", placeholder = "" }: any) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        style={type === "date" ? { colorScheme: "dark" } : undefined}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

function Select({ label, value, setValue, options }: any) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
      >
        <option value="">Select</option>
        {options.map((option: string) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}