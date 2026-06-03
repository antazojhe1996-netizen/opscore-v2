"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  FileSpreadsheet,
  Mail,
  Pencil,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import * as XLSX from "xlsx";

type Employee = {
  id: string;
  employee_no: string;
  first_name: string;
  last_name: string;
  email: string;
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
  const [email, setEmail] = useState("");
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
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getValue = (row: any, keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
        return row[key];
      }
    }

    return "";
  };

  const cleanMoney = (value: any) =>
    Number(String(value || "").replace("₱", "").replace(/,/g, "").trim()) || 0;

  const cleanDate = (value: any) => {
    if (!value) return null;

    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return null;

      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
        date.d
      ).padStart(2, "0")}`;
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
    setEmail("");
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

    if (email.trim() && !email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return false;
    }

    if (Number(basicRate || 0) <= 0) {
      setFormError("Basic rate must be greater than zero.");
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
      email: email.trim(),
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
      ? supabase
          .from("employees")
          .update(payload)
          .eq("employee_no", editingEmployeeNo)
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
    setEmail(employee.email || "");
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

  const archiveEmployee = async (employee: Employee) => {
    const confirmArchive = confirm(
      `Archive ${employee.first_name} ${employee.last_name}? This will keep history but remove the employee from active operations.`
    );

    if (!confirmArchive) return;

    const { error } = await supabase
      .from("employees")
      .update({
        employment_status: "Resigned",
        payroll_active: false,
      })
      .eq("employee_no", employee.employee_no);

    if (error) {
      console.log("ARCHIVE EMPLOYEE ERROR:", error.message);
      alert("Failed to archive employee.");
      return;
    }

    getEmployees();
  };

  const restoreEmployee = async (employee: Employee) => {
    const confirmRestore = confirm(
      `Restore ${employee.first_name} ${employee.last_name} as Active?`
    );

    if (!confirmRestore) return;

    const { error } = await supabase
      .from("employees")
      .update({
        employment_status: "Active",
        payroll_active: true,
      })
      .eq("employee_no", employee.employee_no);

    if (error) {
      console.log("RESTORE EMPLOYEE ERROR:", error.message);
      alert("Failed to restore employee.");
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
        const first = String(
          getValue(row, ["First Name", "first_name", "FirstName"])
        ).trim();

        const last = String(
          getValue(row, ["Last Name", "last_name", "LastName"])
        ).trim();

        const fullName = String(
          getValue(row, ["Name", "Employee Name", "Full Name"])
        ).trim();

        let firstNameValue = first;
        let lastNameValue = last;

        if (!firstNameValue && !lastNameValue && fullName) {
          const parts = fullName.split(" ");
          firstNameValue = parts.slice(0, -1).join(" ") || fullName;
          lastNameValue = parts.slice(-1).join(" ");
        }

        const employeeNoValue =
          String(
            getValue(row, ["Employee No", "Employee Number", "Employee ID", "ID"])
          ).trim() || `EMP-${Date.now()}-${index}`;

        const rateTypeValue =
          String(getValue(row, ["Rate Type", "rate_type"])).trim() || "Daily";

        const basicRateValue = cleanMoney(
          getValue(row, [
            "Basic Rate",
            "basic_rate",
            "Daily Rate",
            "daily_rate",
            "Rate",
          ])
        );

        return {
          employee_no: employeeNoValue,
          first_name: firstNameValue,
          last_name: lastNameValue,
          email: String(
            getValue(row, ["Email", "email", "Email Address"])
          ).trim(),
          department: String(getValue(row, ["Department", "department"])).trim(),
          position: String(getValue(row, ["Position", "position"])).trim(),
          employment_status:
            String(
              getValue(row, ["Status", "Employment Status", "employment_status"])
            ).trim() || "Active",
          employment_type:
            String(getValue(row, ["Employment Type", "employment_type"])).trim() ||
            "Regular",
          contact_number: String(
            getValue(row, ["Contact", "Contact Number", "contact_number"])
          ).trim(),
          hire_date:
            cleanDate(getValue(row, ["Hire Date", "Date Hired", "hire_date"])) ||
            null,
          daily_rate: basicRateValue,
          rate_type: rateTypes.includes(rateTypeValue) ? rateTypeValue : "Daily",
          basic_rate: basicRateValue,
          payroll_active:
            String(
              getValue(row, ["Payroll Active", "payroll_active"])
            ).toLowerCase() === "no"
              ? false
              : true,
          payroll_notes: String(
            getValue(row, ["Payroll Notes", "Notes", "payroll_notes"])
          ).trim(),
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

    const { error } = await supabase.from("employees").insert(previewRows);

    setIsImporting(false);

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

  const exportEmployees = () => {
    const exportRows = filteredEmployees.map((emp) => ({
      "Employee No": emp.employee_no,
      "First Name": emp.first_name,
      "Last Name": emp.last_name,
      Email: emp.email,
      Department: emp.department,
      Position: emp.position,
      Status: emp.employment_status,
      "Employment Type": emp.employment_type,
      "Rate Type": emp.rate_type,
      "Basic Rate": emp.basic_rate || emp.daily_rate || 0,
      "Payroll Active": emp.payroll_active === false ? "No" : "Yes",
      "Contact Number": emp.contact_number,
      "Hire Date": emp.hire_date,
      Notes: emp.payroll_notes,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "opscore_employees_export.xlsx");
  };

  /// EFFECTS
  useEffect(() => {
    getEmployees();
    getDropdownData();
  }, []);

  /// CALCULATIONS
  const inactiveStatuses = ["resigned", "terminated", "inactive", "awol"];

  const activeEmployeeRows = employees.filter(
    (emp) =>
      !inactiveStatuses.includes(
        String(emp.employment_status || "").toLowerCase()
      )
  );

  const archivedEmployeeRows = employees.filter((emp) =>
    inactiveStatuses.includes(String(emp.employment_status || "").toLowerCase())
  );

  const totalEmployees = employees.length;
  const activeEmployees = activeEmployeeRows.length;
  const archivedEmployees = archivedEmployeeRows.length;

  const payrollActiveCount = activeEmployeeRows.filter(
    (emp) => emp.payroll_active !== false
  ).length;

  const missingEmailCount = activeEmployeeRows.filter((emp) => !emp.email).length;

  const totalMonthlyPayrollEstimate = activeEmployeeRows.reduce((sum, emp) => {
    const rate = Number(emp.basic_rate || emp.daily_rate || 0);

    if ((emp.rate_type || "Daily") === "Daily") return sum + rate * 26;
    if ((emp.rate_type || "Daily") === "Weekly") return sum + rate * 4;
    if ((emp.rate_type || "Daily") === "Monthly") return sum + rate;

    return sum;
  }, 0);

  const departmentCounts = activeEmployeeRows.reduce(
    (acc: Record<string, number>, emp) => {
      const dept = emp.department || "Unassigned";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    },
    {}
  );

  const topDepartments = Object.entries(departmentCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const employeesWithIssues = activeEmployeeRows.filter(
    (emp) =>
      !emp.email ||
      !emp.department ||
      !emp.position ||
      !emp.employment_type ||
      !emp.basic_rate
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const search = `${emp.employee_no} ${emp.first_name} ${emp.last_name} ${emp.email} ${emp.department} ${emp.position} ${emp.employment_status} ${emp.rate_type}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesDepartment =
        departmentFilter === "ALL" || emp.department === departmentFilter;

      const matchesStatus =
        statusFilter === "ALL" || emp.employment_status === statusFilter;

      return search && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employee Masterlist</h1>
            <p className="mt-2 text-slate-400">
              Manage employee records, payroll profile, department assignment,
              and import/export controls.
            </p>
          </div>

          <button
            onClick={exportEmployees}
            className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-yellow-300"
          >
            Export Employees
          </button>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={<Users size={22} />} title="Total Employees" value={totalEmployees} />
          <KpiCard icon={<BadgeCheck size={22} />} title="Active Employees" value={activeEmployees} success />
          <KpiCard icon={<Briefcase size={22} />} title="Payroll Active" value={payrollActiveCount} />
          <KpiCard icon={<Mail size={22} />} title="Missing Email" value={missingEmailCount} danger={missingEmailCount > 0} />
          <KpiCard icon={<DollarSignIcon />} title="Est. Monthly Payroll" value={formatMoney(totalMonthlyPayrollEstimate)} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-3">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <UserPlus size={22} /> {editingEmployeeNo ? "Edit Employee" : "Add Employee"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Required fields are marked with an asterisk.
                </p>
              </div>

              {editingEmployeeNo && (
                <span className="rounded-full border border-blue-500/40 px-3 py-1 text-xs font-black text-blue-400">
                  Editing {editingEmployeeNo}
                </span>
              )}
            </div>

            {formError && (
              <p className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <FormPanel title="Personal Details">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Employee No" value={employeeNo} setValue={setEmployeeNo} placeholder="Auto if blank" />
                  <Input label="Email" type="email" value={email} setValue={setEmail} placeholder="employee@email.com" />
                  <Input label="First Name *" value={firstName} setValue={setFirstName} />
                  <Input label="Last Name *" value={lastName} setValue={setLastName} />
                  <Input label="Contact Number" value={contactNumber} setValue={setContactNumber} />
                  <Input label="Hire Date" type="date" value={hireDate} setValue={setHireDate} />
                </div>
              </FormPanel>

              <FormPanel title="Work Assignment">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select label="Department *" value={department} setValue={setDepartment} options={departments.map((d) => d.name)} />
                  <Select label="Position *" value={position} setValue={setPosition} options={positions.map((p) => p.name)} />
                  <Select label="Status *" value={employmentStatus} setValue={setEmploymentStatus} options={employmentStatuses.map((s) => s.name)} />
                  <Select label="Employment Type *" value={employmentType} setValue={setEmploymentType} options={employmentTypes.map((t) => t.name)} />
                </div>
              </FormPanel>

              <FormPanel title="Payroll Profile">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Select label="Rate Type *" value={rateType} setValue={setRateType} options={rateTypes} />
                  <Input label="Basic Rate *" type="number" value={basicRate} setValue={setBasicRate} />
                  <Select label="Payroll Active" value={payrollActive} setValue={setPayrollActive} options={["Yes", "No"]} />
                </div>

                <div className="mt-4">
                  <label className="text-sm font-semibold text-slate-300">
                    Payroll Notes
                  </label>
                  <textarea
                    value={payrollNotes}
                    onChange={(e) => setPayrollNotes(e.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </FormPanel>

              <FormPanel title="Employee Health Check">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <MiniStat title="Archived Employees" value={archivedEmployees} />
                  <MiniStat title="Records With Issues" value={employeesWithIssues.length} danger={employeesWithIssues.length > 0} />
                </div>

                <div className="mt-4 space-y-2">
                  {topDepartments.length > 0 ? (
                    topDepartments.map((dept) => (
                      <div
                        key={dept.name}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                      >
                        <p className="text-sm font-semibold">{dept.name}</p>
                        <p className="font-bold text-yellow-400">{dept.count}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No department data found.</p>
                  )}
                </div>
              </FormPanel>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={saveEmployee}
                disabled={isSaving}
                className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : editingEmployeeNo
                  ? "Update Employee"
                  : "Save Employee"}
              </button>

              <button
                onClick={clearForm}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
              >
                {editingEmployeeNo ? "Cancel Edit" : "Clear Form"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <FileSpreadsheet size={22} /> Import Employees
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Import Excel/CSV employee records. Preview first before saving.
            </p>

            <div className="mt-5 space-y-3">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />

              <button
                onClick={importEmployees}
                disabled={isImporting || previewRows.length === 0}
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black hover:bg-emerald-500 disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import Preview Rows"}
              </button>

              {fileName && (
                <p className="text-sm text-slate-400">
                  Selected: <span className="font-bold text-white">{fileName}</span>
                </p>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-slate-300">
                Supported headers
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Employee No, First Name, Last Name, Email, Department, Position,
                Status, Employment Type, Rate Type, Basic Rate, Contact, Hire Date.
              </p>
            </div>

            {previewRows.length > 0 && (
              <div className="mt-5 max-h-[360px] overflow-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Employee No</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                    </tr>
                  </thead>

                  <tbody>
                    {previewRows.slice(0, 50).map((row, index) => (
                      <tr
                        key={`${row.employee_no}-${index}`}
                        className="border-t border-slate-800"
                      >
                        <td className="px-4 py-3">{row.employee_no}</td>
                        <td className="px-4 py-3 font-bold">
                          {row.first_name} {row.last_name}
                        </td>
                        <td className="px-4 py-3">{row.department}</td>
                        <td className="px-4 py-3">{row.position}</td>
                        <td className="px-4 py-3 text-right">
                          {formatMoney(row.basic_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold">Employee List</h2>
              <p className="mt-1 text-sm text-slate-400">
                Search, filter, edit, export, or archive employee records.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-slate-500"
                />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Status</option>
                {employmentStatuses.map((status) => (
                  <option key={status.id} value={status.name}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[680px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1500px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Email</th>
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
                {filteredEmployees.map((emp) => {
                  const isArchived = inactiveStatuses.includes(
                    String(emp.employment_status || "").toLowerCase()
                  );

                  return (
                    <tr
                      key={emp.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-black">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {emp.employee_no}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {emp.email ? (
                          <span className="text-slate-300">{emp.email}</span>
                        ) : (
                          <span className="text-red-400">No email</span>
                        )}
                      </td>

                      <td className="px-4 py-3">{emp.department}</td>
                      <td className="px-4 py-3">{emp.position}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={emp.employment_status} />
                      </td>
                      <td className="px-4 py-3">{emp.employment_type}</td>
                      <td className="px-4 py-3 text-yellow-400">
                        {emp.rate_type || "Daily"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatMoney(emp.basic_rate || emp.daily_rate)}
                      </td>

                      <td className="px-4 py-3">
                        {emp.payroll_active === false ? (
                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                            Inactive
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => editEmployee(emp)}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold hover:bg-blue-500"
                          >
                            <Pencil size={12} /> Edit
                          </button>

                          {isArchived ? (
                            <button
                              onClick={() => restoreEmployee(emp)}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold hover:bg-emerald-500"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => archiveEmployee(emp)}
                              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold hover:bg-slate-600"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-slate-500"
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

function DollarSignIcon() {
  return <span className="text-xl font-black">₱</span>;
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  success,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  subtitle?: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/20 bg-red-500/10"
          : success
          ? "border-green-500/20 bg-green-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-yellow-400">
          {icon}
        </div>

        <p className="text-sm text-slate-400">{title}</p>
      </div>

      <h2 className="text-2xl font-bold">{value}</h2>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function FormPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MiniStat({
  title,
  value,
  danger,
}: {
  title: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <h3
        className={
          danger
            ? "mt-1 text-2xl font-black text-red-400"
            : "mt-1 text-2xl font-black text-white"
        }
      >
        {value}
      </h3>
    </div>
  );
}

function Input({
  label,
  value,
  setValue,
  type = "text",
  placeholder = "",
}: any) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        style={type === "date" ? { colorScheme: "dark" } : undefined}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
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
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
      >
        <option value="">Select</option>
        {options.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const style =
    normalized === "active"
      ? "bg-emerald-500/10 text-emerald-400"
      : normalized === "probationary"
      ? "bg-blue-500/10 text-blue-400"
      : normalized === "resigned" ||
        normalized === "terminated" ||
        normalized === "inactive" ||
        normalized === "awol"
      ? "bg-red-500/10 text-red-400"
      : "bg-slate-500/10 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {status || "No Status"}
    </span>
  );
}