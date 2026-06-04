"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

const defaultRules = [
  ["Beverages", 0, 100, 0, 0, 0],
  ["Food", 0, 100, 0, 0, 0],
  ["Employee Salary", 0, 0, 0, 0, 100],
  ["Housekeeping", 100, 0, 0, 0, 0],
  ["Frontdesk", 100, 0, 0, 0, 0],
  ["Laundry", 100, 0, 0, 0, 0],
  ["Pool Maintenance", 70, 20, 10, 0, 0],
  ["Gas Vehicle/RFID", 0, 0, 0, 0, 100],
  ["Electric", 75, 25, 0, 0, 0],
  ["Water", 80, 20, 0, 0, 0],
  ["Internet", 70, 30, 0, 0, 0],
  ["Netflix", 100, 0, 0, 0, 0],
  ["Rent", 50, 30, 0, 20, 0],
  ["System Fee", 50, 30, 0, 20, 0],
  ["Sanitary", 0, 0, 0, 0, 100],
  ["Pool League", 0, 50, 50, 0, 0],
  ["Taxes", 50, 30, 0, 20, 0],
];

export default function ExpenseAllocationPage() {
  /// STATES
  const [rules, setRules] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState("");

  const [expenseType, setExpenseType] = useState("");
  const [rooms, setRooms] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [sportsBar, setSportsBar] = useState("");
  const [apartment, setApartment] = useState("");
  const [shared, setShared] = useState("");

  /// CALCULATIONS
  const total =
    Number(rooms || 0) +
    Number(restaurant || 0) +
    Number(sportsBar || 0) +
    Number(apartment || 0) +
    Number(shared || 0);

  /// FUNCTIONS - GET DATA
  const getExpenseCategories = async () => {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.log("GET EXPENSE CATEGORIES ERROR:", error);
      return;
    }

    setExpenseCategories(data || []);
  };

  const getRules = async () => {
    const { data, error } = await supabase
      .from("expense_allocation_rules")
      .select("*")
      .order("expense_type", { ascending: true });

    if (error) {
      console.log("GET ALLOCATION RULES ERROR:", error);
      return;
    }

    setRules(data || []);
  };

  /// FUNCTIONS - FORM
  const resetForm = () => {
    setEditingId("");
    setExpenseType("");
    setRooms("");
    setRestaurant("");
    setSportsBar("");
    setApartment("");
    setShared("");
  };

  const fillFormForEdit = (rule: any) => {
    setEditingId(rule.id);
    setExpenseType(rule.expense_type || "");
    setRooms(String(rule.rooms_percent ?? 0));
    setRestaurant(String(rule.restaurant_percent ?? 0));
    setSportsBar(String(rule.sports_bar_percent ?? 0));
    setApartment(String(rule.apartment_percent ?? 0));
    setShared(String(rule.shared_percent ?? 0));

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    if (!expenseType) {
      alert("Select expense category.");
      return false;
    }

    if (total !== 100) {
      alert("Total allocation must be exactly 100%.");
      return false;
    }

    const duplicateRule = rules.find(
      (rule) =>
        rule.expense_type.toLowerCase() === expenseType.toLowerCase() &&
        rule.id !== editingId
    );

    if (duplicateRule) {
      alert("This expense category already has an allocation rule.");
      return false;
    }

    return true;
  };

  /// FUNCTIONS - SAVE
  const saveRule = async () => {
    if (!validateForm()) return;

    const payload = {
      expense_type: expenseType,
      rooms_percent: Number(rooms || 0),
      restaurant_percent: Number(restaurant || 0),
      sports_bar_percent: Number(sportsBar || 0),
      apartment_percent: Number(apartment || 0),
      shared_percent: Number(shared || 0),
      is_active: true,
    };

    if (editingId) {
      const { error } = await supabase
        .from("expense_allocation_rules")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        console.log("UPDATE ALLOCATION RULE ERROR:", error);
        alert("Failed to update allocation rule.");
        return;
      }

      alert("Allocation rule updated.");
    } else {
      const { error } = await supabase
        .from("expense_allocation_rules")
        .insert(payload);

      if (error) {
        console.log("ADD ALLOCATION RULE ERROR:", error);
        alert("Failed to save allocation rule.");
        return;
      }

      alert("Allocation rule saved.");
    }

    resetForm();
    getRules();
  };

  const addDefaultRules = async () => {
    const existingNames = rules.map((rule) => rule.expense_type.toLowerCase());

    const rows = defaultRules
      .filter((rule) => !existingNames.includes(String(rule[0]).toLowerCase()))
      .map((rule) => ({
        expense_type: rule[0],
        rooms_percent: rule[1],
        restaurant_percent: rule[2],
        sports_bar_percent: rule[3],
        apartment_percent: rule[4],
        shared_percent: rule[5],
        is_active: true,
      }));

    if (rows.length === 0) {
      alert("Default rules already exist.");
      return;
    }

    const { error } = await supabase
      .from("expense_allocation_rules")
      .insert(rows);

    if (error) {
      console.log("ADD DEFAULT RULES ERROR:", error);
      alert("Failed to add defaults. Check table columns or duplicate names.");
      return;
    }

    getRules();
  };

  const toggleRule = async (rule: any) => {
    const { error } = await supabase
      .from("expense_allocation_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);

    if (error) {
      console.log("TOGGLE RULE ERROR:", error);
      return;
    }

    getRules();
  };

  const deleteRule = async (id: string) => {
    const ok = confirm("Delete this allocation rule?");
    if (!ok) return;

    const { error } = await supabase
      .from("expense_allocation_rules")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE RULE ERROR:", error);
      return;
    }

    if (editingId === id) resetForm();
    getRules();
  };

  /// EFFECTS
  useEffect(() => {
    getRules();
    getExpenseCategories();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Settings
          </p>

          <h1 className="mt-2 text-4xl font-black">Expense Allocation</h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-400">
            Set how shared expenses are distributed across Rooms, Restaurant,
            Sports Bar, Apartment, and Shared/Admin for accurate profit reports.
          </p>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Allocation Rule" : "Add Allocation Rule"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Select from active expense categories. Total allocation must
                equal 100%.
              </p>
            </div>

            <div className="flex gap-2">
              {editingId && (
                <button
                  onClick={resetForm}
                  className="w-fit rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel Edit
                </button>
              )}

              <button
                onClick={addDefaultRules}
                className="w-fit rounded-xl border border-amber-400 px-4 py-2 text-sm font-bold text-amber-400 hover:bg-amber-400 hover:text-slate-950"
              >
                Add Default Rules
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              disabled={!!editingId}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60 xl:col-span-2"
            >
              <option value="">Select expense category</option>

              {expenseCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}

              {editingId &&
                expenseType &&
                !expenseCategories.some((cat) => cat.name === expenseType) && (
                  <option value={expenseType}>{expenseType}</option>
                )}
            </select>

            <PercentInput label="Rooms %" value={rooms} setValue={setRooms} />
            <PercentInput
              label="Restaurant %"
              value={restaurant}
              setValue={setRestaurant}
            />
            <PercentInput
              label="Sports Bar %"
              value={sportsBar}
              setValue={setSportsBar}
            />
            <PercentInput
              label="Apartment %"
              value={apartment}
              setValue={setApartment}
            />
            <PercentInput label="Shared %" value={shared} setValue={setShared} />
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p
              className={`text-sm font-bold ${
                total === 100 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              Total: {total}%
            </p>

            <button
              onClick={saveRule}
              className={`rounded-xl px-5 py-3 text-sm font-bold ${
                editingId
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                  : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              {editingId ? "Update Rule" : "Save Rule"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Allocation Rules</h2>
              <p className="mt-1 text-sm text-slate-400">
                Active rules will be used later for profit reports and expense
                distribution.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
              Total Rules:{" "}
              <span className="font-bold text-white">{rules.length}</span>
            </div>
          </div>

          <div className="max-h-[650px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Expense Type</th>
                  <th className="px-4 py-3 text-left">Rooms</th>
                  <th className="px-4 py-3 text-left">Restaurant</th>
                  <th className="px-4 py-3 text-left">Sports Bar</th>
                  <th className="px-4 py-3 text-left">Apartment</th>
                  <th className="px-4 py-3 text-left">Shared</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rules.map((rule) => {
                  const rowTotal =
                    Number(rule.rooms_percent || 0) +
                    Number(rule.restaurant_percent || 0) +
                    Number(rule.sports_bar_percent || 0) +
                    Number(rule.apartment_percent || 0) +
                    Number(rule.shared_percent || 0);

                  return (
                    <tr
                      key={rule.id}
                      className={`border-t border-slate-800 text-slate-200 hover:bg-slate-800/40 ${
                        editingId === rule.id ? "bg-amber-500/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold">
                        {rule.expense_type}
                      </td>

                      <td className="px-4 py-3">{rule.rooms_percent}%</td>
                      <td className="px-4 py-3">{rule.restaurant_percent}%</td>
                      <td className="px-4 py-3">{rule.sports_bar_percent}%</td>
                      <td className="px-4 py-3">{rule.apartment_percent}%</td>
                      <td className="px-4 py-3">{rule.shared_percent}%</td>

                      <td
                        className={`px-4 py-3 font-bold ${
                          rowTotal === 100
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {rowTotal}%
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            rule.is_active
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => fillFormForEdit(rule)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => toggleRule(rule)}
                            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold hover:bg-amber-500 hover:text-slate-950"
                          >
                            {rule.is_active ? "Disable" : "Enable"}
                          </button>

                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold hover:bg-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {rules.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-10 text-center text-slate-500"
                    >
                      No allocation rules yet. Click Add Default Rules.
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

function PercentInput({ label, value, setValue }: any) {
  return (
    <input
      type="number"
      min="0"
      max="100"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={label}
      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
    />
  );
}