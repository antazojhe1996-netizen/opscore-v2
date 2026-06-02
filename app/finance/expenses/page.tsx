"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import * as XLSX from "xlsx";

export default function ExpensesPage() {
  /// STATES - DATABASE DATA
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [paymentMethodsData, setPaymentMethodsData] = useState<any[]>([]);
  const [expenseAreasData, setExpenseAreasData] = useState<any[]>([]);
  const [expenseSourcesData, setExpenseSourcesData] = useState<any[]>([]);
  

  /// STATES - MANUAL EXPENSE FORM
  const today = new Date().toISOString().split("T")[0];

  const [expenseDate, setExpenseDate] = useState(today);
  const [category, setCategory] = useState("");
  const [expenseArea, setExpenseArea] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [remarks, setRemarks] = useState("");


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
  const paymentMethods = paymentMethodsData.map((item) => item.name);
  const expenseAreas = expenseAreasData.map((item) => item.name);
  const expenseSources = expenseSourcesData.map((item) => item.name);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  /// CALCULATIONS - DATE
  const currentYear = new Date().getFullYear();
  const now = new Date();

  /// CALCULATIONS - SOURCE HELPERS
  const getExpenseSourceType = (expense: any) => {
    if (expense.source === "Expense Request") return "Expense Request";
    if (expense.source === "Imported") return "Imported";
    return "Manual Entry";
  };

  const requestExpenseTotal = expenses
    .filter((expense) => getExpenseSourceType(expense) === "Expense Request")
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const manualExpenseTotal = expenses
    .filter((expense) => getExpenseSourceType(expense) === "Manual Entry")
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  /// CALCULATIONS - SUMMARY CARDS
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const todayExpenses = expenses
    .filter((expense) => expense.expense_date === today)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const thisMonthExpenses = expenses
    .filter((expense) => {
      const date = new Date(expense.expense_date + "T00:00:00");

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const pendingLiquidationAmount = expenseRequests
    .filter((request) => request.status === "RELEASED")
    .reduce((sum, request) => sum + Number(request.amount || 0), 0);

  const highestExpense =
    expenses.length > 0
      ? expenses.reduce((highest, expense) =>
          Number(expense.amount || 0) > Number(highest.amount || 0)
            ? expense
            : highest
        )
      : null;

  /// CALCULATIONS - MONTHLY CATEGORY SUMMARY
  const monthlyCategorySummary = monthNames.map((month, monthIndex) => {
    const row: any = { month };

    categories.forEach((cat) => {
      row[cat] = expenses
        .filter((expense) => {
          const date = new Date(expense.expense_date + "T00:00:00");

          return (
            date.getFullYear() === currentYear &&
            date.getMonth() === monthIndex &&
            expense.category === cat
          );
        })
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    });

    return row;
  });

  /// CALCULATIONS - FILTERED EXPENSES
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(expense.expense_date || "").toLowerCase().includes(search) ||
        String(expense.category || "").toLowerCase().includes(search) ||
        String(expense.department || "").toLowerCase().includes(search) ||
        String(expense.description || "").toLowerCase().includes(search) ||
        String(expense.source || "").toLowerCase().includes(search) ||
        String(expense.payment_method || "").toLowerCase().includes(search);

      const sourceType = getExpenseSourceType(expense);

      const matchesSource =
        sourceFilter === "ALL" ? true : sourceType === sourceFilter;

      const matchesCategory =
        categoryFilter === "ALL" ? true : expense.category === categoryFilter;

      const matchesDepartment =
        departmentFilter === "ALL"
          ? true
          : expense.department === departmentFilter;

      return matchesSearch && matchesSource && matchesCategory && matchesDepartment;
    });
  }, [expenses, searchTerm, sourceFilter, categoryFilter, departmentFilter]);

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
      return sortConfig.direction === "asc"
        ? new Date(aValue).getTime() - new Date(bValue).getTime()
        : new Date(bValue).getTime() - new Date(aValue).getTime();
    }

    return sortConfig.direction === "asc"
      ? String(aValue || "").localeCompare(String(bValue || ""))
      : String(bValue || "").localeCompare(String(aValue || ""));
  });

  const pendingRequests = expenseRequests.filter(
  (request) => request.status === "PENDING"
);

