"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Home,
  LockKeyhole,
  Receipt,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
type HealthStatus = "Healthy" | "Warning" | "Critical";
type Severity = "good" | "warning" | "critical";

type CheckItem = {
  module: string;
  label: string;
  count: number;
  severity: Severity;
};

export default function DatabaseHealthPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [systemRoles, setSystemRoles] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);

  const [approvalAssignments, setApprovalAssignments] = useState<any[]>([]);
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>([]);

  const [leaveCredits, setLeaveCredits] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  const [payrollRows, setPayrollRows] = useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);

  const [posSettings, setPosSettings] = useState<any[]>([]);
  const [posCategories, setPosCategories] = useState<any[]>([]);
  const [posProducts, setPosProducts] = useState<any[]>([]);
  const [posOrderTypes, setPosOrderTypes] = useState<any[]>([]);
  const [posPaymentMethods, setPosPaymentMethods] = useState<any[]>([]);

  const [apartmentUnits, setApartmentUnits] = useState<any[]>([]);
  const [apartmentBills, setApartmentBills] = useState<any[]>([]);
  const [apartmentPayments, setApartmentPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashDrawers, setCashDrawers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /// DATA
  const allowedEmployeeStatuses = ["active", "inactive", "resigned", "terminated"];
  const allowedApartmentStatuses = [
    "active",
    "occupied",
    "vacant",
    "maintenance",
    "inactive",
  ];
  const allowedDrawerStatuses = ["open", "closed", "voided"];

  /// FUNCTIONS
  const getRowsFromTables = async (tableNames: string[]) => {
    for (const tableName of tableNames) {
      const { data, error } = await supabase.from(tableName).select("*");

      if (!error && data) {
        return data || [];
      }

      if (error) {
        console.log(`DATABASE HEALTH LOAD ${tableName} ERROR:`, error.message);
      }
    }

    return [];
  };

  const loadData = async () => {
    setLoading(true);

    const [
      employeeData,
      userData,
      roleData,
      permissionData,
      approvalAssignmentData,
      approvalWorkflowData,
      leaveCreditData,
      leaveRequestData,
      leaveTypeData,
      payrollData,
      payrollPeriodData,
      posSettingData,
      posCategoryData,
      posProductData,
      posOrderTypeData,
      posPaymentMethodData,
      unitData,
      billData,
      paymentData,
      expenseData,
      drawerData,
    ] = await Promise.all([
      getRowsFromTables(["employees"]),
      getRowsFromTables(["system_users"]),
      getRowsFromTables(["system_roles"]),
      getRowsFromTables(["role_permissions"]),
      getRowsFromTables(["approval_assignments"]),
      getRowsFromTables(["approval_workflows"]),
      getRowsFromTables(["employee_leave_credits"]),
      getRowsFromTables(["leave_requests"]),
      getRowsFromTables(["leave_types"]),
      getRowsFromTables(["payroll_records"]),
      getRowsFromTables(["payroll_periods"]),
      getRowsFromTables(["pos_settings"]),
      getRowsFromTables(["pos_categories"]),
      getRowsFromTables(["pos_products"]),
      getRowsFromTables(["pos_order_types"]),
      getRowsFromTables(["pos_payment_methods"]),
      getRowsFromTables(["apartment_units"]),
      getRowsFromTables(["apartment_bills"]),
      getRowsFromTables(["apartment_payments"]),
      getRowsFromTables(["expenses"]),
      getRowsFromTables(["finance_cash_drawers"]),
    ]);

    setEmployees(employeeData);
    setSystemUsers(userData);
    setSystemRoles(roleData);
    setRolePermissions(permissionData);

    setApprovalAssignments(approvalAssignmentData);
    setApprovalWorkflows(approvalWorkflowData);

    setLeaveCredits(leaveCreditData);
    setLeaveRequests(leaveRequestData);
    setLeaveTypes(leaveTypeData);

    setPayrollRows(payrollData);
    setPayrollPeriods(payrollPeriodData);

    setPosSettings(posSettingData);
    setPosCategories(posCategoryData);
    setPosProducts(posProductData);
    setPosOrderTypes(posOrderTypeData);
    setPosPaymentMethods(posPaymentMethodData);

    setApartmentUnits(unitData);
    setApartmentBills(billData);
    setApartmentPayments(paymentData);
    setExpenses(expenseData);
    setCashDrawers(drawerData);

    setLoading(false);
  };

  const formatMoney = (value: any) =>
    `Ã¢â€šÂ±${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getFullName = (employee: any) =>
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    employee.name ||
    employee.employee_name ||
    "Unnamed Employee";

  const getDrawerStatus = (drawer: any) =>
    String(drawer.status || drawer.drawer_status || "").toLowerCase();

  const getDrawerHolder = (drawer: any) =>
    drawer.holder_name ||
    drawer.cashier_name ||
    drawer.cashier ||
    drawer.employee_name ||
    drawer.opened_by ||
    "";

  const getDrawerExpectedCash = (drawer: any) =>
    Number(drawer.expected_cash ?? drawer.expected_amount ?? 0);

  const getDrawerActualCash = (drawer: any) =>
    Number(drawer.actual_cash ?? drawer.actual_amount ?? 0);

  const getDrawerVariance = (drawer: any) => {
    const saved = drawer.variance ?? drawer.cash_variance ?? drawer.difference;

    if (saved !== undefined && saved !== null) {
      return Number(saved || 0);
    }

    return getDrawerActualCash(drawer) - getDrawerExpectedCash(drawer);
  };

  const getHealthStatus = (score: number): HealthStatus => {
    if (score >= 95) return "Healthy";
    if (score >= 80) return "Warning";
    return "Critical";
  };

  /// CALCULATIONS
  const duplicateEmployees = useMemo(() => {
    const map: Record<string, any[]> = {};

    employees.forEach((employee) => {
      const name = getFullName(employee).toLowerCase().trim();

      if (!name || name === "unnamed employee") return;

      if (!map[name]) map[name] = [];
      map[name].push(employee);
    });

    return Object.values(map)
      .filter((group) => group.length > 1)
      .flat();
  }, [employees]);

  const employeesMissingDepartment = employees.filter(
    (employee) => !String(employee.department || "").trim()
  );

  const employeesMissingPosition = employees.filter(
    (employee) => !String(employee.position || "").trim()
  );

  const employeesInvalidStatus = employees.filter((employee) => {
    const status = String(
      employee.employment_status || employee.status || "active"
    ).toLowerCase();

    return !allowedEmployeeStatuses.includes(status);
  });

  const occupiedNoTenant = apartmentUnits.filter((unit) => {
    const status = String(unit.status || "").toLowerCase();
    return status === "occupied" && !String(unit.tenant_name || "").trim();
  });

  const unitsInvalidStatus = apartmentUnits.filter((unit) => {
    const status = String(unit.status || "").toLowerCase();
    return status && !allowedApartmentStatuses.includes(status);
  });

  const unitsNoBills = apartmentUnits.filter((unit) => {
    const status = String(unit.status || "").toLowerCase();

    if (!["active", "occupied", "maintenance"].includes(status)) return false;

    return !apartmentBills.some(
      (bill) => String(bill.unit_id) === String(unit.id)
    );
  });

  const billsWithoutUnit = apartmentBills.filter(
    (bill) =>
      !apartmentUnits.some((unit) => String(unit.id) === String(bill.unit_id))
  );

  const paymentsWithoutBill = apartmentPayments.filter(
    (payment) =>
      !apartmentBills.some((bill) => String(bill.id) === String(payment.bill_id))
  );

  const negativeApartmentBills = apartmentBills.filter((bill) => {
    const total =
      Number(bill.rent_amount || 0) +
      Number(bill.electric_amount || 0) +
      Number(bill.water_amount || 0) +
      Number(bill.internet_amount || 0) +
      Number(bill.other_amount || 0);

    return total < 0;
  });

  const uncategorizedExpenses = expenses.filter(
    (expense) => !String(expense.category || "").trim()
  );

  const negativeExpenses = expenses.filter(
    (expense) => Number(expense.amount || 0) < 0
  );

  const expensesMissingDate = expenses.filter(
    (expense) => !String(expense.expense_date || expense.date || "").trim()
  );

  const payrollMissingEmployee = payrollRows.filter(
    (row) => !String(row.employee_id || "").trim()
  );

  const negativePayroll = payrollRows.filter(
    (row) => Number(row.net_pay || row.total_net_pay || row.payroll_total || 0) < 0
  );

  const duplicatePayrollRows = useMemo(() => {
    const map: Record<string, any[]> = {};

    payrollRows.forEach((row) => {
      const key = `${row.employee_id || "no-employee"}-${
        row.period_id ||
        row.cutoff_id ||
        row.payroll_period_id ||
        row.start_date ||
        ""
      }-${row.end_date || ""}`;

      if (!map[key]) map[key] = [];
      map[key].push(row);
    });

    return Object.values(map)
      .filter((group) => group.length > 1)
      .flat();
  }, [payrollRows]);

  const openDrawers = cashDrawers.filter((drawer) =>
    ["open", "active", "pending"].includes(getDrawerStatus(drawer))
  );

  const invalidDrawerStatus = cashDrawers.filter((drawer) => {
    const status = getDrawerStatus(drawer);
    return status && !allowedDrawerStatuses.includes(status);
  });

  const missingDrawerCashier = cashDrawers.filter(
    (drawer) => !String(getDrawerHolder(drawer) || "").trim()
  );

  const drawersWithVariance = cashDrawers.filter(
    (drawer) => getDrawerVariance(drawer) !== 0
  );

  const leaveCreditMismatch =
    employees.length > 0 &&
    leaveCredits.length > 0 &&
    leaveCredits.length !== employees.length;

  const deploymentBlockers = [
    { label: "System Users", count: systemUsers.length, required: true },
    { label: "System Roles", count: systemRoles.length, required: true },
    { label: "Role Permissions", count: rolePermissions.length, required: true },
    { label: "Employees", count: employees.length, required: true },
    { label: "Leave Credits", count: leaveCredits.length, required: true },
    { label: "POS Settings", count: posSettings.length, required: true },
    { label: "POS Order Types", count: posOrderTypes.length, required: true },
    { label: "POS Payment Methods", count: posPaymentMethods.length, required: true },
  ].filter((item) => item.required && item.count === 0);

  const checks: CheckItem[] = [
    {
      module: "Security",
      label: "System users missing",
      count: systemUsers.length === 0 ? 1 : 0,
      severity: "critical",
    },
    {
      module: "Security",
      label: "System roles missing",
      count: systemRoles.length === 0 ? 1 : 0,
      severity: "critical",
    },
    {
      module: "Security",
      label: "Role permissions missing",
      count: rolePermissions.length === 0 ? 1 : 0,
      severity: "critical",
    },
    {
      module: "Leave",
      label: "Leave credits missing",
      count: leaveCredits.length === 0 ? 1 : 0,
      severity: "critical",
    },
    {
      module: "Leave",
      label: "Leave credits mismatch",
      count: leaveCreditMismatch ? 1 : 0,
      severity: "warning",
    },
    {
      module: "POS",
      label: "POS settings missing",
      count: posSettings.length === 0 ? 1 : 0,
      severity: "critical",
    },
    {
      module: "POS",
      label: "POS order types missing",
      count: posOrderTypes.length === 0 ? 1 : 0,
      severity: "critical",
    },
    {
      module: "POS",
      label: "POS payment methods missing",
      count: posPaymentMethods.length === 0 ? 1 : 0,
      severity: "critical",
    },
    {
      module: "Employees",
      label: "Duplicate employee records",
      count: duplicateEmployees.length,
      severity: "critical",
    },
    {
      module: "Employees",
      label: "Missing department",
      count: employeesMissingDepartment.length,
      severity: "warning",
    },
    {
      module: "Employees",
      label: "Missing position",
      count: employeesMissingPosition.length,
      severity: "warning",
    },
    {
      module: "Employees",
      label: "Invalid employee status",
      count: employeesInvalidStatus.length,
      severity: "critical",
    },
    {
      module: "Apartment",
      label: "Occupied units without tenant",
      count: occupiedNoTenant.length,
      severity: "critical",
    },
    {
      module: "Apartment",
      label: "Invalid apartment unit status",
      count: unitsInvalidStatus.length,
      severity: "critical",
    },
    {
      module: "Apartment",
      label: "Active/occupied units without bills",
      count: unitsNoBills.length,
      severity: "warning",
    },
    {
      module: "Apartment",
      label: "Bills without matching unit",
      count: billsWithoutUnit.length,
      severity: "critical",
    },
    {
      module: "Apartment",
      label: "Payments without matching bill",
      count: paymentsWithoutBill.length,
      severity: "critical",
    },
    {
      module: "Apartment",
      label: "Negative apartment bills",
      count: negativeApartmentBills.length,
      severity: "critical",
    },
    {
      module: "Finance",
      label: "Uncategorized expenses",
      count: uncategorizedExpenses.length,
      severity: "warning",
    },
    {
      module: "Finance",
      label: "Negative expense amount",
      count: negativeExpenses.length,
      severity: "critical",
    },
    {
      module: "Finance",
      label: "Expenses missing date",
      count: expensesMissingDate.length,
      severity: "warning",
    },
    {
      module: "Payroll",
      label: "Payroll periods missing",
      count: payrollPeriods.length === 0 ? 1 : 0,
      severity: "warning",
    },
    {
      module: "Payroll",
      label: "Payroll rows missing employee",
      count: payrollMissingEmployee.length,
      severity: "critical",
    },
    {
      module: "Payroll",
      label: "Negative payroll rows",
      count: negativePayroll.length,
      severity: "critical",
    },
    {
      module: "Payroll",
      label: "Duplicate payroll rows",
      count: duplicatePayrollRows.length,
      severity: "critical",
    },
    {
      module: "Cash Drawer",
      label: "Open drawers",
      count: openDrawers.length,
      severity: openDrawers.length > 1 ? "critical" : "warning",
    },
    {
      module: "Cash Drawer",
      label: "Invalid drawer status",
      count: invalidDrawerStatus.length,
      severity: "critical",
    },
    {
      module: "Cash Drawer",
      label: "Missing cashier / holder",
      count: missingDrawerCashier.length,
      severity: "critical",
    },
    {
      module: "Cash Drawer",
      label: "Drawer variance found",
      count: drawersWithVariance.length,
      severity: "warning",
    },
  ];

  const totalIssues = checks.reduce((sum, check) => sum + check.count, 0);

  const criticalIssues = checks
    .filter((check) => check.severity === "critical")
    .reduce((sum, check) => sum + check.count, 0);

  const warningIssues = checks
    .filter((check) => check.severity === "warning")
    .reduce((sum, check) => sum + check.count, 0);

  const healthScore = Math.max(0, 100 - criticalIssues * 7 - warningIssues * 3);
  const healthStatus = getHealthStatus(healthScore);
  const deploymentReady = deploymentBlockers.length === 0 && criticalIssues === 0;

  const totalRecords =
    employees.length +
    systemUsers.length +
    systemRoles.length +
    rolePermissions.length +
    approvalAssignments.length +
    approvalWorkflows.length +
    leaveCredits.length +
    leaveRequests.length +
    leaveTypes.length +
    payrollRows.length +
    payrollPeriods.length +
    posSettings.length +
    posCategories.length +
    posProducts.length +
    posOrderTypes.length +
    posPaymentMethods.length +
    apartmentUnits.length +
    apartmentBills.length +
    apartmentPayments.length +
    expenses.length +
    cashDrawers.length;

  const attentionItems = checks
    .filter((check) => check.count > 0)
    .map((check) => ({
      module: check.module,
      label: check.label,
      count: check.count,
      severity: check.severity,
      action: getRecommendedAction(check.label),
    }));

  const getModuleBoardStatus = (moduleTitle: string): Severity => {
    const relatedChecks = checks.filter(
      (check) => check.module === moduleTitle && check.count > 0
    );

    if (relatedChecks.some((check) => check.severity === "critical")) {
      return "critical";
    }

    if (relatedChecks.some((check) => check.severity === "warning")) {
      return "warning";
    }

    return "good";
  };

  const operationsModules = [
    {
      title: "Security",
      subtitle: "Users, roles, permissions",
      status: getModuleBoardStatus("Security"),
      icon: <LockKeyhole size={22} />,
    },
    {
      title: "Employees",
      subtitle: "Employee master records",
      status: getModuleBoardStatus("Employees"),
      icon: <Users size={22} />,
    },
    {
      title: "Leave",
      subtitle: "Credits and requests",
      status: getModuleBoardStatus("Leave"),
      icon: <ClipboardCheck size={22} />,
    },
    {
      title: "Payroll",
      subtitle: "Periods and records",
      status: getModuleBoardStatus("Payroll"),
      icon: <ShieldAlert size={22} />,
    },
    {
      title: "POS",
      subtitle: "Settings and master data",
      status: getModuleBoardStatus("POS"),
      icon: <Utensils size={22} />,
    },
    {
      title: "Finance",
      subtitle: "Expenses and cash records",
      status: getModuleBoardStatus("Finance"),
      icon: <Receipt size={22} />,
    },
    {
      title: "Apartment",
      subtitle: "Units, bills, payments",
      status: getModuleBoardStatus("Apartment"),
      icon: <Home size={22} />,
    },
    {
      title: "Cash Drawer",
      subtitle: "Cash handling review",
      status: getModuleBoardStatus("Cash Drawer"),
      icon: <Wallet size={22} />,
    },
  ];

  const countGroups = [
    {
      title: "Core Security",
      icon: <LockKeyhole size={18} />,
      rows: [
        ["System Users", systemUsers.length, systemUsers.length === 0 ? "critical" : "good"],
        ["System Roles", systemRoles.length, systemRoles.length === 0 ? "critical" : "good"],
        [
          "Role Permissions",
          rolePermissions.length,
          rolePermissions.length === 0 ? "critical" : "good",
        ],
      ],
    },
    {
      title: "HR / Leave",
      icon: <Users size={18} />,
      rows: [
        ["Employees", employees.length, employees.length === 0 ? "critical" : "good"],
        [
          "Leave Credits",
          leaveCredits.length,
          leaveCredits.length === 0
            ? "critical"
            : leaveCreditMismatch
              ? "warning"
              : "good",
        ],
        ["Leave Requests", leaveRequests.length, "good"],
        ["Leave Types", leaveTypes.length, "good"],
      ],
    },
    {
      title: "Approvals",
      icon: <ClipboardCheck size={18} />,
      rows: [
        [
          "Assignments",
          approvalAssignments.length,
          approvalAssignments.length === 0 ? "warning" : "good",
        ],
        [
          "Workflows",
          approvalWorkflows.length,
          approvalWorkflows.length === 0 ? "warning" : "good",
        ],
      ],
    },
    {
      title: "Payroll",
      icon: <ShieldAlert size={18} />,
      rows: [
        ["Periods", payrollPeriods.length, payrollPeriods.length === 0 ? "warning" : "good"],
        ["Records", payrollRows.length, payrollRows.length === 0 ? "warning" : "good"],
      ],
    },
    {
      title: "POS",
      icon: <Utensils size={18} />,
      rows: [
        ["Settings", posSettings.length, posSettings.length === 0 ? "critical" : "good"],
        ["Categories", posCategories.length, "good"],
        ["Products", posProducts.length, "good"],
        [
          "Order Types",
          posOrderTypes.length,
          posOrderTypes.length === 0 ? "critical" : "good",
        ],
        [
          "Payment Methods",
          posPaymentMethods.length,
          posPaymentMethods.length === 0 ? "critical" : "good",
        ],
      ],
    },
    {
      title: "Finance / Apartment",
      icon: <Receipt size={18} />,
      rows: [
        ["Expenses", expenses.length, "good"],
        ["Cash Drawers", cashDrawers.length, "good"],
        ["Apartment Units", apartmentUnits.length, "good"],
        ["Apartment Bills", apartmentBills.length, "good"],
        ["Apartment Payments", apartmentPayments.length, "good"],
      ],
    },
  ];

  const opscoreInsights = [
    deploymentBlockers.length === 0
      ? "No critical deployment blockers detected."
      : "Critical master data is missing. Review blockers before operations.",
    rolePermissions.length > 0
      ? "Security roles and permissions are available."
      : "Security permissions need restoration.",
    posSettings.length > 0 &&
    posOrderTypes.length > 0 &&
    posPaymentMethods.length > 0
      ? "POS master records are complete for current audit requirements."
      : "POS master records need validation before POS use.",
    criticalIssues === 0
      ? "System is usable, but warnings should be reviewed."
      : "Critical issues must be resolved before staff use.",
    warningIssues > 0
      ? "Focus review on leave, payroll, apartment billing, and cash drawer items."
      : "No warning items detected.",
  ];

  const recommendedActions = Array.from(
    new Set(attentionItems.map((item) => item.action))
  ).slice(0, 5);

  /// EFFECTS
  useEffect(() => {
    loadData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  ADMIN
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Database Health
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  Read-only system health monitor for master data, deployment
                  blockers, operational records, and database integrity.
                </p>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Checking..." : "Refresh Check"}
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                  <Database size={24} />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    System Health
                  </p>
                  <div className="mt-1 flex items-end gap-1">
                    <h2 className="text-4xl font-black tracking-tight text-slate-950">
                      {healthScore}
                    </h2>
                    <p className="pb-1 text-xl font-black text-slate-950">%</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Readiness
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={deploymentReady ? "good" : "critical"}
                    label={
                      deploymentReady
                        ? "Ready for Operations"
                        : "Action Required"
                    }
                  />
                  <StatusBadge status={statusToSeverity(healthStatus)} label={healthStatus} />
                </div>
              </div>

              <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                Critical records and database relationships must be reviewed before
                staff-wide use.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                title="Critical Issues"
                value={criticalIssues}
                status={criticalIssues > 0 ? "critical" : "good"}
              />
              <MetricCard
                title="Review Items"
                value={warningIssues}
                status={warningIssues > 0 ? "warning" : "good"}
              />
              <MetricCard title="Records Checked" value={totalRecords} status="good" />
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-700" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Attention Queue
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Attention Required
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    Items that need review before or during operations.
                  </p>
                </div>
              </div>

              {attentionItems.length === 0 ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                    <p className="text-sm font-black text-emerald-700">
                      No attention items found.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {attentionItems.slice(0, 6).map((item) => (
                    <AttentionItem key={`${item.module}-${item.label}`} item={item} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-slate-700" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    OPSCORE Review
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    OPSCORE Insights
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    System assessment and recommended focus.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {opscoreInsights.map((insight) => (
                  <div
                    key={insight}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold leading-6 text-slate-700">
                      {insight}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  Recommended Actions
                </p>

                <ol className="mt-3 space-y-2 pl-5 text-sm font-bold leading-6 text-blue-700">
                  {(recommendedActions.length > 0
                    ? recommendedActions
                    : ["Continue monitoring. No immediate action required."]
                  ).map((action) => (
                    <li key={action} className="list-decimal">
                      {action}
                    </li>
                  ))}
                </ol>

                <p className="mt-4 text-xs font-bold text-blue-700">
                  Estimated review time:{" "}
                  {attentionItems.length > 0 ? "10-15 minutes" : "0-5 minutes"}.
                </p>
              </div>
            </section>
          </section>

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Module Board
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Operations Modules
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                Quick readiness view by work area.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {operationsModules.map((module) => (
                <OperationsModuleCard key={module.title} module={module} />
              ))}
            </div>
          </section>

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Database className="h-6 w-6 text-slate-700" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Record Counts
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  System Overview
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Master records and operational data counts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {countGroups.map((group) => (
                <MasterCountCard key={group.title} group={group} />
              ))}
            </div>
          </section>

          <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Detailed Audit
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Database Checks
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                Total issues found: {totalIssues}. This page is read-only and safe
                for live database review.
              </p>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Check</th>
                    <th className="px-6 py-4 text-right">Issues</th>
                    <th className="px-6 py-4">Severity</th>
                    <th className="px-6 py-4">Recommended Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {checks.map((check) => (
                    <tr
                      key={`${check.module}-${check.label}`}
                      className="transition-all duration-200 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-black text-slate-950">
                        {check.module}
                      </td>
                      <td className="px-6 py-4">{toTitleCase(check.label)}</td>
                      <td
                        className={`px-6 py-4 text-right font-black ${
                          check.count > 0 ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {check.count}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={check.count === 0 ? "good" : check.severity}
                          label={check.count === 0 ? "OK" : check.severity.toUpperCase()}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {check.count === 0
                          ? "No action needed."
                          : getRecommendedAction(check.label)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DetailPanel
              title="Employee Records to Review"
              empty="No employee issues found."
              rows={[
                ...duplicateEmployees.slice(0, 5).map((employee) => ({
                  title: getFullName(employee),
                  subtitle: "Possible duplicate employee record",
                })),
                ...employeesInvalidStatus.slice(0, 5).map((employee) => ({
                  title: getFullName(employee),
                  subtitle: `Invalid status: ${
                    employee.employment_status || employee.status || "-"
                  }`,
                })),
                ...employeesMissingDepartment.slice(0, 5).map((employee) => ({
                  title: getFullName(employee),
                  subtitle: "Missing department",
                })),
              ]}
            />

            <DetailPanel
              title="Apartment Records to Review"
              empty="No apartment issues found."
              rows={[
                ...occupiedNoTenant.slice(0, 5).map((unit) => ({
                  title: unit.unit_name || "Unnamed Unit",
                  subtitle: "Occupied but no tenant name",
                })),
                ...unitsNoBills.slice(0, 5).map((unit) => ({
                  title: unit.unit_name || "Unnamed Unit",
                  subtitle: "Active/occupied/maintenance but no bill found",
                })),
                ...paymentsWithoutBill.slice(0, 5).map((payment) => ({
                  title: `Payment ${formatMoney(payment.amount)}`,
                  subtitle: "Payment has no matching bill",
                })),
              ]}
            />

            <DetailPanel
              title="Cash Drawer Records to Review"
              empty="No cash drawer issues found."
              rows={[
                ...drawersWithVariance.slice(0, 8).map((drawer) => ({
                  title: getDrawerHolder(drawer) || "Missing cashier",
                  subtitle: `Variance ${formatMoney(getDrawerVariance(drawer))}`,
                })),
                ...missingDrawerCashier.slice(0, 5).map((drawer) => ({
                  title: drawer.id || "Drawer record",
                  subtitle: "Missing cashier / holder",
                })),
              ]}
            />

            <DetailPanel
              title="Finance / Payroll Records to Review"
              empty="No finance or payroll issues found."
              rows={[
                ...uncategorizedExpenses.slice(0, 5).map((expense) => ({
                  title: expense.description || expense.particulars || "Expense",
                  subtitle: "Missing category",
                })),
                ...negativeExpenses.slice(0, 5).map((expense) => ({
                  title: expense.description || expense.particulars || "Expense",
                  subtitle: `Negative amount ${formatMoney(expense.amount)}`,
                })),
                ...negativePayroll.slice(0, 5).map((row) => ({
                  title: row.employee_name || row.employee_id || "Payroll Row",
                  subtitle: "Negative payroll amount",
                })),
              ]}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Deployment Rules
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Deployment Data Standard
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StandardBox
                title="Employee Status"
                values={["active", "inactive", "resigned", "terminated"]}
              />
              <StandardBox
                title="Apartment Status"
                values={["active", "occupied", "vacant", "maintenance", "inactive"]}
              />
              <StandardBox
                title="Bill Status"
                values={["unpaid", "partial", "paid", "cancelled"]}
              />
              <StandardBox
                title="Cash Drawer Status"
                values={["open", "closed", "voided"]}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function toTitleCase(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getRecommendedAction(label: string) {
  const value = label.toLowerCase();

  if (value.includes("system users")) {
    return "Restore or create required system user records.";
  }

  if (value.includes("system roles")) {
    return "Restore role master records before using access control.";
  }

  if (value.includes("role permissions")) {
    return "Restore permissions before staff login testing.";
  }

  if (value.includes("pos settings")) {
    return "Restore POS settings master data.";
  }

  if (value.includes("pos order types")) {
    return "Restore POS order types such as Dine-in, Takeout, Room Charge.";
  }

  if (value.includes("pos payment methods")) {
    return "Restore POS payment methods such as Cash, GCash, Bank, Terminal.";
  }

  if (value.includes("leave credits")) {
    return "Review employee leave credit records.";
  }

  if (value.includes("duplicate")) {
    return "Review and merge/archive duplicate records.";
  }

  if (value.includes("missing")) {
    return "Complete required field before live deployment.";
  }

  if (value.includes("invalid")) {
    return "Standardize value based on allowed status list.";
  }

  if (value.includes("negative")) {
    return "Review amount and correct imported or encoded value.";
  }

  if (value.includes("open drawers")) {
    return "Close or verify cash drawers before daily closing.";
  }

  if (value.includes("variance")) {
    return "Review remittance, receipts, and expected cash computation.";
  }

  if (value.includes("without matching")) {
    return "Review linked records and repair missing relationships.";
  }

  if (value.includes("without tenant")) {
    return "Assign tenant name or change unit status.";
  }

  if (value.includes("without bills")) {
    return "Create missing billing records or update unit status.";
  }

  return "Review and correct affected records.";
}

function statusToSeverity(status: HealthStatus): Severity {
  if (status === "Healthy") return "good";
  if (status === "Warning") return "warning";
  return "critical";
}

function StatusBadge({ status, label }: { status: Severity; label: string }) {
  const className =
    status === "critical"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
}

function MetricCard({
  title,
  value,
  status,
}: {
  title: string;
  value: any;
  status: Severity;
}) {
  const valueClass =
    status === "critical"
      ? "text-red-700"
      : status === "warning"
        ? "text-amber-700"
        : "text-slate-950";

  const cardClass =
    status === "critical"
      ? "border-red-200 bg-red-50"
      : status === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${cardClass}`}>
      <p
        className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
          status === "critical"
            ? "text-red-700"
            : status === "warning"
              ? "text-amber-700"
              : "text-slate-500"
        }`}
      >
        {title}
      </p>
      <h2 className={`mt-3 text-3xl font-black tracking-tight ${valueClass}`}>
        {value}
      </h2>
    </div>
  );
}

function AttentionItem({ item }: { item: any }) {
  return (
    <div
      className={`rounded-3xl border p-4 ${
        item.severity === "critical"
          ? "border-red-200 bg-red-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={item.severity} label={item.severity.toUpperCase()} />
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
              {item.module}
            </span>
          </div>

          <p
            className={`mt-3 text-sm font-black ${
              item.severity === "critical" ? "text-red-700" : "text-amber-700"
            }`}
          >
            {toTitleCase(item.label)}
          </p>
          <p
            className={`mt-1 text-sm font-bold leading-6 ${
              item.severity === "critical" ? "text-red-700" : "text-amber-700"
            }`}
          >
            {item.action}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${
            item.severity === "critical"
              ? "border-red-200 bg-white text-red-700"
              : "border-amber-200 bg-white text-amber-700"
          }`}
        >
          {item.count}
        </span>
      </div>
    </div>
  );
}

function OperationsModuleCard({ module }: any) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-black text-slate-950">{module.title}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{module.subtitle}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          {module.icon}
        </div>
      </div>

      <div className="mt-5">
        <StatusBadge
          status={module.status}
          label={
            module.status === "critical"
              ? "Action Required"
              : module.status === "warning"
                ? "Needs Review"
                : "Ready"
          }
        />
      </div>
    </div>
  );
}

function MasterCountCard({ group }: any) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          {group.icon}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Data Group
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{group.title}</h3>
        </div>
      </div>

      <div className="space-y-2">
        {group.rows.map((row: any[]) => (
          <div
            key={row[0]}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p className="text-sm font-bold text-slate-700">{row[0]}</p>
            <div className="flex items-center gap-2">
              <p className="font-black text-slate-950">{row[1]}</p>
              <StatusDot status={row[2] as Severity} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: Severity }) {
  const className =
    status === "critical"
      ? "bg-red-600"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-emerald-600";

  return <span className={`h-2.5 w-2.5 rounded-full ${className}`} />;
}

function DetailPanel({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { title: string; subtitle: string }[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Review Panel
      </p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>

      <div className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {empty}
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${row.title}-${row.subtitle}-${index}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="font-black text-slate-950">{row.title}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{row.subtitle}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StandardBox({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-black text-slate-950">{title}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}






