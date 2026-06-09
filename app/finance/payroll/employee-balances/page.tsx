"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
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
  const [selectedBalance, setSelectedBalance] =
    useState<EmployeeBalance | null>(null);

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
        enrichedBalances.map(
          (item) => item.employee_name || "Unknown Employee",
        ),
      ),
    ).sort();
  }, [enrichedBalances]);

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

  /// UI
  return (
    <PageGuard moduleKey="employee_balances">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6 xl:p-8">
          <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                Payroll Control
              </p>
              <h1 className="mt-2 text-4xl font-black">
                Employee Balance Ledger
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                Central ledger for employee liabilities such as cash advances,
                restaurant unpaid charges, carry-forward amounts, and payroll
                balances. Payroll-deductible items are monitored here but
                settled through payroll processing.
              </p>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={18} />
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </section>

          <section className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-black text-blue-300">
                  Payroll Settlement Rule
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Cash advances, restaurant unpaid charges, carry-forward
                  balances, and payroll balances should be deducted and closed
                  through Payroll Manager. Manual paid buttons are disabled to
                  protect audit trail.
                </p>
              </div>
              <ShieldCheck className="shrink-0 text-blue-300" size={30} />
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                onClick={() => setLedgerTab("LIABILITIES")}
                className={`rounded-2xl border p-5 text-left ${
                  ledgerTab === "LIABILITIES"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                    : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Employee Owes Company
                </p>
                <h2 className="mt-1 text-xl font-black">Employee Liabilities</h2>
                <p className="mt-1 text-sm opacity-80">
                  Cash advances, salary loans, meal charges, and restaurant unpaid items.
                </p>
                <p className="mt-3 text-2xl font-black">
                  {formatPeso(totalEmployeeLiabilitiesOutstanding)}
                </p>
              </button>

              <button
                onClick={() => setLedgerTab("PAYROLL_BALANCES")}
                className={`rounded-2xl border p-5 text-left ${
                  ledgerTab === "PAYROLL_BALANCES"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                    : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Company Owes Employee
                </p>
                <h2 className="mt-1 text-xl font-black">Payroll Balances</h2>
                <p className="mt-1 text-sm opacity-80">
                  Partial releases, unreleased salary, and payroll carry-forward balances.
                </p>
                <p className="mt-3 text-2xl font-black">
                  {formatPeso(totalPayrollBalancesOutstanding)}
                </p>
              </button>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-black">Add Employee Liability</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Use this for employee meal charges, restaurant unpaid items,
                  salary loans, or manual liabilities that should be deducted
                  through payroll.
                </p>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-300">
                Settlement: Via Payroll
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <select
                value={liabilityEmployeeId}
                onChange={(event) => setLiabilityEmployeeId(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none xl:col-span-2"
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {getEmployeeName(employee)}
                  </option>
                ))}
              </select>

              <select
                value={liabilityType}
                onChange={(event) => setLiabilityType(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {MANUAL_LIABILITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <input
                value={liabilityAmount}
                onChange={(event) => setLiabilityAmount(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <button
                onClick={createManualLiability}
                disabled={loading || !permissions?.can_create}
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Liability
              </button>
            </div>

            <input
              value={liabilityRemarks}
              onChange={(event) => setLiabilityRemarks(event.target.value)}
              placeholder="Remarks / reference / reason"
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            />

            {!permissions?.can_create && (
              <p className="mt-3 text-xs text-red-300">
                Your role has no create permission for Employee Balances.
              </p>
            )}
          </section>

          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-slate-500"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search employee, type, source, source ID, remarks..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
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
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
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
                onChange={(event) =>
                  setSelectedEmployeeName(event.target.value)
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none xl:col-span-2"
              >
                <option value="ALL">All Employees</option>
                {employeeOptions.map((employee) => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>

              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-400 xl:col-span-3">
                Showing{" "}
                <span className="font-black text-white">
                  {displayBalances.length}
                </span>{" "}
                {ledgerTab === "PAYROLL_BALANCES" ? "payroll balance" : "employee liability"} record(s). Settlement is controlled by payroll; cancel is
                for correction only.
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{displayTitle}</h2>
                <p className="text-sm text-slate-400">
                  {displayDescription}
                </p>
              </div>
              <ShieldCheck className="text-blue-300" size={24} />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Original</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Activity</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBalances.map((balance) => {
                    const isActive =
                      normalizeLower(balance.status || "Active") === "active";
                    const category = getLiabilityCategory(balance);

                    return (
                      <tr
                        key={balance.id}
                        className="border-t border-slate-800 hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-4">
                          <p className="font-black text-white">
                            {balance.employee_name || "Unknown Employee"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {balance.employee_id || "No employee ID"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeStyle(`${category} ${balance.balance_type}`)}`}
                          >
                            {category}
                          </span>
                          <p className="mt-1 text-xs text-slate-500">
                            {balance.balance_type || "Balance"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-slate-200">
                          {formatPeso(balance.original_amount)}
                        </td>

                        <td className="px-4 py-4 text-right font-black text-blue-300">
                          {formatPeso(balance.remaining_balance)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(balance.status)}`}
                          >
                            {balance.status || "Active"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(balance.updated_at || balance.created_at)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => setSelectedBalance(balance)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-slate-800"
                            >
                              <Eye size={13} /> View
                            </button>

                            {isActive && permissions?.can_delete && (
                              <button
                                onClick={() => cancelBalance(balance)}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20"
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
                      <td
                        colSpan={7}
                        className="px-4 py-14 text-center text-slate-500"
                      >
                        {ledgerTab === "PAYROLL_BALANCES"
                          ? "No payroll balance records found."
                          : "No employee liability records found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-black">
                  {ledgerTab === "PAYROLL_BALANCES"
                    ? "Payroll Balance Summary"
                    : "Employee Liability Summary"}
                </h2>
                <p className="text-sm text-slate-400">
                  Employees ranked by active outstanding balance in the selected ledger.
                </p>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Summary is filter-aware
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {employeeSummary.slice(0, 12).map((employee) => (
                <button
                  key={employee.employeeName}
                  onClick={() => setSelectedEmployeeName(employee.employeeName)}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-left hover:bg-slate-800/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">
                        {employee.employeeName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Active {employee.activeCount} • Closed {employee.paidCount}
                        • Cancelled {employee.cancelledCount}
                      </p>
                    </div>
                    <p
                      className={
                        employee.outstanding > 0
                          ? "font-black text-blue-300"
                          : "font-black text-emerald-300"
                      }
                    >
                      {formatPeso(employee.outstanding)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <MiniAmount
                      label="Cash Adv"
                      value={employee.cashAdvance}
                      formatPeso={formatPeso}
                    />
                    <MiniAmount
                      label="Rest/Unpaid"
                      value={employee.restaurant}
                      formatPeso={formatPeso}
                    />
                    <MiniAmount
                      label="Carry"
                      value={employee.carryForward}
                      formatPeso={formatPeso}
                    />
                    <MiniAmount
                      label="Other"
                      value={employee.payrollBalance + employee.other}
                      formatPeso={formatPeso}
                    />
                  </div>
                </button>
              ))}

              {employeeSummary.length === 0 && (
                <div className="rounded-xl bg-slate-950 p-6 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-4">
                  No employee summary available.
                </div>
              )}
            </div>
          </section>

        </main>

        {selectedBalance && (
          <BalanceDrawer
            balance={selectedBalance}
            onClose={() => setSelectedBalance(null)}
            formatPeso={formatPeso}
            formatDate={formatDate}
            getStatusStyle={getStatusStyle}
            getTypeStyle={getTypeStyle}
            getLiabilityCategory={getLiabilityCategory}
            isPayrollSettled={isPayrollSettled}
            getPaidAmount={getPaidAmount}
            getProgressPercent={getProgressPercent}
            getProgressLabel={getProgressLabel}
            getLedgerDirectionLabel={getLedgerDirectionLabel}
          />
        )}
      </div>
    </PageGuard>
  );
}

function MiniAmount({ label, value, formatPeso }: any) {
  return (
    <div className="rounded-lg bg-slate-900 px-2 py-1">
      <p>{label}</p>
      <p
        className={
          Number(value || 0) > 0
            ? "font-black text-blue-300"
            : "font-bold text-slate-500"
        }
      >
        {formatPeso(value)}
      </p>
    </div>
  );
}

function BalanceDrawer({
  balance,
  onClose,
  formatPeso,
  formatDate,
  getStatusStyle,
  getTypeStyle,
  getLiabilityCategory,
  isPayrollSettled,
  getPaidAmount,
  getProgressPercent,
  getProgressLabel,
  getLedgerDirectionLabel,
}: any) {
  const category = getLiabilityCategory(balance);
  const payrollSettled = isPayrollSettled(balance);
  const paidAmount = getPaidAmount(balance);
  const progressPercent = getProgressPercent(balance);
  const progressLabel = getProgressLabel(balance);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                Ledger Details
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {balance.employee_name || "Unknown Employee"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeStyle(`${category} ${balance.balance_type}`)}`}
                >
                  {category}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(balance.status)}`}
                >
                  {balance.status || "Active"}
                </span>
                <span
                  className={
                    payrollSettled
                      ? "rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300"
                      : "rounded-full bg-slate-700 px-3 py-1 text-xs font-bold text-slate-300"
                  }
                >
                  {payrollSettled ? "Settled via Payroll" : "Manual Review"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-900 p-3 text-slate-400 hover:text-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <section className="mb-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
            <h3 className="text-lg font-black text-blue-300">
              Settlement Rule
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {payrollSettled
                ? "This liability should be reduced or closed by Payroll Manager deductions, not by manual paid action."
                : "This item is not recognized as a standard payroll-deductible liability. Review source before closing."}
            </p>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <DetailCard
              label="Original Amount"
              value={formatPeso(balance.original_amount)}
            />
            <DetailCard
              label="Paid Through Payroll"
              value={formatPeso(paidAmount)}
              success
            />
            <DetailCard
              label="Remaining Balance"
              value={formatPeso(balance.remaining_balance)}
              highlight
            />
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">Settlement Progress</h3>
                <p className="text-sm text-slate-400">Computed from original amount minus remaining balance.</p>
              </div>
              <p className={progressPercent > 0 ? "text-2xl font-black text-emerald-300" : "text-2xl font-black text-slate-500"}>
                {progressLabel}
              </p>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-950">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="rounded-xl bg-slate-950 p-3">
                <p>Original</p>
                <p className="mt-1 font-black text-white">{formatPeso(balance.original_amount)}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-3">
                <p>Paid</p>
                <p className="mt-1 font-black text-emerald-300">{formatPeso(paidAmount)}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-3">
                <p>Remaining</p>
                <p className="mt-1 font-black text-blue-300">{formatPeso(balance.remaining_balance)}</p>
              </div>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailCard
              label="Ledger Direction"
              value={getLedgerDirectionLabel(balance)}
            />
            <DetailCard
              label="Source Module"
              value={balance.source_module || "-"}
            />
            <DetailCard label="Period ID" value={balance.period_id || "-"} />
            <DetailCard
              label="Created"
              value={formatDate(balance.created_at)}
            />
            <DetailCard
              label="Updated"
              value={formatDate(balance.updated_at)}
            />
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black">Reference</h3>
            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Employee ID" value={balance.employee_id || "-"} />
              <InfoRow label="Source ID" value={balance.source_id || "-"} />
              <InfoRow
                label="Cancelled At"
                value={formatDate(balance.cancelled_at)}
              />
              <InfoRow
                label="Cancel Reason"
                value={balance.cancel_reason || "-"}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black">Remarks / Ledger Notes</h3>
            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">
              {balance.remarks || "No remarks saved."}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

function DetailCard({ label, value, highlight, success }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <h3
        className={`mt-2 break-words text-xl font-black ${
          highlight ? "text-blue-300" : success ? "text-emerald-300" : "text-white"
        }`}
      >
        {value}
      </h3>
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 rounded-xl bg-slate-950 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="break-all font-semibold text-slate-200">{value}</span>
    </div>
  );
}
