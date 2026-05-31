"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function FinanceSettingsPage() {
  /// STATES
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [expenseAreas, setExpenseAreas] = useState<any[]>([]);
  const [expenseSources, setExpenseSources] = useState<any[]>([]);
  const [revenueSources, setRevenueSources] = useState<any[]>([]);

  const [newCategory, setNewCategory] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newExpenseArea, setNewExpenseArea] = useState("");
  const [newExpenseSource, setNewExpenseSource] = useState("");
  const [newRevenueSource, setNewRevenueSource] = useState("");

  /// FUNCTIONS
  const getFinanceSettings = async () => {
    const { data: categories } = await supabase
      .from("finance_expense_categories")
      .select("*")
      .order("name", { ascending: true });

    const { data: payments } = await supabase
      .from("finance_payment_methods")
      .select("*")
      .order("name", { ascending: true });

    const { data: areas } = await supabase
      .from("finance_expense_areas")
      .select("*")
      .order("name", { ascending: true });

    const { data: expenseSourcesData } = await supabase
      .from("finance_expense_sources")
      .select("*")
      .order("name", { ascending: true });

    const { data: revenueSourcesData } = await supabase
      .from("finance_revenue_sources")
      .select("*")
      .order("name", { ascending: true });

    setExpenseCategories(categories || []);
    setPaymentMethods(payments || []);
    setExpenseAreas(areas || []);
    setExpenseSources(expenseSourcesData || []);
    setRevenueSources(revenueSourcesData || []);
  };

  const addItem = async (table: string, value: string, reset: () => void) => {
    if (!value.trim()) {
      alert("Please enter a name.");
      return;
    }

    const { error } = await supabase.from(table).insert([
      {
        name: value.trim(),
        is_active: true,
      },
    ]);

    if (error) {
      console.log("ADD ITEM ERROR:", error);
      alert("Failed to add item. It may already exist.");
      return;
    }

    reset();
    getFinanceSettings();
  };

  const toggleItem = async (
    table: string,
    id: number,
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

  const deleteItem = async (table: string, id: number) => {
    const confirmDelete = confirm("Are you sure you want to delete this item?");
    if (!confirmDelete) return;

    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      console.log("DELETE ITEM ERROR:", error);
      alert("Failed to delete item.");
      return;
    }

    getFinanceSettings();
  };

  useEffect(() => {
    getFinanceSettings();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Finance Settings</h1>
          <p className="text-sm text-slate-400">
            Configure finance dropdowns used in expenses, sales, and reporting.
          </p>
        </div>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Expense Settings</h2>
            <p className="text-sm text-slate-400">
              Used for expense encoding, import, export, and expense reports.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SettingsPanel
              title="Expense Categories"
              description="What kind of expense this is."
              inputValue={newCategory}
              setInputValue={setNewCategory}
              items={expenseCategories}
              tableName="finance_expense_categories"
              addItem={() =>
                addItem("finance_expense_categories", newCategory, () =>
                  setNewCategory("")
                )
              }
              toggleItem={toggleItem}
              deleteItem={deleteItem}
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
              deleteItem={deleteItem}
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
              deleteItem={deleteItem}
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
              deleteItem={deleteItem}
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
              deleteItem={deleteItem}
            />
          </div>
        </section>
      </main>
    </div>
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
  deleteItem,
}: any) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="mb-5">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>

      <div className="mb-5 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add new item..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
        />

        <button
          onClick={addItem}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
        >
          Add
        </button>
      </div>

      <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-800">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item: any) => (
              <tr
                key={item.id}
                className="border-b border-slate-800/70 text-slate-200 hover:bg-slate-800/30"
              >
                <td className="px-4 py-3 font-medium">{item.name}</td>

                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      toggleItem(tableName, item.id, item.is_active)
                    }
                    className={`w-24 rounded-full border px-3 py-1 text-xs font-semibold ${
                      item.is_active
                        ? "border-green-500/30 bg-green-500/20 text-green-400"
                        : "border-red-500/30 bg-red-500/20 text-red-400"
                    }`}
                  >
                    {item.is_active ? "Active" : "Inactive"}
                  </button>
                </td>

                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteItem(tableName, item.id)}
                    className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-semibold hover:bg-slate-500"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-500">
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