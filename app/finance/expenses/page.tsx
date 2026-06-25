import { supabase } from '@/lib/supabase';
"use client";


// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { createAuditLog } from "@/lib/audit";
import * as XLSX from "xlsx";
import TopNavbar from "@/components/TopNavbar";

export default function ExpensesPage() {
  /// STATES - DATABASE DATA
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [expenseSubcategories, setExpenseSubcategories] = useState<any[]>([]);
  const [paymentMethodsData, setPaymentMethodsData] = useState<any[]>([]);
  const [expenseAreasData, setExpenseAreasData] = useState<any[]>([]);
  const [expenseSourcesData, setExpenseSourcesData] = useState<any[]>([]);

  /// STATES - MANUAL EXPENSE FORM
  const today = new Date().toISOString().split("T")[0];

  const [expenseDate, setExpenseDate] = useState(today);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [expenseArea, setExpenseArea] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [remarks, setRemarks] = useState("");

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [deductToPayroll, setDeductToPayroll] = useState("Yes");

  /// STATES - FILTERS
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  /// STATES - SORTING
  const [sortConfig, setSortConfig] = useState({
    key: "expense_date",
    direction: "desc",
  });

  /// DATA - SETTINGS LISTS
  const categories = expenseCategories.map((item) => item.name);
  const selectedCategoryRecord = expenseCategories.find(
    (item) => String(item.name || "") === String(category || "")
  );

  const subcategoryOptions = expenseSubcategories
    .filter((item) => {
      if (!category) return false;

      if (item.category_id && selectedCategoryRecord?.id) {
        return String(item.category_id) === String(selectedCategoryRecord.id);
      }

      return String(item.category || "") === String(category || "");
    })
    .map((item) => item.name || item.subcategory_name || item.label)
    .filter(Boolean);

  const paymentMethods = paymentMethodsData.map((item) => item.name);
  const expenseAreas = expenseAreasData.map((item) => item.name);
  const expenseSources = expenseSourcesData.map((item) => item.name);

  // Cash Advance is now controlled from Cash Management.
  // Expense Ledger remains an operating-expense log and reporting page.
  const isCashAdvance = false;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  /// CALCULATIONS - DATE
  const currentYear = new Date().getFullYear();
  const now = new Date();

  /// FUNCTIONS - FORMATTERS
  const formatCurrency = (value: any) =>
    `â‚±${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getExpenseDisplayAmount = (expense: any) => {
    const netAmount = Number(expense.net_expense_amount);
    const actualSpent = Number(expense.actual_spent_amount);
    const baseAmount = Number(expense.amount || 0);

    if (String(expense.liquidation_status || "").toUpperCase() === "LIQUIDATED") {
      if (Number.isFinite(netAmount) && netAmount > 0) return netAmount;
      if (Number.isFinite(actualSpent) && actualSpent > 0) return actualSpent;
    }

    return baseAmount;
  };

  const cleanNumber = (value: any) => {
    if (!value) return 0;

    return Number(
      String(value)
        .replace("â‚±", "")
        .replace(/,/g, "")
        .trim()
    );
  };

  const formatExcelDate = (value: any) => {
    if (!value) return "";

    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return "";

      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
        date.d
      ).padStart(2, "0")}`;
    }

    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    return String(value).split("T")[0];
  };

  /// CALCULATIONS - SOURCE HELPERS
  const getExpenseSourceType = (expense: any) => {
    const rawSource = String(expense.source || "");

    if (rawSource === "Imported") return "Imported";
    if (rawSource.includes("Cash Drawer")) return "Cash Drawer";
    if (rawSource === "Payroll Release") return "Payroll Release";
    if (rawSource === "Expense Request") return "Expense Request";

    return "Manual Entry";
  };

  const getSourceBadgeStyle = (sourceType: string) => {
    if (sourceType === "Cash Drawer") return "bg-amber-500/10 text-blue-300";
    if (sourceType === "Payroll Release") return "bg-cyan-500/10 text-blue-300";
    if (sourceType === "Imported") return "bg-purple-500/10 text-blue-300";
    if (sourceType === "Expense Request") return "bg-blue-500/10 text-blue-400";
    return "bg-emerald-500/10 text-blue-300";
  };

  const getPayrollBadge = (expense: any) => {
    if (!expense.deduct_to_payroll) return null;

    if (expense.employee_balance_id || expense.payroll_adjustment_id) {
      return (
        <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-blue-300">
          Payroll Linked
        </span>
      );
    }

    return (
      <span className="w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-blue-300">
        Payroll Pending
      </span>
    );
  };

  const getPayrollPeriodLabel = (period: any) => {
    if (!period) return "No payroll period";

    return `${period.period_name || "Payroll Period"} (${period.status})`;
  };

  const getLinkedPayrollPeriod = (expense: any) => {
    return payrollPeriods.find(
      (period) =>
        String(period.id) === String(expense.payroll_period_id) ||
        String(period.id) === String(expense.period_id)
    );
  };

  const getPayrollSourceLabel = (expense: any) => {
    if (!expense.deduct_to_payroll) return "";

    const sourceType = getExpenseSourceType(expense);

    if (sourceType === "Cash Drawer") return "Source: Cash Drawer";
    if (sourceType === "Manual Entry") return "Source: Expenses";
    if (sourceType === "Payroll Release") return "Source: Payroll Manager";

    return `Source: ${sourceType}`;
  };

  const getReferenceLabel = (expense: any) => {
    const references = [];

    if (expense.id) references.push(`Expense ID: ${expense.id}`);
    if (expense.cash_movement_id) references.push(`Cash Movement ID: ${expense.cash_movement_id}`);
    if (expense.employee_balance_id) references.push(`Employee Balance ID: ${expense.employee_balance_id}`);

    return references.join(" â€¢ ");
  };

  const isExpenseVoided = (expense: any) => {
    const statusText = String(expense?.status || expense?.expense_status || "ACTIVE").toUpperCase();
    return statusText === "VOIDED" || statusText === "VOID" || Boolean(expense?.voided_at);
  };

  const activeExpenses = expenses.filter((expense) => !isExpenseVoided(expense));

  /// CALCULATIONS - REPORTING CLASSIFICATION
  // Enterprise finance rule:
  // Payroll-linked cash advances are employee receivables, not operating expenses.
  // They remain in the database for audit trail, but they are excluded from the
  // Official Expense Ledger and operating expense summaries.
  const operatingExpenses = activeExpenses.filter(
    (expense) => !expense.deduct_to_payroll
  );

  const employeeAdvanceReceivables = activeExpenses.filter(
    (expense) => expense.deduct_to_payroll
  );

  /// CALCULATIONS - SUMMARY CARDS
  const totalExpenses = operatingExpenses.reduce(
    (sum, expense) => sum + getExpenseDisplayAmount(expense),
    0
  );

  const todayExpenses = operatingExpenses
    .filter((expense) => expense.expense_date === today)
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  const thisMonthExpenses = operatingExpenses
    .filter((expense) => {
      const date = new Date(expense.expense_date + "T00:00:00");
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  const cashDrawerExpenseTotal = operatingExpenses
    .filter((expense) => getExpenseSourceType(expense) === "Cash Drawer")
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  const manualExpenseTotal = operatingExpenses
    .filter((expense) => getExpenseSourceType(expense) === "Manual Entry")
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  const importedExpenseTotal = operatingExpenses
    .filter((expense) => getExpenseSourceType(expense) === "Imported")
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  const payrollReleaseTotal = operatingExpenses
    .filter((expense) => getExpenseSourceType(expense) === "Payroll Release")
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  const cashAdvanceTotal = employeeAdvanceReceivables
    .filter((expense) => expense.deduct_to_payroll)
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  const linkedCashAdvanceTotal = employeeAdvanceReceivables
    .filter(
      (expense) =>
        expense.deduct_to_payroll &&
        (expense.employee_balance_id || expense.payroll_adjustment_id)
    )
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  const unlinkedCashAdvanceTotal = employeeAdvanceReceivables
    .filter(
      (expense) =>
        expense.deduct_to_payroll &&
        !(expense.employee_balance_id || expense.payroll_adjustment_id)
    )
    .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);

  /// CALCULATIONS - MONTHLY CATEGORY SUMMARY
  const monthlyCategorySummary = monthNames.map((month, monthIndex) => {
    const row: any = { month };

    categories.forEach((cat) => {
      row[cat] = operatingExpenses
        .filter((expense) => {
          const date = new Date(expense.expense_date + "T00:00:00");

          return (
            date.getFullYear() === currentYear &&
            date.getMonth() === monthIndex &&
            expense.category === cat
          );
        })
        .reduce((sum, expense) => sum + getExpenseDisplayAmount(expense), 0);
    });

    return row;
  });

  /// CALCULATIONS - FILTERED EXPENSES
  const filteredExpenses = useMemo(() => {
    return operatingExpenses.filter((expense) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(expense.expense_date || "").toLowerCase().includes(search) ||
        String(expense.category || "").toLowerCase().includes(search) ||
        String(expense.subcategory || "").toLowerCase().includes(search) ||
        String(expense.department || "").toLowerCase().includes(search) ||
        String(expense.description || "").toLowerCase().includes(search) ||
        String(expense.employee_name || "").toLowerCase().includes(search) ||
        String(expense.source || "").toLowerCase().includes(search) ||
        String(expense.payment_method || "").toLowerCase().includes(search);

      const sourceType = getExpenseSourceType(expense);

      const matchesSource =
        sourceFilter === "ALL" ? true : sourceType === sourceFilter;

      const matchesCategory =
        categoryFilter === "ALL" ? true : expense.category === categoryFilter;

      const matchesDepartment =
        departmentFilter === "ALL" ? true : expense.department === departmentFilter;

      return matchesSearch && matchesSource && matchesCategory && matchesDepartment;
    });
  }, [operatingExpenses, searchTerm, sourceFilter, categoryFilter, departmentFilter]);

  /// CALCULATIONS - SORTED EXPENSES
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (sortConfig.key === "amount") {
      return sortConfig.direction === "asc"
        ? Number(aValue || 0) - Number(bValue || 0)
        : Number(bValue || 0) - Number(aValue || 0);
    }

    if (sortConfig.key === "expense_date") {
      const dateDiff =
        sortConfig.direction === "asc"
          ? new Date(aValue || "1900-01-01").getTime() -
            new Date(bValue || "1900-01-01").getTime()
          : new Date(bValue || "1900-01-01").getTime() -
            new Date(aValue || "1900-01-01").getTime();

      if (dateDiff !== 0) return dateDiff;

      const aCreated = new Date(a.created_at || a.posted_date || a.updated_at || "1900-01-01").getTime();
      const bCreated = new Date(b.created_at || b.posted_date || b.updated_at || "1900-01-01").getTime();

      return sortConfig.direction === "asc"
        ? aCreated - bCreated
        : bCreated - aCreated;
    }

    return sortConfig.direction === "asc"
      ? String(aValue || "").localeCompare(String(bValue || ""))
      : String(bValue || "").localeCompare(String(aValue || ""));
  });

  /// FUNCTIONS - TABLE SORTING
  const requestSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortIcon = (key: string) => {
    if (sortConfig.key !== key) return "â†•";
    return sortConfig.direction === "asc" ? "â†‘" : "â†“";
  };

  /// PERMISSIONS
  const getCurrentUserPermissions = async () => {
    const systemUserId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_system_user_id")
        : null;

    const companyId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_company_id")
        : null;

    const savedRoleId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_role_id")
        : null;

    if (!systemUserId || !companyId) {
      setPermissions([]);
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
      console.log("EXPENSES COMPANY USER PERMISSION ERROR:", companyUserError?.message);
      setPermissions([]);
      return;
    }

    const activeRoleId = companyUser.role_id || savedRoleId;

    if (!activeRoleId) {
      setPermissions([]);
      return;
    }

    const { data: rolePermissions, error: permissionError } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", activeRoleId);

    if (permissionError) {
      console.log("EXPENSES PERMISSION ERROR:", permissionError.message);
      setPermissions([]);
      return;
    }

    setPermissions(rolePermissions || []);
  };

  const hasPermission = (
    moduleKey: string,
    field: "can_view" | "can_create" | "can_edit" | "can_delete" | "can_approve" | "can_release"
  ) => {
    return permissions.some(
      (permission) =>
        permission.module_key === moduleKey && permission[field] === true
    );
  };

  const canCreateExpenses = hasPermission("expenses", "can_create");
  const canDeleteExpenses = hasPermission("expenses", "can_delete");

  /// FUNCTIONS - GET DATA
  const getFinanceSettings = async () => {
    const { data: categoriesData } = await supabase
  .from("expense_categories")
  .select("*")
  .eq("is_active", true)
  .order("name", { ascending: true });

    const { data: subcategoriesData } = await supabase
      .from("expense_subcategories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const { data: paymentsData } = await supabase
      .from("finance_payment_methods")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const { data: areasData } = await supabase
      .from("finance_expense_areas")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const { data: sourcesData } = await supabase
      .from("finance_expense_sources")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    setExpenseCategories(categoriesData || []);
    setExpenseSubcategories(subcategoriesData || []);
    setPaymentMethodsData(paymentsData || []);
    setExpenseAreasData(areasData || []);
    setExpenseSourcesData(sourcesData || []);
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("payroll_active", true)
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error);
      return;
    }

    setEmployees(data || []);
  };

  const getPayrollPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .in("status", ["Draft", "Reopened"])
      .order("start_date", { ascending: true });

    if (error) {
      console.log("GET PAYROLL PERIODS ERROR:", error);
      return;
    }

    setPayrollPeriods(data || []);

  };

  const getExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET EXPENSES ERROR:", error);
      return;
    }

    setExpenses(data || []);
  };

  const getPayrollPeriodCoveringDate = (dateValue: string) => {
    if (!dateValue) return null;

    return (
      payrollPeriods.find(
        (period) =>
          String(period.start_date || "") <= dateValue &&
          String(period.end_date || "") >= dateValue
      ) || null
    );
  };

  const getTargetPayrollPeriod = async (dateValue: string) => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .lte("start_date", dateValue)
      .gte("end_date", dateValue)
      .in("status", ["Draft", "Reopened"])
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("GET TARGET PAYROLL PERIOD ERROR:", error);
      return null;
    }

    return data;
  };

  const markPayrollNeedsRegeneration = async (periodId: string) => {
    if (!periodId) return;

    const { error } = await supabase
      .from("payroll_periods")
      .update({
        needs_regeneration: true,
      })
      .eq("id", periodId);

    if (error) {
      console.log("MARK PAYROLL NEEDS REGENERATION ERROR:", error);
    }
  };

  /// FUNCTIONS - RESET FORM
  const resetManualExpenseForm = () => {
    setExpenseDate(today);
    setCategory("");
    setSubcategory("");
    setExpenseArea("");
    setDescription("");
    setSource("");
    setAmount("");
    setPaymentMethod("");
    setRemarks("");
    setSelectedEmployeeId("");
    setDeductToPayroll("Yes");
  };

  /// FUNCTIONS - ADD MANUAL EXPENSE
  const addExpense = async () => {
    if (!canCreateExpenses) {
      alert("Access denied.");
      return;
    }

    if (
      !expenseDate ||
      !category ||
      !expenseArea ||
      !description.trim() ||
      !source ||
      !amount ||
      !paymentMethod
    ) {
      alert("Please complete required fields.");
      return;
    }

    const amountValue = Number(amount);

    if (amountValue <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }

    if (isCashAdvance && deductToPayroll === "Yes" && !selectedEmployeeId) {
      alert("Select employee for cash advance payroll deduction.");
      return;
    }

    const selectedEmployee = employees.find(
      (employee) => employee.id === selectedEmployeeId
    );

    const activePayrollPeriod =
      isCashAdvance && deductToPayroll === "Yes"
        ? await getTargetPayrollPeriod(expenseDate)
        : null;

    if (isCashAdvance && deductToPayroll === "Yes" && !activePayrollPeriod) {
      alert(`No Draft/Reopened payroll period covers ${expenseDate}. Create or reopen the correct cutoff first.`);
      return;
    }

    const expensePayload = {
      expense_date: expenseDate,
      category,
      subcategory: subcategory || null,
      department: expenseArea,
      description,
      source,
      amount: amountValue,
      payment_method: paymentMethod,
      remarks,
      employee_id: isCashAdvance ? selectedEmployeeId || null : null,
      employee_name:
        isCashAdvance && selectedEmployee
          ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
          : null,
      deduct_to_payroll: isCashAdvance && deductToPayroll === "Yes",
      status: "ACTIVE",
      payroll_period_id:
        isCashAdvance && deductToPayroll === "Yes"
          ? activePayrollPeriod?.id || null
          : null,
    };

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert(expensePayload)
      .select()
      .single();

    if (expenseError) {
      console.log("ADD EXPENSE ERROR:", expenseError);
      alert("Failed to save expense.");
      return;
    }

    let linkedBalanceData: any = null;

    if (isCashAdvance && deductToPayroll === "Yes" && selectedEmployee) {
      const employeeName = `${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}`.trim();

      const { data: balanceData, error: balanceError } = await supabase
        .from("employee_balances")
        .insert({
          employee_id: selectedEmployee.id,
          employee_name: employeeName,
          balance_type: "Cash Advance",
          original_amount: amountValue,
          remaining_balance: amountValue,
          status: "Active",
          source_module: "Expenses",
          source_id: null,
          period_id: activePayrollPeriod?.id || null,
          remarks:
            `Source: Expenses. Auto linked to: ${
              activePayrollPeriod
                ? `${activePayrollPeriod.period_name || "Payroll Period"} (${activePayrollPeriod.start_date} to ${activePayrollPeriod.end_date})`
                : "No active cutoff"
            }. Expense ID: ${expenseData.id}. ${
              remarks || `Cash advance from Expenses on ${expenseDate}. Source: ${source}.`
            }`,
        })
        .select()
        .single();

      if (balanceError) {
        console.log("CREATE EMPLOYEE BALANCE ERROR:", balanceError);

        await createAuditLog({
          userName: "OPSCORE USER",
          module: "Expenses",
          action: "Cash Advance Balance Failed",
          description: `Expense saved but employee balance failed for ${employeeName} - ${formatCurrency(amountValue)}`,
          severity: "critical",
          recordId: expenseData.id,
          newValue: {
            expense: expensePayload,
            error: balanceError.message,
          },
        });

        alert(
          `Expense saved, but failed to create employee balance for payroll deduction.\n\n${balanceError.message}`
        );

        resetManualExpenseForm();
        getExpenses();
        return;
      }

      linkedBalanceData = balanceData;

      await supabase
        .from("expenses")
        .update({
          employee_balance_id: balanceData.id,
        })
        .eq("id", expenseData.id);

      if (activePayrollPeriod?.id) {
        await supabase
          .from("payroll_periods")
          .update({ needs_regeneration: true })
          .eq("id", activePayrollPeriod.id);
      }

      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Expenses",
        action: "Cash Advance Created",
        description: `${employeeName} cash advance ${formatCurrency(amountValue)} created and linked to payroll period ${
          activePayrollPeriod?.period_name || activePayrollPeriod?.id || "No period"
        }`,
        severity: "warning",
        recordId: expenseData.id,
        newValue: {
          expense: {
            ...expensePayload,
            id: expenseData.id,
            employee_balance_id: balanceData.id,
          },
          employeeBalance: balanceData,
          payrollPeriod: activePayrollPeriod,
        },
      });

      await getPayrollPeriods();
    } else {
      await createAuditLog({
        userName: "OPSCORE USER",
        module: "Expenses",
        action: "Create Expense",
        description: `${category} expense created: ${description} - ${formatCurrency(amountValue)}`,
        severity: "info",
        recordId: expenseData.id,
        newValue: {
          ...expensePayload,
          id: expenseData.id,
          employee_balance_id: linkedBalanceData?.id || null,
        },
      });
    }

    resetManualExpenseForm();
    getExpenses();

    alert(
      isCashAdvance && deductToPayroll === "Yes"
        ? "Cash advance saved and added to employee balances for payroll deduction."
        : "Expense saved."
    );
  };

  /// FUNCTIONS - VOID EXPENSE
  const voidExpense = async (expense: any) => {
    if (!canDeleteExpenses) {
      alert("Access denied.");
      return;
    }

    if (isExpenseVoided(expense)) {
      alert("This expense is already voided.");
      return;
    }

    const reason = window.prompt(
      (expense.employee_balance_id || expense.payroll_adjustment_id)
        ? "Enter void reason. This will void the expense and mark linked payroll/balance records inactive when available."
        : "Enter void reason for this expense."
    );

    if (!reason || !reason.trim()) {
      alert("Void reason is required.");
      return;
    }

    const linkedBalanceId = expense.employee_balance_id;
    const linkedAdjustmentId = expense.payroll_adjustment_id;
    const linkedPeriodId = expense.payroll_period_id || expense.period_id;
    const voidedAt = new Date().toISOString();
    const voidedBy =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_name") || "OPSCORE USER"
        : "OPSCORE USER";

    const currentRemarks = String(expense.remarks || "").trim();
    const voidRemarks = `${currentRemarks}${currentRemarks ? "\n" : ""}[VOIDED by ${voidedBy} at ${voidedAt}] Reason: ${reason.trim()}`;

    const { error: expenseVoidError } = await supabase
      .from("expenses")
      .update({
        status: "VOIDED",
        void_reason: reason.trim(),
        voided_by: voidedBy,
        voided_at: voidedAt,
        remarks: voidRemarks,
      })
      .eq("id", expense.id);

    if (expenseVoidError) {
      console.log("VOID EXPENSE ERROR:", expenseVoidError);
      alert("Failed to void expense. Check if expenses void columns exist in Supabase.");
      return;
    }

    let linkedBalanceVoided = false;
    let linkedAdjustmentVoided = false;

    if (linkedBalanceId) {
      const { error: balanceVoidError } = await supabase
        .from("employee_balances")
        .update({
          status: "Voided",
          remarks: `VOIDED from Expenses. Reason: ${reason.trim()}. Expense ID: ${expense.id}`,
        })
        .eq("id", linkedBalanceId);

      if (balanceVoidError) {
        console.log("VOID LINKED EMPLOYEE BALANCE WARNING:", balanceVoidError.message);
      } else {
        linkedBalanceVoided = true;
      }
    }

    if (linkedAdjustmentId) {
      const { error: adjustmentVoidError } = await supabase
        .from("payroll_adjustments")
        .update({
          status: "VOIDED",
          remarks: `VOIDED from Expenses. Reason: ${reason.trim()}. Expense ID: ${expense.id}`,
        })
        .eq("id", linkedAdjustmentId);

      if (adjustmentVoidError) {
        console.log("VOID LINKED PAYROLL ADJUSTMENT WARNING:", adjustmentVoidError.message);
      } else {
        linkedAdjustmentVoided = true;
      }

      if (linkedPeriodId) {
        await markPayrollNeedsRegeneration(linkedPeriodId);
      }
    }

    await createAuditLog({
      userName: voidedBy,
      module: "Expenses",
      action: expense.deduct_to_payroll ? "Void Cash Advance Expense" : "Void Expense",
      description: expense.deduct_to_payroll
        ? `Voided payroll-linked cash advance for ${expense.employee_name || "Unknown employee"} - ${formatCurrency(getExpenseDisplayAmount(expense))}. Reason: ${reason.trim()}`
        : `Voided expense: ${expense.description || expense.category || "Expense"} - ${formatCurrency(getExpenseDisplayAmount(expense))}. Reason: ${reason.trim()}`,
      severity: expense.deduct_to_payroll ? "critical" : "warning",
      recordId: expense.id,
      oldValue: expense,
      newValue: {
        status: "VOIDED",
        voidReason: reason.trim(),
        voidedBy,
        voidedAt,
        linkedBalanceVoided,
        linkedAdjustmentVoided,
      },
    });

    await getExpenses();
    if (linkedPeriodId) await getPayrollPeriods();

    alert("Expense was voided. It is excluded from official expense totals and reports.");
  };

  /// FUNCTIONS - EXPORT EXPENSES
  const exportExpenses = () => {
    if (operatingExpenses.length === 0 && employeeAdvanceReceivables.length === 0) {
      alert("No expense or employee advance records to export.");
      return;
    }

    const expenseRows = operatingExpenses.map((expense) => ({
      Date: expense.expense_date,
      Category: expense.category,
      Subcategory: expense.subcategory || "",
      Expense_Area: expense.department,
      Employee: expense.employee_name || "",
      Description: expense.description,
      Source: expense.source || "",
      Source_Type: getExpenseSourceType(expense),
      Amount: getExpenseDisplayAmount(expense),
      Payment_Method: expense.payment_method,
      Deduct_To_Payroll: expense.deduct_to_payroll ? "Yes" : "No",
      Payroll_Period_ID: expense.payroll_period_id || "",
      Payroll_Adjustment_ID: expense.payroll_adjustment_id || "",
      Employee_Balance_ID: expense.employee_balance_id || "",
      Cash_Movement_ID: expense.cash_movement_id || "",
      Remarks: expense.remarks || "",
    }));

    const employeeAdvanceRows = employeeAdvanceReceivables.map((expense) => ({
      Date: expense.expense_date,
      Category: expense.category,
      Subcategory: expense.subcategory || "",
      Expense_Area: expense.department,
      Employee: expense.employee_name || "",
      Description: expense.description,
      Source: expense.source || "",
      Source_Type: getExpenseSourceType(expense),
      Amount: getExpenseDisplayAmount(expense),
      Payment_Method: expense.payment_method,
      Deduct_To_Payroll: expense.deduct_to_payroll ? "Yes" : "No",
      Payroll_Period_ID: expense.payroll_period_id || "",
      Payroll_Adjustment_ID: expense.payroll_adjustment_id || "",
      Employee_Balance_ID: expense.employee_balance_id || "",
      Cash_Movement_ID: expense.cash_movement_id || "",
      Remarks: expense.remarks || "",
    }));

    const categoryRows = monthlyCategorySummary.map((row) => {
      const newRow: any = { Month: row.month };

      categories.forEach((cat) => {
        newRow[cat] = row[cat];
      });

      return newRow;
    });

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(expenseRows),
      "Operating Expenses"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(employeeAdvanceRows),
      "Employee Advances"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(categoryRows),
      "Monthly by Category"
    );

    XLSX.writeFile(
      workbook,
      `Expenses_Ledger_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  /// FUNCTIONS - IMPORT EXPENSES
  const handleImportFile = async (event: any) => {
    if (!canCreateExpenses) {
      alert("Access denied.");
      event.target.value = "";
      return;
    }

    const file = event.target.files[0];

    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    const parsedRows = rows
      .map((row) => ({
        expense_date: formatExcelDate(row.Date || row.date || row.expense_date),
        category: row.Category || row.category || "",
        subcategory: row.Subcategory || row.subcategory || "",
        department:
          row.Expense_Area ||
          row["Expense Area"] ||
          row.Department ||
          row.department ||
          "",
        description: row.Description || row.description || "",
        source:
          row.Source ||
          row.source ||
          row.Supplier ||
          row.supplier ||
          row.Vendor ||
          row.vendor ||
          "Imported",
        amount: cleanNumber(row.Amount || row.amount),
        payment_method:
          row.Payment ||
          row.Payment_Method ||
          row["Payment Method"] ||
          row.payment_method ||
          "",
        remarks: row.Remarks || row.remarks || "Imported expense",
        status: "ACTIVE",
      }))
      .filter((row) => row.expense_date && row.amount > 0);

    setImportPreview(parsedRows);
  };

  const cancelImport = () => {
    setImportPreview([]);
  };

  const saveImportedExpenses = async () => {
    if (!canCreateExpenses) {
      alert("Access denied.");
      return;
    }

    if (importPreview.length === 0) {
      alert("No imported expenses to save.");
      return;
    }

    const { error } = await supabase.from("expenses").insert(importPreview);

    if (error) {
      console.log("IMPORT EXPENSES ERROR:", error);
      alert("Failed to import expenses.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Expenses",
      action: "Import Expenses",
      description: `${importPreview.length} expense record(s) imported`,
      severity: "info",
      newValue: {
        importedCount: importPreview.length,
        sampleRows: importPreview.slice(0, 10),
      },
    });

    alert("Imported expenses saved successfully.");
    setImportPreview([]);
    getExpenses();
  };

  /// EFFECTS
  useEffect(() => {
    getCurrentUserPermissions();
    getExpenses();
    getFinanceSettings();
    getEmployees();
    getPayrollPeriods();
  }, []);

  /// UI
  return (
    <PageGuard moduleKey="expenses">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="FINANCE / EXPENSE LEDGER" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            {/* PAGE HEADER */}
            <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Finance
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Expense Ledger
                </h1>
                <p className="mt-1 max-w-4xl text-sm font-medium text-slate-500">
                  Record operating expenses, monitor cash drawer postings, review imports, and export finance-ready reports.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportExpenses}
                  className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  Export Excel
                </button>

              </div>
            </section>

            {!canCreateExpenses && (
              <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 shadow-sm">
                View-only access. You can review and export the expense ledger, but creating, importing, and deleting expenses are disabled for this role.
              </section>
            )}

            {/* ENTRY FORM */}
            <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Manual Entry
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Record Operating Expense
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Use this form for operating expenses only. Cash advances are released through Cash Management.
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FieldLabel label="Expense Date">
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </FieldLabel>

                    <FieldLabel label="Category">
                      <select
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setSubcategory("");
                        }}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select expense category</option>
                        {categories
                          .filter((item) => !String(item || "").toLowerCase().includes("cash advance"))
                          .map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                      </select>
                    </FieldLabel>

                    <FieldLabel label="Subcategory">
                      <select
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        disabled={subcategoryOptions.length === 0}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">{subcategoryOptions.length === 0 ? "No subcategory" : "Select subcategory"}</option>
                        {subcategoryOptions.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </FieldLabel>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FieldLabel label="Expense Area">
                      <select
                        value={expenseArea}
                        onChange={(e) => setExpenseArea(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select expense area</option>
                        {expenseAreas.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </FieldLabel>

                    <FieldLabel label="Source / Supplier">
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select source / supplier</option>
                        {expenseSources.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </FieldLabel>

                    <FieldLabel label="Payment Method">
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select payment method</option>
                        {paymentMethods.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </FieldLabel>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
                    <FieldLabel label="Description">
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the operating expense"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </FieldLabel>

                    <FieldLabel label="Amount">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                          â‚±
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-lg font-black text-slate-950 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    </FieldLabel>
                  </div>

                  <FieldLabel label="Additional Details">
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      placeholder="Reference number, supplier note, or internal remarks"
                      className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </FieldLabel>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      Cash advances are managed in Cash Management to avoid duplicate release workflows.
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={resetManualExpenseForm}
                        className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                      >
                        Reset
                      </button>
                      {canCreateExpenses ? (
                        <button
                          type="button"
                          onClick={addExpense}
                          className="h-11 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                        >
                          Save Expense
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-6 text-sm font-bold text-slate-400"
                        >
                          View Only
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Source Summary
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Expense Sources
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Operating expenses by posting source.
                </p>

                <div className="mt-5 space-y-3">
                  <SourceLine label="Manual Entry" value={formatCurrency(manualExpenseTotal)} />
                  <SourceLine label="Cash Drawer" value={formatCurrency(cashDrawerExpenseTotal)} />
                  <SourceLine label="Imported" value={formatCurrency(importedExpenseTotal)} />
                  <SourceLine label="Payroll Release" value={formatCurrency(payrollReleaseTotal)} />
                  <SourceLine label="Employee Advances" value={formatCurrency(cashAdvanceTotal)} />
                </div>
              </aside>
            </section>

            {/* KPI CARDS */}
            <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="This Month" value={formatCurrency(thisMonthExpenses)} helper="Operating expenses" />
              <MetricCard title="Today" value={formatCurrency(todayExpenses)} helper="Posted today" />
              <MetricCard title="Employee Advances" value={formatCurrency(cashAdvanceTotal)} helper="Receivables only" />
              <MetricCard
                title="Unlinked Advances"
                value={formatCurrency(unlinkedCashAdvanceTotal)}
                helper="Needs payroll link review"
                danger={unlinkedCashAdvanceTotal > 0}
              />
            </section>

            {(unlinkedCashAdvanceTotal > 0 || cashAdvanceTotal > 0) && (
              <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {unlinkedCashAdvanceTotal > 0 && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                      Payroll Link Warning
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Cash Advance Review Needed
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-amber-800">
                      {formatCurrency(unlinkedCashAdvanceTotal)} cash advance amount is not linked to payroll deduction. Review the employee balance or payroll period before payroll generation.
                    </p>
                  </div>
                )}

                {cashAdvanceTotal > 0 && (
                  <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                      Employee Receivables
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Cash Advances Excluded
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-blue-800">
                      {formatCurrency(cashAdvanceTotal)} payroll-linked cash advance amount is excluded from operating expenses to avoid inflated reports.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* LEDGER FILTERS */}
            <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search ledger..."
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 xl:col-span-2"
                />

                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="ALL">All Sources</option>
                  <option value="Manual Entry">Manual Entry</option>
                  <option value="Cash Drawer">Cash Drawer</option>
                  <option value="Payroll Release">Payroll Release</option>
                  <option value="Expense Request">Expense Request</option>
                  <option value="Imported">Imported</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="ALL">All Areas</option>
                  {expenseAreas.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* EXPENSE LEDGER TABLE */}
            <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Table / Log
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Official Expense Ledger
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Operating expenses only. Payroll-linked cash advances are tracked separately as employee receivables.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">
                  Showing <span className="text-slate-950">{sortedExpenses.length}</span> of <span className="text-slate-950">{operatingExpenses.length}</span>
                </div>
              </div>

              <div className="max-h-[720px] overflow-auto">
                <table className="w-full min-w-[1380px] table-fixed border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      {[
                        ["expense_date", "Date", "w-[120px]"],
                        ["department", "Area", "w-[150px]"],
                        ["category", "Category", "w-[170px]"],
                        ["subcategory", "Subcategory", "w-[170px]"],
                        ["employee_name", "Employee", "w-[180px]"],
                        ["description", "Description", "w-[290px]"],
                        ["amount", "Amount", "w-[140px]"],
                        ["source", "Source", "w-[160px]"],
                        ["payment_method", "Payment", "w-[140px]"],
                      ].map(([key, label, width]) => (
                        <th
                          key={key}
                          onClick={() => requestSort(key)}
                          className={`${width} cursor-pointer whitespace-nowrap px-4 py-3 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{label}</span>
                            <span className="text-xs text-slate-400">{sortIcon(key)}</span>
                          </div>
                        </th>
                      ))}
                      <th className="w-[180px] whitespace-nowrap px-4 py-3">Payroll</th>
                      <th className="w-[110px] whitespace-nowrap px-4 py-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {sortedExpenses.map((expense) => {
                      const sourceType = getExpenseSourceType(expense);

                      return (
                        <tr key={expense.id} className="text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3">{expense.expense_date}</td>
                          <td className="truncate px-4 py-3">{expense.department || "-"}</td>
                          <td className="truncate px-4 py-3">{expense.category || "-"}</td>
                          <td className="truncate px-4 py-3">{expense.subcategory || "-"}</td>
                          <td className="truncate px-4 py-3">{expense.employee_name || "-"}</td>
                          <td className="px-4 py-3">
                            <p className="break-words font-semibold text-slate-800">{expense.description || "-"}</p>
                            {expense.remarks && <p className="mt-1 break-words text-xs font-medium text-slate-500">{expense.remarks}</p>}
                            {getReferenceLabel(expense) && <p className="mt-1 break-all text-xs font-medium text-slate-400">{getReferenceLabel(expense)}</p>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-black text-slate-950">{formatCurrency(getExpenseDisplayAmount(expense))}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <SourceBadge sourceType={sourceType} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{expense.payment_method || "-"}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {expense.deduct_to_payroll ? <PayrollBadge expense={expense} /> : <span className="text-xs font-bold text-slate-400">-</span>}
                              {expense.deduct_to_payroll && <span className="text-xs font-medium text-slate-500">{getPayrollSourceLabel(expense)}</span>}
                              {expense.payroll_period_id && <span className="text-xs font-medium text-slate-500">Cutoff: {getPayrollPeriodLabel(getLinkedPayrollPeriod(expense))}</span>}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {canDeleteExpenses ? (
                              <button
                                type="button"
                                onClick={() => voidExpense(expense)}
                                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                              >
                                Void
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">View only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {sortedExpenses.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-14 text-center">
                          <p className="text-sm font-black text-slate-700">No records found</p>
                          <p className="mt-1 text-sm font-medium text-slate-500">No operating expenses match the selected filters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* LOWER REPORTING SECTION */}
            <section className="space-y-5">
              <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Report View
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Monthly Expenses by Category
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Finance export view aligned by month and category.
                  </p>
                </div>

                <div className="max-h-[520px] overflow-auto">
                  <table className="min-w-[1800px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="sticky left-0 z-20 whitespace-nowrap bg-slate-50 px-4 py-3">Month</th>
                        {categories.map((cat) => (
                          <th key={cat} className="whitespace-nowrap px-4 py-3">{cat}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyCategorySummary.map((row) => (
                        <tr key={row.month} className="text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 font-black text-slate-950">{row.month}</td>
                          {categories.map((cat) => (
                            <td key={cat} className="whitespace-nowrap px-4 py-3">{formatCurrency(row[cat])}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50 text-slate-950">
                        <td className="sticky left-0 z-20 whitespace-nowrap bg-slate-50 px-4 py-3 font-black">Total</td>
                        {categories.map((cat) => {
                          const total = monthlyCategorySummary.reduce((sum, row) => sum + Number(row[cat] || 0), 0);
                          return <td key={cat} className="whitespace-nowrap px-4 py-3 font-black">{formatCurrency(total)}</td>;
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Import Review
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Import Preview
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Upload Excel/CSV from the top action button, review preview, then save.
                    </p>
                  </div>

                  {canCreateExpenses && (
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                        Import File
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleImportFile}
                          className="hidden"
                        />
                      </label>

                      {importPreview.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={cancelImport}
                            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveImportedExpenses}
                            className="h-10 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                          >
                            Save Import
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-[380px] overflow-auto">
                  <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="w-[120px] px-4 py-3">Date</th>
                        <th className="w-[160px] px-4 py-3">Category</th>
                        <th className="w-[160px] px-4 py-3">Area</th>
                        <th className="w-[240px] px-4 py-3">Description</th>
                        <th className="w-[160px] px-4 py-3">Source</th>
                        <th className="w-[140px] px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.map((expense, index) => (
                        <tr key={index} className="text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3">{expense.expense_date}</td>
                          <td className="truncate px-4 py-3">{expense.category || "-"}</td>
                          <td className="truncate px-4 py-3">{expense.department || "-"}</td>
                          <td className="break-words px-4 py-3">{expense.description || "-"}</td>
                          <td className="truncate px-4 py-3">{expense.source || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-black text-slate-950">{formatCurrency(getExpenseDisplayAmount(expense))}</td>
                        </tr>
                      ))}

                      {importPreview.length === 0 && (
                        <tr>
                          <td colSpan={6} className="h-[310px] px-4 text-center">
                            <p className="text-sm font-black text-slate-700">No records found</p>
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              {canCreateExpenses ? "Upload Excel/CSV to preview expenses." : "Import is disabled for view-only roles."}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function FieldLabel({ label, children }: any) {
  return (
    <label className="block">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      {children}
    </label>
  );
}

function SourceLine({ label, value }: any) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function MetricCard({ title, value, helper, danger = false }: any) {
  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md ${
        danger ? "border-red-200" : "border-slate-200"
      }`}
    >
      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${danger ? "text-red-600" : "text-slate-500"}`}>
        {title}
      </p>
      <h2 className={`mt-2 break-words text-3xl font-black tracking-tight ${danger ? "text-red-700" : "text-slate-950"}`}>
        {value}
      </h2>
      {helper && <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>}
    </div>
  );
}

function SourceBadge({ sourceType }: any) {
  const type = String(sourceType || "Manual Entry");

  const style =
    type === "Cash Drawer"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : type === "Payroll Release"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : type === "Imported"
          ? "border-slate-200 bg-slate-100 text-slate-700"
          : type === "Expense Request"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
      {type}
    </span>
  );
}

function PayrollBadge({ expense }: any) {
  const isLinked = Boolean(expense?.employee_balance_id || expense?.payroll_adjustment_id);

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
        isLinked
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {isLinked ? "Payroll Linked" : "Payroll Pending"}
    </span>
  );
}





