"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

export default function FinanceSettingsPage() {
  /// STATES
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [expenseAreas, setExpenseAreas] = useState<any[]>([]);
  const [expenseSources, setExpenseSources] = useState<any[]>([]);
  const [revenueSources, setRevenueSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newExpenseArea, setNewExpenseArea] = useState("");
  const [newExpenseSource, setNewExpenseSource] = useState("");
  const [newRevenueSource, setNewRevenueSource] = useState("");

  /// FUNCTIONS
  const getFinanceSettings = async () => {
    setLoading(true);

    const { data: categories, error: categoriesError } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true });

    const { data: payments, error: paymentsError } = await supabase
      .from("finance_payment_methods")
      .select("*")
      .order("name", { ascending: true });

    const { data: areas, error: areasError } = await supabase
      .from("finance_expense_areas")
      .select("*")
      .order("name", { ascending: true });

    const { data: expenseSourcesData, error: sourcesError } = await supabase
      .from("finance_expense_sources")
      .select("*")
      .order("name", { ascending: true });

    const { data: revenueSourcesData, error: revenueError } = await supabase
      .from("finance_revenue_sources")
      .select("*")
      .order("name", { ascending: true });


    if (categoriesError) console.log("GET CATEGORIES ERROR:", categoriesError);
    if (paymentsError) console.log("GET PAYMENTS ERROR:", paymentsError);
    if (areasError) console.log("GET AREAS ERROR:", areasError);
    if (sourcesError) console.log("GET SOURCES ERROR:", sourcesError);
    if (revenueError) console.log("GET REVENUE ERROR:", revenueError);

    console.log("EXPENSE CATEGORIES COUNT:", categories?.length);

    setExpenseCategories(categories || []);
    setPaymentMethods(payments || []);
    setExpenseAreas(areas || []);
    setExpenseSources(expenseSourcesData || []);
    setRevenueSources(revenueSourcesData || []);

    setLoading(false);
  };

  const addItem = async (table: string, value: string, reset: () => void) => {
    if (!value.trim()) {
      alert("Please enter a name.");
      return;
    }

    const payload: any = {
      name: value.trim(),
      is_active: true,
    };

    if (table === "expense_categories" && value.toLowerCase().includes("cash advance")) {
      payload.description = "Employee cash advance linked to payroll deduction.";
      payload.is_employee_related = true;
      payload.is_payroll_deductible = true;
    }

    const { error } = await supabase.from(table).insert(payload);

    if (error) {
      console.log("ADD ITEM ERROR:", error);
      alert("Failed to add item. It may already exist or table columns are missing.");
      return;
    }

    reset();
    getFinanceSettings();
  };

  const toggleItem = async (
    table: string,
    id: string,
    currentStatus: boolean
  ) => {
    const { error } = await supabase
      .from(table)
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      console.log("TOGGLE ITEM ERROR:", error);
      alert("Failed to update item.");
      return;
    }

    getFinanceSettings();
  };


  useEffect(() => {
    getFinanceSettings();
  }, []);

  /// UI
  return (
    <PageGuard moduleKey="finance_settings">
      <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Finance Settings</h1>
          <p className="text-sm text-slate-400">
            Configure finance dropdowns, revenue sources, expense categories, and payment master data.
          </p>
        </div>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Expense Settings</h2>
            <p className="text-sm text-slate-400">
              Used for expense requests, manual expenses, approval, release,
              liquidation, payroll deduction, and reports.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SettingsPanel
              title="Expense Categories"
              description="Master list used by the Expenses page category dropdown."
              inputValue={newCategory}
              setInputValue={setNewCategory}
              items={expenseCategories}
              tableName="expense_categories"
              addItem={() =>
                addItem("expense_categories", newCategory, () =>
                  setNewCategory("")
                )
              }
              toggleItem={toggleItem}
              loading={loading}
            />

            <SettingsPanel
              title="Expense Areas"
              description="Where the expense should be charged."
              inputValue={newExpenseArea}
              setInputValue={setNewExpenseArea}
              items={expenseAreas}
              tableName="finance_expense_areas"
              addItem={() =>
                addItem("finance_expense_areas", newExpenseArea, () =>
                  setNewExpenseArea("")
                )
              }
              toggleItem={toggleItem}
              loading={loading}
            />

            <SettingsPanel
              title="Expense Sources"
              description="Supplier, store, vendor, or purchase source."
              inputValue={newExpenseSource}
              setInputValue={setNewExpenseSource}
              items={expenseSources}
              tableName="finance_expense_sources"
              addItem={() =>
                addItem("finance_expense_sources", newExpenseSource, () =>
                  setNewExpenseSource("")
                )
              }
              toggleItem={toggleItem}
              loading={loading}
            />

            <SettingsPanel
              title="Payment Methods"
              description="How the expense was paid."
              inputValue={newPaymentMethod}
              setInputValue={setNewPaymentMethod}
              items={paymentMethods}
              tableName="finance_payment_methods"
              addItem={() =>
                addItem("finance_payment_methods", newPaymentMethod, () =>
                  setNewPaymentMethod("")
                )
              }
              toggleItem={toggleItem}
              loading={loading}
            />
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">Revenue Settings</h2>
            <p className="text-sm text-slate-400">
              Used for sales and future profit dashboard grouping.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SettingsPanel
              title="Revenue Sources"
              description="Where the business income came from."
              inputValue={newRevenueSource}
              setInputValue={setNewRevenueSource}
              items={revenueSources}
              tableName="finance_revenue_sources"
              addItem={() =>
                addItem("finance_revenue_sources", newRevenueSource, () =>
                  setNewRevenueSource("")
                )
              }
              toggleItem={toggleItem}
              loading={loading}
            />
          </div>
        </section>
      </main>
      </div>
    </PageGuard>
  );
}

function SettingsPanel({
  title,
  description,
  inputValue,
  setInputValue,
  items,
  tableName,
  addItem,
  toggleItem,
  loading,
}: any) {
  const activeCount = items.filter((item: any) => item.is_active).length;
  const inactiveCount = items.length - activeCount;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
          <p className="mt-2 text-xs text-slate-500">
            Table: <span className="text-amber-400">{tableName}</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
          Total: <span className="font-bold text-white">{items.length}</span>{" "}
          · Active:{" "}
          <span className="font-bold text-emerald-400">{activeCount}</span> ·
          Inactive:{" "}
          <span className="font-bold text-red-400">{inactiveCount}</span>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add new item..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
        />

        <button
          onClick={addItem}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
        >
          Add
        </button>
      </div>

      <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-800">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rules</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}

            {!loading &&
              items.map((item: any) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-800/70 text-slate-200 hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3 font-medium">{item.name}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex w-24 justify-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        item.is_active
                          ? "border-green-500/30 bg-green-500/20 text-green-400"
                          : "border-red-500/30 bg-red-500/20 text-red-400"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {item.is_payroll_deductible ? (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                        Payroll Deductible
                      </span>
                    ) : item.is_employee_related ? (
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                        Employee Related
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Standard</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleItem(tableName, item.id, item.is_active)
                      }
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                        item.is_active
                          ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950"
                          : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950"
                      }`}
                    >
                      {item.is_active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}