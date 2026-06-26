"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import OpscoreAssistant from "@/components/OpscoreAssistant";import { createAuditLog } from "@/lib/audit";
import PageGuard from "@/components/PageGuard";

type PermissionSet = {
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_approve?: boolean;
  can_release?: boolean;
};

type EmployeeBalance = {
  id: string;
  employee_id?: string | null;
  employee_name?: string | null;
  balance_type?: string | null;
  original_amount?: number | null;
  remaining_balance?: number | null;
  status?: string | null;
  source_module?: string | null;
  source_id?: string | null;
  period_id?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
};

type Employee = {
  id: string;
  employee_no?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  position?: string | null;
  employment_status?: string | null;
  company_id?: string | null;
};

const MODULE_KEY = "employee_balances";

const MANUAL_LIABILITY_TYPES = [
  "Employee Meal Charge",
  "Restaurant Unpaid",
  "Salary Loan",
  "Other Liability",
];

export default function EmployeeBalancesPage() {
  /// STATES
  const [balances, setBalances] = useState<EmployeeBalance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [permissions, setPermissions] = useState<PermissionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [ledgerTab, setLedgerTab] = useState<"LIABILITIES" | "PAYROLL_BALANCES">("LIABILITIES");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [selectedEmployeeLedger, setSelectedEmployeeLedger] = useState<{
    employeeName: string;
    employeeId?: string | null;
    employeeNo?: string | null;
    department?: string | null;
    position?: string | null;
  } | null>(null);

  const [liabilityEmployeeId, setLiabilityEmployeeId] = useState("");
  const [liabilityType, setLiabilityType] = useState("Employee Meal Charge");
  const [liabilityAmount, setLiabilityAmount] = useState("");
  const [liabilityRemarks, setLiabilityRemarks] = useState("");

  /// HELPERS
  const formatPeso = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return String(value).slice(0, 19).replace("T", " ");
  };

  const getPaidAmount = (balance: Pick<EmployeeBalance, "original_amount" | "remaining_balance">) => {
    const original = Number(balance.original_amount || 0);
    const remaining = Number(balance.remaining_balance || 0);
    return Math.max(original - remaining, 0);
  };

  const getProgressPercent = (balance: Pick<EmployeeBalance, "original_amount" | "remaining_balance">) => {
    const original = Number(balance.original_amount || 0);
    if (original <= 0) return 0;
    return Math.min(Math.max((getPaidAmount(balance) / original) * 100, 0), 100);
  };

  const getProgressLabel = (balance: Pick<EmployeeBalance, "original_amount" | "remaining_balance">) =>
    `${getProgressPercent(balance).toFixed(1)}%`;

  const normalize = (value: any) => String(value || "").trim();
  const normalizeLower = (value: any) => normalize(value).toLowerCase();

  const getEmployeeName = (employee?: Employee | null) => {
    if (!employee) return "Unknown Employee";

    return (
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
      employee.employee_no ||
      "Unnamed Employee"
    );
  };

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [employees]);

  const getBalanceEmployee = (balance: EmployeeBalance) => {
    if (balance.employee_id && employeeMap.has(balance.employee_id)) {
      return employeeMap.get(balance.employee_id) || null;
    }

    return null;
  };

  const getBalanceEmployeeName = (balance: EmployeeBalance) => {
    const employee = getBalanceEmployee(balance);
    return (
      getEmployeeName(employee) || balance.employee_name || "Unknown Employee"
    );
  };

  const openEmployeeLedger = (balance: EmployeeBalance) => {
    const employee = getBalanceEmployee(balance);
    setSelectedEmployeeLedger({
      employeeName: balance.employee_name || getBalanceEmployeeName(balance),
      employeeId: balance.employee_id || employee?.id || null,
      employeeNo: employee?.employee_no || null,
      department: employee?.department || null,
      position: employee?.position || null,
    });
  };

  const openEmployeeLedgerByName = (employeeName: string) => {
    const employee = employees.find((item) => getEmployeeName(item) === employeeName);
    setSelectedEmployeeLedger({
      employeeName,
      employeeId: employee?.id || null,
      employeeNo: employee?.employee_no || null,
      department: employee?.department || null,
      position: employee?.position || null,
    });
  };

  const openEmployeeLedgerFromEmployee = (employee: Employee) => {
    setSelectedEmployeeLedger({
      employeeName: getEmployeeName(employee),
      employeeId: employee.id,
      employeeNo: employee.employee_no || null,
      department: employee.department || null,
      position: employee.position || null,
    });
  };

  const getStatusStyle = (status: any) => {
    const normalized = normalizeLower(status || "Active");

    if (["active", "open"].includes(normalized))
      return "bg-blue-500/10 text-blue-300";
    if (["paid", "closed", "settled"].includes(normalized))
      return "bg-emerald-500/10 text-emerald-300";
    if (["cancelled", "canceled", "void", "reversed"].includes(normalized))
      return "bg-red-500/10 text-red-300";
    return "bg-slate-700 text-slate-300";
  };

  const getTypeStyle = (type: any) => {
    const normalized = normalizeLower(type);

    if (normalized.includes("cash advance"))
      return "bg-slate-800 text-slate-300";
    if (normalized.includes("restaurant") || normalized.includes("unpaid"))
      return "bg-slate-800 text-slate-300";
    if (normalized.includes("payroll balance"))
      return "bg-blue-500/10 text-blue-300";
    if (normalized.includes("carry")) return "bg-red-500/10 text-red-300";
    return "bg-slate-700 text-slate-300";
  };

  const getLiabilityCategory = (balance: EmployeeBalance) => {
    const text =
      `${balance.balance_type || ""} ${balance.source_module || ""} ${balance.remarks || ""}`.toLowerCase();

    if (text.includes("cash advance")) return "Cash Advance";
    if (
      text.includes("restaurant") ||
      text.includes("unpaid") ||
      text.includes("employee charge") ||
      text.includes("meal")
    )
      return "Restaurant / Unpaid";
    if (text.includes("carry")) return "Payroll Carry Forward";
    if (text.includes("payroll")) return "Payroll Balance";
    if (text.includes("salary loan")) return "Salary Loan";
    return "Other Liability";
  };

  const isPayrollBalanceItem = (balance: EmployeeBalance) => {
    const category = getLiabilityCategory(balance);
    const text =
      `${balance.balance_type || ""} ${balance.source_module || ""} ${balance.remarks || ""}`.toLowerCase();

    return (
      category === "Payroll Balance" ||
      category === "Payroll Carry Forward" ||
      text.includes("partial salary") ||
      text.includes("remaining salary") ||
      text.includes("unreleased payroll")
    );
  };

  const isEmployeeLiabilityItem = (balance: EmployeeBalance) =>
    !isPayrollBalanceItem(balance);

  const getLedgerDirectionLabel = (balance: EmployeeBalance) =>
    isPayrollBalanceItem(balance)
      ? "Company owes employee"
      : "Employee owes company";

  const isPayrollSettled = (balance: EmployeeBalance) => {
    const category = getLiabilityCategory(balance);
    return [
      "Cash Advance",
      "Restaurant / Unpaid",
      "Cash Advance",
      "Restaurant / Unpaid",
      "Salary Loan",
      "Other Liability",
      "Payroll Carry Forward",
      "Payroll Balance",
    ].includes(category);
  };

  const getUserName = () =>
    localStorage.getItem("opscore_current_user_name") ||
    localStorage.getItem("opscore_current_employee_name") ||
    localStorage.getItem("opscore_username") ||
    "OPSCORE USER";

  const getCurrentCompanyId = () =>
    localStorage.getItem("opscore_current_company_id") ||
    localStorage.getItem("company_id") ||
    "";

  /// PERMISSIONS
  const getPermissions = async () => {
    const roleId = localStorage.getItem("opscore_current_role_id");
    const roleName = localStorage.getItem("opscore_current_role_name");

    if (!roleId && !roleName) {
      setPermissions({ can_view: true });
      return;
    }

    let query = supabase
      .from("role_permissions")
      .select("*")
      .eq("module_key", MODULE_KEY);

    if (roleId) {
      query = query.eq("role_id", roleId);
    } else if (roleName) {
      query = query.eq("role_name", roleName);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.log("GET EMPLOYEE BALANCES PERMISSIONS ERROR:", error.message);
      setPermissions({ can_view: true });
      return;
    }

    setPermissions(data || { can_view: true });
  };

  const deny = () => {
    alert("Access denied.");
  };

  /// LOADERS
  const loadData = async () => {
    setLoading(true);

    const [balanceResult, employeeResult] = await Promise.all([
      supabase
        .from("employee_balances")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select(
          "id, employee_no, first_name, last_name, department, position, employment_status, company_id",
        )
        .order("first_name", { ascending: true }),
    ]);

    if (balanceResult.error) {
      console.log("GET EMPLOYEE BALANCES ERROR:", balanceResult.error.message);
    }

    if (employeeResult.error) {
      console.log("GET EMPLOYEES ERROR:", employeeResult.error.message);
    }

    setBalances(balanceResult.data || []);
    setEmployees(employeeResult.data || []);
    setLoading(false);
  };

  /// ACTIONS
  const createManualLiability = async () => {
    if (!permissions?.can_create) {
      deny();
      return;
    }

    if (!liabilityEmployeeId || !liabilityType || !liabilityAmount) {
      alert("Complete employee, type, and amount.");
      return;
    }

    const amountValue = Number(liabilityAmount || 0);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    const employee = employeeMap.get(liabilityEmployeeId);

    if (!employee) {
      alert("Employee not found. Please refresh and try again.");
      return;
    }

    const employeeName = getEmployeeName(employee);
    const now = new Date().toISOString();
    const companyId = getCurrentCompanyId() || employee.company_id || "";

    if (!companyId) {
      alert("No company selected. Please login again before creating employee liabilities.");
      return;
    }

    const payload = {
      company_id: companyId,
      employee_id: employee.id,
      employee_name: employeeName,
      balance_type: liabilityType,
      original_amount: amountValue,
      remaining_balance: amountValue,
      status: "Active",
      source_module: "Employee Balance Ledger",
      source_id: null,
      period_id: null,
      remarks:
        liabilityRemarks.trim() ||
        `${liabilityType} manually created from Employee Balance Ledger.`,
      created_at: now,
      updated_at: now,
    };

    const confirmed = confirm(
      `Create employee liability?\n\nEmployee: ${employeeName}\nType: ${liabilityType}\nAmount: ${formatPeso(amountValue)}\n\nThis will be available for payroll deduction.`,
    );

    if (!confirmed) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("employee_balances")
      .insert(payload)
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.log("CREATE EMPLOYEE LIABILITY ERROR:", error.message);
      alert(`Failed to create employee liability.\n\n${error.message}`);
      return;
    }

    await createAuditLog({
      userName: getUserName(),
      module: "Employee Balance Ledger",
      action: "Create Employee Liability",
      description: `${employeeName} ${liabilityType} created - ${formatPeso(amountValue)}`,
      severity: "warning",
      recordId: data?.id,
      newValue: payload,
    });

    setLiabilityEmployeeId("");
    setLiabilityType("Employee Meal Charge");
    setLiabilityAmount("");
    setLiabilityRemarks("");

    await loadData();
    alert(
      "Employee liability created. It will be available for payroll deduction.",
    );
  };

  const cancelBalance = async (balance: EmployeeBalance) => {
    if (!permissions?.can_delete) {
      deny();
      return;
    }

    if (normalizeLower(balance.status) !== "active") {
      alert("Only active balances can be cancelled.");
      return;
    }

    const reason = prompt("Reason for cancelling this balance?");
    if (!reason?.trim()) {
      alert("Cancel reason is required.");
      return;
    }

    const confirmed = confirm(
      `Cancel this balance?\n\n${getBalanceEmployeeName(balance)}\n${balance.balance_type || "Balance"}\nRemaining: ${formatPeso(balance.remaining_balance)}\n\nReminder: Cancel is for correction only. Payroll-deductible items should normally be settled through payroll.`,
    );

    if (!confirmed) return;

    const payload = {
      remaining_balance: 0,
      status: "Cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason.trim(),
      remarks:
        `${balance.remarks || ""} | Cancelled from Employee Balance Ledger. Reason: ${reason.trim()}.`.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("employee_balances")
      .update(payload)
      .eq("id", balance.id);

    if (error) {
      console.log("CANCEL BALANCE ERROR:", error.message);
      alert("Failed to cancel balance.");
      return;
    }

    await createAuditLog({
      userName: getUserName(),
      module: "Employee Balance Ledger",
      action: "Cancel Employee Liability",
      description: `${getBalanceEmployeeName(balance)} ${balance.balance_type || "balance"} cancelled - ${formatPeso(balance.remaining_balance)}. Reason: ${reason.trim()}`,
      severity: "critical",
      recordId: balance.id,
      oldValue: balance,
      newValue: payload,
    });

    await loadData();
  };

  /// EFFECTS
  useEffect(() => {
    getPermissions();
    loadData();
  }, []);

  /// CALCULATIONS
  const enrichedBalances = useMemo(() => {
    return balances.map((balance) => ({
      ...balance,
      employee_name: getBalanceEmployeeName(balance),
    }));
  }, [balances, employeeMap]);

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set(enrichedBalances.map((item) => item.balance_type || "Balance")),
    ).sort();
  }, [enrichedBalances]);

  const sourceOptions = useMemo(() => {
    return Array.from(
      new Set(enrichedBalances.map((item) => item.source_module || "Unknown")),
    ).sort();
  }, [enrichedBalances]);

  const employeeOptions = useMemo(() => {
    return Array.from(
      new Set(
        employees.map((item) => getEmployeeName(item)).filter(Boolean),
      ),
    ).sort();
  }, [employees]);

  const departmentOptions = useMemo(() => {
    return Array.from(
      new Set(
        employees.map((item) => item.department || "Unassigned").filter(Boolean),
      ),
    ).sort();
  }, [employees]);

  const filteredBalances = useMemo(() => {
    return enrichedBalances.filter((item) => {
      const search = searchTerm.toLowerCase();
      const rowText =
        `${item.employee_name || ""} ${item.balance_type || ""} ${item.status || ""} ${item.source_module || ""} ${item.source_id || ""} ${item.remarks || ""}`.toLowerCase();

      const matchesSearch = rowText.includes(search);
      const matchesStatus =
        statusFilter === "ALL" ||
        normalizeLower(item.status || "Active") ===
          normalizeLower(statusFilter);
      const matchesType =
        typeFilter === "ALL" || item.balance_type === typeFilter;
      const matchesSource =
        sourceFilter === "ALL" || item.source_module === sourceFilter;
      const matchesEmployee =
        selectedEmployeeName === "ALL" ||
        item.employee_name === selectedEmployeeName;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesSource &&
        matchesEmployee
      );
    });
  }, [
    enrichedBalances,
    searchTerm,
    statusFilter,
    typeFilter,
    sourceFilter,
    selectedEmployeeName,
  ]);

  const employeeLiabilityBalances = filteredBalances.filter(isEmployeeLiabilityItem);
  const payrollBalanceRecords = filteredBalances.filter(isPayrollBalanceItem);
  const displayBalances =
    ledgerTab === "PAYROLL_BALANCES"
      ? payrollBalanceRecords
      : employeeLiabilityBalances;

  const displayTitle =
    ledgerTab === "PAYROLL_BALANCES" ? "Payroll Balances" : "Employee Liabilities";

  const displayDescription =
    ledgerTab === "PAYROLL_BALANCES"
      ? "Outstanding salary balances owed by the company to employees."
      : "Amounts owed by employees to the company and collected through payroll.";

  const activeBalances = enrichedBalances.filter(
    (item) => normalizeLower(item.status || "Active") === "active",
  );
  const paidBalances = enrichedBalances.filter((item) =>
    ["paid", "closed", "settled"].includes(normalizeLower(item.status)),
  );
  const cancelledBalances = enrichedBalances.filter((item) =>
    ["cancelled", "canceled"].includes(normalizeLower(item.status)),
  );

  const totalOutstanding = activeBalances.reduce(
    (sum, item) => sum + Number(item.remaining_balance || 0),
    0,
  );

  const totalPaidThroughPayroll = enrichedBalances.reduce(
    (sum, item) => sum + getPaidAmount(item),
    0,
  );

  const activeEmployeeLiabilities = activeBalances.filter(isEmployeeLiabilityItem);
  const activePayrollBalances = activeBalances.filter(isPayrollBalanceItem);

  const totalEmployeeLiabilitiesOutstanding = activeEmployeeLiabilities.reduce(
    (sum, item) => sum + Number(item.remaining_balance || 0),
    0,
  );

  const totalPayrollBalancesOutstanding = activePayrollBalances.reduce(
    (sum, item) => sum + Number(item.remaining_balance || 0),
    0,
  );

  const totalEmployeeLiabilitiesPaid = enrichedBalances
    .filter(isEmployeeLiabilityItem)
    .reduce((sum, item) => sum + getPaidAmount(item), 0);

  const totalPayrollBalancesPaid = enrichedBalances
    .filter(isPayrollBalanceItem)
    .reduce((sum, item) => sum + getPaidAmount(item), 0);

  const cashAdvanceOutstanding = activeBalances
    .filter((item) => getLiabilityCategory(item) === "Cash Advance")
    .reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0);

  const restaurantOutstanding = activeBalances
    .filter((item) => getLiabilityCategory(item) === "Restaurant / Unpaid")
    .reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0);

  const carryForwardOutstanding = activeBalances
    .filter((item) => getLiabilityCategory(item) === "Payroll Carry Forward")
    .reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0);

  const employeeSummary = useMemo(() => {
    const map = new Map<string, any>();

    displayBalances.forEach((item) => {
      const name = item.employee_name || "Unknown Employee";
      const current = map.get(name) || {
        employeeName: name,
        activeCount: 0,
        paidCount: 0,
        cancelledCount: 0,
        outstanding: 0,
        originalTotal: 0,
        paidTotal: 0,
        cashAdvance: 0,
        restaurant: 0,
        carryForward: 0,
        payrollBalance: 0,
        other: 0,
        rows: [],
      };

      current.rows.push(item);
      current.originalTotal += Number(item.original_amount || 0);
      current.paidTotal += getPaidAmount(item);

      if (normalizeLower(item.status || "Active") === "active") {
        const amount = Number(item.remaining_balance || 0);
        const category = getLiabilityCategory(item);

        current.activeCount += 1;
        current.outstanding += amount;

        if (category === "Cash Advance") current.cashAdvance += amount;
        else if (category === "Restaurant / Unpaid")
          current.restaurant += amount;
        else if (category === "Payroll Carry Forward") current.carryForward += amount;
        else if (category === "Payroll Balance")
          current.payrollBalance += amount;
        else current.other += amount;
      } else if (
        ["paid", "closed", "settled"].includes(normalizeLower(item.status))
      ) {
        current.paidCount += 1;
      } else if (
        ["cancelled", "canceled"].includes(normalizeLower(item.status))
      ) {
        current.cancelledCount += 1;
      }

      map.set(name, current);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.outstanding - a.outstanding,
    );
  }, [displayBalances]);

  const selectedEmployeeLedgerRows = selectedEmployeeLedger
    ? enrichedBalances.filter((item) => {
        const sameEmployeeId =
          selectedEmployeeLedger.employeeId &&
          String(item.employee_id || "") === String(selectedEmployeeLedger.employeeId);
        const sameEmployeeName =
          String(item.employee_name || "") === String(selectedEmployeeLedger.employeeName);

        return sameEmployeeId || sameEmployeeName;
      })
    : [];

  const employeeLedgerDirectory = useMemo(() => {
    return employees
      .map((employee) => {
        const employeeName = getEmployeeName(employee);
        const rows = enrichedBalances.filter((item) => {
          const sameEmployeeId =
            employee.id && String(item.employee_id || "") === String(employee.id);
          const sameEmployeeName = String(item.employee_name || "") === String(employeeName);

          return sameEmployeeId || sameEmployeeName;
        });

        const activeRowsForEmployee = rows.filter(
          (item) => normalizeLower(item.status || "Active") === "active",
        );
        const liabilityRowsForEmployee = activeRowsForEmployee.filter(isEmployeeLiabilityItem);
        const payrollRowsForEmployee = activeRowsForEmployee.filter(isPayrollBalanceItem);
        const historyRowsForEmployee = rows.filter(
          (item) => normalizeLower(item.status || "Active") !== "active",
        );
        const outstanding = activeRowsForEmployee.reduce(
          (sum, item) => sum + Number(item.remaining_balance || 0),
          0,
        );
        const liabilityOutstanding = liabilityRowsForEmployee.reduce(
          (sum, item) => sum + Number(item.remaining_balance || 0),
          0,
        );
        const payrollOutstanding = payrollRowsForEmployee.reduce(
          (sum, item) => sum + Number(item.remaining_balance || 0),
          0,
        );

        return {
          employee,
          employeeName,
          rows,
          activeCount: activeRowsForEmployee.length,
          historyCount: historyRowsForEmployee.length,
          liabilityOutstanding,
          payrollOutstanding,
          outstanding,
        };
      })
      .filter((item) => {
        const search = searchTerm.toLowerCase();
        const rowText = `${item.employeeName} ${item.employee.employee_no || ""} ${item.employee.department || ""} ${item.employee.position || ""} ${item.rows
          .map((row) => `${row.balance_type || ""} ${row.source_module || ""} ${row.remarks || ""}`)
          .join(" ")}`.toLowerCase();
        const matchesSearch = rowText.includes(search);
        const matchesEmployee =
          selectedEmployeeName === "ALL" || item.employeeName === selectedEmployeeName;
        const matchesDepartment =
          departmentFilter === "ALL" || (item.employee.department || "Unassigned") === departmentFilter;

        return matchesSearch && matchesEmployee && matchesDepartment;
      })
      .sort((a, b) => b.outstanding - a.outstanding || a.employeeName.localeCompare(b.employeeName));
  }, [employees, enrichedBalances, searchTerm, selectedEmployeeName, departmentFilter]);

  const assistantReminders = [
    ...(activeEmployeeLiabilities.length > 0
      ? [
          {
            type: "Warning",
            tone: "warning",
            text: `${activeEmployeeLiabilities.length} active employee liability row(s) are available for payroll deduction.`,
          },
        ]
      : []),
    ...(totalEmployeeLiabilitiesOutstanding > 0
      ? [
          {
            type: "Warning",
            tone: "warning",
            text: `Employee liabilities outstanding: ${formatPeso(totalEmployeeLiabilitiesOutstanding)}.`,
          },
        ]
      : []),
    ...(totalPayrollBalancesOutstanding > 0
      ? [
          {
            type: "Information",
            tone: "info",
            text: `Payroll balances owed to employees: ${formatPeso(totalPayrollBalancesOutstanding)}.`,
          },
        ]
      : []),
    ...(cancelledBalances.length > 0
      ? [
          {
            type: "Neutral",
            tone: "neutral",
            text: `${cancelledBalances.length} cancelled ledger item(s) remain in audit history.`,
          },
        ]
      : []),
    {
      type: "Information",
      tone: "info",
      text: "Settlement stays controlled through Payroll Manager; manual cancel is for correction only.",
    },
  ].slice(0, 5);

  /// UI
  return (
    <PageGuard moduleKey="employee_balances">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />
        <TopNavbar breadcrumb="PAYROLL / EMPLOYEE BALANCE LEDGER" />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Payroll Control
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Employee Balance Ledger
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  Central ledger for employee liabilities, cash advances,
                  restaurant unpaid charges, payroll balances, and carry-forward
                  amounts. Payroll-deductible items are monitored here and
                  settled through payroll processing.
                </p>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={17} />
                {loading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </section>

          <section className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LedgerKpiCard
              label="Outstanding Liabilities"
              value={formatPeso(totalEmployeeLiabilitiesOutstanding)}
              helper={`${activeEmployeeLiabilities.length} active row(s)`}
              tone="warning"
            />
            <LedgerKpiCard
              label="Payroll Balances"
              value={formatPeso(totalPayrollBalancesOutstanding)}
              helper={`${activePayrollBalances.length} active row(s)`}
              tone="info"
            />
            <LedgerKpiCard
              label="Collected Through Payroll"
              value={formatPeso(totalPaidThroughPayroll)}
              helper={`${paidBalances.length} paid / closed row(s)`}
              tone="success"
            />
            <LedgerKpiCard
              label="Cancelled Items"
              value={cancelledBalances.length}
              helper="Audit retained"
              tone="danger"
            />
          </section>

          <section className="mb-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Payroll Settlement Rule
                </h2>
                <p className="mt-1 max-w-5xl text-sm font-medium leading-6 text-blue-700">
                  Cash advances, restaurant unpaid charges, carry-forward
                  balances, and payroll balances should be deducted and closed
                  through Payroll Manager. Manual paid buttons are disabled to
                  protect the payroll audit trail.
                </p>
              </div>
              <ShieldCheck className="shrink-0 text-blue-700" size={30} />
            </div>
          </section>

          <section className="mb-4 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Manual Liability Entry
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Add Employee Liability
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
                    Use this for employee meal charges, restaurant unpaid items,
                    salary loans, or manual liabilities that should be deducted
                    through payroll.
                  </p>
                </div>
                <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                  Settlement via Payroll
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-2">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Employee
                  </label>
                  <select
                    value={liabilityEmployeeId}
                    onChange={(event) => setLiabilityEmployeeId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {getEmployeeName(employee)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Liability Type
                  </label>
                  <select
                    value={liabilityType}
                    onChange={(event) => setLiabilityType(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    {MANUAL_LIABILITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Amount
                  </label>
                  <input
                    value={liabilityAmount}
                    onChange={(event) => setLiabilityAmount(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Remarks / Reference
                </label>
                <textarea
                  value={liabilityRemarks}
                  onChange={(event) => setLiabilityRemarks(event.target.value)}
                  placeholder="Remarks, source reference, or reason for the liability..."
                  className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {!permissions?.can_create ? (
                  <p className="text-xs font-bold text-red-600">
                    Your role has no create permission for Employee Balances.
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-500">
                    New liabilities become available for payroll deduction after saving.
                  </p>
                )}

                <button
                  onClick={createManualLiability}
                  disabled={loading || !permissions?.can_create}
                  className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Liability
                </button>
              </div>
            </div>
          </section>

          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search employee, type, source, ID, or remarks..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-9 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All Types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All Sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <select
                value={selectedEmployeeName}
                onChange={(event) => setSelectedEmployeeName(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All Employees</option>
                {employeeOptions.map((employee) => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>

              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All Departments</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 xl:col-span-3">
                Showing <span className="mx-1 font-black text-slate-950">{displayBalances.length}</span>{" "}
                {ledgerTab === "PAYROLL_BALANCES" ? "payroll balance" : "employee liability"} record(s) • <span className="mx-1 font-black text-slate-950">{employeeLedgerDirectory.length}</span> employee ledger(s).
              </div>
            </div>
          </section>

          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLedgerTab("LIABILITIES")}
                  className={
                    ledgerTab === "LIABILITIES"
                      ? "h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white"
                      : "h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                  }
                >
                  Liabilities <span className="ml-2 text-xs opacity-75">{employeeLiabilityBalances.length}</span>
                </button>

                <button
                  onClick={() => setLedgerTab("PAYROLL_BALANCES")}
                  className={
                    ledgerTab === "PAYROLL_BALANCES"
                      ? "h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white"
                      : "h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                  }
                >
                  Payroll Balances <span className="ml-2 text-xs opacity-75">{payrollBalanceRecords.length}</span>
                </button>
              </div>

              <div className="text-sm font-bold text-slate-500">
                {displayDescription}
              </div>
            </div>
          </section>

          <section className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Ledger Table
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {displayTitle}
                  </h2>
                </div>
                <ShieldCheck className="text-blue-700" size={24} />
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Original</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {displayBalances.map((balance) => {
                    const isActive = normalizeLower(balance.status || "Active") === "active";
                    const category = getLiabilityCategory(balance);

                    return (
                      <tr key={balance.id} className="transition-all duration-200 hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">
                            {balance.employee_name || "Unknown Employee"}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {balance.employee_id || "No employee ID"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <TypeBadge label={category} />
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {balance.balance_type || "Balance"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-slate-700">
                          {formatPeso(balance.original_amount)}
                        </td>

                        <td className="px-4 py-4 text-right font-black text-slate-950">
                          {formatPeso(balance.remaining_balance)}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={balance.status || "Active"} />
                        </td>

                        <td className="px-4 py-4 text-slate-500">
                          {formatDate(balance.updated_at || balance.created_at)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => openEmployeeLedger(balance)}
                              className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                            >
                              <Eye size={13} /> View
                            </button>

                            {isActive && permissions?.can_delete && (
                              <button
                                onClick={() => cancelBalance(balance)}
                                className="h-9 rounded-xl bg-red-600 px-3 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {displayBalances.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <p className="font-black text-slate-700">
                          {ledgerTab === "PAYROLL_BALANCES"
                            ? "No payroll balance records found."
                            : "No employee liability records found."}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Adjust your filters or refresh the ledger.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Employee Master Ledger
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    All Employee Drawers
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Filter by employee or department, then open a full ledger drawer for every active employee.
                  </p>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {employeeLedgerDirectory.length} employee(s)
                </p>
              </div>
            </div>

            <div className="overflow-auto p-4">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="rounded-l-xl px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Active Liabilities</th>
                    <th className="px-4 py-3 text-right">Payroll Balances</th>
                    <th className="px-4 py-3 text-right">Total Outstanding</th>
                    <th className="px-4 py-3 text-center">Ledger Rows</th>
                    <th className="rounded-r-xl px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {employeeLedgerDirectory.map((item) => (
                    <tr
                      key={item.employee.id}
                      className="transition-all duration-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">{item.employeeName}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {item.employee.employee_no || "No employee no."} • {item.employee.position || "No position"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {item.employee.department || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-amber-700">
                        {formatPeso(item.liabilityOutstanding)}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-blue-700">
                        {formatPeso(item.payrollOutstanding)}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-950">
                        {formatPeso(item.outstanding)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                          Active {item.activeCount} • History {item.historyCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openEmployeeLedgerFromEmployee(item.employee)}
                          className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                        >
                          <Eye size={13} /> View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}

                  {employeeLedgerDirectory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm font-bold text-slate-500">
                        No employee ledger found for the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {selectedEmployeeLedger && (
          <EmployeeLedgerDrawer
            employeeName={selectedEmployeeLedger.employeeName}
            employeeMeta={selectedEmployeeLedger}
            rows={selectedEmployeeLedgerRows}
            onClose={() => setSelectedEmployeeLedger(null)}
            formatPeso={formatPeso}
            formatDate={formatDate}
            getLiabilityCategory={getLiabilityCategory}
            getPaidAmount={getPaidAmount}
            getProgressLabel={getProgressLabel}
            getLedgerDirectionLabel={getLedgerDirectionLabel}
            isPayrollBalanceItem={isPayrollBalanceItem}
          />
        )}

        <OpscoreAssistant reminders={assistantReminders} />
      </div>
    </PageGuard>
  );
}

function LedgerKpiCard({ label, value, helper, tone = "neutral" }: any) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "info"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-3xl border bg-white p-5 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-bold opacity-80">{helper}</p>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const normalized = String(status || "Active").toLowerCase();

  const className =
    normalized.includes("active") || normalized.includes("open")
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized.includes("paid") || normalized.includes("closed") || normalized.includes("settled")
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : normalized.includes("cancel") || normalized.includes("void") || normalized.includes("reversed")
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      {status || "Active"}
    </span>
  );
}

function TypeBadge({ label }: any) {
  const text = String(label || "Balance").toLowerCase();

  const className =
    text.includes("cash")
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : text.includes("payroll") || text.includes("carry")
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : text.includes("restaurant") || text.includes("unpaid")
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      {label || "Balance"}
    </span>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value || "-"}
      </p>
    </div>
  );
}

function FinancialStat({ label, value, tone = "default" }: any) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}


function EmployeeLedgerDrawer({
  employeeName,
  employeeMeta,
  rows,
  onClose,
  formatPeso,
  formatDate,
  getLiabilityCategory,
  getPaidAmount,
  getProgressLabel,
  getLedgerDirectionLabel,
  isPayrollBalanceItem,
}: any) {
  const activeRows = rows.filter(
    (row: EmployeeBalance) => String(row.status || "Active").toLowerCase() === "active",
  );
  const paidRows = rows.filter((row: EmployeeBalance) =>
    ["paid", "closed", "settled"].includes(String(row.status || "").toLowerCase()),
  );
  const cancelledRows = rows.filter((row: EmployeeBalance) =>
    ["cancelled", "canceled"].includes(String(row.status || "").toLowerCase()),
  );
  const liabilityRows = rows.filter((row: EmployeeBalance) => !isPayrollBalanceItem(row));
  const payrollRows = rows.filter((row: EmployeeBalance) => isPayrollBalanceItem(row));
  const activeLiabilityRows = liabilityRows.filter(
    (row: EmployeeBalance) => String(row.status || "Active").toLowerCase() === "active",
  );
  const activePayrollRows = payrollRows.filter(
    (row: EmployeeBalance) => String(row.status || "Active").toLowerCase() === "active",
  );
  const historyRows = rows.filter(
    (row: EmployeeBalance) => String(row.status || "Active").toLowerCase() !== "active",
  );

  const originalTotal = rows.reduce(
    (sum: number, row: EmployeeBalance) => sum + Number(row.original_amount || 0),
    0,
  );
  const paidTotal = rows.reduce(
    (sum: number, row: EmployeeBalance) => sum + getPaidAmount(row),
    0,
  );
  const remainingTotal = activeRows.reduce(
    (sum: number, row: EmployeeBalance) => sum + Number(row.remaining_balance || 0),
    0,
  );
  const liabilityTotal = activeLiabilityRows.reduce(
    (sum: number, row: EmployeeBalance) => sum + Number(row.remaining_balance || 0),
    0,
  );
  const payrollTotal = activePayrollRows.reduce(
    (sum: number, row: EmployeeBalance) => sum + Number(row.remaining_balance || 0),
    0,
  );

  return (
    <div className="fixed right-0 top-16 z-50 flex h-[calc(100vh-64px)] w-full justify-end bg-slate-950/35">
      <aside className="flex h-full w-full max-w-[820px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Employee Balance Ledger
              </p>
              <h2 className="mt-2 truncate text-3xl font-black tracking-tight text-slate-950">
                {employeeName}
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {(employeeMeta?.department || "Unassigned Department")} • {(employeeMeta?.position || "No position")} • {(employeeMeta?.employeeNo || "No employee no.")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Active {activeRows.length}
                </span>
                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  Payroll {payrollRows.length}
                </span>
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  Liabilities {liabilityRows.length}
                </span>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  History {historyRows.length}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              aria-label="Close employee ledger"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F5F7FB] p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FinancialStat label="Original" value={formatPeso(originalTotal)} />
            <FinancialStat label="Paid" value={formatPeso(paidTotal)} tone="success" />
            <FinancialStat
              label="Remaining"
              value={formatPeso(remainingTotal)}
              tone={remainingTotal > 0 ? "warning" : "success"}
            />
            <FinancialStat label="Ledger Rows" value={rows.length} tone="info" />
          </section>

          <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                Employee Owes Company
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatPeso(liabilityTotal)}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-700">
                Active employee liabilities
              </p>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                Company Owes Employee
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatPeso(payrollTotal)}
              </p>
              <p className="mt-1 text-xs font-bold text-blue-700">
                Active payroll balances
              </p>
            </div>
          </section>

          <LedgerRowsSection
            title="Active Employee Liabilities"
            description="Cash advances, meal charges, salary loans, and other active balances owed by the employee."
            rows={activeLiabilityRows}
            emptyText="No active employee liabilities."
            formatPeso={formatPeso}
            formatDate={formatDate}
            getLiabilityCategory={getLiabilityCategory}
            getPaidAmount={getPaidAmount}
            getProgressLabel={getProgressLabel}
            getLedgerDirectionLabel={getLedgerDirectionLabel}
          />

          <LedgerRowsSection
            title="Active Payroll Balances"
            description="Partial releases, unreleased salary, and carry-forward balances owed to the employee."
            rows={activePayrollRows}
            emptyText="No active payroll balances."
            formatPeso={formatPeso}
            formatDate={formatDate}
            getLiabilityCategory={getLiabilityCategory}
            getPaidAmount={getPaidAmount}
            getProgressLabel={getProgressLabel}
            getLedgerDirectionLabel={getLedgerDirectionLabel}
          />

          <LedgerRowsSection
            title="Paid / Cancelled History"
            description="Closed, paid, or cancelled ledger records retained for audit trail."
            rows={historyRows}
            emptyText="No paid or cancelled ledger history."
            formatPeso={formatPeso}
            formatDate={formatDate}
            getLiabilityCategory={getLiabilityCategory}
            getPaidAmount={getPaidAmount}
            getProgressLabel={getProgressLabel}
            getLedgerDirectionLabel={getLedgerDirectionLabel}
          />
        </div>

        <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-500">
              Settlement stays controlled by Payroll Manager. This drawer is employee-level audit view only.
            </p>
            <button
              onClick={onClose}
              className="h-11 shrink-0 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
            >
              Close Ledger
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function LedgerRowsSection({
  title,
  description,
  rows,
  emptyText,
  formatPeso,
  formatDate,
  getLiabilityCategory,
  getPaidAmount,
  getProgressLabel,
  getLedgerDirectionLabel,
}: any) {
  return (
    <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {description}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {rows.length} row(s)
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row: EmployeeBalance) => {
          const category = getLiabilityCategory(row);
          const paidAmount = getPaidAmount(row);
          const progressLabel = getProgressLabel(row);

          return (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <TypeBadge label={category} />
                    <StatusBadge status={row.status || "Active"} />
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                      {getLedgerDirectionLabel(row)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-black text-slate-950">
                    {row.balance_type || "Balance"}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Source: {row.source_module || "Unknown"} • Updated {formatDate(row.updated_at || row.created_at)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-right sm:min-w-[330px]">
                  <MiniLedgerStat label="Original" value={formatPeso(row.original_amount)} />
                  <MiniLedgerStat label="Paid" value={formatPeso(paidAmount)} />
                  <MiniLedgerStat label="Remaining" value={formatPeso(row.remaining_balance)} strong />
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: progressLabel }} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <DetailRow label="Progress" value={progressLabel} />
                <DetailRow label="Source ID" value={row.source_id || "-"} />
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Remarks
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-600">
                  {row.remarks || "No remarks recorded."}
                </p>
              </div>

              {row.cancel_reason && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
                    Cancel Reason
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-red-700">
                    {row.cancel_reason}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 py-10 text-center text-sm font-bold text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function MiniLedgerStat({ label, value, strong = false }: any) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className={strong ? "mt-1 font-black text-slate-950" : "mt-1 font-bold text-slate-700"}>
        {value}
      </p>
    </div>
  );
}

function BalanceDrawer({
  balance,
  onClose,
  formatPeso,
  formatDate,
  getLiabilityCategory,
  getPaidAmount,
  getProgressLabel,
  getLedgerDirectionLabel,
}: any) {
  const category = getLiabilityCategory(balance);
  const paidAmount = getPaidAmount(balance);
  const progressLabel = getProgressLabel(balance);
  const remaining = Number(balance.remaining_balance || 0);

  return (
    <div className="fixed right-0 top-16 z-50 flex h-[calc(100vh-64px)] w-full justify-end bg-slate-950/35">
      <aside className="flex h-full w-full max-w-[820px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Ledger Details
              </p>
              <h2 className="mt-2 truncate text-3xl font-black tracking-tight text-slate-950">
                {balance.employee_name || "Unknown Employee"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <TypeBadge label={category} />
                <StatusBadge status={balance.status || "Active"} />
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {getLedgerDirectionLabel(balance)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              aria-label="Close ledger details"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F5F7FB] p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FinancialStat
              label="Original"
              value={formatPeso(balance.original_amount)}
            />
            <FinancialStat
              label="Paid"
              value={formatPeso(paidAmount)}
              tone="success"
            />
            <FinancialStat
              label="Remaining"
              value={formatPeso(remaining)}
              tone={remaining > 0 ? "warning" : "success"}
            />
          </section>

          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Financial Progress
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: progressLabel }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Collected through payroll</span>
              <span className="text-slate-950">{progressLabel}</span>
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Ledger Details
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <DetailRow label="Employee ID" value={balance.employee_id || "-"} />
              <DetailRow label="Balance Type" value={balance.balance_type || "Balance"} />
              <DetailRow label="Direction" value={getLedgerDirectionLabel(balance)} />
              <DetailRow label="Source" value={balance.source_module || "Unknown"} />
              <DetailRow label="Source ID" value={balance.source_id || "-"} />
              <DetailRow label="Period ID" value={balance.period_id || "-"} />
              <DetailRow label="Created" value={formatDate(balance.created_at)} />
              <DetailRow label="Updated" value={formatDate(balance.updated_at)} />
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Audit Notes
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Remarks
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                  {balance.remarks || "No remarks recorded."}
                </p>
              </div>

              {balance.cancel_reason && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
                    Cancel Reason
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-red-700">
                    {balance.cancel_reason}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
            >
              Close Details
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}


