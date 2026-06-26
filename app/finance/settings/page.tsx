"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
export default function FinanceSettingsPage() {
  /// STATES
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [expenseAreas, setExpenseAreas] = useState<any[]>([]);
  const [expenseSources, setExpenseSources] = useState<any[]>([]);
  const [revenueSources, setRevenueSources] = useState<any[]>([]);
  const [cashMovementSources, setCashMovementSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newExpenseArea, setNewExpenseArea] = useState("");
  const [newExpenseSource, setNewExpenseSource] = useState("");
  const [newRevenueSource, setNewRevenueSource] = useState("");
  const [newCashMovementSource, setNewCashMovementSource] = useState("");

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

    const { data: cashMovementSourcesData, error: cashMovementSourcesError } =
      await supabase
        .from("finance_cash_sources")
        .select("*")
        .order("name", { ascending: true });

    if (categoriesError) console.log("GET CATEGORIES ERROR:", categoriesError);
    if (paymentsError) console.log("GET PAYMENTS ERROR:", paymentsError);
    if (areasError) console.log("GET AREAS ERROR:", areasError);
    if (sourcesError) console.log("GET SOURCES ERROR:", sourcesError);
    if (revenueError) console.log("GET REVENUE ERROR:", revenueError);
    if (cashMovementSourcesError) {
      console.log("GET CASH MOVEMENT SOURCES ERROR:", cashMovementSourcesError);
    }

    setExpenseCategories(categories || []);
    setPaymentMethods(payments || []);
    setExpenseAreas(areas || []);
    setExpenseSources(expenseSourcesData || []);
    setRevenueSources(revenueSourcesData || []);
    setCashMovementSources(cashMovementSourcesData || []);

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

    if (
      table === "expense_categories" &&
      value.toLowerCase().includes("cash advance")
    ) {
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

  const updatePaymentMethodRule = async (
    id: string,
    field:
      | "deduct_from_cash_flow"
      | "requires_approval"
      | "requires_liquidation"
      | "requires_drawer"
      | "return_destination_enabled",
    value: boolean
  ) => {
    const { error } = await supabase
      .from("finance_payment_methods")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      console.log("UPDATE PAYMENT METHOD RULE ERROR:", error);
      alert("Failed to update payment method rule. Check if the rule columns exist.");
      return;
    }

    getFinanceSettings();
  };

  const deleteItem = async (table: string, id: string, name: string) => {
    const confirmed = window.confirm(
      `Delete "${name}"? This should only be used for newly added or unused settings.`
    );

    if (!confirmed) return;

    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      console.log("DELETE ITEM ERROR:", error);
      alert(
        "Failed to delete item. It may already be linked to existing records. Use Disable instead."
      );
      return;
    }

    getFinanceSettings();
  };

  /// CALCULATIONS
  const totalMasterData =
    expenseCategories.length +
    paymentMethods.length +
    expenseAreas.length +
    expenseSources.length +
    revenueSources.length +
    cashMovementSources.length;

  const totalActiveMasterData = [
    ...expenseCategories,
    ...paymentMethods,
    ...expenseAreas,
    ...expenseSources,
    ...revenueSources,
    ...cashMovementSources,
  ].filter((item) => item.is_active).length;

  const payrollDeductibleCategories = expenseCategories.filter(
    (item) => item.is_payroll_deductible
  ).length;

  const inactiveMasterData = Math.max(totalMasterData - totalActiveMasterData, 0);

  useEffect(() => {
    getFinanceSettings();
  }, []);

  /// UI
  return (
    <PageGuard moduleKey="finance_settings">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="FINANCE / SETTINGS" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    FINANCE
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    Finance Settings
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                    Maintain controlled master data for expenses, cash movements,
                    revenue sources, and finance reports.
                  </p>
                </div>

                <button
                  onClick={getFinanceSettings}
                  disabled={loading}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Refreshing..." : "Refresh Settings"}
                </button>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="Master Data Items" value={totalMasterData} />
              <SummaryCard title="Active Items" value={totalActiveMasterData} />
              <SummaryCard title="Inactive Items" value={inactiveMasterData} />
              <SummaryCard title="Payroll Rules" value={payrollDeductibleCategories} />
            </section>

            <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                Finance Control Center
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Master Data Governance
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-blue-700">
                Use Disable for master data already connected to historical records.
                Delete should only be used for newly added or unused items.
              </p>
            </section>

            <SectionHeader
              title="Expense Settings"
              description="Used by expense requests, manual expenses, approvals, cash releases, liquidation, payroll deductions, and reports."
            />

            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
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
                deleteItem={deleteItem}
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
                deleteItem={deleteItem}
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
                deleteItem={deleteItem}
                loading={loading}
              />

              <PaymentMethodRulesPanel
                inputValue={newPaymentMethod}
                setInputValue={setNewPaymentMethod}
                items={paymentMethods}
                addItem={() =>
                  addItem("finance_payment_methods", newPaymentMethod, () =>
                    setNewPaymentMethod("")
                  )
                }
                toggleItem={toggleItem}
                deleteItem={deleteItem}
                updatePaymentMethodRule={updatePaymentMethodRule}
                loading={loading}
              />
            </section>

            <SectionHeader
              title="Cash Movement Settings"
              description="Used by Cash Management source dropdowns. Add or disable sources without editing code."
            />

            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SettingsPanel
                title="Cash Movement Sources"
                description="Master list used by the Cash Management source dropdown."
                inputValue={newCashMovementSource}
                setInputValue={setNewCashMovementSource}
                items={cashMovementSources}
                tableName="finance_cash_sources"
                addItem={() =>
                  addItem("finance_cash_sources", newCashMovementSource, () =>
                    setNewCashMovementSource("")
                  )
                }
                toggleItem={toggleItem}
                deleteItem={deleteItem}
                loading={loading}
              />
            </section>

            <SectionHeader
              title="Revenue Settings"
              description="Used for sales and future profit dashboard grouping."
            />

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
                loading={loading}
              />
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Settings Group
      </p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}