const pendingRequestAmount = pendingRequests.reduce(
  (sum, request) => sum + Number(request.amount || 0),
  0
);

  /// FUNCTIONS - FORMATTERS
  const formatCurrency = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const cleanNumber = (value: any) => {
    if (!value) return 0;

    return Number(
      String(value)
        .replace("₱", "")
        .replace(/,/g, "")
        .trim()
    );
  };

  const formatExcelDate = (value: any) => {
    if (!value) return "";

    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return "";

      const year = date.y;
      const month = String(date.m).padStart(2, "0");
      const day = String(date.d).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    return String(value).split("T")[0];
  };

  const getSourceBadgeStyle = (sourceType: string) => {
    if (sourceType === "Expense Request") {
      return "bg-blue-500/10 text-blue-400";
    }

    if (sourceType === "Imported") {
      return "bg-purple-500/10 text-purple-400";
    }

    return "bg-emerald-500/10 text-emerald-400";
  };

  /// FUNCTIONS - TABLE SORTING
  const requestSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortIcon = (key: string) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  /// FUNCTIONS - GET DATA
  const getFinanceSettings = async () => {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("finance_expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (categoriesError) {
      console.log("GET EXPENSE CATEGORIES ERROR:", categoriesError);
    }

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("finance_payment_methods")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (paymentsError) {
      console.log("GET PAYMENT METHODS ERROR:", paymentsError);
    }

    const { data: areasData, error: areasError } = await supabase
      .from("finance_expense_areas")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (areasError) {
      console.log("GET EXPENSE AREAS ERROR:", areasError);
    }

    const { data: sourcesData, error: sourcesError } = await supabase
      .from("finance_expense_sources")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (sourcesError) {
      console.log("GET EXPENSE SOURCES ERROR:", sourcesError);
    }

    setExpenseCategories(categoriesData || []);
    setPaymentMethodsData(paymentsData || []);
    setExpenseAreasData(areasData || []);
    setExpenseSourcesData(sourcesData || []);
  };

  const getExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (error) {
      console.log("GET EXPENSES ERROR:", error);
      return;
    }

    setExpenses(data || []);
  };

  const getExpenseRequests = async () => {
    const { data, error } = await supabase
      .from("expense_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET EXPENSE REQUESTS ERROR:", error);
      return;
    }

    setExpenseRequests(data || []);
  };

  /// FUNCTIONS - RESET FORM
  const resetManualExpenseForm = () => {
    setExpenseDate(today);
    setCategory("");
    setExpenseArea("");
    setDescription("");
    setSource("");
    setAmount("");
    setPaymentMethod("");
    setRemarks("");
  };

  /// FUNCTIONS - ADD MANUAL EXPENSE
  const addExpense = async () => {
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

    const { error } = await supabase.from("expenses").insert([
      {
        expense_date: expenseDate,
        category,
        department: expenseArea,
        description,
        source,
        amount: amountValue,
        payment_method: paymentMethod,
        remarks,
      },
    ]);

    if (error) {
      console.log("ADD EXPENSE ERROR:", error);
      alert("Failed to save expense.");
      return;
    }

    resetManualExpenseForm();
    getExpenses();
  };

  /// FUNCTIONS - DELETE EXPENSE
  const deleteExpense = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.log("DELETE EXPENSE ERROR:", error);
      alert("Failed to delete expense.");
      return;
    }

    getExpenses();
  };

    /// FUNCTIONS - EXPORT EXPENSES
  const exportExpenses = () => {
    if (expenses.length === 0) {
      alert("No expenses to export.");
      return;
    }

    const expenseRows = expenses.map((expense) => ({
      Date: expense.expense_date,
      Category: expense.category,
      Expense_Area: expense.department,
      Description: expense.description,
      Source: expense.source || "",
      Source_Type: getExpenseSourceType(expense),
      Amount: Number(expense.amount || 0),
      Payment_Method: expense.payment_method,
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
      "Expense Ledger"
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
      }))
      .filter((row) => row.expense_date && row.amount > 0);

    setImportPreview(parsedRows);
  };

  const cancelImport = () => {
    setImportPreview([]);
  };

  const saveImportedExpenses = async () => {
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

    alert("Imported expenses saved successfully.");
    setImportPreview([]);
    getExpenses();
  };

  /// EFFECTS
  useEffect(() => {
    getExpenses();
    getExpenseRequests();
    getFinanceSettings();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Finance Ledger
          </p>
          <h1 className="mt-2 text-3xl font-bold">Expenses Ledger</h1>
          <p className="mt-2 text-sm text-slate-400">
            Review manual expenses, imported expenses, and posted expense requests in one official ledger.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="This Month Expenses"
            value={formatCurrency(thisMonthExpenses)}
            color="text-red-400"
          />

          <SummaryCard
            title="Expense Requests"
            value={formatCurrency(requestExpenseTotal)}
            color="text-blue-400"
          />

          <SummaryCard
            title="Manual Expenses"
            value={formatCurrency(manualExpenseTotal)}
            color="text-emerald-400"
          />

           <SummaryCard
          title="Pending Requests"
          value={`${pendingRequests.length} / ${formatCurrency(pendingRequestAmount)}`}
          color="text-amber-400"
        />

          <SummaryCard
            title="Pending Liquidation"
            value={formatCurrency(pendingLiquidationAmount)}
            color="text-amber-400"
          />
        </section>

        {pendingRequests.length > 0 && (
  <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-lg font-bold text-amber-400">
          Pending Expense Requests
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {pendingRequests.length} request(s) waiting for approval with total amount of{" "}
          <span className="font-semibold text-white">
            {formatCurrency(pendingRequestAmount)}
          </span>
          .
        </p>
      </div>

      <a
        href="/finance/expense-requests"
        className="w-fit rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400"
      >
        Review Requests →
      </a>
    </div>
  </section>
)}

       

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="self-start rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Manual Expense Entry</h2>
            <p className="mt-1 text-sm text-slate-400">
              Use this for expenses that did not go through the request workflow.
            </p>

            <div className="mt-5 space-y-4">
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Select expense category</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={expenseArea}
                onChange={(e) => setExpenseArea(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Select expense area</option>
                {expenseAreas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />

              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Select source / supplier</option>
                {expenseSources.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Select payment method</option>
                {paymentMethods.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Optional remarks..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />

              <button
                onClick={addExpense}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
              >
                Save Manual Expense
              </button>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">Official Expense Ledger</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Click table headers to sort. Use filters to separate requests, manual entries, and imports.
                </p>
              </div>

              <button
                onClick={exportExpenses}
                className="w-fit rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500"
              >
                Export Excel
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ledger..."
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="ALL">All Sources</option>
                <option value="Expense Request">Expense Request</option>
                <option value="Manual Entry">Manual Entry</option>
                <option value="Imported">Imported</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="ALL">All Areas</option>
                {expenseAreas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-[640px] max-w-full overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1180px] table-fixed border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950">
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    {[
                      ["expense_date", "Date", "w-[120px]"],
                      ["department", "Area", "w-[150px]"],
                      ["category", "Category", "w-[150px]"],
                      ["description", "Description", "w-[260px]"],
                      ["amount", "Amount", "w-[130px]"],
                      ["source", "Source", "w-[160px]"],
                      ["payment_method", "Payment", "w-[130px]"],
                    ].map(([key, label, width]) => (
                      <th
                        key={key}
                        onClick={() => requestSort(key)}
                        className={`${width} cursor-pointer whitespace-nowrap px-4 py-3 hover:bg-slate-800 hover:text-white`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{label}</span>
                          <span className="text-xs text-slate-500">
                            {sortIcon(key)}
                          </span>
                        </div>
                      </th>
                    ))}

                    <th className="w-[100px] whitespace-nowrap px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedExpenses.map((expense) => {
                    const sourceType = getExpenseSourceType(expense);

                    return (
                      <tr
                        key={expense.id}
                        className="border-b border-slate-800/70 text-slate-200 hover:bg-slate-800/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          {expense.expense_date}
                        </td>

                        <td className="truncate px-4 py-3">
                          {expense.department || "-"}
                        </td>

                        <td className="truncate px-4 py-3">
                          {expense.category || "-"}
                        </td>

                        <td className="break-words px-4 py-3">
                          <p>{expense.description || "-"}</p>
                          {expense.remarks && (
                            <p className="mt-1 text-xs text-slate-500">
                              {expense.remarks}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          {formatCurrency(expense.amount)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getSourceBadgeStyle(
                              sourceType
                            )}`}
                          >
                            {sourceType}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {expense.payment_method || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-semibold hover:bg-slate-500"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {sortedExpenses.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-slate-500"
                      >
                        No expenses found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section className="mt-6 min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">Monthly Expenses by Category</h2>

          <div className="max-w-full overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-[1400px] border-collapse text-sm">
              <thead className="bg-slate-950">
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="sticky left-0 z-20 whitespace-nowrap bg-slate-950 px-4 py-3">
                    Month
                  </th>

                  {categories.map((cat) => (
                    <th key={cat} className="whitespace-nowrap px-4 py-3">
                      {cat}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {monthlyCategorySummary.map((row) => (
                  <tr
                    key={row.month}
                    className="border-b border-slate-800/70 text-slate-200 hover:bg-slate-800/30"
                  >
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-slate-900 px-4 py-3 font-semibold">
                      {row.month}
                    </td>

                    {categories.map((cat) => (
                      <td key={cat} className="whitespace-nowrap px-4 py-3">
                        {formatCurrency(row[cat])}
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="border-t border-slate-700 bg-slate-950 text-white">
                  <td className="sticky left-0 z-20 whitespace-nowrap bg-slate-950 px-4 py-3 font-bold">
                    Total
                  </td>

                  {categories.map((cat) => {
                    const total = monthlyCategorySummary.reduce(
                      (sum, row) => sum + Number(row[cat] || 0),
                      0
                    );

                    return (
                      <td key={cat} className="whitespace-nowrap px-4 py-3 font-bold">
                        {formatCurrency(total)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Import Expenses</h2>
              <p className="mt-1 text-sm text-slate-400">
                Upload Excel or CSV, review preview, then save to the ledger.
              </p>
            </div>

            {importPreview.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={cancelImport}
                  className="rounded-lg bg-slate-600 px-3 py-2 text-xs font-semibold hover:bg-slate-500"
                >
                  Cancel
                </button>

                <button
                  onClick={saveImportedExpenses}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"
                >
                  Save Import
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="mb-4 w-fit rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
          />

          <div className="h-[520px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950">
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="w-[120px] px-4 py-3">Date</th>
                  <th className="w-[160px] px-4 py-3">Category</th>
                  <th className="w-[160px] px-4 py-3">Area</th>
                  <th className="w-[220px] px-4 py-3">Description</th>
                  <th className="w-[160px] px-4 py-3">Source</th>
                  <th className="w-[140px] px-4 py-3">Amount</th>
                </tr>
              </thead>

              <tbody>
                {importPreview.map((expense, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-800/70 text-slate-200"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {expense.expense_date}
                    </td>

                    <td className="truncate px-4 py-3">
                      {expense.category || "-"}
                    </td>

                    <td className="truncate px-4 py-3">
                      {expense.department || "-"}
                    </td>

                    <td className="break-words px-4 py-3">
                      {expense.description || "-"}
                    </td>

                    <td className="truncate px-4 py-3">
                      {expense.source || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}

                {importPreview.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="h-[450px] text-center text-slate-500"
                    >
                      Upload Excel/CSV to preview expenses.
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

/// COMPONENT - SUMMARY CARD
function SummaryCard({ title, value, color }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 break-words text-2xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}