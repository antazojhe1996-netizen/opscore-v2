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
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type HealthStatus = "Healthy" | "Warning" | "Critical";

export default function DatabaseHealthPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [apartmentUnits, setApartmentUnits] = useState<any[]>([]);
  const [apartmentBills, setApartmentBills] = useState<any[]>([]);
  const [apartmentPayments, setApartmentPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payrollRows, setPayrollRows] = useState<any[]>([]);
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

    const { data: employeeData } = await supabase.from("employees").select("*");

    const { data: unitData } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    const { data: billData } = await supabase
      .from("apartment_bills")
      .select("*")
      .order("due_date", { ascending: false });

    const { data: paymentData } = await supabase
      .from("apartment_payments")
      .select("*")
      .order("payment_date", { ascending: false });

    const { data: expenseData } = await supabase.from("expenses").select("*");
    const payrollData = await getRowsFromTables(["payroll_records"]);

    const { data: drawerData } = await supabase
      .from("finance_cash_drawers")
      .select("*")
      .order("opened_at", { ascending: false });

    setEmployees(employeeData || []);
    setApartmentUnits(unitData || []);
    setApartmentBills(billData || []);
    setApartmentPayments(paymentData || []);
    setExpenses(expenseData || []);
    setPayrollRows(payrollData || []);
    setCashDrawers(drawerData || []);
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

  const getSeverityStyle = (severity: "good" | "warning" | "critical") => {
    if (severity === "good") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    if (severity === "warning") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    return "border-red-500/20 bg-red-500/10 text-red-300";
  };

  const getHealthStatus = (score: number): HealthStatus => {
    if (score >= 95) return "Healthy";
    if (score >= 80) return "Warning";
    return "Critical";
  };

  const getHealthStyle = (status: HealthStatus) => {
    if (status === "Healthy") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    if (status === "Warning") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    return "border-red-500/30 bg-red-500/10 text-red-300";
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
    (row) =>
      Number(row.net_pay || row.total_net_pay || row.payroll_total || 0) < 0
  );

  const duplicatePayrollRows = useMemo(() => {
    const map: Record<string, any[]> = {};

    payrollRows.forEach((row) => {
      const key = `${row.employee_id || "no-employee"}-${row.period_id || row.cutoff_id || row.payroll_period_id || row.start_date || ""}-${row.end_date || ""}`;
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

  const checks = [
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

  const healthScore = Math.max(
    0,
    100 - criticalIssues * 7 - warningIssues * 3
  );

  const healthStatus = getHealthStatus(healthScore);

  const totalRecords =
    employees.length +
    apartmentUnits.length +
    apartmentBills.length +
    apartmentPayments.length +
    expenses.length +
    payrollRows.length +
    cashDrawers.length;

  const moduleCards = [
    {
      title: "Employees",
      icon: <Users size={22} />,
      total: employees.length,
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
      title: "Apartment",
      icon: <Home size={22} />,
      total: apartmentUnits.length + apartmentBills.length + apartmentPayments.length,
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
      icon: <Receipt size={22} />,
      total: expenses.length,
      issues:
        uncategorizedExpenses.length +
        negativeExpenses.length +
        expensesMissingDate.length,
      details: [
        ["Expenses", expenses.length],
        ["Uncategorized", uncategorizedExpenses.length],
        ["Negative", negativeExpenses.length],
        ["Missing Date", expensesMissingDate.length],
      ],
    },
    {
      title: "Payroll",
      icon: <ShieldAlert size={22} />,
      total: payrollRows.length,
      issues:
        payrollMissingEmployee.length +
        negativePayroll.length +
        duplicatePayrollRows.length,
      details: [
        ["Rows", payrollRows.length],
        ["Missing Emp", payrollMissingEmployee.length],
        ["Negative", negativePayroll.length],
        ["Duplicate", duplicatePayrollRows.length],
      ],
    },
    {
      title: "Cash Drawer",
      icon: <Wallet size={22} />,
      total: cashDrawers.length,
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

  /// EFFECTS
  useEffect(() => {
    loadData();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              OPSCORE Admin
            </p>

            <h1 className="mt-2 text-4xl font-black">Database Health Check</h1>

            <p className="mt-2 text-slate-400">
              Review duplicates, missing fields, invalid statuses, orphan records, and risky data before live deployment.
            </p>
          </div>

          <button
            onClick={loadData}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            {loading ? "Checking..." : "Refresh Check"}
          </button>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className={`rounded-2xl border p-6 ${getHealthStyle(healthStatus)}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide">Health Score</p>
                <h2 className="mt-2 text-5xl font-black text-white">{healthScore}</h2>
              </div>

              <Database size={42} />
            </div>

            <p className="mt-3 text-sm font-bold">{healthStatus}</p>
          </div>

          <SummaryCard title="Records Checked" value={totalRecords} icon={<Database size={22} />} good />
          <SummaryCard title="Critical Issues" value={criticalIssues} icon={<AlertTriangle size={22} />} danger={criticalIssues > 0} />
          <SummaryCard title="Warning Issues" value={warningIssues} icon={<ShieldAlert size={22} />} warning={warningIssues > 0} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          {moduleCards.map((module) => (
            <ModuleHealthCard key={module.title} module={module} />
          ))}
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="text-amber-400" size={26} />

            <div>
              <h2 className="text-2xl font-black">Issue Checklist</h2>
              <p className="text-sm text-slate-400">
                Read-only scan. Fixes should be reviewed before changing live data.
              </p>
            </div>
          </div>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Check</th>
                  <th className="px-4 py-3 text-right">Issues</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Recommended Action</th>
                </tr>
              </thead>

              <tbody>
                {checks.map((check) => (
                  <tr key={`${check.module}-${check.label}`} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold text-white">{check.module}</td>
                    <td className="px-4 py-3 text-slate-300">{check.label}</td>
                    <td className={check.count > 0 ? "px-4 py-3 text-right font-bold text-red-400" : "px-4 py-3 text-right font-bold text-emerald-400"}>
                      {check.count}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getSeverityStyle(check.count === 0 ? "good" : check.severity)}`}>
                        {check.count === 0 ? "OK" : check.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {check.count === 0 ? "No action needed." : getRecommendedAction(check.label)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Total issues found: {totalIssues}. This page is read-only and does not delete or change records.
          </p>
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

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
          <h2 className="text-xl font-black text-amber-300">Deployment Data Standard</h2>

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

function getRecommendedAction(label: string) {
  const value = label.toLowerCase();

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

function SummaryCard({
  title,
  value,
  icon,
  good,
  warning,
  danger,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
  good?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        danger
          ? "border-red-500/20 bg-red-500/10"
          : warning
            ? "border-amber-500/20 bg-amber-500/10"
            : good
              ? "border-emerald-500/20 bg-emerald-500/10"
              : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <div className="rounded-full bg-slate-800 p-3 text-amber-400">
          {icon}
        </div>
      </div>

      <h2 className="text-3xl font-black text-white">{value}</h2>
    </div>
  );
}

function ModuleHealthCard({ module }: any) {
  const clean = module.issues === 0;

  return (
    <div
      className={`rounded-2xl border p-5 ${
        clean
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-amber-500/20 bg-amber-500/10"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{module.title}</p>
          <h3 className="mt-1 text-2xl font-black text-white">
            {clean ? "Clean" : `${module.issues} issue(s)`}
          </h3>
        </div>

        <div className="rounded-full bg-slate-950/60 p-3 text-amber-300">
          {module.icon}
        </div>
      </div>

      <div className="space-y-2">
        {module.details.map(([label, value]: any) => (
          <div key={label} className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2 text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="font-bold text-white">{value}</span>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-4 text-xl font-black">{title}</h2>

      <div className="space-y-3">
        {rows.length > 0 ? (
          rows.slice(0, 10).map((row, index) => (
            <div key={`${row.title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
              <p className="font-bold text-white">{row.title}</p>
              <p className="mt-1 text-sm text-slate-400">{row.subtitle}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-6 text-center text-sm text-emerald-300">
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
