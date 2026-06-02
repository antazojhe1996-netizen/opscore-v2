"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function CashManagementPage() {
  /// STATES - DATABASE DATA
  const [movements, setMovements] = useState<any[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<any[]>([]);
  const [manualExpenses, setManualExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  /// STATES - FORM
  const today = new Date().toISOString().split("T")[0];

  const [businessDate, setBusinessDate] = useState(today);
  const [movementType, setMovementType] = useState("Cash In");
  const [source, setSource] = useState("Room Sales");
  const [paymentType, setPaymentType] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [fromPerson, setFromPerson] = useState("");
  const [toPerson, setToPerson] = useState("");
  const [encodedBy, setEncodedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  /// STATES - FILTERS
  const [dateFilter, setDateFilter] = useState(today);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  /// STATES - SYSTEM
  const [isSaving, setIsSaving] = useState(false);

  /// DATA - OPTIONS
  const movementTypes = [
    "Opening Float",
    "Cash In",
    "Cash Out",
    "Remittance",
    "Adjustment",
  ];

  const sourceOptions = [
    "Room Sales",
    "Restaurant Sales",
    "Apartment Collection",
    "Expense Release",
    "Manual Cash Expense",
    "Owner Withdrawal",
    "Bank Deposit",
    "Petty Cash",
    "Other",
  ];

  const paymentTypes = ["Cash", "GCash", "Bank", "Terminal"];

  /// CALCULATIONS - FILTERED MOVEMENTS
  const filteredMovements = useMemo(() => {
    return movements.filter((item) => {
      const matchesDate = dateFilter ? item.business_date === dateFilter : true;

      const matchesType =
        typeFilter === "ALL" ? true : item.movement_type === typeFilter;

      const matchesPayment =
        paymentFilter === "ALL"
          ? true
          : (item.payment_type || "Cash") === paymentFilter;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(item.source || "").toLowerCase().includes(search) ||
        String(item.from_person || "").toLowerCase().includes(search) ||
        String(item.to_person || "").toLowerCase().includes(search) ||
        String(item.encoded_by || "").toLowerCase().includes(search) ||
        String(item.remarks || "").toLowerCase().includes(search);

      return matchesDate && matchesType && matchesPayment && matchesSearch;
    });
  }, [movements, dateFilter, typeFilter, paymentFilter, searchTerm]);

  /// CALCULATIONS - CASH ONLY MOVEMENTS
  const cashOnlyMovements = filteredMovements.filter(
    (item) => (item.payment_type || "Cash") === "Cash"
  );

  const cashInTotal = cashOnlyMovements
    .filter(
      (item) =>
        item.movement_type === "Opening Float" ||
        item.movement_type === "Cash In" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) > 0)
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const cashOutTotal = cashOnlyMovements
    .filter(
      (item) =>
        item.movement_type === "Cash Out" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0)
    )
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  const remittanceTotal = cashOnlyMovements
    .filter((item) => item.movement_type === "Remittance")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const cashOnHand = cashInTotal - cashOutTotal;

  /// CALCULATIONS - DIGITAL / NON-CASH FUNDS
  const gcashTotal = filteredMovements
    .filter((item) => (item.payment_type || "Cash") === "GCash")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const bankTotal = filteredMovements
    .filter((item) => (item.payment_type || "Cash") === "Bank")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const terminalTotal = filteredMovements
    .filter((item) => (item.payment_type || "Cash") === "Terminal")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  /// CALCULATIONS - CASH HOLDER BALANCES
  const holderBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    cashOnlyMovements.forEach((item) => {
      const value = Number(item.amount || 0);
      const fromName = item.from_person || "";
      const toName = item.to_person || "";

      if (
        item.movement_type === "Opening Float" ||
        item.movement_type === "Cash In"
      ) {
        if (toName) {
          balances[toName] = (balances[toName] || 0) + value;
        }
      }

      if (item.movement_type === "Cash Out") {
        if (fromName) {
          balances[fromName] = (balances[fromName] || 0) - value;
        }
      }

      if (item.movement_type === "Remittance") {
        if (fromName) {
          balances[fromName] = (balances[fromName] || 0) - value;
        }

        if (toName) {
          balances[toName] = (balances[toName] || 0) + value;
        }
      }

      if (item.movement_type === "Adjustment") {
        if (toName && value > 0) {
          balances[toName] = (balances[toName] || 0) + value;
        }

        if (fromName && value < 0) {
          balances[fromName] = (balances[fromName] || 0) - Math.abs(value);
        }
      }
    });

    return Object.entries(balances)
      .map(([name, balance]) => ({ name, balance }))
      .filter((item) => Math.abs(item.balance) > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [cashOnlyMovements]);

  /// CALCULATIONS - PENDING MANUAL CASH EXPENSES
  const pendingManualCashExpenses = manualExpenses.filter((expense) => {
    const payment = String(expense.payment_method || "").toLowerCase();

    return (
      expense.expense_date === dateFilter &&
      payment.includes("cash") &&
      !expense.posted_to_cash_movements
    );
  });

  const pendingManualCashExpenseAmount = pendingManualCashExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  /// CALCULATIONS - RELEASED REQUESTS ALERT
  const pendingReleasedExpenses = expenseRequests
    .filter((item) => item.status === "RELEASED")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      /// FUNCTIONS - FORMATTERS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getMovementStyle = (type: string) => {
    if (type === "Opening Float") return "bg-blue-500/10 text-blue-400";
    if (type === "Cash In") return "bg-emerald-500/10 text-emerald-400";
    if (type === "Cash Out") return "bg-red-500/10 text-red-400";
    if (type === "Remittance") return "bg-amber-500/10 text-amber-400";
    if (type === "Adjustment") return "bg-purple-500/10 text-purple-400";

    return "bg-slate-700 text-slate-300";
  };

  const getPaymentStyle = (payment: string) => {
    if (payment === "Cash") return "bg-emerald-500/10 text-emerald-400";
    if (payment === "GCash") return "bg-purple-500/10 text-purple-400";
    if (payment === "Bank") return "bg-blue-500/10 text-blue-400";
    if (payment === "Terminal") return "bg-sky-500/10 text-sky-400";

    return "bg-slate-700 text-slate-300";
  };

  /// FUNCTIONS - GET DATA
  const getCashMovements = async () => {
    const { data, error } = await supabase
      .from("finance_cash_movements")
      .select("*")
      .order("business_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET CASH MOVEMENTS ERROR:", error);
      return;
    }

    setMovements(data || []);
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

  const getManualExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (error) {
      console.log("GET MANUAL EXPENSES ERROR:", error);
      return;
    }

    setManualExpenses(data || []);
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error);
      return;
    }

    setEmployees(data || []);
  };

  /// FUNCTIONS - RESET FORM
  const resetForm = () => {
    setBusinessDate(today);
    setMovementType("Cash In");
    setSource("Room Sales");
    setPaymentType("Cash");
    setAmount("");
    setFromPerson("");
    setToPerson("");
    setEncodedBy("");
    setRemarks("");
  };

  /// FUNCTIONS - SAVE CASH MOVEMENT
  const saveMovement = async () => {
    if (isSaving) return;

    if (
      !businessDate ||
      !movementType ||
      !source ||
      !paymentType ||
      !amount ||
      !encodedBy.trim()
    ) {
      alert(
        "Please complete date, type, source, payment type, amount, and encoded by."
      );
      return;
    }

    const amountValue = Number(amount);

    if (amountValue === 0) {
      alert("Amount cannot be zero.");
      return;
    }

    if (
      paymentType === "Cash" &&
      (movementType === "Cash In" || movementType === "Opening Float") &&
      !toPerson.trim()
    ) {
      alert("Please enter who received/holds the cash.");
      return;
    }

    if (
      paymentType === "Cash" &&
      movementType === "Cash Out" &&
      !fromPerson.trim()
    ) {
      alert("Please enter who released the cash.");
      return;
    }

    if (
      paymentType === "Cash" &&
      movementType === "Remittance" &&
      (!fromPerson.trim() || !toPerson.trim())
    ) {
      alert("Please enter remitted by and received by.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("finance_cash_movements").insert({
      business_date: businessDate,
      movement_type: movementType,
      source,
      payment_type: paymentType,
      amount: amountValue,
      from_person: fromPerson.trim(),
      to_person: toPerson.trim(),
      encoded_by: encodedBy.trim(),
      remarks: remarks.trim(),
    });

    setIsSaving(false);

    if (error) {
      console.log("SAVE CASH MOVEMENT ERROR:", error);
      alert("Failed to save cash movement.");
      return;
    }

    resetForm();
    getCashMovements();
  };

  /// FUNCTIONS - MOVE MANUAL EXPENSE TO CASH MOVEMENT
  const moveExpenseToCashMovement = async (expense: any) => {
  if (isSaving) return;

  if (expense.posted_to_cash_movements) {
    alert("This expense is already moved to cash movement.");
    return;
  }

  const confirmMove = confirm("Move this expense to Cash Movement?");
  if (!confirmMove) return;

  setIsSaving(true);

    const { data: movementData, error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        business_date: expense.expense_date,
        movement_type: "Cash Out",
        source: "Manual Cash Expense",
        payment_type: "Cash",
        amount: Number(expense.amount || 0),
        from_person:
        expense.requested_by ||
        expense.requestedBy ||
        expense.requested_by_name ||
        "Unknown",

        to_person: "",

        encoded_by:
        expense.created_by ||
        expense.createdBy ||
        expense.encoded_by ||
        "System",
        remarks: `${expense.description || ""} ${
          expense.remarks ? `- ${expense.remarks}` : ""
        }`.trim(),
        reference_type: "expense",
        reference_id: null,
      })
      .select()
      .single();

    if (movementError) {
  setIsSaving(false);

  console.log(
    "MOVE EXPENSE TO CASH MOVEMENT ERROR:",
    movementError
  );

  alert(JSON.stringify(movementError));

  return;
}

    const { error: updateError } = await supabase
      .from("expenses")
      .update({
        posted_to_cash_movements: true,
        cash_movement_id: movementData.id,
        cash_posted_date: new Date().toISOString(),
      })
      .eq("id", expense.id);

    setIsSaving(false);

    if (updateError) {
      console.log("UPDATE EXPENSE CASH POST ERROR:", updateError);
      alert("Cash movement was created, but expense was not marked as posted.");
      return;
    }

    alert("Expense moved to Cash Movement.");

    getCashMovements();
    getManualExpenses();
  };

  

  /// FUNCTIONS - DELETE MOVEMENT
  const deleteMovement = async (id: string) => {
    const confirmDelete = confirm("Delete this cash movement?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("finance_cash_movements")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE CASH MOVEMENT ERROR:", error);
      alert("Failed to delete movement.");
      return;
    }

    getCashMovements();
  };

  /// EFFECTS
  useEffect(() => {
    getCashMovements();
    getExpenseRequests();
    getManualExpenses();
    getEmployees();
  }, []);

    /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Finance Control
          </p>

          <h1 className="mt-2 text-3xl font-bold">Cash Management</h1>

          <p className="mt-2 text-sm text-slate-400">
            Track cash movements, digital payments, manual cash expenses, and
            who is holding the money.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Cash On Hand"
            value={formatMoney(cashOnHand)}
            color="text-emerald-400"
          />

          <SummaryCard
            title="GCash / Digital"
            value={formatMoney(gcashTotal)}
            color="text-purple-400"
          />

          <SummaryCard
            title="Bank"
            value={formatMoney(bankTotal)}
            color="text-blue-400"
          />

          <SummaryCard
            title="Terminal"
            value={formatMoney(terminalTotal)}
            color="text-sky-400"
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Cash In"
            value={formatMoney(cashInTotal)}
            color="text-blue-400"
          />

          <SummaryCard
            title="Cash Out"
            value={formatMoney(cashOutTotal)}
            color="text-red-400"
          />

          <SummaryCard
            title="Cash Remitted"
            value={formatMoney(remittanceTotal)}
            color="text-amber-400"
          />

          <SummaryCard
            title="Pending Cash Expenses"
            value={formatMoney(pendingManualCashExpenseAmount)}
            color="text-red-400"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-xl font-bold">Current Cash Holders</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {holderBalances.map((holder) => (
              <div
                key={holder.name}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <p className="text-sm text-slate-400">{holder.name}</p>

                <h3
                  className={`mt-2 text-xl font-bold ${
                    holder.balance < 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {formatMoney(holder.balance)}
                </h3>
              </div>
            ))}

            {holderBalances.length === 0 && (
              <p className="text-sm text-slate-500">
                No cash holder balances yet.
              </p>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 shadow-lg">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-red-400">
              Pending Manual Cash Expenses
            </h2>

            <p className="mt-1 text-sm text-slate-300">
              Cash expenses from Expenses Ledger that are not yet moved to Cash
              Movement. Fill <span className="font-semibold">From</span> and{" "}
              <span className="font-semibold">Encoded By</span> in the form
              before moving.
            </p>
          </div>

          <div className="overflow-auto rounded-xl border border-red-500/20">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {pendingManualCashExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-t border-red-500/20 text-slate-200"
                  >
                    <td className="px-4 py-3">{expense.expense_date}</td>
                    <td className="px-4 py-3">{expense.department || "-"}</td>
                    <td className="px-4 py-3">{expense.category || "-"}</td>
                    <td className="px-4 py-3">{expense.description || "-"}</td>

                    <td className="px-4 py-3 text-right font-semibold text-red-400">
                      {formatMoney(expense.amount)}
                    </td>

                    <td className="px-4 py-3">
                      {expense.payment_method || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => moveExpenseToCashMovement(expense)}
                        disabled={isSaving}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Move to Cash Movement
                      </button>
                    </td>
                  </tr>
                ))}

                {pendingManualCashExpenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No pending manual cash expenses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Add Cash Movement</h2>

            <p className="mt-1 text-sm text-slate-400">
              Use this for cash in, cash out, remittance, digital payment
              tracking, or adjustments.
            </p>

            <div className="mt-5 space-y-4">
              <input
                type="date"
                value={businessDate}
                onChange={(e) => setBusinessDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {movementTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>

              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {sourceOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {["Cash", "GCash", "Bank", "Terminal"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              {(movementType === "Cash Out" ||
                movementType === "Remittance" ||
                movementType === "Adjustment") && (
                <input
                  value={fromPerson}
                  onChange={(e) => setFromPerson(e.target.value)}
                  placeholder="From / Released by"
                  list="employee-list"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />
              )}

              {(movementType === "Opening Float" ||
                movementType === "Cash In" ||
                movementType === "Remittance" ||
                movementType === "Adjustment") && (
                <input
                  value={toPerson}
                  onChange={(e) => setToPerson(e.target.value)}
                  placeholder="To / Received by / Holder"
                  list="employee-list"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                />
              )}

              <input
                value={encodedBy}
                onChange={(e) => setEncodedBy(e.target.value)}
                placeholder="Encoded by"
                list="employee-list"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <datalist id="employee-list">
                {employees.map((employee) => (
                  <option
                    key={employee.id}
                    value={`${employee.first_name} ${employee.last_name}`}
                  />
                ))}
              </datalist>

              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Remarks / reference / purpose"
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <button
                onClick={saveMovement}
                disabled={isSaving}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Cash Movement"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Cash Movement Ledger</h2>

            <div className="my-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Types</option>
                {movementTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Payments</option>
                {["Cash", "GCash", "Bank", "Terminal"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="max-h-[700px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To / Holder</th>
                    <th className="px-4 py-3">Encoded By</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">{item.business_date}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getMovementStyle(
                            item.movement_type
                          )}`}
                        >
                          {item.movement_type}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStyle(
                            item.payment_type || "Cash"
                          )}`}
                        >
                          {item.payment_type || "Cash"}
                        </span>
                      </td>

                      <td className="px-4 py-3">{item.source}</td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {formatMoney(item.amount)}
                      </td>

                      <td className="px-4 py-3">{item.from_person || "-"}</td>
                      <td className="px-4 py-3">{item.to_person || "-"}</td>
                      <td className="px-4 py-3">{item.encoded_by || "-"}</td>
                      <td className="px-4 py-3">{item.remarks || "-"}</td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteMovement(item.id)}
                          className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-semibold hover:bg-slate-500"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredMovements.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No cash movements found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/// COMPONENT - SUMMARY CARD
function SummaryCard({ title, value, color }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 break-words text-2xl font-bold ${color}`}>
        {value}
      </h2>
    </div>
  );
}