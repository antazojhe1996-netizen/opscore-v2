"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Pencil, Search, Trash2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import * as XLSX from "xlsx";

type Employee = {
  id: string;
  company_id?: string;
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
  portal_enabled?: boolean;
  attendance_source_preference?: string;
  hire_date: string;
  contact_number: string;
  sss_no?: string;
  philhealth_no?: string;
  pagibig_no?: string;
  tin_no?: string;
  birth_date?: string;
  gender?: string;
  civil_status?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  emergency_contact_relationship?: string;
  has_resume?: boolean;
  has_valid_id?: boolean;
  has_contract?: boolean;
  has_nbi_clearance?: boolean;
  has_medical?: boolean;
  has_training_records?: boolean;
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
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState("");
  const [sssNo, setSssNo] = useState("");
  const [philhealthNo, setPhilhealthNo] = useState("");
  const [pagibigNo, setPagibigNo] = useState("");
  const [tinNo, setTinNo] = useState("");
  const [hasResume, setHasResume] = useState("No");
  const [hasValidId, setHasValidId] = useState("No");
  const [hasContract, setHasContract] = useState("No");
  const [hasNbiClearance, setHasNbiClearance] = useState("No");
  const [hasMedical, setHasMedical] = useState("No");
  const [hasTrainingRecords, setHasTrainingRecords] = useState("No");
  const [rateType, setRateType] = useState("Daily");
  const [basicRate, setBasicRate] = useState("");
  const [payrollActive, setPayrollActive] = useState("Yes");
  const [payrollNotes, setPayrollNotes] = useState("");
  const [portalEnabled, setPortalEnabled] = useState("Yes");
  const [attendanceSourcePreference, setAttendanceSourcePreference] =
    useState("Biometrics");
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState("");
  const [currentSystemUserId, setCurrentSystemUserId] = useState("");

  const canCreate = permissions?.can_create === true;
  const canEdit = permissions?.can_edit === true;
  const canDelete = permissions?.can_delete === true;
  const canModify = canCreate || canEdit;

  /// DATA
  const rateTypes = ["Daily", "Weekly", "Monthly"];
  const genderOptions = ["Male", "Female", "Prefer not to say"];
  const civilStatusOptions = ["Single", "Married", "Widowed", "Separated"];
  const yesNoOptions = ["Yes", "No"];
  const attendanceSourceOptions = [
    "Biometrics",
    "Employee Portal",
    "Manual Review",
  ];

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
    Number(
      String(value || "")
        .replace("₱", "")
        .replace(/,/g, "")
        .trim(),
    ) || 0;

  const cleanDate = (value: any) => {
    if (!value) return null;

    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return null;

      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
        date.d,
      ).padStart(2, "0")}`;
    }

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;

    return parsed.toISOString().split("T")[0];
  };

  const getCurrentCompanyId = () => {
    if (typeof window === "undefined") return null;

    return (
      localStorage.getItem("opscore_current_company_id") ||
      localStorage.getItem("opscore_company_id") ||
      localStorage.getItem("company_id")
    );
  };

  const createEmployeeAccount = async (employee: Employee) => {
    if (!employee.email || employee.portal_enabled === false) {
      return {
        skipped: true,
        message: "Portal account skipped because email or portal access is missing.",
      };
    }

    const companyId = employee.company_id || getCurrentCompanyId();

    if (!companyId) {
      return {
        skipped: true,
        message:
          "Employee saved, but account was not created because company_id was not found.",
      };
    }

    const response = await fetch("/api/hr/create-employee-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employee_id: employee.id,
        email: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: "employee",
        company_id: companyId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        skipped: false,
        error: result?.error || "Failed to create employee account.",
      };
    }

    return {
      skipped: false,
      success: true,
      temporaryPassword: result?.temporary_password || "Temp123!",
    };
  };

  const getCurrentPermissions = async () => {
    const roleId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_role_id")
        : null;

    const systemUserId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_system_user_id")
        : null;

    const companyId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_company_id")
        : null;

    if (!roleId || !systemUserId || !companyId) {
      setPermissions(null);
      return;
    }

    const { data: companyUser, error: companyUserError } = await supabase
      .from("company_users")
      .select("id, role_id, is_active")
      .eq("user_id", systemUserId)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .maybeSingle();

    if (companyUserError || !companyUser?.role_id) {
      console.log("GET COMPANY USER PERMISSION ERROR:", companyUserError?.message);
      setPermissions(null);
      return;
    }

    const { data, error } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", companyUser.role_id)
      .eq("module_key", "employees")
      .maybeSingle();

    if (error) {
      console.log("GET EMPLOYEES PERMISSIONS ERROR:", error.message);
      setPermissions(null);
      return;
    }

    setPermissions(data || null);
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
    setBirthDate("");
    setGender("");
    setCivilStatus("");
    setAddress("");
    setEmergencyContactName("");
    setEmergencyContactNumber("");
    setEmergencyContactRelationship("");
    setSssNo("");
    setPhilhealthNo("");
    setPagibigNo("");
    setTinNo("");
    setHasResume("No");
    setHasValidId("No");
    setHasContract("No");
    setHasNbiClearance("No");
    setHasMedical("No");
    setHasTrainingRecords("No");
    setRateType("Daily");
    setBasicRate("");
    setPayrollActive("Yes");
    setPayrollNotes("");
    setPortalEnabled("Yes");
    setAttendanceSourcePreference("Biometrics");
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

    if (portalEnabled === "Yes" && !email.trim()) {
      setFormError("Email is required when Portal Access is enabled.");
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

    if (editingEmployeeNo && !canEdit) {
      alert("Access denied. You do not have permission to update employee records.");
      return;
    }

    if (!editingEmployeeNo && !canCreate) {
      alert("Access denied. You do not have permission to create employee records.");
      return;
    }

    if (!validateForm()) return;

    setIsSaving(true);

    const companyId = getCurrentCompanyId();

    const payload: any = {
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
      birth_date: birthDate || null,
      gender,
      civil_status: civilStatus,
      address: address.trim(),
      emergency_contact_name: emergencyContactName.trim(),
      emergency_contact_number: emergencyContactNumber.trim(),
      emergency_contact_relationship: emergencyContactRelationship.trim(),
      sss_no: sssNo.trim(),
      philhealth_no: philhealthNo.trim(),
      pagibig_no: pagibigNo.trim(),
      tin_no: tinNo.trim(),
      has_resume: hasResume === "Yes",
      has_valid_id: hasValidId === "Yes",
      has_contract: hasContract === "Yes",
      has_nbi_clearance: hasNbiClearance === "Yes",
      has_medical: hasMedical === "Yes",
      has_training_records: hasTrainingRecords === "Yes",
      daily_rate: Number(basicRate || 0),
      rate_type: rateType,
      basic_rate: Number(basicRate || 0),
      payroll_active: payrollActive === "Yes",
      payroll_notes: payrollNotes.trim(),
      portal_enabled: portalEnabled === "Yes",
      attendance_source_preference: attendanceSourcePreference,
    };

    if (companyId) {
      payload.company_id = companyId;
    }

    const oldEmployee = editingEmployeeNo
      ? employees.find((employee) => employee.employee_no === editingEmployeeNo)
      : null;

    let savedEmployee: Employee | null = null;

    if (editingEmployeeNo) {
      const { data, error } = await supabase
        .from("employees")
        .update(payload)
        .eq("employee_no", editingEmployeeNo)
        .select("*")
        .single();

      if (error) {
        setIsSaving(false);
        console.log("SAVE EMPLOYEE ERROR:", error.message);
        alert("Failed to save employee.");
        return;
      }

      savedEmployee = data;
    } else {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        setIsSaving(false);
        console.log("SAVE EMPLOYEE ERROR:", error.message);
        alert("Failed to save employee.");
        return;
      }

      savedEmployee = data;
    }

    let accountMessage = "";

    if (!editingEmployeeNo && savedEmployee?.portal_enabled !== false && savedEmployee?.email) {
      const accountResult = await createEmployeeAccount(savedEmployee);

      if (accountResult.success) {
        accountMessage = `\n\nPortal account created.\nTemporary password: ${accountResult.temporaryPassword}`;
      }

      if (accountResult.error) {
        accountMessage = `\n\nEmployee was saved, but portal account creation failed:\n${accountResult.error}`;
      }

      if (accountResult.skipped && accountResult.message) {
        accountMessage = `\n\n${accountResult.message}`;
      }
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Employees",
      action: editingEmployeeNo ? "Update Employee" : "Create Employee",
      description: editingEmployeeNo
        ? `Updated employee record: ${firstName} ${lastName}`
        : `Created employee record: ${firstName} ${lastName}`,
      severity: "info",
      recordId: editingEmployeeNo || payload.employee_no,
      oldValue: oldEmployee,
      newValue: payload,
    });

    setIsSaving(false);
    clearForm();
    setShowEmployeeForm(false);
    await getEmployees();

    alert(
      editingEmployeeNo
        ? "Employee updated successfully."
        : `Employee saved successfully.${accountMessage}`,
    );
  };

  const editEmployee = (employee: Employee) => {
    if (!canEdit) {
      alert("Access denied. You do not have permission to edit employee records.");
      return;
    }

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
    setBirthDate(employee.birth_date || "");
    setGender(employee.gender || "");
    setCivilStatus(employee.civil_status || "");
    setAddress(employee.address || "");
    setEmergencyContactName(employee.emergency_contact_name || "");
    setEmergencyContactNumber(employee.emergency_contact_number || "");
    setEmergencyContactRelationship(employee.emergency_contact_relationship || "");
    setSssNo(employee.sss_no || "");
    setPhilhealthNo(employee.philhealth_no || "");
    setPagibigNo(employee.pagibig_no || "");
    setTinNo(employee.tin_no || "");
    setHasResume(employee.has_resume ? "Yes" : "No");
    setHasValidId(employee.has_valid_id ? "Yes" : "No");
    setHasContract(employee.has_contract ? "Yes" : "No");
    setHasNbiClearance(employee.has_nbi_clearance ? "Yes" : "No");
    setHasMedical(employee.has_medical ? "Yes" : "No");
    setHasTrainingRecords(employee.has_training_records ? "Yes" : "No");
    setRateType(employee.rate_type || "Daily");
    setBasicRate(String(employee.basic_rate || employee.daily_rate || ""));
    setPayrollActive(employee.payroll_active === false ? "No" : "Yes");
    setPayrollNotes(employee.payroll_notes || "");
    setPortalEnabled(employee.portal_enabled === false ? "No" : "Yes");
    setAttendanceSourcePreference(employee.attendance_source_preference || "Biometrics");

    setShowEmployeeForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const archiveEmployee = async (employee: Employee) => {
    if (!canDelete) {
      alert("Access denied. You do not have permission to archive employee records.");
      return;
    }

    const confirmArchive = confirm(
      `Archive ${employee.first_name} ${employee.last_name}? This will keep history but remove the employee from active operations.`,
    );

    if (!confirmArchive) return;

    const updatePayload = {
      employment_status: "Archived",
      payroll_active: false,
    };

    const { error } = await supabase
      .from("employees")
      .update(updatePayload)
      .eq("employee_no", employee.employee_no);

    if (error) {
      console.log("ARCHIVE EMPLOYEE ERROR:", error.message);
      alert("Failed to archive employee.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Employees",
      action: "Archive Employee",
      description: `${employee.first_name} ${employee.last_name} archived from active operations`,
      severity: "warning",
      recordId: employee.employee_no,
      oldValue: employee,
      newValue: {
        ...employee,
        ...updatePayload,
      },
    });

    getEmployees();
  };

  const restoreEmployee = async (employee: Employee) => {
    if (!canEdit) {
      alert("Access denied. You do not have permission to restore employee records.");
      return;
    }

    const confirmRestore = confirm(
      `Restore ${employee.first_name} ${employee.last_name} as Active?`,
    );

    if (!confirmRestore) return;

    const updatePayload = {
      employment_status: "Active",
      payroll_active: true,
    };

    const { error } = await supabase
      .from("employees")
      .update(updatePayload)
      .eq("employee_no", employee.employee_no);

    if (error) {
      console.log("RESTORE EMPLOYEE ERROR:", error.message);
      alert("Failed to restore employee.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Employees",
      action: "Restore Employee",
      description: `${employee.first_name} ${employee.last_name} restored as active employee`,
      severity: "info",
      recordId: employee.employee_no,
      oldValue: employee,
      newValue: {
        ...employee,
        ...updatePayload,
      },
    });

    getEmployees();
  };


  const deleteEmployee = async (employee: Employee) => {
    if (!canDelete) {
      alert("Access denied. Only authorized users can delete employee records.");
      return;
    }

    if (currentEmployeeId && employee.id === currentEmployeeId) {
      alert("You cannot delete your own employee profile.");
      return;
    }

    if (!currentSystemUserId) {
      alert(
        "Current admin session is incomplete. Logout and login again before deleting employees.",
      );
      return;
    }

    const confirmDelete = confirm(
      `Permanently delete ${employee.first_name} ${employee.last_name}? This will also remove linked portal access if no payroll, attendance, leave, or payroll records exist. This cannot be undone.`,
    );

    if (!confirmDelete) return;

    const response = await fetch("/api/hr/delete-employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employee_id: employee.id,
        current_employee_id: currentEmployeeId || null,
        current_system_user_id: currentSystemUserId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Failed to delete employee.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Employees",
      action: "Delete Employee",
      description: `${employee.first_name} ${employee.last_name} was permanently deleted`,
      severity: "critical",
      recordId: employee.employee_no,
      oldValue: employee,
      newValue: null,
    });

    alert("Employee deleted successfully.");
    getEmployees();
  };

  const handleImportFile = async (file: File) => {
    if (!canCreate) {
      alert("Access denied. You do not have permission to import employee records.");
      return;
    }

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
          getValue(row, ["First Name", "first_name", "FirstName"]),
        ).trim();

        const last = String(
          getValue(row, ["Last Name", "last_name", "LastName"]),
        ).trim();

        const fullName = String(
          getValue(row, ["Name", "Employee Name", "Full Name"]),
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
            getValue(row, [
              "Employee No",
              "Employee Number",
              "Employee ID",
              "ID",
            ]),
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
          ]),
        );

        return {
          employee_no: employeeNoValue,
          first_name: firstNameValue,
          last_name: lastNameValue,
          email: String(getValue(row, ["Email", "email", "Email Address"])).trim(),
          department: String(getValue(row, ["Department", "department"])).trim(),
          position: String(getValue(row, ["Position", "position"])).trim(),
          employment_status:
            String(
              getValue(row, ["Status", "Employment Status", "employment_status"]),
            ).trim() || "Active",
          employment_type:
            String(getValue(row, ["Employment Type", "employment_type"])).trim() ||
            "Regular",
          contact_number: String(
            getValue(row, ["Contact", "Contact Number", "contact_number"]),
          ).trim(),
          hire_date:
            cleanDate(getValue(row, ["Hire Date", "Date Hired", "hire_date"])) ||
            null,
          birth_date:
            cleanDate(getValue(row, ["Birth Date", "Birthday", "birth_date"])) ||
            null,
          gender: String(getValue(row, ["Gender", "gender"])).trim(),
          civil_status: String(getValue(row, ["Civil Status", "civil_status"])).trim(),
          address: String(getValue(row, ["Address", "address"])).trim(),
          emergency_contact_name: String(
            getValue(row, ["Emergency Contact Name", "emergency_contact_name"]),
          ).trim(),
          emergency_contact_number: String(
            getValue(row, [
              "Emergency Contact Number",
              "emergency_contact_number",
            ]),
          ).trim(),
          emergency_contact_relationship: String(
            getValue(row, [
              "Emergency Contact Relationship",
              "emergency_contact_relationship",
            ]),
          ).trim(),
          sss_no: String(getValue(row, ["SSS No", "SSS", "sss_no"])).trim(),
          philhealth_no: String(
            getValue(row, ["PhilHealth No", "PhilHealth", "philhealth_no"]),
          ).trim(),
          pagibig_no: String(
            getValue(row, ["Pag-IBIG No", "PagIBIG", "pagibig_no"]),
          ).trim(),
          tin_no: String(getValue(row, ["TIN No", "TIN", "tin_no"])).trim(),
          has_resume:
            String(getValue(row, ["Has Resume", "Resume"])).toLowerCase() ===
            "yes",
          has_valid_id:
            String(getValue(row, ["Has Valid ID", "Valid ID"])).toLowerCase() ===
            "yes",
          has_contract:
            String(getValue(row, ["Has Contract", "Contract"])).toLowerCase() ===
            "yes",
          has_nbi_clearance:
            String(getValue(row, ["Has NBI", "NBI Clearance"])).toLowerCase() ===
            "yes",
          has_medical:
            String(getValue(row, ["Has Medical", "Medical"])).toLowerCase() ===
            "yes",
          has_training_records:
            String(
              getValue(row, ["Has Training Records", "Training Records"]),
            ).toLowerCase() === "yes",
          daily_rate: basicRateValue,
          rate_type: rateTypes.includes(rateTypeValue) ? rateTypeValue : "Daily",
          basic_rate: basicRateValue,
          payroll_active:
            String(getValue(row, ["Payroll Active", "payroll_active"])).toLowerCase() ===
            "no"
              ? false
              : true,
          payroll_notes: String(
            getValue(row, ["Payroll Notes", "Notes", "payroll_notes"]),
          ).trim(),
          portal_enabled:
            String(
              getValue(row, [
                "Portal Enabled",
                "portal_enabled",
                "Portal Access",
              ]),
            ).toLowerCase() === "no"
              ? false
              : true,
          attendance_source_preference:
            String(
              getValue(row, [
                "Attendance Source",
                "attendance_source_preference",
                "Attendance Source Preference",
              ]),
            ).trim() || "Biometrics",
          created_at: new Date().toISOString(),
        };
      })
      .filter((row) => row.first_name && row.last_name);

    setPreviewRows(cleanedRows);
  };

  const importEmployees = async () => {
    if (!canCreate) {
      alert("Access denied. You do not have permission to import employee records.");
      return;
    }

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

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Employees",
      action: "Import Employees",
      description: `${previewRows.length} employee record(s) imported from ${
        fileName || "uploaded file"
      }`,
      severity: "info",
      recordId: fileName || null,
      newValue: {
        fileName,
        importedCount: previewRows.length,
        sampleRows: previewRows.slice(0, 10),
      },
    });

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
      "Portal Enabled": emp.portal_enabled === false ? "No" : "Yes",
      "Attendance Source": emp.attendance_source_preference || "Biometrics",
      "Contact Number": emp.contact_number,
      "Hire Date": emp.hire_date,
      "Birth Date": emp.birth_date,
      Gender: emp.gender,
      "Civil Status": emp.civil_status,
      Address: emp.address,
      "Emergency Contact Name": emp.emergency_contact_name,
      "Emergency Contact Number": emp.emergency_contact_number,
      "Emergency Contact Relationship": emp.emergency_contact_relationship,
      "SSS No": emp.sss_no,
      "PhilHealth No": emp.philhealth_no,
      "Pag-IBIG No": emp.pagibig_no,
      "TIN No": emp.tin_no,
      "Has Resume": emp.has_resume ? "Yes" : "No",
      "Has Valid ID": emp.has_valid_id ? "Yes" : "No",
      "Has Contract": emp.has_contract ? "Yes" : "No",
      "Has NBI Clearance": emp.has_nbi_clearance ? "Yes" : "No",
      "Has Medical": emp.has_medical ? "Yes" : "No",
      "Has Training Records": emp.has_training_records ? "Yes" : "No",
      Notes: emp.payroll_notes,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "opscore_employees_export.xlsx");
  };

  /// EFFECTS
  useEffect(() => {
    setCurrentEmployeeId(localStorage.getItem("opscore_current_employee_id") || "");
    setCurrentSystemUserId(
      localStorage.getItem("opscore_current_system_user_id") || "",
    );

    getCurrentPermissions();
    getEmployees();
    getDropdownData();
  }, []);

  /// CALCULATIONS
  const inactiveStatuses = [
    "archived",
    "resigned",
    "terminated",
    "inactive",
    "awol",
  ];

  const activeEmployeeRows = employees.filter(
    (emp) =>
      !inactiveStatuses.includes(
        String(emp.employment_status || "").toLowerCase(),
      ),
  );

  const archivedEmployeeRows = employees.filter((emp) =>
    inactiveStatuses.includes(String(emp.employment_status || "").toLowerCase()),
  );

  const totalEmployees = employees.length;
  const activeEmployees = activeEmployeeRows.length;
  const archivedEmployees = archivedEmployeeRows.length;

  const payrollActiveCount = activeEmployeeRows.filter(
    (emp) => emp.payroll_active !== false,
  ).length;

  const missingEmailCount = activeEmployeeRows.filter((emp) => !emp.email).length;

  const incomplete201Count = activeEmployeeRows.filter(
    (emp) =>
      !emp.contact_number ||
      !emp.hire_date ||
      !emp.emergency_contact_name ||
      !emp.emergency_contact_number ||
      !emp.has_valid_id ||
      !emp.has_contract,
  ).length;

  const missingGovInfoCount = activeEmployeeRows.filter(
    (emp) =>
      !emp.sss_no || !emp.philhealth_no || !emp.pagibig_no || !emp.tin_no,
  ).length;

  const departmentCounts = activeEmployeeRows.reduce(
    (acc: Record<string, number>, emp) => {
      const dept = emp.department || "Unassigned";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    },
    {},
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
      !emp.basic_rate ||
      !emp.contact_number ||
      !emp.hire_date ||
      !emp.emergency_contact_name ||
      !emp.emergency_contact_number ||
      !emp.has_valid_id ||
      !emp.has_contract,
  );

  const filteredEmployees = useMemo(() => {
    const normalizedStatusFilter = String(statusFilter || "Active").toLowerCase();

    const sourceEmployees =
      normalizedStatusFilter === "archived"
        ? archivedEmployeeRows
        : normalizedStatusFilter === "all"
          ? employees
          : activeEmployeeRows.filter(
              (emp) =>
                String(emp.employment_status || "").toLowerCase() ===
                normalizedStatusFilter,
            );

    return sourceEmployees.filter((emp) => {
      const search =
        `${emp.employee_no} ${emp.first_name} ${emp.last_name} ${emp.email} ${emp.department} ${emp.position} ${emp.employment_status} ${emp.rate_type}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesDepartment =
        departmentFilter === "ALL" || emp.department === departmentFilter;

      return search && matchesDepartment;
    });
  }, [
    employees,
    activeEmployeeRows,
    archivedEmployeeRows,
    searchTerm,
    departmentFilter,
    statusFilter,
  ]);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />
      <TopNavbar breadcrumb="HR / EMPLOYEES" />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
        <div className="w-full">
          <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                HR
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Employee Records
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Maintain employee master data, payroll profile, portal access,
                attendance source, and 201 file readiness.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportEmployees}
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                Export
              </button>

              {canModify && (
                <button
                  type="button"
                  onClick={() => {
                    if (showEmployeeForm) {
                      clearForm();
                      setShowEmployeeForm(false);
                      return;
                    }

                    setShowEmployeeForm(true);
                    window.setTimeout(() => {
                      document
                        .getElementById("employee-form")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }}
                  className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  {showEmployeeForm
                    ? "Hide Form"
                    : editingEmployeeNo
                      ? "Editing Employee"
                      : "Add Employee"}
                </button>
              )}
            </div>
          </section>

          {!canModify && (
            <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 shadow-sm">
              <p className="font-black text-amber-700">View-only access</p>
              <p className="mt-1">
                You can review employee records, but create, edit, import,
                archive, and restore actions are locked for your role.
              </p>
            </section>
          )}

          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-center">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,1fr)_220px_180px]">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employee, department, position..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-9 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                  <option value="All">All</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CompactMetric label="Active" value={activeEmployees} />
                <CompactMetric label="Payroll" value={payrollActiveCount} />
                <CompactMetric
                  label="201 Issues"
                  value={incomplete201Count}
                  danger={incomplete201Count > 0}
                />
                <CompactMetric
                  label="Missing Gov"
                  value={missingGovInfoCount}
                  danger={missingGovInfoCount > 0}
                />
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Employee Masterlist
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {filteredEmployees.length} employee
                    {filteredEmployees.length === 1 ? "" : "s"} shown. Use
                    filters above to narrow records.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <button
                    onClick={() => setStatusFilter("Active")}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStatusFilter("Archived")}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Archived
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("All");
                      setDepartmentFilter("ALL");
                      setSearchTerm("");
                    }}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[1450px]">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Rate Type</th>
                      <th className="px-4 py-3 text-right">Basic Rate</th>
                      <th className="px-4 py-3">Payroll</th>
                      <th className="px-4 py-3">Portal</th>
                      <th className="px-4 py-3">Attendance Source</th>
                      <th className="px-4 py-3">Gov IDs</th>
                      <th className="px-4 py-3">201 File</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployees.map((emp) => {
                      const isArchived = inactiveStatuses.includes(
                        String(emp.employment_status || "").toLowerCase(),
                      );

                      return (
                        <tr
                          key={emp.id}
                          className="border-t border-slate-100 transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 align-top">
                            <p className="font-black text-slate-950">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              {emp.employee_no || "No employee no"}
                            </p>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <p className={emp.email ? "text-slate-700" : "text-red-700"}>
                              {emp.email || "No email"}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              {emp.contact_number || "No contact"}
                            </p>
                          </td>

                          <td className="px-4 py-3 align-top text-slate-700">
                            {emp.department || "-"}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-700">
                            {emp.position || "-"}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge status={emp.employment_status} />
                          </td>
                          <td className="px-4 py-3 align-top text-slate-700">
                            {emp.employment_type || "-"}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-700">
                            {emp.rate_type || "Daily"}
                          </td>
                          <td className="px-4 py-3 align-top text-right font-bold text-slate-950">
                            {formatMoney(emp.basic_rate || emp.daily_rate)}
                          </td>

                          <td className="px-4 py-3 align-top">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                emp.payroll_active === false
                                  ? "bg-red-500/10 text-red-700"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {emp.payroll_active === false ? "Inactive" : "Active"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                emp.portal_enabled === false
                                  ? "border border-slate-200 bg-slate-100 text-slate-700"
                                  : "border border-blue-200 bg-blue-50 text-blue-700"
                              }`}
                            >
                              {emp.portal_enabled === false ? "Disabled" : "Enabled"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {emp.attendance_source_preference || "Biometrics"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top">
                            {emp.sss_no &&
                            emp.philhealth_no &&
                            emp.pagibig_no &&
                            emp.tin_no ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                Complete
                              </span>
                            ) : (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top">
                            {emp.has_valid_id && emp.has_contract ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                Ready
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-700">
                                Incomplete
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canEdit && (
                                <button
                                  onClick={() => editEmployee(emp)}
                                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                              )}

                              {isArchived && canEdit && (
                                <button
                                  onClick={() => restoreEmployee(emp)}
                                  className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700"
                                >
                                  Restore
                                </button>
                              )}

                              {!isArchived && canDelete && (
                                <button
                                  onClick={() => archiveEmployee(emp)}
                                  className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                                >
                                  Archive
                                </button>
                              )}


                              {canDelete && emp.id !== currentEmployeeId && (
                                <button
                                  onClick={() => deleteEmployee(emp)}
                                  className="inline-flex h-9 items-center gap-1 rounded-xl bg-red-600 px-3 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                                >
                                  <Trash2 size={12} /> Delete
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
                          colSpan={14}
                          className="px-4 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          No employees found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-5">
              {canModify && showEmployeeForm && (
                <section
                  id="employee-form"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        {editingEmployeeNo ? "Edit Employee" : "New Employee"}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Required fields must be completed before saving.
                      </p>
                    </div>

                    {editingEmployeeNo && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                        {editingEmployeeNo}
                      </span>
                    )}
                  </div>

                  {formError && (
                    <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
                      {formError}
                    </p>
                  )}

                  <div className="space-y-4">
                    <FormPanel title="Personal">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Input
                          label="Employee No"
                          value={employeeNo}
                          setValue={setEmployeeNo}
                          placeholder="Auto if blank"
                        />
                        <Input
                          label="Email"
                          type="email"
                          value={email}
                          setValue={setEmail}
                          placeholder="employee@email.com"
                        />
                        <Input
                          label="First Name *"
                          value={firstName}
                          setValue={setFirstName}
                        />
                        <Input
                          label="Last Name *"
                          value={lastName}
                          setValue={setLastName}
                        />
                        <Input
                          label="Contact Number"
                          value={contactNumber}
                          setValue={setContactNumber}
                        />
                        <Input
                          label="Hire Date"
                          type="date"
                          value={hireDate}
                          setValue={setHireDate}
                        />
                      </div>
                    </FormPanel>

                    <FormPanel title="Assignment">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Select
                          label="Department *"
                          value={department}
                          setValue={setDepartment}
                          options={departments.map((d) => d.name)}
                        />
                        <Select
                          label="Position *"
                          value={position}
                          setValue={setPosition}
                          options={positions.map((p) => p.name)}
                        />
                        <Select
                          label="Status *"
                          value={employmentStatus}
                          setValue={setEmploymentStatus}
                          options={employmentStatuses.map((s) => s.name)}
                        />
                        <Select
                          label="Employment Type *"
                          value={employmentType}
                          setValue={setEmploymentType}
                          options={employmentTypes.map((t) => t.name)}
                        />
                      </div>
                    </FormPanel>

                    <FormPanel title="Payroll & Portal">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Select
                          label="Rate Type *"
                          value={rateType}
                          setValue={setRateType}
                          options={rateTypes}
                        />
                        <Input
                          label="Basic Rate *"
                          type="number"
                          value={basicRate}
                          setValue={setBasicRate}
                        />
                        <Select
                          label="Payroll Active"
                          value={payrollActive}
                          setValue={setPayrollActive}
                          options={yesNoOptions}
                        />
                        <Select
                          label="Portal Access"
                          value={portalEnabled}
                          setValue={setPortalEnabled}
                          options={yesNoOptions}
                        />
                        <div className="sm:col-span-2">
                          <Select
                            label="Official Attendance Source"
                            value={attendanceSourcePreference}
                            setValue={setAttendanceSourcePreference}
                            options={attendanceSourceOptions}
                          />
                        </div>
                      </div>
                    </FormPanel>

                    <FormPanel title="201 / Government">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Input label="SSS No." value={sssNo} setValue={setSssNo} />
                        <Input
                          label="PhilHealth No."
                          value={philhealthNo}
                          setValue={setPhilhealthNo}
                        />
                        <Input
                          label="Pag-IBIG No."
                          value={pagibigNo}
                          setValue={setPagibigNo}
                        />
                        <Input label="TIN No." value={tinNo} setValue={setTinNo} />
                        <Select
                          label="Valid ID"
                          value={hasValidId}
                          setValue={setHasValidId}
                          options={yesNoOptions}
                        />
                        <Select
                          label="Contract"
                          value={hasContract}
                          setValue={setHasContract}
                          options={yesNoOptions}
                        />
                      </div>
                    </FormPanel>

                    <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        More employee details
                      </summary>

                      <div className="mt-4 space-y-4">
                        <FormPanel title="Profile">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Input
                              label="Birth Date"
                              type="date"
                              value={birthDate}
                              setValue={setBirthDate}
                            />
                            <Select
                              label="Gender"
                              value={gender}
                              setValue={setGender}
                              options={genderOptions}
                            />
                            <Select
                              label="Civil Status"
                              value={civilStatus}
                              setValue={setCivilStatus}
                              options={civilStatusOptions}
                            />
                            <Input label="Address" value={address} setValue={setAddress} />
                          </div>
                        </FormPanel>

                        <FormPanel title="Emergency Contact">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Input
                              label="Contact Person"
                              value={emergencyContactName}
                              setValue={setEmergencyContactName}
                            />
                            <Input
                              label="Contact Number"
                              value={emergencyContactNumber}
                              setValue={setEmergencyContactNumber}
                            />
                            <Input
                              label="Relationship"
                              value={emergencyContactRelationship}
                              setValue={setEmergencyContactRelationship}
                            />
                          </div>
                        </FormPanel>

                        <FormPanel title="Additional 201 Checklist">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Select
                              label="Resume / Bio Data"
                              value={hasResume}
                              setValue={setHasResume}
                              options={yesNoOptions}
                            />
                            <Select
                              label="NBI Clearance"
                              value={hasNbiClearance}
                              setValue={setHasNbiClearance}
                              options={yesNoOptions}
                            />
                            <Select
                              label="Medical / Health Cert"
                              value={hasMedical}
                              setValue={setHasMedical}
                              options={yesNoOptions}
                            />
                            <Select
                              label="Training Records"
                              value={hasTrainingRecords}
                              setValue={setHasTrainingRecords}
                              options={yesNoOptions}
                            />
                          </div>
                        </FormPanel>

                        <FormPanel title="Payroll Notes">
                          <textarea
                            value={payrollNotes}
                            onChange={(e) => setPayrollNotes(e.target.value)}
                            rows={3}
                            className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          />
                        </FormPanel>
                      </div>
                    </details>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <button
                        onClick={saveEmployee}
                        disabled={isSaving}
                        className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                      >
                        {isSaving
                          ? "Saving..."
                          : editingEmployeeNo
                            ? "Update Employee"
                            : "Save Employee + Account"}
                      </button>

                      <button
                        onClick={() => {
                          clearForm();
                          setShowEmployeeForm(false);
                        }}
                        className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                      >
                        {editingEmployeeNo ? "Cancel Edit" : "Clear Form"}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {canCreate && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                    <FileSpreadsheet size={18} /> Import Employees
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Upload Excel/CSV, preview, then import.
                  </p>

                  <div className="mt-4 space-y-3">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportFile(file);
                      }}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 file:mr-4 file:h-9 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-bold file:text-slate-700"
                    />

                    <button
                      onClick={importEmployees}
                      disabled={isImporting || previewRows.length === 0}
                      className="h-11 w-full rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isImporting
                        ? "Importing..."
                        : `Import ${previewRows.length} Preview Row${
                            previewRows.length === 1 ? "" : "s"
                          }`}
                    </button>

                    {fileName && (
                      <p className="text-sm font-medium text-slate-500">
                        Selected:{" "}
                        <span className="font-bold text-slate-950">{fileName}</span>
                      </p>
                    )}
                  </div>

                  {previewRows.length > 0 && (
                    <div className="mt-4 max-h-[300px] overflow-auto rounded-2xl border border-slate-200">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Employee No</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3 text-right">Rate</th>
                          </tr>
                        </thead>

                        <tbody>
                          {previewRows.slice(0, 50).map((row, index) => (
                            <tr
                              key={`${row.employee_no}-${index}`}
                              className="border-t border-slate-100 transition-all duration-200 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">{row.employee_no}</td>
                              <td className="px-4 py-3 font-bold">
                                {row.first_name} {row.last_name}
                              </td>
                              <td className="px-4 py-3">{row.department}</td>
                              <td className="px-4 py-3 text-right">
                                {formatMoney(row.basic_rate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  Record Health
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MiniStat title="Total Records" value={totalEmployees} />
                  <MiniStat title="Archived" value={archivedEmployees} />
                  <MiniStat
                    title="Records With Issues"
                    value={employeesWithIssues.length}
                    danger={employeesWithIssues.length > 0}
                  />
                  <MiniStat
                    title="Missing Email"
                    value={missingEmailCount}
                    danger={missingEmailCount > 0}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {topDepartments.length > 0 ? (
                    topDepartments.map((dept) => (
                      <div
                        key={dept.name}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-slate-700">
                          {dept.name}
                        </p>
                        <p className="font-bold text-slate-950">{dept.count}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No department data found.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  danger,
}: {
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-white px-4 py-3 shadow-sm",
        danger ? "border-red-200" : "border-slate-200",
      ].join(" ")}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p
        className={[
          "mt-1 text-2xl font-black tracking-tight",
          danger ? "text-red-700" : "text-slate-950",
        ].join(" ")}
      >
        {value}
      </p>
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
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h3
        className={[
          "mt-1 text-2xl font-black tracking-tight",
          danger ? "text-red-700" : "text-slate-950",
        ].join(" ")}
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
      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

function Select({ label, value, setValue, options }: any) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "probationary"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : normalized === "resigned" ||
            normalized === "terminated" ||
            normalized === "inactive" ||
            normalized === "archived" ||
            normalized === "awol"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${style}`}
    >
      {status || "No Status"}
    </span>
  );
}