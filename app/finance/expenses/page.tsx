"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import * as XLSX from "xlsx";

export default function ExpensesPage() {
  /// STATES
  const [expenses, setExpenses] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const [expenseSort, setExpenseSort] = useState("newest");
  const [expenseDate, setExpenseDate] = useState(today);
  const [category, setCategory] = useState("Food");
  const [department, setDepartment] = useState("Restaurant");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "expense_date",
    direction: "desc",
    });

  /// DATA
  const categories = [
    "Food",
    "Beverages",
    "Payroll",
    "Utilities",
    "Housekeeping",
    "Front Office",
    "Maintenance",
    "Laundry",
    "Pool Supplies",
    "Gas Vehicle/RFID",
    "Marketing",
    "Transportation",
    "Apartment",
    "Others",
  ];

  const departments = [
    "Hotel",
    "Restaurant",
    "Sports Bar",
    "Housekeeping",
    "Front Office",
    "Maintenance",
    "Admin",
    "Apartment",
    "Others",
  ];

  const paymentMethods = [
    "Cash",
    "GCash",
    "Bank Transfer",
    "Credit Card",
    "Petty Cash",
  ];

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

  /// CALCULATIONS
  const currentYear = new Date().getFullYear();

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
      const now = new Date();

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const highestExpense =
    expenses.length > 0
      ? expenses.reduce((highest, expense) =>
          Number(expense.amount || 0) > Number(highest.amount || 0)
            ? expense
            : highest
        )
      : null;

  const dailyExpenseSummary = Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;

    const total = expenses
      .filter((expense) => {
        const date = new Date(expense.expense_date + "T00:00:00");

        return date.getFullYear() === currentYear && date.getDate() === day;
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    return { day, total };
  });

  const monthlyExpenseSummary = monthNames.map((month, index) => {
    const total = expenses
      .filter((expense) => {
        const date = new Date(expense.expense_date + "T00:00:00");

        return date.getFullYear() === currentYear && date.getMonth() === index;
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    return { month, total };
  });

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

  

const sortedExpenses = [...expenses].sort((a, b) => {
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

  /// FUNCTIONS
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

  const addExpense = async () => {
    if (!expenseDate || !category || !description.trim() || !amount) {
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
        department,
        description,
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

    setExpenseDate(today);
    setCategory("Food");
    setDepartment("Restaurant");
    setDescription("");
    setAmount("");
    setPaymentMethod("Cash");
    setRemarks("");

    getExpenses();
  };

  const deleteExpense = async (id: number) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.log("DELETE EXPENSE ERROR:", error);
      return;
    }

    getExpenses();
  };

  const exportExpenses = () => {
    if (expenses.length === 0) {
      alert("No expenses to export.");
      return;
    }

    const expenseRows = expenses.map((expense) => ({
      Date: expense.expense_date,
      Category: expense.category,
      Department: expense.department,
      Description: expense.description,
      Amount: Number(expense.amount || 0),
      Payment_Method: expense.payment_method,
      Remarks: expense.remarks || "",
    }));

    const dailyRows = dailyExpenseSummary.map((item) => ({
      Day: item.day,
      Total_Expenses: item.total,
    }));

    const monthlyRows = monthlyExpenseSummary.map((item) => ({
      Month: item.month,
      Total_Expenses: item.total,
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
      "Expense History"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dailyRows),
      "Daily Summary"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(monthlyRows),
      "Monthly Summary"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(categoryRows),
      "Monthly by Category"
    );

    XLSX.writeFile(
      workbook,
      `Expenses_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

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
        expense_date: formatExcelDate(
            row.Date || row.date || row.expense_date
            ),
        category: row.Category || row.category || "Others",
        department: row.Department || row.department || "Others",
        description: row.Description || row.description || "",
        amount: cleanNumber(row.Amount || row.amount),
        
        payment_method:
        row.Payment ||
        row.Payment_Method ||
        row["Payment Method"] ||
        row.payment_method ||
        "Cash",
        remarks: row.Remarks || row.remarks || "",
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

  useEffect(() => {
    getExpenses();
  }, []);

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

  /// UI
return (
  <div className="flex min-h-screen bg-slate-950 text-white">
    <Sidebar />

    <main className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-slate-400">
            Encode, import, summarize, and export hotel expenses.
          </p>
        </div>

        <button
          onClick={exportExpenses}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:bg-green-500"
        >
          Download Excel Report
        </button>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm text-slate-400">Total Expenses</p>
          <h2 className="mt-2 text-3xl font-bold">
            {formatCurrency(totalExpenses)}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm text-slate-400">Today&apos;s Expenses</p>
          <h2 className="mt-2 text-3xl font-bold">
            {formatCurrency(todayExpenses)}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm text-slate-400">This Month</p>
          <h2 className="mt-2 text-3xl font-bold">
            {formatCurrency(thisMonthExpenses)}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm text-slate-400">Highest Expense</p>
          <h2 className="mt-2 text-3xl font-bold">
            {highestExpense ? formatCurrency(highestExpense.amount) : "₱0.00"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {highestExpense?.category || "No data"}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <section className="self-start rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="mb-6 text-xl font-bold">Add Expense</h2>

          <div className="space-y-4">
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
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
            >
              {departments.map((item) => (
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
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500"
            >
              Save Expense
            </button>
          </div>
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Import Expenses</h2>
              <p className="mt-1 text-sm text-slate-400">
                Upload Excel or CSV, review preview, then save.
              </p>
            </div>

            {importPreview.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={cancelImport}
                  className="rounded-xl bg-slate-600 px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:bg-slate-500"
                >
                  Cancel Import
                </button>

                <button
                  onClick={saveImportedExpenses}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500"
                >
                  Save Imported
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />

          <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="whitespace-nowrap px-4 py-3 align-middle">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 align-middle">
                    Category
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 align-middle">
                    Department
                  </th>
                  <th className="min-w-[220px] px-4 py-3 align-middle">
                    Description
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 align-middle">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {importPreview.map((expense, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-800/70 text-slate-200"
                  >
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      {expense.expense_date}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      {expense.category}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      {expense.department}
                    </td>
                    <td className="min-w-[220px] px-4 py-3 align-middle">
                      {expense.description}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle font-semibold">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}

                {importPreview.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Upload Excel/CSV to preview expenses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <h2 className="mb-6 text-xl font-bold">Expense History</h2>

        <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-800">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="border-b border-slate-800 text-left text-slate-400">
                {[
                  ["expense_date", "Date"],
                  ["category", "Category"],
                  ["department", "Department"],
                  ["description", "Description"],
                  ["amount", "Amount"],
                  ["payment_method", "Payment"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => requestSort(key)}
                    className="cursor-pointer whitespace-nowrap px-4 py-3 align-middle transition hover:bg-slate-800 hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <span>{label}</span>
                      <span className="text-xs text-slate-500">
                        {sortIcon(key)}
                      </span>
                    </div>
                  </th>
                ))}

                <th className="whitespace-nowrap px-4 py-3 align-middle">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedExpenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-slate-800/70 text-slate-200 transition hover:bg-slate-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    {expense.expense_date}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    {expense.category}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    {expense.department}
                  </td>

                  <td className="min-w-[220px] px-4 py-3 align-middle">
                    {expense.description}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 align-middle font-semibold">
                    {formatCurrency(expense.amount)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    {expense.payment_method}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-semibold transition-all duration-200 hover:scale-105 hover:bg-slate-500"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {sortedExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No expenses encoded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">Daily Expenses Summary</h2>

          <div className="max-h-[500px] overflow-y-auto rounded-xl border border-slate-800">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="whitespace-nowrap px-4 py-3 align-middle">
                    Day
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 align-middle">
                    Total Expenses
                  </th>
                </tr>
              </thead>

              <tbody>
                {dailyExpenseSummary.map((item) => (
                  <tr
                    key={item.day}
                    className="border-b border-slate-800/70 text-slate-200 transition hover:bg-slate-800/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      {item.day}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle font-semibold">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">Monthly Expenses Summary</h2>

          <div className="rounded-xl border border-slate-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="whitespace-nowrap px-4 py-3 align-middle">
                    Month
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 align-middle">
                    Total Expenses
                  </th>
                </tr>
              </thead>

              <tbody>
                {monthlyExpenseSummary.map((item) => (
                  <tr
                    key={item.month}
                    className="border-b border-slate-800/70 text-slate-200 transition hover:bg-slate-800/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      {item.month}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle font-semibold">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Monthly Expenses by Category</h2>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="whitespace-nowrap px-4 py-3 align-middle">
                  Month
                </th>

                {categories.map((cat) => (
                  <th
                    key={cat}
                    className="whitespace-nowrap px-4 py-3 align-middle"
                  >
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {monthlyCategorySummary.map((row) => (
                <tr
                  key={row.month}
                  className="border-b border-slate-800/70 text-slate-200 transition hover:bg-slate-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 align-middle font-semibold">
                    {row.month}
                  </td>

                  {categories.map((cat) => (
                    <td
                      key={cat}
                      className="whitespace-nowrap px-4 py-3 align-middle"
                    >
                      {formatCurrency(row[cat])}
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="border-t border-slate-700 bg-slate-950 text-white">
                <td className="whitespace-nowrap px-4 py-3 align-middle font-bold">
                  Total
                </td>

                {categories.map((cat) => {
                  const total = monthlyCategorySummary.reduce(
                    (sum, row) => sum + Number(row[cat] || 0),
                    0
                  );

                  return (
                    <td
                      key={cat}
                      className="whitespace-nowrap px-4 py-3 align-middle font-bold"
                    >
                      {formatCurrency(total)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
);
}