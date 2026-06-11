"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  Building2,
  CreditCard,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Table2,
  Trash2,
  Utensils,
  ToggleLeft,
} from "lucide-react";

type SettingTab =
  | "general"
  | "tables"
  | "order_types"
  | "payment_methods"
  | "production_stations"
  | "terminal_defaults";

type PosTable = {
  id: string;
  table_name: string;
  capacity: number | null;
  status: string;
  sort_order: number | null;
  is_active: boolean;
};

type PosOption = {
  id: string;
  name: string;
  code: string;
  sort_order: number | null;
  is_active: boolean;
  printer_name?: string | null;
};

type PosSetting = {
  id: string;
  setting_key: string;
  setting_value: string;
};

const tabs: {
  key: SettingTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "general", label: "General", icon: <ToggleLeft size={16} /> },
  { key: "tables", label: "Tables", icon: <Table2 size={16} /> },
  { key: "order_types", label: "Order Types", icon: <Utensils size={16} /> },
  {
    key: "payment_methods",
    label: "Payment Methods",
    icon: <CreditCard size={16} />,
  },
  {
    key: "production_stations",
    label: "Production Stations",
    icon: <Building2 size={16} />,
  },
  {
    key: "terminal_defaults",
    label: "Terminal Defaults",
    icon: <Settings size={16} />,
  },
];

const generalSettings = [
  {
    key: "enable_table_tracking",
    label: "Enable Table Tracking",
    helper: "Show table selector in POS terminal.",
  },
  {
    key: "require_table_for_dine_in",
    label: "Require Table for Dine In",
    helper: "Prevent dine-in orders without table selection.",
  },
  {
    key: "enable_room_charge",
    label: "Enable Room Charge",
    helper: "Allow posting POS bills to hotel rooms.",
  },
  {
    key: "enable_delivery_orders",
    label: "Enable Delivery Orders",
    helper: "Allow delivery as an order type.",
  },
  {
    key: "enable_takeout_orders",
    label: "Enable Takeout Orders",
    helper: "Allow takeout transactions.",
  },
  {
    key: "enable_service_charge",
    label: "Enable Service Charge",
    helper: "Apply service charge based on configured percent.",
  },
  {
    key: "enable_production_routing",
    label: "Enable Production Routing",
    helper: "Route items to kitchen, bar, or other stations.",
  },
  {
    key: "enable_receipt_printing",
    label: "Enable Receipt Printing",
    helper: "Prepare receipt printing support.",
  },
  {
    key: "enable_cash_drawer",
    label: "Enable Cash Drawer",
    helper: "Prepare cash drawer open/control support.",
  },
  {
    key: "enable_hold_orders",
    label: "Enable Hold Orders",
    helper: "Allow orders to be parked temporarily.",
  },
  {
    key: "enable_recall_orders",
    label: "Enable Recall Orders",
    helper: "Allow held orders to be recalled.",
  },
  {
    key: "enable_discounts",
    label: "Enable Discounts",
    helper: "Allow discount actions in POS.",
  },
  {
    key: "enable_promos",
    label: "Enable Promos",
    helper: "Allow promo and campaign logic.",
  },
  {
    key: "enable_item_notes",
    label: "Enable Item Notes",
    helper: "Allow cashier notes per order item.",
  },
  {
    key: "enable_split_bill",
    label: "Enable Split Bill",
    helper: "Future setting for splitting receipts.",
  },
  {
    key: "enable_split_payment",
    label: "Enable Split Payment",
    helper: "Future setting for multiple payment methods.",
  },
  {
    key: "enable_kitchen_display",
    label: "Enable Kitchen Display",
    helper: "Future setting for KDS screen.",
  },
  {
    key: "enable_order_timers",
    label: "Enable Order Timers",
    helper: "Track order aging and preparation time.",
  },
  {
    key: "enable_priority_queue",
    label: "Enable Priority Queue",
    helper: "Allow urgent orders to be prioritized.",
  },
  {
    key: "enable_floor_plan",
    label: "Enable Floor Plan",
    helper: "Future visual table layout.",
  },
  {
    key: "enable_waitlist",
    label: "Enable Waitlist",
    helper: "Future waitlist support.",
  },
  {
    key: "enable_reservations",
    label: "Enable Reservations",
    helper: "Future POS reservation support.",
  },
  {
    key: "enable_modifiers",
    label: "Enable Modifiers",
    helper: "Future add-ons and item customization.",
  },
  {
    key: "enable_inventory_deduction",
    label: "Enable Inventory Deduction",
    helper: "Future inventory sync after sale.",
  },
  {
    key: "enable_low_stock_alerts",
    label: "Enable Low Stock Alerts",
    helper: "Future low stock warning support.",
  },
  {
    key: "enable_offline_mode",
    label: "Enable Offline Mode",
    helper: "Future offline transaction support.",
  },
  {
    key: "enable_customer_display",
    label: "Enable Customer Display",
    helper: "Future second-screen display support.",
  },
  {
    key: "enable_mobile_pos",
    label: "Enable Mobile POS",
    helper: "Future phone/tablet ordering support.",
  },
  {
    key: "enable_void_approval",
    label: "Enable Void Approval",
    helper: "Require approval before voiding orders.",
  },
  {
    key: "enable_refund_approval",
    label: "Enable Refund Approval",
    helper: "Require approval before refunds.",
  },
];

