"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  Banknote,
  ChefHat,
  Clock3,
  CreditCard,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

type PosSetting = {
  id: string;
  setting_key: string;
  setting_value: string;
};

type MenuGroup = {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type ProductionStation = {
  id: string;
  name: string;
  code: string;
  printer_name: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type PosTable = {
  id: string;
  table_name: string;
  capacity: number | null;
  status: string;
  sort_order: number | null;
  is_active: boolean;
};

type OrderType = {
  id: string;
  name: string;
  code: string;
  sort_order: number | null;
  is_active: boolean;
};

type PaymentMethod = {
  id: string;
  name: string;
  code: string;
  sort_order: number | null;
  is_active: boolean;
};

type PosModifierGroup = {
  id: string;
  company_id: string | null;
  group_name: string;
  group_code: string | null;
  selection_type: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number | null;
  status: string;
};

type PosModifierOption = {
  id: string;
  company_id: string | null;
  modifier_group_id: string;
  option_name: string;
  option_code: string | null;
  price_adjustment: number;
  cost_adjustment: number;
  sort_order: number | null;
  status: string;
};

type PosSetupPackGroup = {
  id: string;
  company_id: string | null;
  pack_id: string;
  group_id: string;
  created_at?: string;
};

type CartModifierSelection = {
  group_id: string;
  group_name: string;
  selection_type: string;
  choices: {
    option_id: string;
    option_name: string;
    price_adjustment: number;
  }[];
};

type Category = {
  id: string;
  name: string;
  category_code: string | null;
  production_area: string | null;
  production_station_id: string | null;
  menu_group_id: string | null;
  short_name: string | null;
  icon: string | null;
  sort_order: number | null;
  requires_production: boolean;
};

type Product = {
  id: string;
  category_id: string;
  setup_pack_id?: string | null;
  item_code: string | null;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  status: string;
  image_url?: string | null;
  is_best_seller?: boolean | null;
  is_hot?: boolean | null;
  is_new?: boolean | null;
  category?: Category | null;
};

type CartItem = {
  id: string;
  cart_key?: string;
  modifier_signature?: string;
  display_name?: string;
  modifiers?: CartModifierSelection[];
  setup_pack_id?: string | null;
  setup_pack_name?: string | null;
  item_code: string | null;
  name: string;
  price: number;
  qty: number;
  production_area: string | null;
  requires_production: boolean;
  sentQty?: number;
};

type Employee = {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
};

type PosSession = {
  id: string;
  company_id: string | null;
  opened_by: string | null;
  opening_cash: number;
  status: "OPEN" | "CLOSED";
  opened_at: string;
};

type VoidCandidateOrder = {
  id: string;
  company_id: string | null;
  session_id: string | null;
  cashier_id: string | null;
  order_tag: string | null;
  order_number: string | null;
  receipt_no: string | null;
  order_type: string | null;
  total_amount: number | null;
  payment_method: string | null;
  payment_method_name: string | null;
  payment_status: string | null;
  status: string | null;
  created_at: string | null;
};

type PosTransactionOrder = VoidCandidateOrder & {
  table_no?: string | null;
  subtotal?: number | null;
  service_charge?: number | null;
  amount_paid?: number | null;
  change_amount?: number | null;
  payment_reference?: string | null;
};

type PosTransactionItem = {
  id?: string | null;
  menu_item_id?: string | null;
  item_name: string | null;
  qty: number | null;
  price: number | null;
  total: number | null;
  production_area?: string | null;
  production_status?: string | null;
};

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const normalizeCode = (value: string) =>
  value.trim().toUpperCase().replaceAll(" ", "_");

const getPaymentButtonClass = (code: string, active: boolean) => {
  const normalized = normalizeCode(code);

  if (normalized.includes("CASH")) {
    return active
      ? "border border-slate-300/70 bg-[#141922] text-white shadow-black/40 ring-slate-300/35"
      : "border border-white/10 bg-[#202020] text-white shadow-black/30 ring-white/10 hover:bg-[#2b2b2b]";
  }

  if (normalized.includes("GCASH")) {
    return active
      ? "border border-sky-300/70 bg-[#0b5ed7] text-white shadow-sky-950/40 ring-sky-300/45"
      : "border border-sky-400/25 bg-sky-500/10 text-sky-100 shadow-black/30 ring-sky-400/20 hover:bg-sky-500/20";
  }

  if (normalized.includes("CARD")) {
    return active
      ? "border border-emerald-300/60 bg-emerald-700 text-white shadow-emerald-950/40 ring-emerald-400/40"
      : "border border-white/10 bg-[#202020] text-white shadow-black/30 ring-white/10 hover:bg-[#2b2b2b]";
  }

  if (normalized.includes("ROOM")) {
    return active
      ? "border border-violet-300/60 bg-violet-700 text-white shadow-violet-950/40 ring-violet-400/40"
      : "border border-white/10 bg-[#202020] text-white shadow-black/30 ring-white/10 hover:bg-[#2b2b2b]";
  }

  return active
    ? "border border-sky-300/70 bg-sky-700 text-white shadow-sky-950/40 ring-sky-300/40"
    : "border border-white/10 bg-[#202020] text-white shadow-black/30 ring-white/10 hover:bg-[#2b2b2b]";
};

export default function POSTerminalPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [cashierName, setCashierName] = useState("Cashier");

  const [sessionPin, setSessionPin] = useState("");
  const [sessionOpeningCash, setSessionOpeningCash] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionActionLoading, setSessionActionLoading] = useState(false);

  const [settings, setSettings] = useState<PosSetting[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [productionStations, setProductionStations] = useState<
    ProductionStation[]
  >([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modifierGroups, setModifierGroups] = useState<PosModifierGroup[]>([]);
  const [modifierOptions, setModifierOptions] = useState<PosModifierOption[]>([]);
  const [setupPackGroups, setSetupPackGroups] = useState<PosSetupPackGroup[]>([]);


  const [selectedMenuGroupId, setSelectedMenuGroupId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedOrderTypeCode, setSelectedOrderTypeCode] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedPaymentMethodCode, setSelectedPaymentMethodCode] =
    useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [showOrderTagModal, setShowOrderTagModal] = useState(false);
  const [orderTag, setOrderTag] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [parkActionType, setParkActionType] = useState<"KITCHEN" | "PARK">(
    "PARK",
  );
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidSearch, setVoidSearch] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidMessage, setVoidMessage] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidCandidates, setVoidCandidates] = useState<VoidCandidateOrder[]>(
    [],
  );
  const [selectedVoidOrder, setSelectedVoidOrder] =
    useState<VoidCandidateOrder | null>(null);

  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionMessage, setTransactionMessage] = useState("");
  const [transactions, setTransactions] = useState<PosTransactionOrder[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PosTransactionOrder | null>(null);
  const [selectedTransactionItems, setSelectedTransactionItems] = useState<
    PosTransactionItem[]
  >([]);

  const [showSessionAuditModal, setShowSessionAuditModal] = useState(false);
  const [sessionAuditLoading, setSessionAuditLoading] = useState(false);
  const [sessionAuditMessage, setSessionAuditMessage] = useState("");
  const [sessionAuditOrders, setSessionAuditOrders] = useState<
    PosTransactionOrder[]
  >([]);
  const [sessionActualCash, setSessionActualCash] = useState("");
  const [sessionVarianceReason, setSessionVarianceReason] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [loadedParkedOrderId, setLoadedParkedOrderId] = useState<string | null>(
    null,
  );
  const [loadedParkedOrderTag, setLoadedParkedOrderTag] = useState("");

  const [modifierModalProduct, setModifierModalProduct] = useState<Product | null>(null);
  const [modifierSelections, setModifierSelections] = useState<Record<string, string[]>>({});
  const [modifierMessage, setModifierMessage] = useState("");


  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  const goToParkedOrders = () => {
    if (typeof window === "undefined") return;

    // Hard navigation is intentional here. The Recall page can be blocked by
    // stale client-router state after print/session actions, so this bypasses
    // Next client routing and forces the parked-orders route to mount fresh.
    window.location.assign("/pos/parked-orders");
  };

  const queueParkedOrdersRedirect = () => {
    // Give the browser print dialog enough time to open before navigating away.
    // Without this delay, SEND TO STATION can save successfully then redirect
    // straight to Parked Orders before the kitchen slip print popup appears.
    window.setTimeout(() => {
      goToParkedOrders();
    }, 2500);
  };

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadTerminalData();
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession || loading) return;

    const parkedOrderId = localStorage.getItem("opscore_open_parked_order_id");
    const parkedOrderTag = localStorage.getItem(
      "opscore_open_parked_order_tag",
    );

    if (!parkedOrderId) return;

    loadParkedOrderToCart(parkedOrderId, parkedOrderTag || "");
  }, [activeSession, loading]);

  const applyCompanyFilter = (query: any) => {
    if (!companyId) return query.is("company_id", null);
    return query.or(`company_id.eq.${companyId},company_id.is.null`);
  };

  const getSettingValue = (key: string) =>
    settings.find((setting) => setting.setting_key === key)?.setting_value ||
    "";

  const getSettingEnabled = (key: string) => getSettingValue(key) === "true";

  const enableTableTracking = getSettingEnabled("enable_table_tracking");
  const requireTableForDineIn = getSettingEnabled("require_table_for_dine_in");
  const enableServiceCharge = getSettingEnabled("enable_service_charge");
  const enableProductionRouting = getSettingEnabled(
    "enable_production_routing",
  );
  const enableCashDrawer = getSettingEnabled("enable_cash_drawer");
  const enableHoldOrders = getSettingEnabled("enable_hold_orders");
  const enableRecallOrders = getSettingEnabled("enable_recall_orders");
  const enableVoidApproval = getSettingEnabled("enable_void_approval");

  const serviceChargePercent = Number(
    getSettingValue("service_charge_percent") || 0,
  );

  const selectedOrderType = orderTypes.find(
    (item) => item.code === selectedOrderTypeCode,
  );

  const selectedTable = tables.find((item) => item.id === selectedTableId);

  const selectedPaymentMethod = paymentMethods.find(
    (item) => item.code === selectedPaymentMethodCode,
  );

  const checkActiveSession = async () => {
    setSessionLoading(true);

    const { data: sessionData, error: sessionError } = await supabase
      .from("pos_sessions")
      .select("*")
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError || !sessionData) {
      setActiveSession(null);
      setSessionLoading(false);
      setLoading(false);
      return;
    }

    const session = sessionData as PosSession;
    setActiveSession(session);

    if (session.opened_by) {
      const { data: employeeData } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("id", session.opened_by)
        .maybeSingle();

      if (employeeData) {
        const fullName =
          `${employeeData.first_name || ""} ${employeeData.last_name || ""}`.trim();

        setCashierName(fullName || "Cashier");
      }
    }

    setSessionLoading(false);
  };

  const startTerminalSession = async () => {
    setSessionMessage("");

    if (!sessionPin.trim()) {
      setSessionMessage("Enter cashier PIN.");
      return;
    }

    if (!sessionOpeningCash.trim()) {
      setSessionMessage("Enter opening cash.");
      return;
    }

    setSessionActionLoading(true);

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id, first_name, last_name")
      .eq("can_access_pos", true)
      .eq("pos_pin", sessionPin.trim())
      .maybeSingle();

    if (employeeError || !employee) {
      setSessionActionLoading(false);
      setSessionMessage("Invalid PIN or cashier has no POS access.");
      return;
    }

    const cashier = employee as Employee;

    const { error: insertError } = await supabase.from("pos_sessions").insert({
      company_id: cashier.company_id,
      opened_by: cashier.id,
      opening_cash: Number(sessionOpeningCash),
      status: "OPEN",
    });

    if (insertError) {
      setSessionActionLoading(false);
      setSessionMessage(insertError.message);
      return;
    }

    setCashierName(
      `${cashier.first_name || ""} ${cashier.last_name || ""}`.trim() ||
        "Cashier",
    );

    setSessionPin("");
    setSessionOpeningCash("");

    await checkActiveSession();
    setSessionActionLoading(false);
  };

  const loadTerminalData = async () => {
    setLoading(true);
    setOrderMessage("");

    const settingsQuery = applyCompanyFilter(
      supabase
        .from("pos_settings")
        .select("*")
        .order("setting_key", { ascending: true }),
    );

    const menuGroupQuery = applyCompanyFilter(
      supabase
        .from("pos_menu_groups")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    );

    const stationQuery = applyCompanyFilter(
      supabase
        .from("pos_production_stations")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    );

    const tableQuery = applyCompanyFilter(
      supabase
        .from("pos_tables")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    );

    const orderTypeQuery = applyCompanyFilter(
      supabase
        .from("pos_order_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    );

    const paymentQuery = applyCompanyFilter(
      supabase
        .from("pos_payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    );

    const categoryQuery = applyCompanyFilter(
      supabase
        .from("pos_categories")
        .select(
          "id, name, category_code, production_area, production_station_id, menu_group_id, short_name, icon, sort_order, requires_production",
        )
        .eq("status", "active")
        .order("sort_order", { ascending: true }),
    );

    const productQuery = applyCompanyFilter(
      supabase
        .from("pos_menu_items")
        .select(
          `
          id,
          category_id,
          setup_pack_id,
          item_code,
          name,
          description,
          price,
          cost,
          status,
          image_url,
          is_best_seller,
          is_hot,
          is_new,
          category:pos_categories (
            id,
            name,
            category_code,
            production_area,
            production_station_id,
            menu_group_id,
            short_name,
            icon,
            sort_order,
            requires_production
          )
        `,
        )
        .eq("status", "active")
        .order("name", { ascending: true }),
    );

    const modifierGroupQuery = applyCompanyFilter(
      supabase
        .from("pos_modifier_groups")
        .select("*")
        .eq("status", "active")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("group_name", { ascending: true }),
    );

    const modifierOptionQuery = applyCompanyFilter(
      supabase
        .from("pos_modifier_options")
        .select("*")
        .eq("status", "active")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("option_name", { ascending: true }),
    );

    const setupPackGroupQuery = applyCompanyFilter(
      supabase
        .from("pos_setup_pack_groups")
        .select("*")
        .order("created_at", { ascending: true }),
    );

    const [
      settingsResult,
      menuGroupResult,
      stationResult,
      tableResult,
      orderTypeResult,
      paymentResult,
      categoryResult,
      productResult,
      modifierGroupResult,
      modifierOptionResult,
      setupPackGroupResult,
    ] = await Promise.all([
      settingsQuery,
      menuGroupQuery,
      stationQuery,
      tableQuery,
      orderTypeQuery,
      paymentQuery,
      categoryQuery,
      productQuery,
      modifierGroupQuery,
      modifierOptionQuery,
      setupPackGroupQuery,
    ]);

    const firstError =
      settingsResult.error ||
      menuGroupResult.error ||
      stationResult.error ||
      tableResult.error ||
      orderTypeResult.error ||
      paymentResult.error ||
      categoryResult.error ||
      productResult.error ||
      modifierGroupResult.error ||
      modifierOptionResult.error ||
      setupPackGroupResult.error;

    if (firstError) {
      setOrderMessage(firstError.message);
      setLoading(false);
      return;
    }

    const loadedSettings = (settingsResult.data || []) as PosSetting[];
    const loadedGroups = (menuGroupResult.data || []) as MenuGroup[];
    const loadedTables = (tableResult.data || []) as PosTable[];
    const loadedOrderTypes = (orderTypeResult.data || []) as OrderType[];
    const loadedPaymentMethods = (paymentResult.data || []) as PaymentMethod[];

    setSettings(loadedSettings);
    setMenuGroups(loadedGroups);
    setProductionStations((stationResult.data || []) as ProductionStation[]);
    setTables(loadedTables);
    setOrderTypes(loadedOrderTypes);
    setPaymentMethods(loadedPaymentMethods);
    setCategories((categoryResult.data || []) as unknown as Category[]);
    setProducts((productResult.data || []) as unknown as Product[]);
    setModifierGroups((modifierGroupResult.data || []) as PosModifierGroup[]);
    setModifierOptions((modifierOptionResult.data || []) as PosModifierOption[]);
    setSetupPackGroups((setupPackGroupResult.data || []) as PosSetupPackGroup[]);

    const getLoadedSetting = (key: string) =>
      loadedSettings.find((setting) => setting.setting_key === key)
        ?.setting_value || "";

    const defaultOrderTypeCode = getLoadedSetting("default_order_type");
    const defaultPaymentMethodCode = getLoadedSetting("default_payment_method");

    const nextOrderType =
      loadedOrderTypes.find((item) => item.code === defaultOrderTypeCode) ||
      loadedOrderTypes[0];

    const nextPaymentMethod =
      loadedPaymentMethods.find(
        (item) => item.code === defaultPaymentMethodCode,
      ) || loadedPaymentMethods[0];

    const nextMenuGroup = loadedGroups[0];
    const nextTable = loadedTables[0];

    setSelectedOrderTypeCode((current) => current || nextOrderType?.code || "");
    setSelectedPaymentMethodCode(
      (current) => current || nextPaymentMethod?.code || "",
    );
    setSelectedMenuGroupId((current) => current || nextMenuGroup?.id || "");
    setSelectedTableId((current) => current || nextTable?.id || "");

    setLoading(false);
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const sortA = Number(a.sort_order || 0);
      const sortB = Number(b.sort_order || 0);

      if (sortA !== sortB) return sortA - sortB;

      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const modeCategories = useMemo(() => {
    return sortedCategories.filter((category) => {
      if (!selectedMenuGroupId) return true;
      return category.menu_group_id === selectedMenuGroupId;
    });
  }, [sortedCategories, selectedMenuGroupId]);

  useEffect(() => {
    if (modeCategories.length === 0) {
      setSelectedCategory("");
      return;
    }

    const selectedStillExists = modeCategories.some(
      (category) => category.id === selectedCategory,
    );

    if (!selectedStillExists) {
      setSelectedCategory(modeCategories[0].id);
    }
  }, [modeCategories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const productName = product.name.toLowerCase();
      const categoryName = product.category?.name || "";
      const categoryGroupId = product.category?.menu_group_id || "";

      const matchesGroup =
        !selectedMenuGroupId || categoryGroupId === selectedMenuGroupId;

      const matchesCategory =
        !selectedCategory || product.category_id === selectedCategory;

      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        String(product.item_code || "")
          .toLowerCase()
          .includes(term) ||
        String(categoryName).toLowerCase().includes(term) ||
        productName.includes(term);

      return matchesGroup && matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, selectedMenuGroupId, search]);

  const getProductionCode = (product: Product) => {
    if (!enableProductionRouting) return null;

    const station = productionStations.find(
      (item) => item.id === product.category?.production_station_id,
    );

    if (station?.code) return station.code;

    if (product.category?.production_area) {
      return normalizeCode(product.category.production_area);
    }

    const defaultStationCode = getSettingValue("default_production_station");

    if (defaultStationCode) return defaultStationCode;

    return null;
  };

  const getRequiresProduction = (product: Product) => {
    if (!enableProductionRouting) return false;

    return product.category?.requires_production !== false;
  };

  const loadParkedOrderToCart = async (orderId: string, tag: string) => {
    setOrderMessage("");

    const { data: orderData, error: orderError } = await supabase
      .from("pos_orders")
      .select("id, order_tag, order_type, table_no, status, payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !orderData) {
      localStorage.removeItem("opscore_open_parked_order_id");
      localStorage.removeItem("opscore_open_parked_order_tag");
      setOrderMessage(orderError?.message || "Parked order not found.");
      return;
    }

    if (orderData.status !== "PARKED") {
      localStorage.removeItem("opscore_open_parked_order_id");
      localStorage.removeItem("opscore_open_parked_order_tag");
      setOrderMessage("This order is no longer parked.");
      return;
    }

    const { data: itemData, error: itemError } = await supabase
      .from("pos_order_items")
      .select(
        "id, menu_item_id, item_name, qty, price, production_area, production_status",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (itemError) {
      setOrderMessage(itemError.message);
      return;
    }

    const orderItemIds = (itemData || [])
      .map((item: any) => item.id)
      .filter(Boolean);

    let modifierRowsByOrderItem = new Map<string, any[]>();

    if (orderItemIds.length > 0) {
      const { data: modifierRows, error: modifierError } = await supabase
        .from("pos_order_item_modifiers")
        .select(
          "order_item_id, setup_pack_id, setup_pack_name, modifier_group_id, modifier_group_name, modifier_option_id, modifier_option_name, price_adjustment, sort_order",
        )
        .in("order_item_id", orderItemIds)
        .order("sort_order", { ascending: true });

      if (modifierError) {
        setOrderMessage(modifierError.message);
        return;
      }

      (modifierRows || []).forEach((row: any) => {
        const current = modifierRowsByOrderItem.get(row.order_item_id) || [];
        modifierRowsByOrderItem.set(row.order_item_id, [...current, row]);
      });
    }

    const buildModifiersFromRows = (rows: any[]): CartModifierSelection[] => {
      const grouped = new Map<string, CartModifierSelection>();

      rows.forEach((row) => {
        const groupId = String(row.modifier_group_id || row.modifier_group_name || "");
        if (!groupId) return;

        const existing = grouped.get(groupId);
        const choice = {
          option_id: String(row.modifier_option_id || row.modifier_option_name || ""),
          option_name: String(row.modifier_option_name || ""),
          price_adjustment: Number(row.price_adjustment || 0),
        };

        if (existing) {
          existing.choices.push(choice);
          return;
        }

        grouped.set(groupId, {
          group_id: groupId,
          group_name: String(row.modifier_group_name || "Option"),
          selection_type: "single",
          choices: [choice],
        });
      });

      return Array.from(grouped.values());
    };

    const loadedItemsMap = new Map<string, CartItem>();

    (itemData || []).forEach((item: any) => {
      const itemModifiers = buildModifiersFromRows(
        modifierRowsByOrderItem.get(item.id) || [],
      );
      const modifierSignature = buildModifierSignature(itemModifiers);
      const product = products.find(
        (productItem) => String(productItem.id) === String(item.menu_item_id || ""),
      );
      const baseName =
        product?.name ||
        String(item.item_name || "")
          .replace(/\s*\([^)]*\)\s*$/g, "")
          .trim();
      const setupPackId =
        product?.setup_pack_id ||
        modifierRowsByOrderItem.get(item.id)?.[0]?.setup_pack_id ||
        null;
      const setupPackName =
        modifierRowsByOrderItem.get(item.id)?.[0]?.setup_pack_name || null;
      const key = `${String(item.menu_item_id || baseName)}__${modifierSignature || "NONE"}`;
      const qty = Number(item.qty || 0);
      const normalizedStatus = String(item.production_status || "").toUpperCase();
      const isProductionItem = normalizedStatus !== "COMPLETED";
      const isAlreadySent = [
        "SENT",
        "PRINTED",
        "IN_PROGRESS",
        "PREPARING",
        "READY",
      ].includes(normalizedStatus);
      const existing = loadedItemsMap.get(key);

      if (existing) {
        existing.qty += qty;
        existing.sentQty =
          Number(existing.sentQty || 0) + (isAlreadySent ? qty : 0);
        existing.requires_production =
          existing.requires_production || isProductionItem || isAlreadySent;
        return;
      }

      loadedItemsMap.set(key, {
        id: item.menu_item_id,
        cart_key: key,
        item_code: product?.item_code || null,
        name: baseName || String(item.item_name || "POS Item"),
        display_name: buildDisplayName(
          { ...(product || {}), name: baseName || String(item.item_name || "POS Item") } as Product,
          itemModifiers,
        ),
        modifier_signature: modifierSignature,
        modifiers: itemModifiers,
        setup_pack_id: setupPackId,
        setup_pack_name: setupPackName,
        price: Number(item.price || 0),
        qty,
        production_area: item.production_area || null,
        requires_production: isProductionItem || isAlreadySent,
        sentQty: isAlreadySent ? qty : 0,
      });
    });

    const loadedItems: CartItem[] = Array.from(loadedItemsMap.values());

    setCart(loadedItems);
    setLoadedParkedOrderId(orderId);
    setLoadedParkedOrderTag(orderData.order_tag || tag || "");

    if (orderData.order_type) {
      setSelectedOrderTypeCode(orderData.order_type);
    }

    localStorage.removeItem("opscore_open_parked_order_id");
    localStorage.removeItem("opscore_open_parked_order_tag");

    setOrderMessage(
      `Loaded parked order ${orderData.order_tag || tag || orderId.slice(0, 8)}.`,
    );
  };

  const getProductVisual = (product: Product) => {
    if (product.category?.icon) return product.category.icon;

    const group = menuGroups.find(
      (item) => item.id === product.category?.menu_group_id,
    );

    if (group?.icon) return group.icon;

    return "•";
  };

  const getProductModifierGroups = (product: Product) => {
    if (!product.setup_pack_id) return [];

    const linkedGroupIds = setupPackGroups
      .filter((link) => link.pack_id === product.setup_pack_id)
      .map((link) => link.group_id);

    return linkedGroupIds
      .map((groupId) => modifierGroups.find((group) => group.id === groupId))
      .filter(Boolean) as PosModifierGroup[];
  };

  const getGroupOptions = (groupId: string) =>
    modifierOptions.filter((option) => option.modifier_group_id === groupId);

  const buildModifierSignature = (modifiers: CartModifierSelection[]) =>
    modifiers
      .map((modifier) =>
        `${modifier.group_id}:${modifier.choices
          .map((choice) => choice.option_id)
          .sort()
          .join(",")}`,
      )
      .sort()
      .join("|");

  const buildDisplayName = (
    product: Product,
    modifiers: CartModifierSelection[] = [],
  ) => {
    const selectedText = modifiers
      .flatMap((modifier) =>
        modifier.choices.map(
          (choice) => `${modifier.group_name}: ${choice.option_name}`,
        ),
      )
      .join(" / ");

    return selectedText ? `${product.name} (${selectedText})` : product.name;
  };

  const addProductToCart = (
    product: Product,
    modifiers: CartModifierSelection[] = [],
  ) => {
    const modifierSignature = buildModifierSignature(modifiers);
    const cartKey = `${product.id}__${modifierSignature || "NONE"}`;
    const displayName = buildDisplayName(product, modifiers);
    const modifierTotal = modifiers.reduce(
      (sum, modifier) =>
        sum +
        modifier.choices.reduce(
          (choiceSum, choice) => choiceSum + Number(choice.price_adjustment || 0),
          0,
        ),
      0,
    );
    const finalPrice = Number(product.price || 0) + modifierTotal;

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => (item.cart_key || item.id) === cartKey,
      );

      if (existingItem) {
        return currentCart.map((item) =>
          (item.cart_key || item.id) === cartKey
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          id: product.id,
          cart_key: cartKey,
          item_code: product.item_code,
          name: product.name,
          display_name: displayName,
          modifier_signature: modifierSignature,
          modifiers,
          setup_pack_id: product.setup_pack_id || null,
          setup_pack_name: null,
          price: finalPrice,
          qty: 1,
          production_area: getRequiresProduction(product)
            ? getProductionCode(product)
            : null,
          requires_production: getRequiresProduction(product),
          sentQty: 0,
        },
      ];
    });
  };

  const addToCart = (product: Product) => {
    const groups = getProductModifierGroups(product);

    if (product.setup_pack_id && groups.length > 0) {
      setModifierModalProduct(product);
      setModifierSelections({});
      setModifierMessage("");
      return;
    }

    addProductToCart(product);
  };

  const toggleModifierSelection = (
    group: PosModifierGroup,
    optionId: string,
  ) => {
    setModifierMessage("");

    setModifierSelections((current) => {
      const currentSelections = current[group.id] || [];
      const isSelected = currentSelections.includes(optionId);
      const isSingle =
        String(group.selection_type || "single").toLowerCase() === "single";

      if (isSingle) {
        return {
          ...current,
          [group.id]: isSelected ? [] : [optionId],
        };
      }

      return {
        ...current,
        [group.id]: isSelected
          ? currentSelections.filter((id) => id !== optionId)
          : [...currentSelections, optionId],
      };
    });
  };

  const closeModifierModal = () => {
    setModifierModalProduct(null);
    setModifierSelections({});
    setModifierMessage("");
  };

  const confirmModifierSelection = () => {
    if (!modifierModalProduct) return;

    const groups = getProductModifierGroups(modifierModalProduct);
    const builtModifiers: CartModifierSelection[] = [];

    for (const group of groups) {
      const selectedOptionIds = modifierSelections[group.id] || [];
      const selectionType = String(group.selection_type || "single").toLowerCase();
      const minSelect =
        selectionType === "single" && group.is_required
          ? 1
          : Math.max(0, Number(group.min_select || 0));
      const maxSelect =
        selectionType === "single"
          ? 1
          : Math.max(1, Number(group.max_select || 1));

      if (selectedOptionIds.length < minSelect) {
        setModifierMessage(`Select at least ${minSelect} for ${group.group_name}.`);
        return;
      }

      if (selectedOptionIds.length > maxSelect) {
        setModifierMessage(`Select up to ${maxSelect} for ${group.group_name}.`);
        return;
      }

      const choices = selectedOptionIds
        .map((optionId) => getGroupOptions(group.id).find((option) => option.id === optionId))
        .filter(Boolean)
        .map((option) => ({
          option_id: option!.id,
          option_name: option!.option_name,
          price_adjustment: Number(option!.price_adjustment || 0),
        }));

      if (choices.length > 0) {
        builtModifiers.push({
          group_id: group.id,
          group_name: group.group_name,
          selection_type: group.selection_type,
          choices,
        });
      }
    }

    addProductToCart(modifierModalProduct, builtModifiers);
    closeModifierModal();
  };

  const increaseQty = (itemKey: string) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        (item.cart_key || item.id) === itemKey
          ? { ...item, qty: item.qty + 1 }
          : item,
      ),
    );
  };

  const decreaseQty = (itemKey: string) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          (item.cart_key || item.id) === itemKey
            ? {
                ...item,
                qty: Math.max(Number(item.sentQty || 0), item.qty - 1),
              }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const resetPaymentState = () => {
    setShowPaymentModal(false);
    setAmountPaid("");
    setPaymentReference("");
  };

  const resetOrderTagState = () => {
    setShowOrderTagModal(false);
    setOrderTag("");
    setOrderNotes("");
    setParkActionType("PARK");
  };

  const clearCart = () => {
    setCart([]);
    resetPaymentState();
    resetOrderTagState();
    setLoadedParkedOrderId(null);
    setLoadedParkedOrderTag("");
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.qty,
    0,
  );

  const serviceCharge =
    enableServiceCharge && serviceChargePercent > 0
      ? subtotal * (serviceChargePercent / 100)
      : 0;

  const grandTotal = subtotal + serviceCharge;
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const productionRequiredCount = cart.filter(
    (item) => item.requires_production,
  ).length;

  const hasProductionItems = productionRequiredCount > 0;

  const kitchenSendItems = cart
    .map((item) => ({
      ...item,
      unsentQty: Math.max(0, Number(item.qty || 0) - Number(item.sentQty || 0)),
    }))
    .filter((item) => item.requires_production && item.unsentQty > 0);

  const groupedKitchenSendItems = kitchenSendItems.reduce<
    Record<string, Array<CartItem & { unsentQty: number }>>
  >((acc, item) => {
    const key = getStationLabelForSlip(item);
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});

  const isAdditionalKitchenSend = cart.some(
    (item) => item.requires_production && Number(item.sentQty || 0) > 0,
  );

  const amountPaidValue = Number(amountPaid || 0);
  const changeAmount =
    amountPaidValue > grandTotal ? amountPaidValue - grandTotal : 0;
  const canConfirmPayment =
    Boolean(selectedPaymentMethod) && amountPaidValue >= grandTotal;

  const openOrderTagModal = (actionType: "KITCHEN" | "PARK") => {
    setOrderMessage("");

    if (!activeSession) {
      setOrderMessage("No active cashier session.");
      return;
    }

    if (cart.length === 0) {
      setOrderMessage("Cart is empty.");
      return;
    }

    if (!selectedOrderType) {
      setOrderMessage("Select order type.");
      return;
    }

    if (actionType === "KITCHEN" && !hasProductionItems) {
      setOrderMessage("No production items found. Use Park Order.");
      return;
    }

    if (actionType === "KITCHEN" && kitchenSendItems.length === 0) {
      setOrderMessage("No new production items to send.");
      return;
    }

    setParkActionType(actionType);
    setOrderTag(loadedParkedOrderTag || "");
    setShowOrderTagModal(true);
  };

  function getStationLabelForSlip(item: CartItem) {
    if (!item.requires_production) return "DIRECT / NO PRODUCTION";

    const productionCode = normalizeCode(item.production_area || "");

    const station = productionStations.find(
      (stationItem) =>
        normalizeCode(stationItem.code || "") === productionCode ||
        String(stationItem.id || "") === String(item.production_area || ""),
    );

    if (station?.name) return station.name.toUpperCase();

    return productionCode || "PRODUCTION";
  }

  const printOrderSlip = (
    tag: string,
    slipItems: CartItem[] = cart,
    slipNotes = orderNotes,
    slipMode: "NEW" | "ADDITIONAL" = isAdditionalKitchenSend
      ? "ADDITIONAL"
      : "NEW",
  ) => {
    if (typeof window === "undefined") return;

    const escapeSlipText = (value: string | number | null | undefined) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const groupedItems = slipItems.reduce<Record<string, CartItem[]>>(
      (acc, item) => {
        const key = getStationLabelForSlip(item);
        acc[key] = [...(acc[key] || []), item];
        return acc;
      },
      {},
    );

    const slipDate = new Date();
    const slipTime = slipDate.toLocaleString("en-PH", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const slipClock = slipDate.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const cleanTag = tag.trim().toUpperCase();
    const slipTitle =
      slipMode === "ADDITIONAL" ? "ADDITIONAL ORDER" : "KITCHEN ORDER";
    const tableLabel = enableTableTracking
      ? selectedTable?.table_name || "NO TABLE"
      : "-";
    const orderTypeLabel =
      selectedOrderType?.name || selectedOrderTypeCode || "-";
    const cashierLabel = cashierName || "Cashier";

    const stationSections = Object.entries(groupedItems)
      .map(([stationName, stationItems]) => {
        const rows = stationItems
          .map((item) => {
            const modifierHtml =
              item.modifiers && item.modifiers.length > 0
                ? `
                  <div class="modifier-block">
                    ${item.modifiers
                      .map(
                        (modifier) => `
                          <div class="modifier-group">
                            ${escapeSlipText(modifier.group_name)}
                          </div>

                          ${modifier.choices
                            .map(
                              (choice) => `
                                <div class="modifier-option">
                                  • ${escapeSlipText(choice.option_name)}
                                </div>
                              `,
                            )
                            .join("")}
                        `,
                      )
                      .join("")}
                  </div>
                `
                : "";

            return `
              <div class="item-row">
                <span class="item-qty">${escapeSlipText(item.qty)}x</span>
                <span class="item-name">
                  ${escapeSlipText(item.name)}
                  ${modifierHtml}
                </span>
              </div>
            `;
          })
          .join("");

        return `
          <section class="station-block">
            <div class="section-title">${escapeSlipText(stationName)}</div>
            ${rows}
          </section>
        `;
      })
      .join("");

    const notesSection = slipNotes.trim()
      ? `
        <div class="divider"></div>
        <section class="notes-block">
          <div class="section-title">NOTES</div>
          <div class="notes-text">${escapeSlipText(slipNotes.trim())}</div>
        </section>
      `
      : "";

    const slipHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeSlipText(slipTitle)} - ${escapeSlipText(cleanTag)}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: "Courier New", Courier, monospace;
              text-transform: uppercase;
            }

            body {
              width: 80mm;
            }

            .slip {
              width: 72mm;
              margin: 0 auto;
              padding: 4mm 3mm 5mm;
              color: #000000;
              font-size: 11px;
              line-height: 1.22;
              font-weight: 700;
            }

            .center {
              text-align: center;
            }

            .brand {
              font-size: 13px;
              font-weight: 900;
              letter-spacing: 0.02em;
            }

            .title {
              margin-top: 2px;
              font-size: 18px;
              font-weight: 900;
              line-height: 1.05;
            }

            .mode {
              margin: 7px 0 6px;
              padding: 5px 4px;
              border: 2px solid #000000;
              text-align: center;
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 0.04em;
            }

            .tag {
              margin-top: 6px;
              text-align: center;
              font-size: 24px;
              font-weight: 900;
              line-height: 1;
              word-break: break-word;
            }

            .divider {
              margin: 7px 0;
              border-top: 1px dashed #000000;
            }

            .heavy-divider {
              margin: 7px 0;
              border-top: 2px solid #000000;
            }

            .meta-grid {
              display: grid;
              grid-template-columns: 23mm 1fr;
              column-gap: 3mm;
              row-gap: 2px;
            }

            .meta-label {
              font-size: 10px;
              font-weight: 900;
            }

            .meta-value {
              text-align: right;
              font-size: 10px;
              font-weight: 900;
              overflow-wrap: anywhere;
            }

            .section-title {
              margin: 0 0 5px;
              padding: 3px 0;
              border-top: 1px solid #000000;
              border-bottom: 1px solid #000000;
              text-align: center;
              font-size: 13px;
              font-weight: 900;
              letter-spacing: 0.04em;
            }

            .item-row {
              display: grid;
              grid-template-columns: 10mm 1fr;
              gap: 2mm;
              padding: 4px 0;
              border-bottom: 1px dashed #999999;
            }

            .item-qty {
              font-size: 15px;
              font-weight: 900;
            }

            .item-name {
              font-size: 14px;
              font-weight: 900;
              line-height: 1.12;
              overflow-wrap: anywhere;
            }

            .modifier-block {
              margin-top: 4px;
              padding-left: 2px;
            }

            .modifier-group {
              margin-top: 3px;
              font-size: 11px;
              font-weight: 900;
              line-height: 1.12;
            }

            .modifier-option {
              padding-left: 4px;
              font-size: 11px;
              font-weight: 700;
              line-height: 1.12;
            }

            .notes-text {
              padding: 3px 0 1px;
              font-size: 14px;
              font-weight: 900;
              line-height: 1.18;
              overflow-wrap: anywhere;
              white-space: pre-wrap;
            }

            .footer {
              margin-top: 8px;
              text-align: center;
              font-size: 9px;
              font-weight: 900;
            }

            .print-clock {
              margin-top: 3px;
              text-align: center;
              font-size: 11px;
              font-weight: 900;
            }

            @media screen {
              body {
                background: #f3f4f6;
              }

              .slip {
                margin: 8px auto;
                background: #ffffff;
                border: 1px solid #d1d5db;
                box-shadow: 0 6px 20px rgba(15, 23, 42, 0.15);
              }
            }
          </style>
        </head>
        <body>
          <main class="slip">
            <header class="center">
              <div class="brand">VINCENT RESORT HOTEL</div>
              <div class="title">${escapeSlipText(slipTitle)}</div>
            </header>

            <div class="heavy-divider"></div>

            <div class="mode">${slipMode === "ADDITIONAL" ? "ADDITIONAL ITEMS" : "NEW ORDER"}</div>
            <div class="tag">${escapeSlipText(cleanTag)}</div>

            <div class="divider"></div>

            <section class="meta-grid">
              <div class="meta-label">TIME</div>
              <div class="meta-value">${escapeSlipText(slipTime)}</div>

              <div class="meta-label">CASHIER</div>
              <div class="meta-value">${escapeSlipText(cashierLabel)}</div>

              <div class="meta-label">TYPE</div>
              <div class="meta-value">${escapeSlipText(orderTypeLabel)}</div>

              <div class="meta-label">TABLE</div>
              <div class="meta-value">${escapeSlipText(tableLabel)}</div>
            </section>

            <div class="divider"></div>

            ${stationSections}

            ${notesSection}

            <div class="heavy-divider"></div>

            <div class="footer">PRINTED FROM OPSCORE POS</div>
            <div class="print-clock">${escapeSlipText(slipClock)}</div>
          </main>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDocument) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDocument.open();
    iframeDocument.write(slipHtml);
    iframeDocument.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1800);
  };

  const buildOrderItemsPayload = (
    orderId: string,
    markUnsentAsSent: boolean,
  ) => {
    return cart.flatMap((item) => {
      const sentQty = Math.min(
        Number(item.sentQty || 0),
        Number(item.qty || 0),
      );
      const unsentQty = Math.max(0, Number(item.qty || 0) - sentQty);
      const basePayload = {
        company_id: activeSession?.company_id || null,
        order_id: orderId,
        menu_item_id: item.id,
        item_name: item.display_name || item.name,
        price: item.price,
        production_area: item.requires_production ? item.production_area : null,
      };

      const rows = [];

      if (sentQty > 0) {
        rows.push({
          ...basePayload,
          qty: sentQty,
          total: item.price * sentQty,
          production_status: item.requires_production ? "SENT" : "COMPLETED",
        });
      }

      if (unsentQty > 0) {
        rows.push({
          ...basePayload,
          qty: unsentQty,
          total: item.price * unsentQty,
          production_status:
            enableProductionRouting && item.requires_production
              ? markUnsentAsSent
                ? "SENT"
                : "PENDING"
              : "COMPLETED",
        });
      }

      return rows;
    });
  };

  const buildOrderRowsForCartItem = (
    orderId: string,
    item: CartItem,
    markUnsentAsSent: boolean,
  ) => {
    const sentQty = Math.min(Number(item.sentQty || 0), Number(item.qty || 0));
    const unsentQty = Math.max(0, Number(item.qty || 0) - sentQty);
    const basePayload = {
      company_id: activeSession?.company_id || null,
      order_id: orderId,
      menu_item_id: item.id,
      item_name: item.display_name || item.name,
      price: item.price,
      production_area: item.requires_production ? item.production_area : null,
    };

    const rows: any[] = [];

    if (sentQty > 0) {
      rows.push({
        ...basePayload,
        qty: sentQty,
        total: item.price * sentQty,
        production_status: item.requires_production ? "SENT" : "COMPLETED",
      });
    }

    if (unsentQty > 0) {
      rows.push({
        ...basePayload,
        qty: unsentQty,
        total: item.price * unsentQty,
        production_status:
          enableProductionRouting && item.requires_production
            ? markUnsentAsSent
              ? "SENT"
              : "PENDING"
            : "COMPLETED",
      });
    }

    return rows;
  };

  const buildModifierRowsForOrderItem = (
    orderId: string,
    orderItemId: string,
    item: CartItem,
  ) => {
    return (item.modifiers || []).flatMap((modifier, modifierIndex) =>
      modifier.choices.map((choice, choiceIndex) => ({
        company_id: activeSession?.company_id || null,
        order_id: orderId,
        order_item_id: orderItemId,
        menu_item_id: item.id,
        setup_pack_id: item.setup_pack_id || null,
        setup_pack_name: item.setup_pack_name || null,
        modifier_group_id: modifier.group_id,
        modifier_group_name: modifier.group_name,
        modifier_option_id: choice.option_id,
        modifier_option_name: choice.option_name,
        price_adjustment: Number(choice.price_adjustment || 0),
        sort_order: modifierIndex * 100 + choiceIndex,
      })),
    );
  };

  const insertOrderItemsWithModifiers = async (
    orderId: string,
    sourceCart: CartItem[],
    markUnsentAsSent: boolean,
  ) => {
    for (const item of sourceCart) {
      const rows = buildOrderRowsForCartItem(orderId, item, markUnsentAsSent);
      if (rows.length === 0) continue;

      const { data: insertedItems, error: itemError } = await supabase
        .from("pos_order_items")
        .insert(rows)
        .select("id");

      if (itemError) return itemError;

      const modifierRows = (insertedItems || []).flatMap((insertedItem: any) =>
        buildModifierRowsForOrderItem(orderId, insertedItem.id, item),
      );

      if (modifierRows.length > 0) {
        const { error: modifierError } = await supabase
          .from("pos_order_item_modifiers")
          .insert(modifierRows);

        if (modifierError) return modifierError;
      }
    }

    return null;
  };

  const getKitchenSlipItems = () =>
    kitchenSendItems.map((item) => ({
      ...item,
      qty: item.unsentQty,
      sentQty: 0,
    }));

  const saveParkedOrder = async () => {
    setOrderMessage("");

    const cleanTag = orderTag.trim().toUpperCase();

    if (!cleanTag) {
      setOrderMessage("Enter order tag.");
      return;
    }

    if (!activeSession) {
      setOrderMessage("No active cashier session.");
      return;
    }

    if (cart.length === 0) {
      setOrderMessage("Cart is empty.");
      return;
    }

    if (!selectedOrderType) {
      setOrderMessage("Select order type.");
      return;
    }

    setOrderLoading(true);

    if (loadedParkedOrderId) {
      const { error: updateOrderError } = await supabase
        .from("pos_orders")
        .update({
          order_tag: cleanTag,
          subtotal,
          service_charge: serviceCharge,
          total_amount: grandTotal,
          payment_status: "UNPAID",
          production_status:
            enableProductionRouting && productionRequiredCount > 0
              ? "PENDING"
              : "COMPLETED",
          status: "PARKED",
        })
        .eq("id", loadedParkedOrderId);

      if (updateOrderError) {
        setOrderLoading(false);
        setOrderMessage(updateOrderError.message);
        return;
      }

      const { error: deleteModifiersError } = await supabase
        .from("pos_order_item_modifiers")
        .delete()
        .eq("order_id", loadedParkedOrderId);

      if (deleteModifiersError) {
        setOrderLoading(false);
        setOrderMessage(deleteModifiersError.message);
        return;
      }

      const { error: deleteItemsError } = await supabase
        .from("pos_order_items")
        .delete()
        .eq("order_id", loadedParkedOrderId);

      if (deleteItemsError) {
        setOrderLoading(false);
        setOrderMessage(deleteItemsError.message);
        return;
      }

      const insertItemsError = await insertOrderItemsWithModifiers(
        loadedParkedOrderId,
        cart,
        parkActionType === "KITCHEN",
      );

      if (insertItemsError) {
        setOrderLoading(false);
        setOrderMessage(insertItemsError.message);
        return;
      }

      if (parkActionType === "KITCHEN") {
        printOrderSlip(
          cleanTag,
          getKitchenSlipItems(),
          orderNotes,
          isAdditionalKitchenSend ? "ADDITIONAL" : "NEW",
        );
      } else {
        printOrderSlip(cleanTag, cart, orderNotes, "NEW");
      }

      setCart([]);
      resetOrderTagState();
      setLoadedParkedOrderId(null);
      setLoadedParkedOrderTag("");
      setOrderLoading(false);
      queueParkedOrdersRedirect();
      return;
    }

    const duplicateQuery = supabase
      .from("pos_orders")
      .select("id")
      .eq("order_tag", cleanTag)
      .eq("status", "PARKED")
      .eq("payment_status", "UNPAID")
      .limit(1);

    const scopedDuplicateQuery = activeSession.company_id
      ? duplicateQuery.eq("company_id", activeSession.company_id)
      : duplicateQuery.is("company_id", null);

    const { data: duplicateOrders, error: duplicateError } =
      await scopedDuplicateQuery;

    if (duplicateError) {
      setOrderLoading(false);
      setOrderMessage(duplicateError.message);
      return;
    }

    const duplicateOrderId = (duplicateOrders || [])[0]?.id || null;

    if (duplicateOrderId && parkActionType !== "KITCHEN") {
      setOrderLoading(false);
      setOrderMessage(
        `Order tag "${cleanTag}" is already queued. Use Recall to update it.`,
      );
      return;
    }

    if (duplicateOrderId && parkActionType === "KITCHEN") {
      const { error: updateDuplicateError } = await supabase
        .from("pos_orders")
        .update({
          order_tag: cleanTag,
          session_id: activeSession.id,
          cashier_id: activeSession.opened_by,
          table_no: enableTableTracking
            ? selectedTable?.table_name || null
            : null,
          order_type: selectedOrderType.code,
          subtotal,
          service_charge: serviceCharge,
          total_amount: grandTotal,
          payment_status: "UNPAID",
          production_status:
            enableProductionRouting && productionRequiredCount > 0
              ? "PENDING"
              : "COMPLETED",
          status: "PARKED",
        })
        .eq("id", duplicateOrderId);

      if (updateDuplicateError) {
        setOrderLoading(false);
        setOrderMessage(updateDuplicateError.message);
        return;
      }

      const { error: deleteDuplicateModifiersError } = await supabase
        .from("pos_order_item_modifiers")
        .delete()
        .eq("order_id", duplicateOrderId);

      if (deleteDuplicateModifiersError) {
        setOrderLoading(false);
        setOrderMessage(deleteDuplicateModifiersError.message);
        return;
      }

      const { error: deleteDuplicateItemsError } = await supabase
        .from("pos_order_items")
        .delete()
        .eq("order_id", duplicateOrderId);

      if (deleteDuplicateItemsError) {
        setOrderLoading(false);
        setOrderMessage(deleteDuplicateItemsError.message);
        return;
      }

      const insertDuplicateItemsError = await insertOrderItemsWithModifiers(
        duplicateOrderId,
        cart,
        true,
      );

      if (insertDuplicateItemsError) {
        setOrderLoading(false);
        setOrderMessage(insertDuplicateItemsError.message);
        return;
      }

      printOrderSlip(
        cleanTag,
        getKitchenSlipItems(),
        orderNotes,
        isAdditionalKitchenSend ? "ADDITIONAL" : "NEW",
      );

      setCart([]);
      resetOrderTagState();
      setLoadedParkedOrderId(null);
      setLoadedParkedOrderTag("");
      setOrderLoading(false);
      queueParkedOrdersRedirect();
      return;
    }

    const { data: orderData, error: orderError } = await supabase
      .from("pos_orders")
      .insert({
        company_id: activeSession.company_id,
        session_id: activeSession.id,
        cashier_id: activeSession.opened_by,
        order_tag: cleanTag,
        table_no: enableTableTracking
          ? selectedTable?.table_name || null
          : null,
        order_type: selectedOrderType.code,
        subtotal,
        service_charge: serviceCharge,
        total_amount: grandTotal,
        amount_paid: 0,
        change_amount: 0,
        payment_status: "UNPAID",
        production_status:
          enableProductionRouting && productionRequiredCount > 0
            ? "PENDING"
            : "COMPLETED",
        status: "PARKED",
      })
      .select("id")
      .single();

    if (orderError || !orderData) {
      setOrderLoading(false);
      setOrderMessage(orderError?.message || "Failed to park order.");
      return;
    }

    const itemsError = await insertOrderItemsWithModifiers(
      orderData.id,
      cart,
      parkActionType === "KITCHEN",
    );

    if (itemsError) {
      setOrderLoading(false);
      setOrderMessage(itemsError.message);
      return;
    }

    if (parkActionType === "KITCHEN") {
      printOrderSlip(
        cleanTag,
        getKitchenSlipItems(),
        orderNotes,
        isAdditionalKitchenSend ? "ADDITIONAL" : "NEW",
      );
    } else {
      printOrderSlip(cleanTag, cart, orderNotes, "NEW");
    }

    setCart([]);
    resetOrderTagState();
    setLoadedParkedOrderId(null);
    setLoadedParkedOrderTag("");

    setOrderLoading(false);
    queueParkedOrdersRedirect();
  };

  const resetVoidState = () => {
    setShowVoidModal(false);
    setVoidSearch("");
    setVoidReason("");
    setVoidMessage("");
    setVoidCandidates([]);
    setSelectedVoidOrder(null);
    setVoidLoading(false);
  };

  const formatPosDateTime = (value: any) => {
    if (!value) return "-";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleString("en-PH", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionReference = (order: Partial<PosTransactionOrder>) =>
    order.receipt_no ||
    order.order_number ||
    order.order_tag ||
    String(order.id || "")
      .slice(0, 8)
      .toUpperCase();

  const loadTransactions = async () => {
    if (!activeSession) {
      setTransactionMessage("No active cashier session.");
      return;
    }

    setTransactionLoading(true);
    setTransactionMessage("");
    setSelectedTransaction(null);
    setSelectedTransactionItems([]);

    let query = supabase
      .from("pos_orders")
      .select(
        `
        id,
        company_id,
        session_id,
        cashier_id,
        order_tag,
        order_number,
        receipt_no,
        order_type,
        table_no,
        subtotal,
        service_charge,
        total_amount,
        payment_method,
        payment_method_name,
        payment_reference,
        amount_paid,
        change_amount,
        payment_status,
        status,
        created_at
      `,
      )
      .eq("session_id", activeSession.id)
      .order("created_at", { ascending: false })
      .limit(60);

    if (activeSession.company_id) {
      query = query.eq("company_id", activeSession.company_id);
    } else {
      query = query.is("company_id", null);
    }

    const { data, error } = await query;

    if (error) {
      setTransactions([]);
      setTransactionMessage(error.message);
      setTransactionLoading(false);
      return;
    }

    const rows = (data || []) as PosTransactionOrder[];
    setTransactions(rows);
    setTransactionMessage(
      rows.length === 0 ? "No transactions for this session yet." : "",
    );
    setTransactionLoading(false);
  };

  const openTransactionsModal = async () => {
    setShowTransactionsModal(true);
    await loadTransactions();
  };

  const closeTransactionsModal = () => {
    setShowTransactionsModal(false);
    setTransactionMessage("");
    setTransactionLoading(false);
    setSelectedTransaction(null);
    setSelectedTransactionItems([]);
  };

  const loadTransactionDetails = async (order: PosTransactionOrder) => {
    setSelectedTransaction(order);
    setSelectedTransactionItems([]);
    setTransactionMessage("");

    const { data, error } = await supabase
      .from("pos_order_items")
      .select(
        "id, menu_item_id, item_name, qty, price, total, production_area, production_status",
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (error) {
      setTransactionMessage(error.message);
      return;
    }

    setSelectedTransactionItems((data || []) as PosTransactionItem[]);
  };

  const printTransactionReceipt = (
    order: PosTransactionOrder,
    items: PosTransactionItem[] = selectedTransactionItems,
  ) => {
    if (typeof window === "undefined") return;

    const escapeText = (value: string | number | null | undefined) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const reference = getTransactionReference(order);
    const total = Number(order.total_amount || 0);
    const paid = Number(order.amount_paid || 0);
    const change = Number(order.change_amount || 0);

    const rowsHtml = items
      .map(
        (item) => `
          <div class="row">
            <div>
              <div class="name">${escapeText(item.item_name || "-")}</div>
              <div class="sub">${escapeText(item.qty || 0)} x ${escapeText(peso(Number(item.price || 0)))}</div>
            </div>
            <div class="amount">${escapeText(peso(Number(item.total || 0)))}</div>
          </div>
        `,
      )
      .join("");

    const receiptHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>POS Receipt - ${escapeText(reference)}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Courier New", monospace; }
            body { width: 80mm; }
            .receipt { width: 72mm; margin: 0 auto; padding: 5mm 3mm; font-size: 11px; font-weight: 700; }
            .center { text-align: center; }
            .brand { font-size: 13px; font-weight: 900; }
            .title { margin-top: 2px; font-size: 15px; font-weight: 900; }
            .divider { margin: 7px 0; border-top: 1px dashed #000; }
            .meta { display: grid; grid-template-columns: 23mm 1fr; gap: 2px 3mm; }
            .right { text-align: right; }
            .row { display: grid; grid-template-columns: 1fr 23mm; gap: 2mm; padding: 4px 0; border-bottom: 1px dashed #aaa; }
            .name { font-size: 12px; font-weight: 900; overflow-wrap: anywhere; }
            .sub { margin-top: 1px; font-size: 10px; }
            .amount { text-align: right; font-size: 12px; font-weight: 900; }
            .total { display: flex; justify-content: space-between; margin-top: 4px; font-size: 13px; font-weight: 900; }
            .footer { margin-top: 8px; text-align: center; font-size: 9px; }
            @media screen { body { background: #f3f4f6; } .receipt { margin: 8px auto; border: 1px solid #ccc; } }
          </style>
        </head>
        <body>
          <main class="receipt">
            <div class="center">
              <div class="brand">VINCENT RESORT HOTEL</div>
              <div class="title">POS RECEIPT</div>
            </div>

            <div class="divider"></div>

            <section class="meta">
              <div>REF</div><div class="right">${escapeText(reference)}</div>
              <div>TIME</div><div class="right">${escapeText(formatPosDateTime(order.created_at))}</div>
              <div>CASHIER</div><div class="right">${escapeText(cashierName || "Cashier")}</div>
              <div>TYPE</div><div class="right">${escapeText(order.order_type || "-")}</div>
              <div>PAYMENT</div><div class="right">${escapeText(order.payment_method_name || order.payment_method || "-")}</div>
            </section>

            <div class="divider"></div>

            ${rowsHtml || "<div class='center'>NO ITEMS FOUND</div>"}

            <div class="divider"></div>

            <div class="total"><span>SUBTOTAL</span><span>${escapeText(peso(Number(order.subtotal || 0)))}</span></div>
            <div class="total"><span>SERVICE</span><span>${escapeText(peso(Number(order.service_charge || 0)))}</span></div>
            <div class="total"><span>TOTAL</span><span>${escapeText(peso(total))}</span></div>
            <div class="total"><span>PAID</span><span>${escapeText(peso(paid))}</span></div>
            <div class="total"><span>CHANGE</span><span>${escapeText(peso(change))}</span></div>

            <div class="divider"></div>
            <div class="footer">PRINTED FROM OPSCORE POS</div>
          </main>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDocument) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDocument.open();
    iframeDocument.write(receiptHtml);
    iframeDocument.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1800);
  };

  const requestVoidFromTransaction = (order: PosTransactionOrder) => {
    const status = String(order.status || "").toUpperCase();
    const paymentStatus = String(order.payment_status || "").toUpperCase();

    if (
      paymentStatus !== "PAID" ||
      ["VOIDED", "CANCELLED", "REFUNDED"].includes(status)
    ) {
      setTransactionMessage("Only paid active transactions can request void.");
      return;
    }

    setSelectedVoidOrder({
      id: order.id,
      company_id: order.company_id || null,
      session_id: order.session_id || null,
      cashier_id: order.cashier_id || null,
      order_tag: order.order_tag || null,
      order_number: order.order_number || null,
      receipt_no: order.receipt_no || null,
      order_type: order.order_type || null,
      total_amount: order.total_amount || null,
      payment_method: order.payment_method || null,
      payment_method_name: order.payment_method_name || null,
      payment_status: order.payment_status || null,
      status: order.status || null,
      created_at: order.created_at || null,
    });
    setVoidReason("");
    setVoidMessage("");
    setVoidCandidates([]);
    setShowTransactionsModal(false);
    setShowVoidModal(true);
  };

  const openVoidModal = async () => {
    setOrderMessage("");

    if (!enableVoidApproval) {
      setOrderMessage("Void approval is disabled in POS settings.");
      return;
    }

    if (!activeSession) {
      setOrderMessage("No active cashier session.");
      return;
    }

    setOrderMessage("Open Transactions, select a paid transaction, then tap Request Void.");
    await openTransactionsModal();
  };

  const searchVoidOrders = async () => {
    const term = voidSearch.trim();

    if (!activeSession) {
      setVoidMessage("No active cashier session.");
      return;
    }

    if (!term) {
      setVoidMessage("Enter receipt number, order number, or order tag.");
      return;
    }

    setVoidLoading(true);
    setVoidMessage("");
    setSelectedVoidOrder(null);

    let query = supabase
      .from("pos_orders")
      .select(
        `
        id,
        company_id,
        session_id,
        cashier_id,
        order_tag,
        order_number,
        receipt_no,
        order_type,
        total_amount,
        payment_method,
        payment_method_name,
        payment_status,
        status,
        created_at
      `,
      )
      .eq("payment_status", "PAID")
      .not("status", "in", "(VOIDED,CANCELLED,REFUNDED)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (activeSession.company_id) {
      query = query.eq("company_id", activeSession.company_id);
    } else {
      query = query.is("company_id", null);
    }

    query = query.or(
      `receipt_no.ilike.%${term}%,order_number.ilike.%${term}%,order_tag.ilike.%${term}%`,
    );

    const { data, error } = await query;

    if (error) {
      setVoidCandidates([]);
      setVoidMessage(error.message);
      setVoidLoading(false);
      return;
    }

    const rows = (data || []) as VoidCandidateOrder[];

    setVoidCandidates(rows);
    setVoidMessage(
      rows.length === 0 ? "No paid matching transaction found." : "",
    );
    setVoidLoading(false);
  };

  const requestVoidApproval = async () => {
    if (!selectedVoidOrder) {
      setVoidMessage("Select a paid transaction from Session Audit first.");
      return;
    }

    const reason = voidReason.trim();

    if (!reason) {
      setVoidMessage("Enter void reason.");
      return;
    }

    if (!activeSession) {
      setVoidMessage("No active cashier session.");
      return;
    }

    setVoidLoading(true);
    setVoidMessage("");

    const { data: existingRequest, error: existingError } = await supabase
      .from("pos_voids")
      .select("id,status")
      .eq("order_id", selectedVoidOrder.id)
      .eq("request_type", "ORDER_VOID")
      .in("status", ["PENDING", "APPROVED"])
      .limit(1)
      .maybeSingle();

    if (existingError) {
      setVoidMessage(existingError.message);
      setVoidLoading(false);
      return;
    }

    if (existingRequest) {
      setVoidMessage(
        `Void request already exists with status ${existingRequest.status}.`,
      );
      setVoidLoading(false);
      return;
    }

    const reference =
      selectedVoidOrder.receipt_no ||
      selectedVoidOrder.order_number ||
      selectedVoidOrder.order_tag ||
      selectedVoidOrder.id.slice(0, 8);

    const { error } = await supabase.from("pos_voids").insert({
      company_id: selectedVoidOrder.company_id || activeSession.company_id || null,
      order_id: selectedVoidOrder.id,
      void_reason: reason,
      voided_by: activeSession.opened_by || selectedVoidOrder.cashier_id || null,
      status: "PENDING",
      request_type: "ORDER_VOID",
    });

    if (error) {
      setVoidMessage(error.message);
      setVoidLoading(false);
      return;
    }

    setVoidLoading(false);
    setTransactionMessage(`Void request submitted for ${reference}.`);
    resetVoidState();
    setShowTransactionsModal(true);
  };

  const loadSessionAudit = async () => {
    if (!activeSession) {
      setSessionAuditMessage("No active cashier session.");
      return;
    }

    setSessionAuditLoading(true);
    setSessionAuditMessage("");

    let query = supabase
      .from("pos_orders")
      .select(
        `
        id,
        company_id,
        session_id,
        cashier_id,
        order_tag,
        order_number,
        receipt_no,
        order_type,
        table_no,
        subtotal,
        service_charge,
        total_amount,
        payment_method,
        payment_method_name,
        payment_reference,
        amount_paid,
        change_amount,
        payment_status,
        status,
        created_at
      `,
      )
      .eq("session_id", activeSession.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (activeSession.company_id) {
      query = query.eq("company_id", activeSession.company_id);
    } else {
      query = query.is("company_id", null);
    }

    const { data, error } = await query;

    if (error) {
      setSessionAuditOrders([]);
      setSessionAuditMessage(error.message);
      setSessionAuditLoading(false);
      return;
    }

    const rows = (data || []) as PosTransactionOrder[];
    setSessionAuditOrders(rows);
    setSessionAuditMessage(
      rows.length === 0 ? "No POS transactions found for this session." : "",
    );
    setSessionAuditLoading(false);
  };

  const openSessionAuditModal = async () => {
    setShowSessionAuditModal(true);
    setSessionActualCash("");
    setSessionVarianceReason("");
    await loadSessionAudit();
  };

  const closeSessionAuditModal = () => {
    setShowSessionAuditModal(false);
    setSessionAuditMessage("");
    setSessionAuditLoading(false);
    setSessionActualCash("");
    setSessionVarianceReason("");
  };

  const isActiveSalesOrder = (order: PosTransactionOrder) => {
    const status = String(order.status || "").toUpperCase();
    const paymentStatus = String(order.payment_status || "").toUpperCase();

    return (
      paymentStatus === "PAID" &&
      !["VOIDED", "CANCELLED", "REFUNDED"].includes(status)
    );
  };

  const getPaymentFamily = (order: PosTransactionOrder) => {
    const paymentText = normalizeCode(
      `${order.payment_method || ""} ${order.payment_method_name || ""}`,
    );

    if (paymentText.includes("GCASH")) return "GCASH";
    if (paymentText.includes("BANK")) return "BANK";
    if (paymentText.includes("CARD") || paymentText.includes("TERMINAL"))
      return "TERMINAL";
    if (paymentText.includes("ROOM")) return "ROOM";
    if (paymentText.includes("CASH")) return "CASH";

    return paymentText || "OTHER";
  };

  const sessionAuditSummary = useMemo(() => {
    const activeSales = sessionAuditOrders.filter(isActiveSalesOrder);
    const voidedOrders = sessionAuditOrders.filter(
      (order) =>
        ["VOIDED", "CANCELLED"].includes(
          String(order.status || "").toUpperCase(),
        ) || String(order.payment_status || "").toUpperCase() === "VOIDED",
    );
    const refundedOrders = sessionAuditOrders.filter(
      (order) =>
        String(order.status || "").toUpperCase() === "REFUNDED" ||
        String(order.payment_status || "").toUpperCase() === "REFUNDED",
    );
    const unpaidOrders = sessionAuditOrders.filter(
      (order) => String(order.payment_status || "").toUpperCase() === "UNPAID",
    );

    const sumOrders = (orders: PosTransactionOrder[]) =>
      orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const paymentTotal = (family: string) =>
      activeSales
        .filter((order) => getPaymentFamily(order) === family)
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const cashSales = paymentTotal("CASH");
    const gcashSales = paymentTotal("GCASH");
    const bankSales = paymentTotal("BANK");
    const terminalSales = paymentTotal("TERMINAL");
    const roomChargeSales = paymentTotal("ROOM");
    const otherSales = activeSales
      .filter(
        (order) =>
          !["CASH", "GCASH", "BANK", "TERMINAL", "ROOM"].includes(
            getPaymentFamily(order),
          ),
      )
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const openingCash = Number(activeSession?.opening_cash || 0);
    const grossSales = sumOrders(activeSales);
    const voidAmount = sumOrders(voidedOrders);
    const refundAmount = sumOrders(refundedOrders);
    const unpaidAmount = sumOrders(unpaidOrders);
    const expectedCash = openingCash + cashSales;
    const actualCash = Number(sessionActualCash || 0);
    const variance = sessionActualCash === "" ? 0 : actualCash - expectedCash;

    return {
      activeSalesCount: activeSales.length,
      totalOrders: sessionAuditOrders.length,
      grossSales,
      cashSales,
      gcashSales,
      bankSales,
      terminalSales,
      roomChargeSales,
      otherSales,
      voidCount: voidedOrders.length,
      voidAmount,
      refundCount: refundedOrders.length,
      refundAmount,
      unpaidCount: unpaidOrders.length,
      unpaidAmount,
      openingCash,
      expectedCash,
      actualCash,
      variance,
    };
  }, [sessionAuditOrders, activeSession?.opening_cash, sessionActualCash]);

  const printSessionAuditSummary = () => {
    if (typeof window === "undefined") return;

    const escapeText = (value: string | number | null | undefined) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const summary = sessionAuditSummary;
    const printedAt = new Date().toLocaleString("en-PH", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>POS Session Audit</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Courier New", monospace; }
            body { width: 80mm; }
            .receipt { width: 72mm; margin: 0 auto; padding: 5mm 3mm; font-size: 11px; font-weight: 700; }
            .center { text-align: center; }
            .brand { font-size: 13px; font-weight: 900; }
            .title { margin-top: 2px; font-size: 15px; font-weight: 900; }
            .divider { margin: 7px 0; border-top: 1px dashed #000; }
            .row { display: flex; justify-content: space-between; gap: 4mm; padding: 2px 0; }
            .strong { font-size: 13px; font-weight: 900; }
            .footer { margin-top: 8px; text-align: center; font-size: 9px; }
          </style>
        </head>
        <body>
          <main class="receipt">
            <div class="center">
              <div class="brand">VINCENT RESORT HOTEL</div>
              <div class="title">POS SESSION AUDIT</div>
            </div>
            <div class="divider"></div>
            <div class="row"><span>CASHIER</span><span>${escapeText(cashierName)}</span></div>
            <div class="row"><span>PRINTED</span><span>${escapeText(printedAt)}</span></div>
            <div class="divider"></div>
            <div class="row"><span>ORDERS</span><span>${escapeText(summary.totalOrders)}</span></div>
            <div class="row"><span>PAID SALES</span><span>${escapeText(summary.activeSalesCount)}</span></div>
            <div class="row strong"><span>GROSS SALES</span><span>${escapeText(peso(summary.grossSales))}</span></div>
            <div class="divider"></div>
            <div class="row"><span>CASH SALES</span><span>${escapeText(peso(summary.cashSales))}</span></div>
            <div class="row"><span>GCASH</span><span>${escapeText(peso(summary.gcashSales))}</span></div>
            <div class="row"><span>BANK</span><span>${escapeText(peso(summary.bankSales))}</span></div>
            <div class="row"><span>TERMINAL</span><span>${escapeText(peso(summary.terminalSales))}</span></div>
            <div class="row"><span>ROOM/OTHER</span><span>${escapeText(peso(summary.roomChargeSales + summary.otherSales))}</span></div>
            <div class="divider"></div>
            <div class="row"><span>OPENING CASH</span><span>${escapeText(peso(summary.openingCash))}</span></div>
            <div class="row strong"><span>EXPECTED CASH</span><span>${escapeText(peso(summary.expectedCash))}</span></div>
            <div class="row"><span>ACTUAL CASH</span><span>${escapeText(sessionActualCash === "" ? "-" : peso(summary.actualCash))}</span></div>
            <div class="row"><span>VARIANCE</span><span>${escapeText(sessionActualCash === "" ? "-" : peso(summary.variance))}</span></div>
            ${sessionVarianceReason.trim() ? `<div class="divider"></div><div>VARIANCE REASON:</div><div>${escapeText(sessionVarianceReason.trim())}</div>` : ""}
            <div class="divider"></div>
            <div class="row"><span>VOIDS</span><span>${escapeText(summary.voidCount)} / ${escapeText(peso(summary.voidAmount))}</span></div>
            <div class="row"><span>REFUNDS</span><span>${escapeText(summary.refundCount)} / ${escapeText(peso(summary.refundAmount))}</span></div>
            <div class="row"><span>UNPAID</span><span>${escapeText(summary.unpaidCount)} / ${escapeText(peso(summary.unpaidAmount))}</span></div>
            <div class="divider"></div>
            <div class="footer">PRINTED FROM OPSCORE POS</div>
          </main>
          <script>window.onload = function () { window.focus(); window.print(); };</script>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDocument) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDocument.open();
    iframeDocument.write(html);
    iframeDocument.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1800);
  };

  const quickCashPayment = () => {
    setOrderMessage("");

    if (!activeSession) {
      setOrderMessage("No active cashier session.");
      return;
    }

    if (cart.length === 0) {
      setOrderMessage("Cart is empty.");
      return;
    }

    if (!selectedOrderType) {
      setOrderMessage("Select order type.");
      return;
    }

    if (enableTableTracking && requireTableForDineIn && !selectedTable) {
      setOrderMessage("Select table before payment.");
      return;
    }

    const cashMethod =
      paymentMethods.find((method) =>
        normalizeCode(`${method.code} ${method.name}`).includes("CASH"),
      ) || paymentMethods[0];

    if (!cashMethod) {
      setOrderMessage("No payment method configured.");
      return;
    }

    setSelectedPaymentMethodCode(cashMethod.code);
    setAmountPaid(String(Number(grandTotal || 0).toFixed(2)));
    setPaymentReference("");
    setShowPaymentModal(true);
  };

  const openPaymentModal = () => {
    setOrderMessage("");

    if (!activeSession) {
      setOrderMessage("No active cashier session.");
      return;
    }

    if (cart.length === 0) {
      setOrderMessage("Cart is empty.");
      return;
    }

    if (!selectedOrderType) {
      setOrderMessage("Select order type.");
      return;
    }

    if (enableTableTracking && requireTableForDineIn && !selectedTable) {
      setOrderMessage("Select table before payment.");
      return;
    }

    const defaultPayment =
      selectedPaymentMethodCode || paymentMethods[0]?.code || "";

    setSelectedPaymentMethodCode(defaultPayment);
    setAmountPaid("");
    setPaymentReference("");
    setShowPaymentModal(true);
  };

  const addQuickAmount = (value: number) => {
    setAmountPaid((current) => String(Number(current || 0) + value));
  };

  const setExactAmount = () => {
    setAmountPaid(String(Number(grandTotal || 0).toFixed(2)));
  };

  const pressKeypad = (key: string) => {
    setAmountPaid((current) => {
      if (key === "C") return "";
      if (key === "BACK") return current.slice(0, -1);
      if (key === "." && current.includes(".")) return current;
      if (key === "." && !current) return "0.";
      return `${current}${key}`;
    });
  };

  const confirmPayment = async (printAfterSave = false) => {
    setOrderMessage("");

    if (!activeSession) {
      setOrderMessage("No active cashier session.");
      return;
    }

    if (cart.length === 0) {
      setOrderMessage("Cart is empty.");
      return;
    }

    if (!selectedOrderType) {
      setOrderMessage("Select order type.");
      return;
    }

    if (enableTableTracking && requireTableForDineIn && !selectedTable) {
      setOrderMessage("Select table before submitting order.");
      return;
    }

    if (!selectedPaymentMethod) {
      setOrderMessage("Select payment method.");
      return;
    }

    if (amountPaidValue < grandTotal) {
      setOrderMessage("Insufficient payment amount.");
      return;
    }

    setOrderLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from("pos_orders")
      .insert({
        company_id: activeSession.company_id,
        session_id: activeSession.id,
        cashier_id: activeSession.opened_by,
        table_no: enableTableTracking
          ? selectedTable?.table_name || null
          : null,
        order_type: selectedOrderType.code,
        subtotal,
        service_charge: serviceCharge,
        total_amount: grandTotal,
        payment_method: selectedPaymentMethod.code,
        payment_method_name: selectedPaymentMethod.name,
        amount_paid: amountPaidValue,
        change_amount: changeAmount,
        payment_reference: paymentReference.trim() || null,
        payment_status: "PAID",
        production_status:
          enableProductionRouting && productionRequiredCount > 0
            ? "PENDING"
            : "COMPLETED",
        status: "COMPLETED",
      })
      .select("id")
      .single();

    if (orderError || !orderData) {
      setOrderLoading(false);
      setOrderMessage(orderError?.message || "Failed to create order.");
      return;
    }

    const itemsError = await insertOrderItemsWithModifiers(
      orderData.id,
      cart,
      false,
    );

    if (itemsError) {
      setOrderLoading(false);
      setOrderMessage(itemsError.message);
      return;
    }

    if (printAfterSave) {
      window.print();
    }

    setCart([]);
    resetPaymentState();
    setOrderMessage("Payment confirmed.");
    setOrderLoading(false);
  };

  if (sessionLoading) {
    return (
      <PageGuard moduleKey="pos_terminal">
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="rounded-3xl border border-blue-300/10 bg-slate-900 p-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
              OPSCORE POS
            </p>
            <h1 className="mt-3 text-2xl font-black">Checking Session...</h1>
          </div>
        </div>
      </PageGuard>
    );
  }

  if (!activeSession) {
    return (
      <PageGuard moduleKey="pos_terminal">
        <div className="flex min-h-screen bg-slate-950 text-white">
          <Sidebar />

          <main className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md rounded-[2rem] border border-blue-300/10 bg-slate-900 p-8 shadow-2xl shadow-black/40">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
                OPSCORE POS
              </p>

              <h1 className="mt-3 text-3xl font-black">Cashier Login</h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter cashier PIN and opening cash to unlock POS terminal.
              </p>

              {sessionMessage && (
                <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm font-bold text-amber-200">
                  {sessionMessage}
                </div>
              )}

              <div className="mt-6 space-y-4">
                <input
                  type="password"
                  value={sessionPin}
                  onChange={(e) => setSessionPin(e.target.value)}
                  placeholder="Cashier PIN"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none focus:border-blue-300"
                />

                <input
                  type="number"
                  value={sessionOpeningCash}
                  onChange={(e) => setSessionOpeningCash(e.target.value)}
                  placeholder="Opening cash"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none focus:border-blue-300"
                />

                <button
                  onClick={startTerminalSession}
                  disabled={sessionActionLoading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-4 font-black text-white hover:bg-blue-500 disabled:opacity-40"
                >
                  Login & Start POS
                </button>
              </div>
            </div>
          </main>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard moduleKey="pos_terminal">
      <div className="min-h-screen bg-[#05080d] text-white">
        {sidebarOpen && (
          <div className="fixed inset-0 z-[9999] flex bg-black/75 backdrop-blur-sm">
            <div className="h-full w-[280px] overflow-hidden">
              <Sidebar />
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex-1"
              aria-label="Close navigation"
            />
          </div>
        )}

        <main className="h-screen overflow-hidden p-1">
          <section className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-1">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-[#070b10] p-2 shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <div className="mb-1.5 flex items-center gap-3 border-b border-white/10 pb-1.5">
                <div className="min-w-[210px] border-r border-white/20 pr-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Cashier
                  </p>
                  <p className="truncate text-[18px] font-black leading-tight text-white">
                    {cashierName}
                  </p>
                </div>

                <select
                  value={selectedOrderTypeCode}
                  onChange={(e) => setSelectedOrderTypeCode(e.target.value)}
                  className="h-11 min-w-[170px] rounded-xl border border-white/25 bg-[#0b1017] px-4 text-[14px] font-black uppercase text-white outline-none shadow-lg shadow-black/25 transition focus:border-[#f5c400]"
                >
                  {orderTypes.map((item) => (
                    <option key={item.id} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>

                {enableTableTracking && (
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="h-11 min-w-[135px] rounded-xl border border-white/20 bg-[#0b1017] px-3 text-[12px] font-black uppercase text-white outline-none transition focus:border-[#f5c400]"
                  >
                    <option value="">Select Table</option>
                    {tables.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.table_name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="ml-auto min-w-[170px] text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    Total
                  </p>
                  <p className="text-[25px] font-black leading-none text-[#f5c400]">
                    {peso(grandTotal)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSearch((value) => !value);
                    if (showSearch) setSearch("");
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                    showSearch
                      ? "border-[#f5c400] bg-[#f5c400] text-black"
                      : "border-white/15 bg-transparent text-white hover:border-white/35 hover:bg-white/5"
                  }`}
                  title="Search"
                >
                  {showSearch ? <X size={18} /> : <Search size={18} />}
                </button>

                <button
                  onClick={loadTerminalData}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-transparent text-white transition hover:border-white/35 hover:bg-white/5"
                  title="Refresh"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {showSearch && (
                <div className="mb-1.5">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-3 text-slate-500"
                    />
                    <input
                      autoFocus
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search item..."
                      className="h-10 w-full rounded-xl bg-[#0d1219] px-3 pl-9 text-[11px] font-semibold text-white outline-none ring-1 ring-white/15 transition placeholder:text-slate-500 focus:ring-amber-400/50"
                    />
                  </div>
                </div>
              )}

              <div className="mb-1 grid grid-cols-4 gap-1">
                {menuGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedMenuGroupId(group.id);
                      setSearch("");
                    }}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-[14px] font-black uppercase tracking-wide shadow-lg transition active:scale-[0.98] ${
                      selectedMenuGroupId === group.id
                        ? "border-white/25 bg-[#232323] text-white shadow-black/40 ring-1 ring-white/15"
                        : "border-white/10 bg-[#202020] text-white shadow-black/30 hover:border-white/25 hover:bg-[#2b2b2b]"
                    }`}
                  >
                    <span>{group.icon || "•"}</span>
                    {group.name}
                  </button>
                ))}
              </div>

              <div className="mb-1 flex h-12 items-center gap-2 overflow-x-auto border-b border-white/10 pb-1">
                {modeCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`h-10 min-w-[132px] shrink-0 rounded-xl border px-4 text-[12px] font-black uppercase tracking-wide transition active:scale-[0.98] ${
                      selectedCategory === category.id
                        ? "border-white/25 bg-[#242424] text-white shadow-sm shadow-black/30 ring-1 ring-white/10"
                        : "border-white/15 bg-[#101620] text-slate-300 hover:border-white/35 hover:bg-[#171f2a] hover:text-white"
                    }`}
                    title={category.name}
                  >
                    {category.short_name || category.name}
                  </button>
                ))}
              </div>

              <div className="mb-0.5 flex items-center justify-between px-1">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                  {filteredProducts.length} items
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex h-full items-center justify-center rounded-xl bg-[#101620] text-sm font-semibold text-slate-500 ring-1 ring-white/10">
                    Loading POS products...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl bg-[#101620] text-sm font-semibold text-slate-500 ring-1 ring-white/10">
                    No products found.
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-1">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="group overflow-hidden rounded-lg border border-white/10 bg-[#111820] text-left shadow-md shadow-black/30 transition hover:border-[#f5c400]/60 active:scale-[0.98]"
                      >
                        <div className="relative h-[70px] overflow-hidden bg-[#070b10]">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#202936] to-[#0d1219] text-3xl">
                              {getProductVisual(product)}
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                          {product.is_best_seller && (
                            <div className="absolute left-0 top-0 rounded-br-md bg-amber-400 px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
                              ★ BEST
                            </div>
                          )}

                          {!product.is_best_seller && product.is_new && (
                            <div className="absolute right-0 top-0 rounded-bl-md bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                              NEW
                            </div>
                          )}

                          {!product.is_best_seller &&
                            !product.is_new &&
                            product.is_hot && (
                              <div className="absolute right-0 top-0 rounded-bl-md bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                                HOT
                              </div>
                            )}

                          {product.setup_pack_id && (
                            <div className="absolute bottom-0 right-0 rounded-tl-md bg-[#f5c400] px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
                              OPTIONS
                            </div>
                          )}
                        </div>

                        <div className="flex min-h-[42px] flex-col justify-between px-2 py-1.5">
                          <p className="line-clamp-2 min-h-[29px] text-[12px] font-black leading-[14px] tracking-[-0.02em] text-white">
                            {product.name}
                          </p>

                          <p className="text-[11px] font-black leading-none text-amber-400">
                            {peso(Number(product.price || 0))}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1.5">
                <button
                  onClick={quickCashPayment}
                  disabled={cart.length === 0 || orderLoading}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 text-[13px] font-black text-white shadow-lg shadow-emerald-950/30 transition active:scale-[0.98] disabled:opacity-40"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-base text-white ring-1 ring-white/15">
                    ₱
                  </span>
                  Quick Cash
                </button>

                <button
                  disabled={!enableCashDrawer}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent text-[13px] font-black text-slate-300 transition hover:border-white/30 hover:bg-white/5 disabled:opacity-40"
                >
                  <CreditCard size={15} />
                  Drawer
                </button>

                <button
                  disabled={!enableHoldOrders}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent text-[13px] font-black text-slate-300 transition hover:border-white/30 hover:bg-white/5 disabled:opacity-40"
                >
                  <Clock3 size={15} />
                  Hold
                </button>

                <a
                  href="/pos/parked-orders"
                  onClick={(event) => {
                    event.preventDefault();
                    goToParkedOrders();
                  }}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 text-[13px] font-black text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-500/20 active:scale-[0.98]"
                >
                  <Undo2 size={15} />
                  Recall
                </a>

                <button
                  onClick={openTransactionsModal}
                  disabled={orderLoading}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/10 text-[13px] font-black text-sky-200 transition hover:border-sky-300/60 hover:bg-sky-500/20 active:scale-[0.98] disabled:opacity-40"
                >
                  <ReceiptText size={15} />
                  Transactions
                </button>

                <button
                  onClick={openSessionAuditModal}
                  disabled={orderLoading}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/10 text-[13px] font-black text-violet-200 transition hover:border-violet-300/60 hover:bg-violet-500/20 active:scale-[0.98] disabled:opacity-40"
                >
                  <Banknote size={15} />
                  Session Audit
                </button>

                <button
                  onClick={openVoidModal}
                  disabled={!enableVoidApproval || orderLoading}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 text-[13px] font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                >
                  <Trash2 size={15} />
                  Void
                </button>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-[#0b1017] shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <div className="shrink-0 border-b border-white/10 px-3 py-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ReceiptText size={14} className="text-amber-300" />
                    <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {loadedParkedOrderTag
                        ? `RECALL: ${loadedParkedOrderTag}`
                        : enableTableTracking
                          ? selectedTable?.table_name || "No Table"
                          : selectedOrderType?.name || "Order"}
                    </p>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-white/10">
                      {totalItems} item(s)
                    </span>
                  </div>

                  <button
                    onClick={clearCart}
                    disabled={cart.length === 0}
                    className="rounded-xl bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-300 ring-1 ring-red-400/25 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-0.5">
                {cart.length === 0 ? (
                  <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 p-5 text-center">
                    <ShoppingBag size={36} className="mb-4 text-slate-600" />
                    <p className="text-sm font-black uppercase tracking-wide text-slate-300">
                      Ready for Order
                    </p>
                    <p className="mt-2 max-w-[180px] text-[11px] font-semibold leading-5 text-slate-500">
                      Tap a menu item to start transaction.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {cart.map((item) => (
                      <div key={item.cart_key || item.id} className="py-1">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-black leading-[15px] text-white">
                              {item.name}
                            </p>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="mt-0.5 space-y-0.5">
                                {item.modifiers.flatMap((modifier) =>
                                  modifier.choices.map((choice) => (
                                    <p
                                      key={`${modifier.group_id}-${choice.option_id}`}
                                      className="truncate text-[9px] font-bold leading-[11px] text-amber-200/90"
                                    >
                                      • {modifier.group_name}: {choice.option_name}
                                      {Number(choice.price_adjustment || 0) !== 0
                                        ? ` (${peso(Number(choice.price_adjustment || 0))})`
                                        : ""}
                                    </p>
                                  )),
                                )}
                              </div>
                            )}
                            <p className="truncate text-[10px] font-semibold leading-[13px] text-slate-500">
                              {item.qty} × {peso(Number(item.price || 0))}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <p className="min-w-[66px] text-right text-[11px] font-black leading-4 text-white">
                              {peso(Number(item.price || 0) * item.qty)}
                            </p>

                            <button
                              onClick={() => decreaseQty(item.cart_key || item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111821] text-slate-300 ring-1 ring-white/10 transition hover:bg-[#17202b]"
                            >
                              <Minus size={13} />
                            </button>

                            <button
                              onClick={() => increaseQty(item.cart_key || item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-black transition hover:bg-amber-400"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 p-1.5 ring-1 ring-white/10">
                <div className="rounded-xl bg-[#101620] px-3 py-1 ring-1 ring-white/10">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
                    <span className="truncate">Subtotal: {peso(subtotal)}</span>
                    <span className="shrink-0">SC: {peso(serviceCharge)}</span>
                  </div>
                </div>

                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  <button
                    disabled
                    className="flex h-7 items-center justify-center rounded-xl bg-[#101620] text-[10px] font-black text-slate-400 ring-1 ring-white/10"
                  >
                    Disc
                  </button>

                  <button
                    disabled
                    className="flex h-7 items-center justify-center rounded-xl bg-[#101620] text-[10px] font-black text-slate-400 ring-1 ring-white/10"
                  >
                    Promo
                  </button>

                  <button
                    disabled
                    className="flex h-7 items-center justify-center rounded-xl bg-[#101620] text-[10px] font-black text-slate-400 ring-1 ring-white/10"
                  >
                    Notes
                  </button>
                </div>

                {orderMessage && (
                  <div className="mt-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-200">
                    {orderMessage}
                  </div>
                )}

                <button
                  onClick={openPaymentModal}
                  disabled={cart.length === 0 || orderLoading}
                  className="mt-1.5 h-14 w-full rounded-xl bg-emerald-500 text-[18px] font-black uppercase tracking-wide text-white shadow-xl shadow-emerald-950/40 transition hover:bg-emerald-400 active:scale-[0.99] disabled:bg-emerald-500/40 disabled:text-white/50"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Banknote size={21} />
                    PAY ORDER
                  </span>
                </button>

                {hasProductionItems ? (
                  <button
                    onClick={() => openOrderTagModal("KITCHEN")}
                    disabled={cart.length === 0 || orderLoading}
                    className="mt-1.5 h-14 w-full rounded-xl bg-[#f5c400] text-[17px] font-black tracking-wide text-black shadow-xl shadow-yellow-950/40 transition hover:bg-[#ffd21f] active:scale-[0.99] disabled:bg-[#f5c400]/45 disabled:text-black/70"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Printer size={21} />
                      SEND ORDER
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => openOrderTagModal("PARK")}
                    disabled={cart.length === 0 || orderLoading}
                    className="mt-1.5 h-14 w-full rounded-xl bg-[#f5c400] text-[18px] font-black tracking-wide text-black shadow-xl shadow-yellow-950/40 transition hover:bg-[#ffd21f] active:scale-[0.99] disabled:bg-[#f5c400]/45 disabled:text-black/70"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Tag size={21} />
                      PARK ORDER
                    </span>
                  </button>
                )}
              </div>
            </aside>
          </section>
        </main>

        {showSessionAuditModal && (
          <div className="fixed inset-0 z-[10053] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="grid max-h-[90vh] w-full max-w-6xl grid-cols-[minmax(0,1fr)_360px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#080d14] shadow-2xl shadow-black">
              <section className="flex min-h-0 flex-col border-r border-white/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-300">
                      POS Session Audit
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white">
                      Remittance Summary
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                      Use this before remittance to verify sales by payment
                      method, voids, refunds, and expected cash.
                    </p>
                  </div>

                  <button
                    onClick={closeSessionAuditModal}
                    disabled={sessionAuditLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <X size={18} />
                  </button>
                </div>

                {sessionAuditMessage && (
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
                    {sessionAuditMessage}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Gross Sales
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#f5c400]">
                      {peso(sessionAuditSummary.grossSales)}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                      {sessionAuditSummary.activeSalesCount} paid sale(s)
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Cash Sales
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-200">
                      {peso(sessionAuditSummary.cashSales)}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                      Cash only
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Online / Terminal
                    </p>
                    <p className="mt-2 text-2xl font-black text-sky-200">
                      {peso(
                        sessionAuditSummary.gcashSales +
                          sessionAuditSummary.bankSales +
                          sessionAuditSummary.terminalSales,
                      )}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                      GCash / Bank / Card
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Expected Cash
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {peso(sessionAuditSummary.expectedCash)}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                      Opening + cash sales
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Payment Breakdown
                    </p>
                    <div className="mt-3 space-y-2 text-sm font-bold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cash</span>
                        <span className="text-white">
                          {peso(sessionAuditSummary.cashSales)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">GCash</span>
                        <span className="text-white">
                          {peso(sessionAuditSummary.gcashSales)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bank</span>
                        <span className="text-white">
                          {peso(sessionAuditSummary.bankSales)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Terminal / Card</span>
                        <span className="text-white">
                          {peso(sessionAuditSummary.terminalSales)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Room / Other</span>
                        <span className="text-white">
                          {peso(
                            sessionAuditSummary.roomChargeSales +
                              sessionAuditSummary.otherSales,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Exceptions
                    </p>
                    <div className="mt-3 space-y-2 text-sm font-bold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Void Transactions
                        </span>
                        <span className="text-red-200">
                          {sessionAuditSummary.voidCount} /{" "}
                          {peso(sessionAuditSummary.voidAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Refunds</span>
                        <span className="text-orange-200">
                          {sessionAuditSummary.refundCount} /{" "}
                          {peso(sessionAuditSummary.refundAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Unpaid / Parked</span>
                        <span className="text-amber-200">
                          {sessionAuditSummary.unpaidCount} /{" "}
                          {peso(sessionAuditSummary.unpaidAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Orders</span>
                        <span className="text-white">
                          {sessionAuditSummary.totalOrders}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Session Transactions
                    </p>
                    <button
                      onClick={loadSessionAudit}
                      disabled={sessionAuditLoading}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                    >
                      {sessionAuditLoading ? "Refreshing" : "Refresh"}
                    </button>
                  </div>

                  <div className="max-h-[28vh] overflow-y-auto divide-y divide-white/10">
                    {sessionAuditOrders.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                        No session transactions found.
                      </div>
                    ) : (
                      sessionAuditOrders.slice(0, 80).map((order) => (
                        <div
                          key={order.id}
                          className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-black text-white">
                              {getTransactionReference(order)}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                              {formatPosDateTime(order.created_at)} •{" "}
                              {order.payment_method_name ||
                                order.payment_method ||
                                "-"}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                            {order.status || order.payment_status || "-"}
                          </span>
                          <p className="text-right font-black text-slate-100">
                            {peso(Number(order.total_amount || 0))}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className="flex min-h-0 flex-col p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Cash Count
                </p>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                    <span>Opening Cash</span>
                    <span className="text-white">
                      {peso(sessionAuditSummary.openingCash)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm font-bold text-slate-400">
                    <span>Cash Sales</span>
                    <span className="text-white">
                      {peso(sessionAuditSummary.cashSales)}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-dashed border-white/15 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-white">
                        Expected Cash
                      </span>
                      <span className="text-xl font-black text-[#f5c400]">
                        {peso(sessionAuditSummary.expectedCash)}
                      </span>
                    </div>
                  </div>
                </div>

                <label className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Actual Cash Count
                </label>
                <input
                  type="number"
                  value={sessionActualCash}
                  onChange={(event) => setSessionActualCash(event.target.value)}
                  placeholder="Enter counted cash"
                  className="mt-2 h-13 min-h-[52px] rounded-xl border border-white/10 bg-[#05080d] px-4 text-xl font-black text-white outline-none placeholder:text-slate-700 focus:border-violet-300/50"
                />

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Variance
                  </p>
                  <p
                    className={`mt-2 text-3xl font-black ${sessionActualCash === "" ? "text-slate-500" : Math.abs(sessionAuditSummary.variance) < 0.01 ? "text-emerald-200" : "text-red-200"}`}
                  >
                    {sessionActualCash === ""
                      ? "-"
                      : peso(sessionAuditSummary.variance)}
                  </p>
                </div>

                {sessionActualCash !== "" &&
                  Math.abs(sessionAuditSummary.variance) >= 0.01 && (
                    <div className="mt-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
                        Variance Reason
                      </label>
                      <textarea
                        value={sessionVarianceReason}
                        onChange={(event) =>
                          setSessionVarianceReason(event.target.value)
                        }
                        placeholder="Required if cash count has variance..."
                        className="mt-2 min-h-[130px] w-full rounded-xl border border-red-400/30 bg-[#05080d] p-4 text-sm font-semibold text-white outline-none placeholder:text-slate-700 focus:border-red-300/60"
                      />
                    </div>
                  )}

                <div className="mt-auto space-y-2 pt-5">
                  <button
                    onClick={printSessionAuditSummary}
                    disabled={
                      sessionAuditLoading ||
                      (sessionActualCash !== "" &&
                        Math.abs(sessionAuditSummary.variance) >= 0.01 &&
                        !sessionVarianceReason.trim())
                    }
                    className="h-13 min-h-[52px] w-full rounded-xl bg-violet-500 text-sm font-black uppercase text-white transition hover:bg-violet-400 disabled:bg-violet-500/40 disabled:text-white/50"
                  >
                    Print Session Summary
                  </button>

                  <button
                    onClick={openTransactionsModal}
                    disabled={sessionAuditLoading}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-sm font-black uppercase text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    View Transactions
                  </button>

                  <button
                    onClick={closeSessionAuditModal}
                    disabled={sessionAuditLoading}
                    className="h-11 w-full rounded-xl border border-white/10 bg-transparent text-sm font-black uppercase text-slate-400 transition hover:bg-white/5 disabled:opacity-40"
                  >
                    Close
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {showTransactionsModal && (
          <div className="fixed inset-0 z-[10053] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="grid max-h-[88vh] w-full max-w-6xl grid-cols-[minmax(0,1fr)_380px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#080d14] shadow-2xl shadow-black">
              <section className="flex min-h-0 flex-col border-r border-white/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
                      POS Transactions
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white">
                      Session Audit
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                      Review paid transactions before remittance. Open a row to
                      view items, print receipt, or request void approval.
                    </p>
                  </div>

                  <button
                    onClick={closeTransactionsModal}
                    disabled={transactionLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Current Session
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {cashierName} • {transactions.length} transaction(s)
                    </p>
                  </div>

                  <button
                    onClick={loadTransactions}
                    disabled={transactionLoading}
                    className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>

                {transactionMessage && (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
                    {transactionMessage}
                  </div>
                )}

                <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="grid grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <span>Reference</span>
                    <span>Time</span>
                    <span>Payment</span>
                    <span className="text-right">Amount</span>
                    <span>Status</span>
                  </div>

                  <div className="max-h-[58vh] overflow-y-auto divide-y divide-white/10">
                    {transactionLoading ? (
                      <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                        Loading transactions...
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                        No transactions found.
                      </div>
                    ) : (
                      transactions.map((order) => {
                        const selected = selectedTransaction?.id === order.id;
                        const status = String(order.status || "").toUpperCase();
                        const paymentStatus = String(
                          order.payment_status || "",
                        ).toUpperCase();

                        return (
                          <button
                            key={order.id}
                            onClick={() => loadTransactionDetails(order)}
                            className={`grid w-full grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_0.7fr] gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] ${
                              selected ? "bg-sky-500/10" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-white">
                                {getTransactionReference(order)}
                              </p>
                              <p className="mt-1 truncate text-[10px] font-bold uppercase text-slate-500">
                                {order.order_type || "ORDER"}{" "}
                                {order.table_no ? `• ${order.table_no}` : ""}
                              </p>
                            </div>

                            <p className="text-xs font-bold text-slate-300">
                              {formatPosDateTime(order.created_at)}
                            </p>

                            <p className="truncate text-xs font-black text-slate-300">
                              {order.payment_method_name ||
                                order.payment_method ||
                                "-"}
                            </p>

                            <p className="text-right text-sm font-black text-[#f5c400]">
                              {peso(Number(order.total_amount || 0))}
                            </p>

                            <div className="flex flex-col gap-1">
                              <span
                                className={`w-fit rounded-full px-2 py-1 text-[9px] font-black uppercase ring-1 ${
                                  paymentStatus === "PAID"
                                    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25"
                                    : "bg-amber-500/10 text-amber-300 ring-amber-400/25"
                                }`}
                              >
                                {order.payment_status || "-"}
                              </span>
                              <span
                                className={`w-fit rounded-full px-2 py-1 text-[9px] font-black uppercase ring-1 ${
                                  ["VOIDED", "CANCELLED", "REFUNDED"].includes(
                                    status,
                                  )
                                    ? "bg-red-500/10 text-red-300 ring-red-400/25"
                                    : "bg-white/5 text-slate-400 ring-white/10"
                                }`}
                              >
                                {order.status || "-"}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              <section className="flex min-h-0 flex-col p-5">
                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Transaction Detail
                  </p>

                  {selectedTransaction ? (
                    <>
                      <h3 className="mt-2 text-2xl font-black text-white">
                        {getTransactionReference(selectedTransaction)}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-400">
                        {formatPosDateTime(selectedTransaction.created_at)}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                          <p className="text-[9px] font-black uppercase text-slate-500">
                            Total
                          </p>
                          <p className="mt-1 text-lg font-black text-[#f5c400]">
                            {peso(
                              Number(selectedTransaction.total_amount || 0),
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                          <p className="text-[9px] font-black uppercase text-slate-500">
                            Payment
                          </p>
                          <p className="mt-1 truncate text-sm font-black text-white">
                            {selectedTransaction.payment_method_name ||
                              selectedTransaction.payment_method ||
                              "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            printTransactionReceipt(
                              selectedTransaction,
                              selectedTransactionItems,
                            )
                          }
                          className="h-11 rounded-xl border border-amber-400/40 bg-amber-400 text-xs font-black uppercase text-black transition hover:bg-amber-300"
                        >
                          Reprint
                        </button>

                        <button
                          onClick={() => requestVoidFromTransaction(selectedTransaction)}
                          disabled={
                            String(
                              selectedTransaction.payment_status || "",
                            ).toUpperCase() !== "PAID" ||
                            ["VOIDED", "CANCELLED", "REFUNDED"].includes(
                              String(
                                selectedTransaction.status || "",
                              ).toUpperCase(),
                            )
                          }
                          className="h-11 rounded-xl border border-red-400/40 bg-red-500 text-xs font-black uppercase text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-500/30 disabled:text-white/50"
                        >
                          Request Void
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
                      Select a transaction from the table to view full order
                      details.
                    </p>
                  )}
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Items
                    </p>
                  </div>

                  <div className="max-h-[40vh] overflow-y-auto divide-y divide-white/10">
                    {!selectedTransaction ? (
                      <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                        No transaction selected.
                      </div>
                    ) : selectedTransactionItems.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                        No items loaded.
                      </div>
                    ) : (
                      selectedTransactionItems.map((item, index) => (
                        <div
                          key={`${item.menu_item_id || item.item_name}-${index}`}
                          className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">
                              {item.item_name || "-"}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                              {item.qty || 0} x {peso(Number(item.price || 0))}
                              {item.production_status
                                ? ` • ${item.production_status}`
                                : ""}
                            </p>
                          </div>

                          <p className="text-sm font-black text-slate-200">
                            {peso(Number(item.total || 0))}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {selectedTransaction && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        printTransactionReceipt(
                          selectedTransaction,
                          selectedTransactionItems,
                        )
                      }
                      className="h-12 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase text-slate-100 transition hover:bg-white/10"
                    >
                      Print Receipt
                    </button>

                    <button
                      onClick={() =>
                        requestVoidFromTransaction(selectedTransaction)
                      }
                      disabled={
                        String(
                          selectedTransaction.payment_status || "",
                        ).toUpperCase() !== "PAID" ||
                        ["VOIDED", "CANCELLED", "REFUNDED"].includes(
                          String(
                            selectedTransaction.status || "",
                          ).toUpperCase(),
                        )
                      }
                      className="h-12 rounded-xl border border-red-400/40 bg-red-500/10 text-xs font-black uppercase text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      Request Void
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {showVoidModal && (
          <div className="fixed inset-0 z-[10054] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="grid max-h-[88vh] w-full max-w-3xl grid-cols-[minmax(0,1fr)_320px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#080d14] shadow-2xl shadow-black">
              <section className="flex min-h-0 flex-col border-r border-white/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">
                      POS Void Approval
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white">
                      Request Void
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                      This request is linked to the selected Session Audit
                      transaction. Cashier does not need to type or remember a
                      receipt number.
                    </p>
                  </div>

                  <button
                    onClick={resetVoidState}
                    disabled={voidLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <X size={18} />
                  </button>
                </div>

                {voidMessage && (
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
                    {voidMessage}
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Selected Transaction
                  </p>

                  {selectedVoidOrder ? (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-2xl font-black text-white">
                          {selectedVoidOrder.receipt_no ||
                            selectedVoidOrder.order_number ||
                            selectedVoidOrder.order_tag ||
                            selectedVoidOrder.id.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                          {selectedVoidOrder.order_type || "ORDER"} • {" "}
                          {selectedVoidOrder.payment_method_name ||
                            selectedVoidOrder.payment_method ||
                            "Payment"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                          <p className="text-[9px] font-black uppercase text-slate-500">
                            Amount
                          </p>
                          <p className="mt-1 text-xl font-black text-[#f5c400]">
                            {peso(Number(selectedVoidOrder.total_amount || 0))}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                          <p className="text-[9px] font-black uppercase text-slate-500">
                            Status
                          </p>
                          <p className="mt-1 text-sm font-black uppercase text-emerald-300">
                            {selectedVoidOrder.payment_status || "PAID"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm font-bold leading-6 text-amber-100">
                      No transaction selected. Close this window, open
                      Transactions, select a paid row, then tap Request Void.
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
                    Control Note
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-red-100/80">
                    This does not void the sale immediately. It creates a
                    pending POS void request for manager approval.
                  </p>
                </div>
              </section>

              <section className="flex min-h-0 flex-col p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Void Reason
                </p>

                <textarea
                  autoFocus
                  value={voidReason}
                  onChange={(event) => setVoidReason(event.target.value)}
                  placeholder="Required reason for manager approval..."
                  className="mt-3 min-h-[220px] rounded-2xl border border-white/10 bg-[#05080d] p-4 text-sm font-semibold text-white outline-none placeholder:text-slate-700 focus:border-red-300/50"
                />

                <div className="mt-auto space-y-2 pt-5">
                  <button
                    onClick={requestVoidApproval}
                    disabled={
                      !selectedVoidOrder || !voidReason.trim() || voidLoading
                    }
                    className="h-13 min-h-[52px] w-full rounded-xl bg-red-500 text-sm font-black uppercase text-white transition hover:bg-red-400 disabled:bg-red-500/40 disabled:text-white/50"
                  >
                    {voidLoading ? "Submitting..." : "Submit Void Request"}
                  </button>

                  <button
                    onClick={resetVoidState}
                    disabled={voidLoading}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-sm font-black uppercase text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {showOrderTagModal && (
          <div className="fixed inset-0 z-[10055] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="grid max-h-[90vh] w-full max-w-5xl grid-cols-[minmax(0,1fr)_360px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#080d14] shadow-2xl shadow-black">
              <section className="flex min-h-0 flex-col border-r border-white/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f5c400]">
                      {parkActionType === "KITCHEN"
                        ? isAdditionalKitchenSend
                          ? "Additional Kitchen Send"
                          : "Kitchen Send Confirmation"
                        : "Park Order"}
                    </p>

                    <h2 className="mt-2 text-3xl font-black text-white">
                      {parkActionType === "KITCHEN"
                        ? "Confirm Order Send"
                        : "Order Tag"}
                    </h2>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                      {parkActionType === "KITCHEN"
                        ? "Review station routing, unsent quantities, and notes before sending to production. Only new unsent items will print and route."
                        : "Enter a unique tag so cashier can find this order later."}
                    </p>
                  </div>

                  <button
                    onClick={resetOrderTagState}
                    disabled={orderLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <X size={18} />
                  </button>
                </div>

                {parkActionType === "KITCHEN" ? (
                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                        {isAdditionalKitchenSend
                          ? "Additional Order"
                          : "New Kitchen Order"}
                      </p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-amber-100/80">
                        Cashier must confirm this screen before the slip is
                        saved, routed, and printed.
                      </p>
                    </div>

                    {Object.entries(groupedKitchenSendItems).length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-[#0b1017] p-5 text-sm font-bold text-slate-400">
                        No new production items to send.
                      </div>
                    ) : (
                      Object.entries(groupedKitchenSendItems).map(
                        ([stationName, stationItems]) => (
                          <div key={stationName} className="mb-4 last:mb-0">
                            <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                              <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#f5c400]">
                                {stationName}
                              </p>

                              <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                                {stationItems.reduce(
                                  (sum, item) => sum + item.unsentQty,
                                  0,
                                )}{" "}
                                item(s)
                              </span>
                            </div>

                            <div className="space-y-2">
                              {stationItems.map((item) => (
                                <div
                                  key={`${stationName}-${item.id}`}
                                  className="flex items-center justify-between rounded-xl bg-[#0b1017] px-3 py-3 ring-1 ring-white/10"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-white">
                                      ✓ {item.name}
                                    </p>
                                    {Number(item.sentQty || 0) > 0 && (
                                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                        Previous sent: {item.sentQty}
                                      </p>
                                    )}
                                  </div>

                                  <p className="text-lg font-black text-white">
                                    x{item.unsentQty}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )
                    )}

                    {orderNotes.trim() && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1017] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-white">
                          {orderNotes.trim()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <p className="text-sm font-semibold leading-6 text-slate-400">
                      Example: Pool, Australian, Kubo, Blue Shirt.
                    </p>
                  </div>
                )}
              </section>

              <section className="flex min-h-0 flex-col p-5">
                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Order Tag
                  </label>

                  <input
                    autoFocus
                    value={orderTag}
                    onChange={(event) => setOrderTag(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && orderTag.trim()) {
                        saveParkedOrder();
                      }
                    }}
                    placeholder="UNIQUE TAG: POOL / AUSTRALIAN / KUBO"
                    className="mt-2 h-14 w-full rounded-xl border border-white/10 bg-[#05080d] px-4 text-xl font-black uppercase text-white outline-none placeholder:text-slate-700 focus:border-amber-300/50"
                  />

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["POOL", "KUBO", "BAR", "TAKEOUT", "GROUP", "VIP"].map(
                      (tag) => (
                        <button
                          key={tag}
                          onClick={() => setOrderTag(tag)}
                          className="h-10 rounded-xl bg-white/5 text-xs font-black uppercase text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10"
                        >
                          {tag}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Notes / Instructions
                  </label>

                  <textarea
                    value={orderNotes}
                    onChange={(event) => setOrderNotes(event.target.value)}
                    placeholder="Less ice, no onion, serve later..."
                    className="mt-2 min-h-[120px] w-full rounded-xl border border-white/10 bg-[#05080d] p-4 text-sm font-semibold text-white outline-none placeholder:text-slate-700 focus:border-amber-300/50"
                  />
                </div>

                {parkActionType === "KITCHEN" && (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                      Incremental Send Active
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-amber-100/80">
                      This sends only{" "}
                      {kitchenSendItems.reduce(
                        (sum, item) => sum + item.unsentQty,
                        0,
                      )}{" "}
                      new item(s) across {kitchenSendItems.length} line item(s).
                      Previously sent quantities stay recorded and will not
                      print again.
                    </p>
                  </div>
                )}

                <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                  <button
                    onClick={resetOrderTagState}
                    disabled={orderLoading}
                    className="h-14 rounded-xl border border-white/10 bg-white/5 text-base font-black uppercase tracking-wide text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveParkedOrder}
                    disabled={
                      !orderTag.trim() ||
                      orderLoading ||
                      (parkActionType === "KITCHEN" &&
                        kitchenSendItems.length === 0)
                    }
                    className="h-14 rounded-xl bg-[#f5c400] text-base font-black uppercase tracking-wide text-black shadow-xl shadow-yellow-950/30 transition hover:bg-[#ffd21f] disabled:bg-[#f5c400]/40 disabled:text-black/50"
                  >
                    {orderLoading
                      ? "Saving..."
                      : parkActionType === "KITCHEN"
                        ? "Send Order"
                        : "Save Parked Order"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {modifierModalProduct && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1017] text-white shadow-2xl shadow-black/60">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                    Smart Setup Pack
                  </p>
                  <h2 className="mt-1 text-2xl font-black leading-tight">
                    {modifierModalProduct.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    Select required options before adding this item.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModifierModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
                {getProductModifierGroups(modifierModalProduct).map((group) => {
                  const options = getGroupOptions(group.id);
                  const selectedIds = modifierSelections[group.id] || [];
                  const isSingle =
                    String(group.selection_type || "single").toLowerCase() === "single";

                  return (
                    <section
                      key={group.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-black text-white">
                            {group.group_name}
                          </h3>
                          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            {isSingle ? "Single Select" : "Multiple Select"} • Min{" "}
                            {isSingle && group.is_required ? 1 : group.min_select || 0} / Max{" "}
                            {isSingle ? 1 : group.max_select || 1}
                          </p>
                        </div>

                        {group.is_required && (
                          <span className="rounded-full bg-red-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-red-200 ring-1 ring-red-400/25">
                            Required
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {options.map((option) => {
                          const selected = selectedIds.includes(option.id);

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => toggleModifierSelection(group, option.id)}
                              className={`flex min-h-[46px] items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] ${
                                selected
                                  ? "border-amber-300 bg-amber-400 text-black"
                                  : "border-white/10 bg-[#111820] text-white hover:border-white/25 hover:bg-[#17202b]"
                              }`}
                            >
                              <span className="text-sm font-black">
                                {option.option_name}
                              </span>
                              <span
                                className={`text-xs font-black ${
                                  selected ? "text-black/70" : "text-slate-400"
                                }`}
                              >
                                {Number(option.price_adjustment || 0) !== 0
                                  ? peso(Number(option.price_adjustment || 0))
                                  : "Included"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}

                {modifierMessage && (
                  <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                    {modifierMessage}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/10 p-5">
                <button
                  type="button"
                  onClick={closeModifierModal}
                  className="h-11 rounded-xl border border-white/15 px-5 text-sm font-black text-slate-300 transition hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmModifierSelection}
                  className="h-11 rounded-xl bg-[#f5c400] px-5 text-sm font-black uppercase text-black transition hover:bg-[#ffd21f]"
                >
                  Add To Order
                </button>
              </div>
            </section>
          </div>
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="grid h-[72vh] w-full max-w-5xl grid-cols-[minmax(0,1fr)_390px] overflow-hidden rounded-3xl border border-white/10 bg-[#080d14] shadow-2xl shadow-black">
              <section className="flex min-h-0 flex-col border-r border-white/10 p-4">
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#f5c400]">
                      Payment
                    </p>
                    <h2 className="mt-0.5 text-lg font-black tracking-tight text-white">
                      Order Summary
                    </h2>
                  </div>

                  <button
                    onClick={resetPaymentState}
                    disabled={orderLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-1.5 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/10">
                  <p className="text-[11px] font-black uppercase tracking-wide text-white">
                    {selectedOrderType?.name || "Order"}
                  </p>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                    {totalItems} item(s)
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="h-full overflow-y-auto divide-y divide-white/10">
                    {cart.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-1"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-white">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-[9px] font-semibold text-slate-500">
                            {item.qty} × {peso(item.price)}
                          </p>
                        </div>

                        <p className="text-[11px] font-black text-emerald-200">
                          {peso(item.price * item.qty)}
                        </p>
                      </div>
                    ))}

                    {cart.length > 8 && (
                      <div className="px-3 py-2 text-xs font-black text-slate-500">
                        + {cart.length - 4} more item(s)
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 shrink-0 overflow-hidden rounded-xl bg-[#101620] ring-1 ring-white/10">
                  <div className="space-y-0.5 px-3 py-1 text-[11px] font-semibold">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span className="text-white">{peso(subtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Service Charge</span>
                      <span className="text-white">{peso(serviceCharge)}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-dashed border-white/15 pt-1.5">
                      <span className="text-xs font-black uppercase text-white">
                        Total
                      </span>
                      <span className="text-lg font-black text-[#f5c400]">
                        {peso(grandTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-t border-white/10">
                    <div className="px-3 py-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Paid
                      </p>
                      <p className="mt-0.5 text-base font-black text-white">
                        {peso(amountPaidValue)}
                      </p>
                    </div>

                    <div className="border-l border-white/10 px-3 py-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Change
                      </p>
                      <p className="mt-0.5 text-base font-black text-emerald-200">
                        {peso(changeAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex min-h-0 flex-col p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Payment Method
                </p>

                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethodCode(method.code)}
                      className={`flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase shadow-lg ring-1 transition active:scale-[0.98] ${getPaymentButtonClass(
                        method.code,
                        selectedPaymentMethodCode === method.code,
                      )}`}
                    >
                      <CreditCard size={14} />
                      {method.name}
                    </button>
                  ))}
                </div>

                <div className="mt-2 rounded-xl bg-black/20 p-2 ring-1 ring-white/10">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Amount Paid
                  </p>

                  <div className="mt-1.5 flex h-10 items-center justify-between rounded-xl bg-[#05080d] px-4 ring-1 ring-white/10">
                    <span className="text-xl font-black text-slate-400">₱</span>
                    <p className="text-right text-lg font-black tracking-tight text-white">
                      {Number(amountPaidValue || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="mt-1.5 grid grid-cols-5 gap-1">
                    <button
                      onClick={setExactAmount}
                      className="h-8 rounded-lg bg-emerald-500/20 text-[11px] font-black text-emerald-200 ring-1 ring-emerald-400/25 transition active:scale-[0.98]"
                    >
                      EXACT
                    </button>

                    {[500, 1000, 2000, 5000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => addQuickAmount(amount)}
                        className="h-8 rounded-lg bg-white/5 text-xs font-black text-white ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98]"
                      >
                        ₱{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    {[
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      "C",
                      "0",
                      "BACK",
                    ].map((key) => (
                      <button
                        key={key}
                        onClick={() => pressKeypad(key)}
                        className={`h-9 rounded-lg text-lg font-black ring-1 transition active:scale-[0.98] ${
                          key === "C"
                            ? "bg-red-500/15 text-red-300 ring-red-400/25"
                            : key === "BACK"
                              ? "bg-white/5 text-slate-300 ring-white/10"
                              : "bg-[#151c26] text-white ring-white/10 hover:bg-[#1d2633]"
                        }`}
                      >
                        {key === "BACK" ? "←" : key}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Reference No. Optional
                    </p>
                    <input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                      placeholder="GCash / Card reference"
                      className="mt-1 h-8 w-full rounded-lg border border-white/10 bg-[#05080d] px-3 text-[11px] font-semibold text-white outline-none placeholder:text-slate-600 focus:border-amber-300/50"
                    />
                  </div>

                  {amountPaidValue > 0 && amountPaidValue < grandTotal && (
                    <div className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-xs font-bold text-red-200">
                      Insufficient payment.
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-2">
                  <button
                    onClick={() => confirmPayment(true)}
                    disabled={!canConfirmPayment || orderLoading}
                    className="h-11 w-full rounded-xl bg-[#f5c400] text-base font-black uppercase tracking-wide text-black shadow-xl shadow-yellow-950/30 transition hover:bg-[#ffd21f] disabled:bg-[#f5c400]/40 disabled:text-black/50"
                  >
                    {orderLoading ? "Saving..." : "Pay + Print Receipt"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </PageGuard>
  );
}
