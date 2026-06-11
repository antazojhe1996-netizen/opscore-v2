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
  item_code: string | null;
  name: string;
  price: number;
  qty: number;
  production_area: string | null;
  requires_production: boolean;
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
  const [parkActionType, setParkActionType] = useState<"KITCHEN" | "PARK">("PARK");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [loadedParkedOrderId, setLoadedParkedOrderId] = useState<string | null>(
    null,
  );
  const [loadedParkedOrderTag, setLoadedParkedOrderTag] = useState("");

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  const goToParkedOrders = () => {
    if (typeof window !== "undefined") {
      window.location.href = `${window.location.origin}/pos/parked-orders`;
    }
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
    const parkedOrderTag = localStorage.getItem("opscore_open_parked_order_tag");

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

    const [
      settingsResult,
      menuGroupResult,
      stationResult,
      tableResult,
      orderTypeResult,
      paymentResult,
      categoryResult,
      productResult,
    ] = await Promise.all([
      settingsQuery,
      menuGroupQuery,
      stationQuery,
      tableQuery,
      orderTypeQuery,
      paymentQuery,
      categoryQuery,
      productQuery,
    ]);

    const firstError =
      settingsResult.error ||
      menuGroupResult.error ||
      stationResult.error ||
      tableResult.error ||
      orderTypeResult.error ||
      paymentResult.error ||
      categoryResult.error ||
      productResult.error;

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
        "menu_item_id, item_name, qty, price, production_area, production_status",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (itemError) {
      setOrderMessage(itemError.message);
      return;
    }

    const loadedItems: CartItem[] = (itemData || []).map((item: any) => ({
      id: item.menu_item_id,
      item_code: null,
      name: item.item_name,
      price: Number(item.price || 0),
      qty: Number(item.qty || 0),
      production_area: item.production_area || null,
      requires_production: item.production_status !== "COMPLETED",
    }));

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

  const addToCart = (product: Product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }

      return [
        ...currentCart,
        {
          id: product.id,
          item_code: product.item_code,
          name: product.name,
          price: Number(product.price || 0),
          qty: 1,
          production_area: getRequiresProduction(product)
            ? getProductionCode(product)
            : null,
          requires_production: getRequiresProduction(product),
        },
      ];
    });
  };

  const increaseQty = (itemId: string) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === itemId ? { ...item, qty: item.qty + 1 } : item,
      ),
    );
  };

  const decreaseQty = (itemId: string) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === itemId ? { ...item, qty: item.qty - 1 } : item,
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

    setParkActionType(actionType);
    setOrderTag(loadedParkedOrderTag || "");
    setShowOrderTagModal(true);
  };

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

      const { error: deleteItemsError } = await supabase
        .from("pos_order_items")
        .delete()
        .eq("order_id", loadedParkedOrderId);

      if (deleteItemsError) {
        setOrderLoading(false);
        setOrderMessage(deleteItemsError.message);
        return;
      }

      const refreshedItems = cart.map((item) => ({
        company_id: activeSession.company_id,
        order_id: loadedParkedOrderId,
        menu_item_id: item.id,
        item_name: item.name,
        qty: item.qty,
        price: item.price,
        total: item.price * item.qty,
        production_area: item.requires_production ? item.production_area : null,
        production_status:
          enableProductionRouting && item.requires_production
            ? "PENDING"
            : "COMPLETED",
      }));

      const { error: insertItemsError } = await supabase
        .from("pos_order_items")
        .insert(refreshedItems);

      if (insertItemsError) {
        setOrderLoading(false);
        setOrderMessage(insertItemsError.message);
        return;
      }

      setCart([]);
      resetOrderTagState();
      setLoadedParkedOrderId(null);
      setLoadedParkedOrderTag("");
      setOrderLoading(false);
      goToParkedOrders();
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

    if ((duplicateOrders || []).length > 0) {
      setOrderLoading(false);
      setOrderMessage(`Order tag "${cleanTag}" is already queued.`);
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

    const orderItems = cart.map((item) => ({
      company_id: activeSession.company_id,
      order_id: orderData.id,
      menu_item_id: item.id,
      item_name: item.name,
      qty: item.qty,
      price: item.price,
      total: item.price * item.qty,
      production_area: item.requires_production ? item.production_area : null,
      production_status:
        enableProductionRouting && item.requires_production
          ? "PENDING"
          : "COMPLETED",
    }));

    const { error: itemsError } = await supabase
      .from("pos_order_items")
      .insert(orderItems);

    if (itemsError) {
      setOrderLoading(false);
      setOrderMessage(itemsError.message);
      return;
    }

    setCart([]);
    resetOrderTagState();
    setLoadedParkedOrderId(null);
    setLoadedParkedOrderTag("");

    setOrderLoading(false);
    goToParkedOrders();
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

    const orderItems = cart.map((item) => ({
      company_id: activeSession.company_id,
      order_id: orderData.id,
      menu_item_id: item.id,
      item_name: item.name,
      qty: item.qty,
      price: item.price,
      total: item.price * item.qty,
      production_area: item.requires_production ? item.production_area : null,
      production_status:
        enableProductionRouting && item.requires_production
          ? "PENDING"
          : "COMPLETED",
    }));

    const { error: itemsError } = await supabase
      .from("pos_order_items")
      .insert(orderItems);

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

              <div className="mt-1 grid grid-cols-5 gap-1.5">
                <button className="flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 text-[13px] font-black text-white shadow-lg shadow-emerald-950/30 transition active:scale-[0.98]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-base text-white ring-1 ring-white/15">
                    N
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

                <button
                  onClick={goToParkedOrders}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 text-[13px] font-black text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-500/20 active:scale-[0.98]"
                >
                  <Undo2 size={15} />
                  Recall
                </button>

                <button
                  disabled={!enableVoidApproval}
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
                      <div key={item.id} className="py-1">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-black leading-[15px] text-white">
                              {item.name}
                            </p>
                            <p className="truncate text-[10px] font-semibold leading-[13px] text-slate-500">
                              {item.qty} × {peso(Number(item.price || 0))}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <p className="min-w-[66px] text-right text-[11px] font-black leading-4 text-white">
                              {peso(Number(item.price || 0) * item.qty)}
                            </p>

                            <button
                              onClick={() => decreaseQty(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111821] text-slate-300 ring-1 ring-white/10 transition hover:bg-[#17202b]"
                            >
                              <Minus size={13} />
                            </button>

                            <button
                              onClick={() => increaseQty(item.id)}
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

                {hasProductionItems ? (
                  <button
                    onClick={() => openOrderTagModal("KITCHEN")}
                    disabled={cart.length === 0 || orderLoading}
                    className="mt-1.5 h-16 w-full rounded-xl bg-[#f5c400] text-[18px] font-black tracking-wide text-black shadow-xl shadow-yellow-950/40 transition hover:bg-[#ffd21f] active:scale-[0.99] disabled:bg-[#f5c400]/45 disabled:text-black/70"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ChefHat size={21} />
                      SEND TO KITCHEN
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => openOrderTagModal("PARK")}
                    disabled={cart.length === 0 || orderLoading}
                    className="mt-1.5 h-16 w-full rounded-xl bg-[#f5c400] text-[20px] font-black tracking-wide text-black shadow-xl shadow-yellow-950/40 transition hover:bg-[#ffd21f] active:scale-[0.99] disabled:bg-[#f5c400]/45 disabled:text-black/70"
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

        {showOrderTagModal && (
          <div className="fixed inset-0 z-[10055] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#080d14] p-6 shadow-2xl shadow-black">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f5c400]">
                    {parkActionType === "KITCHEN"
                      ? "Send To Kitchen"
                      : "Park Order"}
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-white">
                    Order Tag
                  </h2>

                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                    Enter a unique tag so cashier can find this order later.
                    Example: Pool, Australian, Kubo, Blue Shirt.
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

              <div className="mt-5 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
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

              <button
                onClick={saveParkedOrder}
                disabled={!orderTag.trim() || orderLoading}
                className="mt-5 h-14 w-full rounded-xl bg-[#f5c400] text-base font-black uppercase tracking-wide text-black shadow-xl shadow-yellow-950/30 transition hover:bg-[#ffd21f] disabled:bg-[#f5c400]/40 disabled:text-black/50"
              >
                {orderLoading
                  ? "Saving..."
                  : parkActionType === "KITCHEN"
                    ? "Save + Send To Kitchen"
                    : "Save Parked Order"}
              </button>
            </div>
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
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "BACK"].map(
                      (key) => (
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
                      ),
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Reference No. Optional
                    </p>
                    <input
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
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