export default function POSSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>("general");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [tables, setTables] = useState<PosTable[]>([]);
  const [orderTypes, setOrderTypes] = useState<PosOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PosOption[]>([]);
  const [productionStations, setProductionStations] = useState<PosOption[]>([]);
  const [settings, setSettings] = useState<PosSetting[]>([]);

  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("");

  const [newOrderTypeName, setNewOrderTypeName] = useState("");
  const [newOrderTypeCode, setNewOrderTypeCode] = useState("");

  const [newPaymentName, setNewPaymentName] = useState("");
  const [newPaymentCode, setNewPaymentCode] = useState("");

  const [newStationName, setNewStationName] = useState("");
  const [newStationCode, setNewStationCode] = useState("");
  const [newPrinterName, setNewPrinterName] = useState("");

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  useEffect(() => {
    loadSettings();
  }, []);

  const applyCompanyFilter = (query: any) => {
    if (!companyId) return query.is("company_id", null);

    return query.or(`company_id.eq.${companyId},company_id.is.null`);
  };

  const loadSettings = async () => {
    setLoading(true);
    setMessage("");

    const tableQuery = applyCompanyFilter(
      supabase
        .from("pos_tables")
        .select("*")
        .order("sort_order", { ascending: true }),
    );

    const orderTypeQuery = applyCompanyFilter(
      supabase
        .from("pos_order_types")
        .select("*")
        .order("sort_order", { ascending: true }),
    );

    const paymentQuery = applyCompanyFilter(
      supabase
        .from("pos_payment_methods")
        .select("*")
        .order("sort_order", { ascending: true }),
    );

    const stationQuery = applyCompanyFilter(
      supabase
        .from("pos_production_stations")
        .select("*")
        .order("sort_order", { ascending: true }),
    );

    const settingsQuery = applyCompanyFilter(
      supabase
        .from("pos_settings")
        .select("*")
        .order("setting_key", { ascending: true }),
    );

    const [
      tableResult,
      orderTypeResult,
      paymentResult,
      stationResult,
      settingsResult,
    ] = await Promise.all([
      tableQuery,
      orderTypeQuery,
      paymentQuery,
      stationQuery,
      settingsQuery,
    ]);

    const firstError =
      tableResult.error ||
      orderTypeResult.error ||
      paymentResult.error ||
      stationResult.error ||
      settingsResult.error;

    if (firstError) {
      setMessage(firstError.message);
    }

    setTables((tableResult.data || []) as PosTable[]);
    setOrderTypes((orderTypeResult.data || []) as PosOption[]);
    setPaymentMethods((paymentResult.data || []) as PosOption[]);
    setProductionStations((stationResult.data || []) as PosOption[]);
    setSettings((settingsResult.data || []) as PosSetting[]);

    setLoading(false);
  };

  const nextSortOrder = (items: { sort_order: number | null }[]) => {
    const highest = items.reduce(
      (max, item) => Math.max(max, Number(item.sort_order || 0)),
      0,
    );

    return highest + 1;
  };

  const addTable = async () => {
    if (!newTableName.trim()) return;

    const { error } = await supabase.from("pos_tables").insert({
      company_id: companyId,
      table_name: newTableName.trim(),
      capacity: Number(newTableCapacity || 0),
      status: "available",
      sort_order: nextSortOrder(tables),
      is_active: true,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewTableName("");
    setNewTableCapacity("");
    await loadSettings();
  };

  const addOption = async (
    tableName:
      | "pos_order_types"
      | "pos_payment_methods"
      | "pos_production_stations",
  ) => {
    const config = {
      pos_order_types: {
        name: newOrderTypeName,
        code: newOrderTypeCode,
        list: orderTypes,
        clear: () => {
          setNewOrderTypeName("");
          setNewOrderTypeCode("");
        },
      },
      pos_payment_methods: {
        name: newPaymentName,
        code: newPaymentCode,
        list: paymentMethods,
        clear: () => {
          setNewPaymentName("");
          setNewPaymentCode("");
        },
      },
      pos_production_stations: {
        name: newStationName,
        code: newStationCode,
        list: productionStations,
        clear: () => {
          setNewStationName("");
          setNewStationCode("");
          setNewPrinterName("");
        },
      },
    }[tableName];

    if (!config.name.trim() || !config.code.trim()) return;

    const payload: any = {
      company_id: companyId,
      name: config.name.trim(),
      code: config.code.trim().toUpperCase().replaceAll(" ", "_"),
      sort_order: nextSortOrder(config.list),
      is_active: true,
    };

    if (tableName === "pos_production_stations") {
      payload.printer_name = newPrinterName.trim() || null;
    }

    const { error } = await supabase.from(tableName).insert(payload);

    if (error) {
      setMessage(error.message);
      return;
    }

    config.clear();
    await loadSettings();
  };

  const toggleActive = async (
    tableName: string,
    id: string,
    current: boolean,
  ) => {
    const { error } = await supabase
      .from(tableName)
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadSettings();
  };

  const deleteRow = async (tableName: string, id: string) => {
    const { error } = await supabase.from(tableName).delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadSettings();
  };

  const getSettingValue = (key: string) =>
    settings.find((setting) => setting.setting_key === key)?.setting_value || "";

  const saveSetting = async (key: string, value: string) => {
    const existing = settings.find((setting) => setting.setting_key === key);

    if (existing) {
      const { error } = await supabase
        .from("pos_settings")
        .update({
          setting_value: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("pos_settings").insert({
        company_id: companyId,
        setting_key: key,
        setting_value: value,
      });

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    await loadSettings();
  };

  return (
    <PageGuard moduleKey="pos_settings">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          <section className="mb-6 rounded-[2rem] border border-blue-300/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
                  OPSCORE POS
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight">
                  POS Settings
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                  Configure general POS behavior, tables, order types, payment
                  methods, production stations, service charge, and terminal
                  defaults without changing code.
                </p>
              </div>

              <button
                onClick={loadSettings}
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </section>

          {message && (
            <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
              {message}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black transition ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "border border-slate-800 bg-white/[0.035] text-slate-400 hover:bg-blue-500/10 hover:text-white"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </section>

          <section className="rounded-[1.75rem] border border-blue-300/10 bg-white/[0.035] p-5 shadow-xl shadow-black/20">
            {loading ? (
              <div className="rounded-2xl bg-slate-950 p-8 text-center text-sm font-bold text-slate-400">
                Loading POS settings...
              </div>
            ) : (
              <>
                {activeTab === "general" && (
                  <div>
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-xl font-black">
                          General Settings
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                          Control optional POS features from settings. Terminal
                          behavior should read these values instead of relying
                          on hardcoded code.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                        Settings Driven
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {generalSettings.map((setting) => (
                        <ToggleSettingCard
                          key={setting.key}
                          settingKey={setting.key}
                          label={setting.label}
                          helper={setting.helper}
                          value={getSettingValue(setting.key)}
                          onSave={saveSetting}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "tables" && (
                  <SettingsTableSection
                    title="Tables"
                    inputs={
                      <>
                        <input
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)}
                          placeholder="Table name"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <input
                          type="number"
                          value={newTableCapacity}
                          onChange={(e) => setNewTableCapacity(e.target.value)}
                          placeholder="Capacity"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <button
                          onClick={addTable}
                          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black hover:bg-blue-500"
                        >
                          <Plus size={16} />
                          Add Table
                        </button>
                      </>
                    }
                  >
                    {tables.map((table) => (
                      <RowCard
                        key={table.id}
                        title={table.table_name}
                        helper={`Capacity: ${table.capacity || 0} • Status: ${
                          table.status
                        }`}
                        isActive={table.is_active}
                        onToggle={() =>
                          toggleActive("pos_tables", table.id, table.is_active)
                        }
                        onDelete={() => deleteRow("pos_tables", table.id)}
                      />
                    ))}
                  </SettingsTableSection>
                )}

                {activeTab === "order_types" && (
                  <SettingsTableSection
                    title="Order Types"
                    inputs={
                      <>
                        <input
                          value={newOrderTypeName}
                          onChange={(e) => setNewOrderTypeName(e.target.value)}
                          placeholder="Order type name"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <input
                          value={newOrderTypeCode}
                          onChange={(e) => setNewOrderTypeCode(e.target.value)}
                          placeholder="Code"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <button
                          onClick={() => addOption("pos_order_types")}
                          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black hover:bg-blue-500"
                        >
                          <Plus size={16} />
                          Add Type
                        </button>
                      </>
                    }
                  >
                    {orderTypes.map((item) => (
                      <RowCard
                        key={item.id}
                        title={item.name}
                        helper={item.code}
                        isActive={item.is_active}
                        onToggle={() =>
                          toggleActive(
                            "pos_order_types",
                            item.id,
                            item.is_active,
                          )
                        }
                        onDelete={() => deleteRow("pos_order_types", item.id)}
                      />
                    ))}
                  </SettingsTableSection>
                )}

                {activeTab === "payment_methods" && (
                  <SettingsTableSection
                    title="Payment Methods"
                    inputs={
                      <>
                        <input
                          value={newPaymentName}
                          onChange={(e) => setNewPaymentName(e.target.value)}
                          placeholder="Payment method name"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <input
                          value={newPaymentCode}
                          onChange={(e) => setNewPaymentCode(e.target.value)}
                          placeholder="Code"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <button
                          onClick={() => addOption("pos_payment_methods")}
                          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black hover:bg-blue-500"
                        >
                          <Plus size={16} />
                          Add Method
                        </button>
                      </>
                    }
                  >
                    {paymentMethods.map((item) => (
                      <RowCard
                        key={item.id}
                        title={item.name}
                        helper={item.code}
                        isActive={item.is_active}
                        onToggle={() =>
                          toggleActive(
                            "pos_payment_methods",
                            item.id,
                            item.is_active,
                          )
                        }
                        onDelete={() =>
                          deleteRow("pos_payment_methods", item.id)
                        }
                      />
                    ))}
                  </SettingsTableSection>
                )}

                {activeTab === "production_stations" && (
                  <SettingsTableSection
                    title="Production Stations"
                    inputs={
                      <>
                        <input
                          value={newStationName}
                          onChange={(e) => setNewStationName(e.target.value)}
                          placeholder="Station name"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <input
                          value={newStationCode}
                          onChange={(e) => setNewStationCode(e.target.value)}
                          placeholder="Code"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <input
                          value={newPrinterName}
                          onChange={(e) => setNewPrinterName(e.target.value)}
                          placeholder="Printer name optional"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
                        />

                        <button
                          onClick={() => addOption("pos_production_stations")}
                          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black hover:bg-blue-500"
                        >
                          <Plus size={16} />
                          Add Station
                        </button>
                      </>
                    }
                  >
                    {productionStations.map((item) => (
                      <RowCard
                        key={item.id}
                        title={item.name}
                        helper={`${item.code}${
                          item.printer_name ? ` • ${item.printer_name}` : ""
                        }`}
                        isActive={item.is_active}
                        onToggle={() =>
                          toggleActive(
                            "pos_production_stations",
                            item.id,
                            item.is_active,
                          )
                        }
                        onDelete={() =>
                          deleteRow("pos_production_stations", item.id)
                        }
                      />
                    ))}
                  </SettingsTableSection>
                )}

                {activeTab === "terminal_defaults" && (
                  <div>
                    <h2 className="text-xl font-black">Terminal Defaults</h2>

                    <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <DefaultSelect
                        label="Default Order Type"
                        value={getSettingValue("default_order_type")}
                        options={orderTypes}
                        onSave={(value) =>
                          saveSetting("default_order_type", value)
                        }
                      />

                      <DefaultSelect
                        label="Default Payment Method"
                        value={getSettingValue("default_payment_method")}
                        options={paymentMethods}
                        onSave={(value) =>
                          saveSetting("default_payment_method", value)
                        }
                      />

                      <DefaultSelect
                        label="Default Production Station"
                        value={getSettingValue("default_production_station")}
                        options={productionStations}
                        onSave={(value) =>
                          saveSetting("default_production_station", value)
                        }
                      />

                      <DefaultInput
                        label="Service Charge Percent"
                        value={getSettingValue("service_charge_percent")}
                        onSave={(value) =>
                          saveSetting("service_charge_percent", value)
                        }
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function SettingsTableSection({
  title,
  inputs,
  children,
}: {
  title: string;
  inputs: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-black">{title}</h2>

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-4">
        {inputs}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function RowCard({
  title,
  helper,
  isActive,
  onToggle,
  onDelete,
}: {
  title: string;
  helper: string;
  isActive: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div>
        <p className="font-black text-white">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`rounded-xl px-3 py-2 text-xs font-black ${
            isActive
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </button>

        <button
          onClick={onDelete}
          className="rounded-xl bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function ToggleSettingCard({
  settingKey,
  label,
  helper,
  value,
  onSave,
}: {
  settingKey: string;
  label: string;
  helper: string;
  value: string;
  onSave: (key: string, value: string) => void;
}) {
  const enabled = value === "true";

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div>
        <p className="font-black text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
          {settingKey}
        </p>
      </div>

      <button
        onClick={() => onSave(settingKey, enabled ? "false" : "true")}
        className={`shrink-0 rounded-xl px-5 py-2 text-sm font-black ${
          enabled
            ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/25"
            : "bg-slate-800 text-slate-300 ring-1 ring-white/10"
        }`}
      >
        {enabled ? "ON" : "OFF"}
      </button>
    </div>
  );
}

function DefaultSelect({
  label,
  value,
  options,
  onSave,
}: {
  label: string;
  value: string;
  options: PosOption[];
  onSave: (value: string) => void;
}) {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex gap-2">
        <select
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
        >
          <option value="">Select default</option>
          {options
            .filter((option) => option.is_active)
            .map((option) => (
              <option key={option.id} value={option.code}>
                {option.name}
              </option>
            ))}
        </select>

        <button
          onClick={() => onSave(currentValue)}
          className="rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-500"
        >
          <Save size={16} />
        </button>
      </div>
    </div>
  );
}

function DefaultInput({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
}) {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex gap-2">
        <input
          type="number"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder="0"
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-300"
        />

        <button
          onClick={() => onSave(currentValue)}
          className="rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-500"
        >
          <Save size={16} />
        </button>
      </div>
    </div>
  );
}