function PaymentMethodRulesPanel({
  inputValue,
  setInputValue,
  items,
  addItem,
  toggleItem,
  deleteItem,
  updatePaymentMethodRule,
  loading,
}: any) {
  const activeCount = items.filter((item: any) => item.is_active).length;
  const inactiveCount = items.length - activeCount;

  const boolValue = (value: any) => value === true;

  const renderRuleToggle = (
    item: any,
    field:
      | "deduct_from_cash_flow"
      | "requires_approval"
      | "requires_liquidation"
      | "requires_drawer"
      | "return_destination_enabled",
    label: string,
    helpText: string
  ) => {
    const checked = boolValue(item[field]);

    return (
      <button
        type="button"
        onClick={() => updatePaymentMethodRule(item.id, field, !checked)}
        className={
          checked
            ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-black text-emerald-700 transition-all duration-200 hover:bg-emerald-100 active:scale-[0.98]"
            : "rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-black text-slate-500 transition-all duration-200 hover:bg-slate-100 active:scale-[0.98]"
        }
      >
        <span className="block">
          {checked ? "YES" : "NO"} Â· {label}
        </span>
        <span className="mt-1 block text-[10px] font-bold normal-case leading-4 opacity-80">
          {helpText}
        </span>
      </button>
    );
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Payment Logic
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              Payment Methods
            </h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Control whether each payment method affects drawer cash flow,
              requires approval, creates liquidation, requires drawer access,
              and allows return destination selection.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-400">
              Table: <span className="text-slate-700">finance_payment_methods</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
            Total: <span className="text-slate-950">{items.length}</span> Â· Active:{" "}
            <span className="text-emerald-700">{activeCount}</span> Â· Inactive:{" "}
            <span className="text-red-700">{inactiveCount}</span>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add payment method, e.g. Owner Abono..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />

          <button
            onClick={addItem}
            className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            Add
          </button>
        </div>
      </div>

      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[1180px]">
          <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Method</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Cash Flow Rules</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {loading && (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <p className="text-sm font-black text-slate-950">Loading...</p>
                </td>
              </tr>
            )}

            {!loading &&
              items.map((item: any) => (
                <tr
                  key={item.id}
                  className="transition-all duration-200 hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-950">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {String(item.name || "")
                        .trim()
                        .toUpperCase()
                        .replace(/\s+/g, "_")}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    {item.is_active ? (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                      {renderRuleToggle(
                        item,
                        "deduct_from_cash_flow",
                        "Cash Flow",
                        "Affects drawer cash on hand"
                      )}
                      {renderRuleToggle(
                        item,
                        "requires_approval",
                        "Approval",
                        "Sends request to Approval Center"
                      )}
                      {renderRuleToggle(
                        item,
                        "requires_liquidation",
                        "Liquidation",
                        "Requires actual spent / returned cash"
                      )}
                      {renderRuleToggle(
                        item,
                        "requires_drawer",
                        "Drawer",
                        "Requires an active cash drawer"
                      )}
                      {renderRuleToggle(
                        item,
                        "return_destination_enabled",
                        "Return Destination",
                        "Allows Owner / Cash Drawer return choice"
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() =>
                          toggleItem("finance_payment_methods", item.id, item.is_active)
                        }
                        className={
                          item.is_active
                            ? "h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                            : "h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]"
                        }
                      >
                        {item.is_active ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() =>
                          deleteItem("finance_payment_methods", item.id, item.name)
                        }
                        className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <p className="text-sm font-black text-slate-950">
                    No payment methods found
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Add Cash, Bank, GCash, Terminal, or Owner Abono.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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
  loading,
}: any) {
  const activeCount = items.filter((item: any) => item.is_active).length;
  const inactiveCount = items.length - activeCount;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Master Data
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              {description}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-400">
              Table: <span className="text-slate-700">{tableName}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
            Total: <span className="text-slate-950">{items.length}</span> Â· Active:{" "}
            <span className="text-emerald-700">{activeCount}</span> Â· Inactive:{" "}
            <span className="text-red-700">{inactiveCount}</span>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add new item..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />

          <button
            onClick={addItem}
            className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            Add
          </button>
        </div>
      </div>

      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[760px]">
          <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Rules</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {loading && (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <p className="text-sm font-black text-slate-950">Loading...</p>
                </td>
              </tr>
            )}

            {!loading &&
              items.map((item: any) => (
                <tr
                  key={item.id}
                  className="transition-all duration-200 hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-black text-slate-950">
                    {item.name}
                  </td>

                  <td className="px-6 py-4">
                    {item.is_active ? (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {item.is_payroll_deductible ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                        Payroll Deductible
                      </span>
                    ) : item.is_employee_related ? (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        Employee Related
                      </span>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        Standard
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() =>
                          toggleItem(tableName, item.id, item.is_active)
                        }
                        className={
                          item.is_active
                            ? "h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                            : "h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]"
                        }
                      >
                        {item.is_active ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => deleteItem(tableName, item.id, item.name)}
                        className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <p className="text-sm font-black text-slate-950">
                    No items found
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Add a new item using the field above.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}





