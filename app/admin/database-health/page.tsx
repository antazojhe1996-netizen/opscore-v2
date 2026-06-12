"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Home,
  Receipt,
  ShieldAlert,
  Users,
  Wallet,
  LockKeyhole,
  ClipboardCheck,
  Utensils,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type HealthStatus = "Healthy" | "Warning" | "Critical";
type Severity = "good" | "warning" | "critical";

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
  const allowedApartmentStatuses = ["active", "occupied", "vacant", "maintenance", "inactive"];
  const allowedDrawerStatuses = ["open", "closed", "voided"];

  /// FUNCTIONS
  const getRowsFromTables = async (tableNames: string[]) => {
    for (const tableName of tableNames) {
      const { data, error } = await supabase.from(tableName).select("*");
      if (!error && data) return data || [];
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
    `₱${Number(value || 0).toLocaleString("en-PH", {
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
    if (saved !== undefined && saved !== null) return Number(saved || 0);
    return getDrawerActualCash(drawer) - getDrawerExpectedCash(drawer);
  };

  const getSeverityStyle = (severity: Severity) => {
    if (severity === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    if (severity === "warning") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    return "border-red-500/40 bg-red-500/10 text-red-200";
  };

  const getHealthStatus = (score: number): HealthStatus => {
    if (score >= 95) return "Healthy";
    if (score >= 80) return "Warning";
    return "Critical";
  };

  const getHealthStyle = (status: HealthStatus) => {
    if (status === "Healthy") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    if (status === "Warning") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    return "border-red-500/40 bg-red-500/10 text-red-200";
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

    return Object.values(map).filter((group) => group.length > 1).flat();
  }, [employees]);

  const employeesMissingDepartment = employees.filter(
    (employee) => !String(employee.department || "").trim()
  );

  const employeesMissingPosition = employees.filter(
    (employee) => !String(employee.position || "").trim()
  );

  const employeesInvalidStatus = employees.filter((employee) => {
    const status = String(employee.employment_status || employee.status || "active").toLowerCase();
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
    return !apartmentBills.some((bill) => String(bill.unit_id) === String(unit.id));
  });

  const billsWithoutUnit = apartmentBills.filter(
    (bill) => !apartmentUnits.some((unit) => String(unit.id) === String(bill.unit_id))
  );

  const paymentsWithoutBill = apartmentPayments.filter(
    (payment) => !apartmentBills.some((bill) => String(bill.id) === String(payment.bill_id))
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
        row.period_id || row.cutoff_id || row.payroll_period_id || row.start_date || ""
      }-${row.end_date || ""}`;
      if (!map[key]) map[key] = [];
      map[key].push(row);
    });

    return Object.values(map).filter((group) => group.length > 1).flat();
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
    employees.length > 0 && leaveCredits.length > 0 && leaveCredits.length !== employees.length;

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

  const warningBlockers = [
    ...(leaveCreditMismatch
      ? [
          {
            label: "Leave Credits Mismatch",
            note: `${leaveCredits.length} credits vs ${employees.length} employees`,
          },
        ]
      : []),
    ...(approvalAssignments.length === 0
      ? [{ label: "Approval Assignments", note: "No approval assignment records found" }]
      : []),
    ...(approvalWorkflows.length === 0
      ? [{ label: "Approval Workflows", note: "No approval workflow records found" }]
      : []),
  ];

  const checks = [
    { module: "Security", label: "System users missing", count: systemUsers.length === 0 ? 1 : 0, severity: "critical" as const },
    { module: "Security", label: "System roles missing", count: systemRoles.length === 0 ? 1 : 0, severity: "critical" as const },
    { module: "Security", label: "Role permissions missing", count: rolePermissions.length === 0 ? 1 : 0, severity: "critical" as const },

    { module: "Leave", label: "Leave credits missing", count: leaveCredits.length === 0 ? 1 : 0, severity: "critical" as const },
    { module: "Leave", label: "Leave credits mismatch", count: leaveCreditMismatch ? 1 : 0, severity: "warning" as const },

    { module: "POS", label: "POS settings missing", count: posSettings.length === 0 ? 1 : 0, severity: "critical" as const },
    { module: "POS", label: "POS order types missing", count: posOrderTypes.length === 0 ? 1 : 0, severity: "critical" as const },
    { module: "POS", label: "POS payment methods missing", count: posPaymentMethods.length === 0 ? 1 : 0, severity: "critical" as const },

    { module: "Employees", label: "Duplicate employee records", count: duplicateEmployees.length, severity: "critical" as const },
    { module: "Employees", label: "Missing department", count: employeesMissingDepartment.length, severity: "warning" as const },
    { module: "Employees", label: "Missing position", count: employeesMissingPosition.length, severity: "warning" as const },
    { module: "Employees", label: "Invalid employee status", count: employeesInvalidStatus.length, severity: "critical" as const },

    { module: "Apartment", label: "Occupied units without tenant", count: occupiedNoTenant.length, severity: "critical" as const },
    { module: "Apartment", label: "Invalid apartment unit status", count: unitsInvalidStatus.length, severity: "critical" as const },
    { module: "Apartment", label: "Active/occupied units without bills", count: unitsNoBills.length, severity: "warning" as const },
    { module: "Apartment", label: "Bills without matching unit", count: billsWithoutUnit.length, severity: "critical" as const },
    { module: "Apartment", label: "Payments without matching bill", count: paymentsWithoutBill.length, severity: "critical" as const },
    { module: "Apartment", label: "Negative apartment bills", count: negativeApartmentBills.length, severity: "critical" as const },

    { module: "Finance", label: "Uncategorized expenses", count: uncategorizedExpenses.length, severity: "warning" as const },
    { module: "Finance", label: "Negative expense amount", count: negativeExpenses.length, severity: "critical" as const },
    { module: "Finance", label: "Expenses missing date", count: expensesMissingDate.length, severity: "warning" as const },

    { module: "Payroll", label: "Payroll periods missing", count: payrollPeriods.length === 0 ? 1 : 0, severity: "warning" as const },
    { module: "Payroll", label: "Payroll rows missing employee", count: payrollMissingEmployee.length, severity: "critical" as const },
    { module: "Payroll", label: "Negative payroll rows", count: negativePayroll.length, severity: "critical" as const },
    { module: "Payroll", label: "Duplicate payroll rows", count: duplicatePayrollRows.length, severity: "critical" as const },

    { module: "Cash Drawer", label: "Open drawers", count: openDrawers.length, severity: openDrawers.length > 1 ? "critical" as const : "warning" as const },
    { module: "Cash Drawer", label: "Invalid drawer status", count: invalidDrawerStatus.length, severity: "critical" as const },
    { module: "Cash Drawer", label: "Missing cashier / holder", count: missingDrawerCashier.length, severity: "critical" as const },
    { module: "Cash Drawer", label: "Drawer variance found", count: drawersWithVariance.length, severity: "warning" as const },
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

  const countGroups = [
    {
      title: "Core Security",
      icon: <LockKeyhole size={18} />,
      rows: [
        ["System Users", systemUsers.length, systemUsers.length === 0 ? "critical" : "good"],
        ["System Roles", systemRoles.length, systemRoles.length === 0 ? "critical" : "good"],
        ["Role Permissions", rolePermissions.length, rolePermissions.length === 0 ? "critical" : "good"],
      ],
    },
    {
      title: "HR / Leave",
      icon: <Users size={18} />,
      rows: [
        ["Employees", employees.length, employees.length === 0 ? "critical" : "good"],
        ["Leave Credits", leaveCredits.length, leaveCredits.length === 0 ? "critical" : leaveCreditMismatch ? "warning" : "good"],
        ["Leave Requests", leaveRequests.length, "good"],
        ["Leave Types", leaveTypes.length, "good"],
      ],
    },
    {
      title: "Approvals",
      icon: <ClipboardCheck size={18} />,
      rows: [
        ["Assignments", approvalAssignments.length, approvalAssignments.length === 0 ? "warning" : "good"],
        ["Workflows", approvalWorkflows.length, approvalWorkflows.length === 0 ? "warning" : "good"],
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
        ["Order Types", posOrderTypes.length, posOrderTypes.length === 0 ? "critical" : "good"],
        ["Payment Methods", posPaymentMethods.length, posPaymentMethods.length === 0 ? "critical" : "good"],
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

  const moduleCards = [
    {
      title: "Security",
      icon: <LockKeyhole size={20} />,
      issues:
        (systemUsers.length === 0 ? 1 : 0) +
        (systemRoles.length === 0 ? 1 : 0) +
        (rolePermissions.length === 0 ? 1 : 0),
      details: [
        ["Users", systemUsers.length],
        ["Roles", systemRoles.length],
        ["Permissions", rolePermissions.length],
      ],
    },
    {
      title: "Employees",
      icon: <Users size={20} />,
      issues:
        duplicateEmployees.length +
        employeesMissingDepartment.length +
        employeesMissingPosition.length +
        employeesInvalidStatus.length,
      details: [
        ["Records", employees.length],
        ["Duplicates", duplicateEmployees.length],
        ["Missing Dept", employeesMissingDepartment.length],
        ["Invalid Status", employeesInvalidStatus.length],
      ],
    },
    {
      title: "Leave",
      icon: <ClipboardCheck size={20} />,
      issues: (leaveCredits.length === 0 ? 1 : 0) + (leaveCreditMismatch ? 1 : 0),
      details: [
        ["Credits", leaveCredits.length],
        ["Requests", leaveRequests.length],
        ["Types", leaveTypes.length],
        ["Mismatch", leaveCreditMismatch ? "Yes" : "No"],
      ],
    },
    {
      title: "Payroll",
      icon: <ShieldAlert size={20} />,
      issues:
        payrollMissingEmployee.length +
        negativePayroll.length +
        duplicatePayrollRows.length +
        (payrollPeriods.length === 0 ? 1 : 0),
      details: [
        ["Periods", payrollPeriods.length],
        ["Rows", payrollRows.length],
        ["Negative", negativePayroll.length],
        ["Duplicate", duplicatePayrollRows.length],
      ],
    },
    {
      title: "POS",
      icon: <Utensils size={20} />,
      issues:
        (posSettings.length === 0 ? 1 : 0) +
        (posOrderTypes.length === 0 ? 1 : 0) +
        (posPaymentMethods.length === 0 ? 1 : 0),
      details: [
        ["Settings", posSettings.length],
        ["Products", posProducts.length],
        ["Order Types", posOrderTypes.length],
        ["Payments", posPaymentMethods.length],
      ],
    },
    {
      title: "Apartment",
      icon: <Home size={20} />,
      issues:
        occupiedNoTenant.length +
        unitsInvalidStatus.length +
        unitsNoBills.length +
        billsWithoutUnit.length +
        paymentsWithoutBill.length +
        negativeApartmentBills.length,
      details: [
        ["Units", apartmentUnits.length],
        ["Bills", apartmentBills.length],
        ["Payments", apartmentPayments.length],
        ["Issues", occupiedNoTenant.length + unitsInvalidStatus.length + unitsNoBills.length + billsWithoutUnit.length + paymentsWithoutBill.length],
      ],
    },
    {
      title: "Finance",
      icon: <Receipt size={20} />,
      issues: uncategorizedExpenses.length + negativeExpenses.length + expensesMissingDate.length,
      details: [
        ["Expenses", expenses.length],
        ["Uncategorized", uncategorizedExpenses.length],
        ["Negative", negativeExpenses.length],
        ["Missing Date", expensesMissingDate.length],
      ],
    },
    {
      title: "Cash Drawer",
      icon: <Wallet size={20} />,
      issues:
        openDrawers.length +
        invalidDrawerStatus.length +
        missingDrawerCashier.length +
        drawersWithVariance.length,
      details: [
        ["Drawers", cashDrawers.length],
        ["Open", openDrawers.length],
        ["Variance", drawersWithVariance.length],
        ["No Cashier", missingDrawerCashier.length],
      ],
    },
  ];


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
    const relatedChecks = checks.filter((check) => check.module === moduleTitle && check.count > 0);

    if (relatedChecks.some((check) => check.severity === "critical")) return "critical";
    if (relatedChecks.some((check) => check.severity === "warning")) return "warning";

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

  const opscoreInsights = [
    deploymentBlockers.length === 0
      ? "No critical deployment blockers detected."
      : "Critical master data is missing. Review blockers before operations.",
    rolePermissions.length > 0
      ? "Security roles and permissions are available."
      : "Security permissions need restoration.",
    posSettings.length > 0 && posOrderTypes.length > 0 && posPaymentMethods.length > 0
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
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-7">
        <section className="mb-5 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/20">
          <div className="grid grid-cols-1 gap-0 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="p-6 sm:p-7">
              <p className="text-base font-black uppercase tracking-[0.22em] text-slate-200">
                OPSCORE
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Operations Management System
              </h1>

              <p className="mt-2 text-lg font-semibold text-slate-300">
                System Health Monitor
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-2xl border px-5 py-3 text-lg font-black ${
                    deploymentReady
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                      : "border-red-500/40 bg-red-500/15 text-red-100"
                  }`}
                >
                  {deploymentReady ? "🟢 READY FOR OPERATIONS" : "🔴 ACTION REQUIRED"}
                </span>

                <button
                  onClick={loadData}
                  className="rounded-2xl border border-slate-600 bg-slate-950 px-5 py-3 text-base font-black text-white hover:bg-slate-800"
                >
                  {loading ? "Checking..." : "Refresh Check"}
                </button>
              </div>
            </div>

            <div className={`border-t border-slate-700 p-6 sm:p-7 xl:border-l xl:border-t-0 ${getHealthStyle(healthStatus)}`}>
              <p className="text-base font-black uppercase tracking-[0.2em] text-white/80">
                System Health
              </p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-6xl font-black leading-none text-white sm:text-7xl">
                  {healthScore}
                </span>
                <span className="pb-2 text-3xl font-black text-white">%</span>
              </div>

              <p className="mt-3 text-xl font-black text-white">{healthStatus}</p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <StatusMetric label="Critical" value={criticalIssues} status={criticalIssues > 0 ? "critical" : "good"} />
                <StatusMetric label="Review" value={warningIssues} status={warningIssues > 0 ? "warning" : "good"} />
                <StatusMetric label="Records" value={totalRecords} status="good" />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="text-amber-200" size={30} />
              <div>
                <h2 className="text-2xl font-black text-white">Attention Required</h2>
                <p className="text-base font-semibold text-amber-100">
                  Items that need review before or during operations.
                </p>
              </div>
            </div>

            {attentionItems.length === 0 ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-lg font-black text-emerald-100">
                ✅ No attention items found.
              </div>
            ) : (
              <div className="space-y-3">
                {attentionItems.slice(0, 6).map((item) => (
                  <div
                    key={`${item.module}-${item.label}`}
                    className={`rounded-2xl border p-4 ${
                      item.severity === "critical"
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-amber-500/40 bg-slate-950/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-white">
                          {item.module}: {toTitleCase(item.label)}
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-200">
                          {item.action}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-sm font-black ${
                          item.severity === "critical"
                            ? "border-red-400/40 bg-red-500/15 text-red-100"
                            : "border-amber-400/40 bg-amber-500/15 text-amber-100"
                        }`}
                      >
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Database className="text-emerald-200" size={30} />
              <div>
                <h2 className="text-2xl font-black text-white">OPSCORE Insights</h2>
                <p className="text-base font-semibold text-slate-300">
                  System assessment and recommended focus.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {opscoreInsights.map((insight) => (
                <div key={insight} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-base font-semibold leading-relaxed text-slate-100">
                    {insight}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <h3 className="text-lg font-black text-emerald-100">Recommended Actions</h3>

              <ol className="mt-3 space-y-2 pl-5 text-base font-semibold text-emerald-50">
                {(recommendedActions.length > 0 ? recommendedActions : ["Continue monitoring. No immediate action required."]).map((action) => (
                  <li key={action} className="list-decimal">
                    {action}
                  </li>
                ))}
              </ol>

              <p className="mt-4 text-sm font-bold text-emerald-100/80">
                Estimated review time: {attentionItems.length > 0 ? "10-15 minutes" : "0-5 minutes"}.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white">Operations Modules</h2>
              <p className="text-base font-semibold text-slate-300">
                Quick readiness view by work area.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {operationsModules.map((module) => (
              <OperationsModuleCard key={module.title} module={module} />
            ))}
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="mb-5 flex items-center gap-3">
            <Database className="text-slate-200" size={28} />
            <div>
              <h2 className="text-2xl font-black text-white">System Overview</h2>
              <p className="text-base font-semibold text-slate-300">
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

        <details className="mb-5 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <summary className="cursor-pointer text-2xl font-black text-white">
            View Detailed Audit
          </summary>

          <div className="mt-5">
            <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-700">
              <table className="w-full min-w-[900px] text-base">
                <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-200">
                  <tr>
                    <th className="px-4 py-4">Module</th>
                    <th className="px-4 py-4">Check</th>
                    <th className="px-4 py-4 text-right">Issues</th>
                    <th className="px-4 py-4">Severity</th>
                    <th className="px-4 py-4">Recommended Action</th>
                  </tr>
                </thead>

                <tbody>
                  {checks.map((check) => (
                    <tr key={`${check.module}-${check.label}`} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-4 font-black text-white">{check.module}</td>
                      <td className="px-4 py-4 font-semibold text-slate-200">{toTitleCase(check.label)}</td>
                      <td className={`px-4 py-4 text-right text-lg font-black ${check.count > 0 ? "text-red-200" : "text-emerald-200"}`}>
                        {check.count}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-3 py-1 text-sm font-black ${getSeverityStyle(check.count === 0 ? "good" : check.severity)}`}>
                          {check.count === 0 ? "OK" : check.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-300">
                        {check.count === 0 ? "No action needed." : getRecommendedAction(check.label)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-400">
              Total issues found: {totalIssues}. This page is read-only and safe for live database review.
            </p>
          </div>
        </details>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
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
                subtitle: `Invalid status: ${employee.employment_status || employee.status || "-"}`,
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

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-black text-white">Deployment Data Standard</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StandardBox title="Employee Status" values={["active", "inactive", "resigned", "terminated"]} />
            <StandardBox title="Apartment Status" values={["active", "occupied", "vacant", "maintenance", "inactive"]} />
            <StandardBox title="Bill Status" values={["unpaid", "partial", "paid", "cancelled"]} />
            <StandardBox title="Cash Drawer Status" values={["open", "closed", "voided"]} />
          </div>
        </section>
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

function StatusMetric({
  label,
  value,
  status,
}: {
  label: string;
  value: any;
  status: Severity;
}) {
  const style =
    status === "critical"
      ? "border-red-500/40 bg-red-500/15 text-red-100"
      : status === "warning"
        ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";

  return (
    <div className={`rounded-2xl border p-3 text-center ${style}`}>
      <p className="text-sm font-black uppercase tracking-wide opacity-90">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function OperationsModuleCard({ module }: any) {
  const style =
    module.status === "critical"
      ? "border-red-500/40 bg-red-500/10"
      : module.status === "warning"
        ? "border-amber-500/40 bg-amber-500/10"
        : "border-emerald-500/30 bg-emerald-500/10";

  const badge =
    module.status === "critical"
      ? "🔴 Action Required"
      : module.status === "warning"
        ? "🟡 Needs Review"
        : "🟢 Ready";

  return (
    <div className={`rounded-2xl border p-5 ${style}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-black text-white">{module.title}</p>
          <p className="mt-1 text-base font-semibold text-slate-200">{module.subtitle}</p>
        </div>

        <div className="rounded-2xl bg-slate-950/70 p-3 text-white">
          {module.icon}
        </div>
      </div>

      <p className="mt-5 text-lg font-black text-white">{badge}</p>
    </div>
  );
}


function getRecommendedAction(label: string) {
  const value = label.toLowerCase();

  if (value.includes("system users")) return "Restore or create required system user records.";
  if (value.includes("system roles")) return "Restore role master records before using access control.";
  if (value.includes("role permissions")) return "Restore permissions before staff login testing.";
  if (value.includes("pos settings")) return "Restore POS settings master data.";
  if (value.includes("pos order types")) return "Restore POS order types such as Dine-in, Takeout, Room Charge.";
  if (value.includes("pos payment methods")) return "Restore POS payment methods such as Cash, GCash, Bank, Terminal.";
  if (value.includes("leave credits")) return "Review employee leave credit records.";
  if (value.includes("duplicate")) return "Review and merge/archive duplicate records.";
  if (value.includes("missing")) return "Complete required field before live deployment.";
  if (value.includes("invalid")) return "Standardize value based on allowed status list.";
  if (value.includes("without matching")) return "Check foreign key relation and repair orphan record.";
  if (value.includes("without tenant")) return "Add tenant name or change unit status.";
  if (value.includes("without bills")) return "Create billing record or set unit as vacant/inactive.";
  if (value.includes("negative")) return "Verify amount. Use adjustment entry instead of negative value when possible.";
  if (value.includes("variance")) return "Review cashier drawer and attach explanation.";
  if (value.includes("open drawers")) return "Close old drawers before generating owner reports.";

  return "Review record and correct data standard.";
}

function CompactMetric({
  label,
  value,
  warning,
  danger,
}: {
  label: string;
  value: any;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        danger
          ? "border-red-500/40 bg-red-500/10"
          : warning
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-white/10 bg-black/20"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MasterCountCard({ group }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-slate-950 p-2 text-slate-300">{group.icon}</div>
        <h3 className="font-black text-white">{group.title}</h3>
      </div>

      <div className="space-y-2">
        {group.rows.map(([label, value, status]: any) => (
          <div key={label} className="flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2">
            <span className="text-sm text-slate-400">{label}</span>
            <span
              className={`text-lg font-black ${
                status === "critical"
                  ? "text-red-300"
                  : status === "warning"
                    ? "text-amber-300"
                    : "text-emerald-300"
              }`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleHealthCard({ module }: any) {
  const clean = module.issues === 0;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        clean ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-300">{module.title}</p>
          <h3 className="mt-1 text-xl font-black text-white">
            {clean ? "Healthy" : `${module.issues} issue(s)`}
          </h3>
        </div>

        <div className="rounded-full bg-slate-950/60 p-3 text-white">{module.icon}</div>
      </div>

      <div className="space-y-1.5">
        {module.details.map(([label, value]: any) => (
          <div key={label} className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-1.5 text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="font-black text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { title: string; subtitle: string }[];
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-black">{title}</h2>

      <div className="max-h-[260px] space-y-2 overflow-auto pr-1">
        {rows.length > 0 ? (
          rows.slice(0, 10).map((row, index) => (
            <div key={`${row.title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
              <p className="font-bold text-white">{row.title}</p>
              <p className="mt-1 text-sm text-slate-400">{row.subtitle}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-6 text-center text-sm text-emerald-200">
            <CheckCircle2 className="mx-auto mb-2" size={24} />
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}

function StandardBox({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <h3 className="font-bold text-white">{title}</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}