"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/app/lib/supabase";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  Edit,
  FileSpreadsheet,
  GitBranch,
  ImageIcon,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Table2,
  ToggleLeft,
  Trash2,
  Upload,
  Utensils,
  X,
  XCircle,
} from "lucide-react";

type SetupTab =
  | "general"
  | "categories"
  | "products"
  | "choice_groups"
  | "setup_packs"
  | "stations"
  | "routing"
  | "payments"
  | "tables"
  | "import_export";

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

type PosCategory = {
  id: string;
  company_id: string | null;
  name: string;
  category_code: string | null;
  description?: string | null;
  production_area: string | null;
  production_station_id: string | null;
  requires_production: boolean;
  sort_order: number | null;
  status: string | null;
  created_at?: string;
  updated_at?: string;
};

type PosMenuItem = {
  id: string;
  company_id: string | null;
  category_id: string;
  setup_pack_id?: string | null;
  item_code: string | null;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  image_url?: string | null;
  is_inventory_tracked?: boolean | null;
  is_best_seller?: boolean | null;
  is_hot?: boolean | null;
  is_new?: boolean | null;
  status: string | null;
  created_at?: string;
  updated_at?: string;
  category?: {
    id: string;
    name: string;
    category_code: string | null;
    status: string | null;
  } | null;
};

type PosSetupPack = {
  id: string;
  company_id: string | null;
  pack_name: string;
  pack_code: string | null;
  description?: string | null;
  status: string;
  created_at?: string;
};

type PosSetupPackGroup = {
  id: string;
  company_id: string | null;
  pack_id: string;
  group_id: string;
  created_at?: string;
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
  created_at?: string;
  updated_at?: string;
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
  created_at?: string;
  updated_at?: string;
};

type ModifierGroupForm = {
  group_name: string;
  group_code: string;
  selection_type: string;
  min_select: string;
  max_select: string;
  is_required: boolean;
  status: string;
};

type ModifierOptionForm = {
  option_name: string;
  option_code: string;
  price_adjustment: string;
  cost_adjustment: string;
  sort_order: string;
  status: string;
  quick_options: string;
};

type SetupPackForm = {
  pack_name: string;
  pack_code: string;
  description: string;
  status: string;
};

type CategoryForm = {
  name: string;
  category_code: string;
  description: string;
  requires_production: boolean;
  production_station_id: string;
  status: string;
};

type ProductForm = {
  item_code: string;
  name: string;
  description: string;
  category_id: string;
  setup_pack_id: string;
  price: string;
  cost: string;
  image_url: string;
  is_inventory_tracked: boolean;
  is_best_seller: boolean;
  is_hot: boolean;
  is_new: boolean;
  status: string;
};

const emptyCategoryForm: CategoryForm = {
  name: "",
  category_code: "",
  description: "",
  requires_production: true,
  production_station_id: "",
  status: "active",
};

const emptyProductForm: ProductForm = {
  item_code: "",
  name: "",
  description: "",
  category_id: "",
  setup_pack_id: "",
  price: "",
  cost: "",
  image_url: "",
  is_inventory_tracked: false,
  is_best_seller: false,
  is_hot: false,
  is_new: false,
  status: "active",
};


const emptyModifierGroupForm: ModifierGroupForm = {
  group_name: "",
  group_code: "",
  selection_type: "single",
  min_select: "0",
  max_select: "1",
  is_required: false,
  status: "active",
};

const emptyModifierOptionForm: ModifierOptionForm = {
  option_name: "",
  option_code: "",
  price_adjustment: "0",
  cost_adjustment: "0",
  sort_order: "",
  status: "active",
  quick_options: "",
};

const emptySetupPackForm: SetupPackForm = {
  pack_name: "",
  pack_code: "",
  description: "",
  status: "active",
};

const tabs: {
  key: SetupTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "general", label: "General", icon: <ToggleLeft size={16} /> },
  { key: "categories", label: "Categories", icon: <Package size={16} /> },
  { key: "products", label: "Products", icon: <Utensils size={16} /> },
  { key: "choice_groups", label: "Choice Groups", icon: <Settings size={16} /> },
  { key: "setup_packs", label: "Setup Packs", icon: <Package size={16} /> },
  { key: "stations", label: "Stations", icon: <Building2 size={16} /> },
  { key: "routing", label: "Routing", icon: <GitBranch size={16} /> },
  { key: "payments", label: "Payments", icon: <CreditCard size={16} /> },
  { key: "tables", label: "Tables", icon: <Table2 size={16} /> },
  { key: "import_export", label: "Import / Export", icon: <FileSpreadsheet size={16} /> },
];

const generalSettings = [
  { key: "enable_table_tracking", label: "Enable Table Tracking", helper: "Show table selector in POS terminal." },
  { key: "require_table_for_dine_in", label: "Require Table for Dine In", helper: "Prevent dine-in orders without table selection." },
  { key: "enable_room_charge", label: "Enable Room Charge", helper: "Allow posting POS bills to hotel rooms." },
  { key: "enable_delivery_orders", label: "Enable Delivery Orders", helper: "Allow delivery as an order type." },
  { key: "enable_takeout_orders", label: "Enable Takeout Orders", helper: "Allow takeout transactions." },
  { key: "enable_service_charge", label: "Enable Service Charge", helper: "Apply service charge based on configured percent." },
  { key: "enable_production_routing", label: "Enable Production Routing", helper: "Route items to kitchen, bar, or other stations." },
  { key: "enable_receipt_printing", label: "Enable Receipt Printing", helper: "Prepare receipt printing support." },
  { key: "enable_cash_drawer", label: "Enable Cash Drawer", helper: "Prepare cash drawer open/control support." },
  { key: "enable_hold_orders", label: "Enable Hold Orders", helper: "Allow orders to be parked temporarily." },
  { key: "enable_recall_orders", label: "Enable Recall Orders", helper: "Allow held orders to be recalled." },
  { key: "enable_discounts", label: "Enable Discounts", helper: "Allow discount actions in POS." },
  { key: "enable_promos", label: "Enable Promos", helper: "Allow promo and campaign logic." },
  { key: "enable_item_notes", label: "Enable Item Notes", helper: "Allow cashier notes per order item." },
  { key: "enable_void_approval", label: "Enable Void Approval", helper: "Require manager approval before voiding orders." },
  { key: "enable_refund_approval", label: "Enable Refund Approval", helper: "Require manager approval before refunds." },
];

const peso = (value: number | string | null | undefined) =>
  `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const cleanCode = (value: string) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeHeader = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeText = (value: any) => String(value ?? "").trim();

const toNumber = (value: any) => {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[₱$]/g, "")
    .trim();

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeBoolean = (value: any) => {
  const text = normalizeText(value).toLowerCase();
  return ["true", "yes", "y", "1", "on", "active", "routed", "queue", "queue_required", "best", "hot", "new"].includes(text);
};

const normalizeStatus = (value: any) => {
  const text = normalizeText(value).toLowerCase();

  if (!text) return "active";
  if (["inactive", "disabled", "archived", "deleted", "not_active"].includes(text)) return "inactive";

  return "active";
};

const getCell = (row: Record<string, any>, keys: string[]) => {
  const normalized = Object.keys(row).reduce<Record<string, any>>((acc, key) => {
    acc[normalizeHeader(key)] = row[key];
    return acc;
  }, {});

  for (const key of keys) {
    const found = normalized[normalizeHeader(key)];
    if (found !== undefined && found !== null && String(found).trim() !== "") {
      return found;
    }
  }

  return "";
};

const makeCategoryCode = (categoryName: string) =>
  cleanCode(categoryName.replace(/^\d+\s*/g, "")).slice(0, 20) ||
  cleanCode(categoryName).slice(0, 20);

const getPosterCategoryDescription = (categoryName: string) => {
  const upper = categoryName.toUpperCase();

  if (upper.includes("BEER")) return "Beer, bottled beer, canned beer, and beer products";
  if (upper.includes("LIQUOR") || upper.includes("VODKA") || upper.includes("WHISKY") || upper.includes("GIN") || upper.includes("RUM") || upper.includes("TEQUILA")) return "Liquor, spirits, and alcoholic beverages";
  if (upper.includes("JUICE")) return "Juices and fruit drink products";
  if (upper.includes("COFFEE")) return "Coffee and ready-to-drink coffee products";
  if (upper.includes("SHAKE")) return "Shakes and blended drink products";
  if (upper.includes("ICE")) return "Ice cream and cold dessert products";
  if (upper.includes("BEVERAGE")) return "Beverages and drink products";

  return "Auto-created POS category from import";
};

export default function POSSetupCenterPage() {
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<SetupTab>("general");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [tables, setTables] = useState<PosTable[]>([]);
  const [orderTypes, setOrderTypes] = useState<PosOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PosOption[]>([]);
  const [productionStations, setProductionStations] = useState<PosOption[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [products, setProducts] = useState<PosMenuItem[]>([]);
  const [settings, setSettings] = useState<PosSetting[]>([]);
  const [modifierGroups, setModifierGroups] = useState<PosModifierGroup[]>([]);
  const [modifierOptions, setModifierOptions] = useState<PosModifierOption[]>([]);
  const [setupPacks, setSetupPacks] = useState<PosSetupPack[]>([]);
  const [setupPackGroups, setSetupPackGroups] = useState<PosSetupPackGroup[]>([]);

  const [categorySearch, setCategorySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [modifierSearch, setModifierSearch] = useState("");
  const [setupPackSearch, setSetupPackSearch] = useState("");
  const [selectedModifierGroupId, setSelectedModifierGroupId] = useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [modifierGroupModalOpen, setModifierGroupModalOpen] = useState(false);
  const [modifierOptionModalOpen, setModifierOptionModalOpen] = useState(false);
  const [setupPackModalOpen, setSetupPackModalOpen] = useState(false);
  const [setupPackGroupsModalOpen, setSetupPackGroupsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PosCategory | null>(null);
  const [editingProduct, setEditingProduct] = useState<PosMenuItem | null>(null);
  const [editingModifierGroup, setEditingModifierGroup] = useState<PosModifierGroup | null>(null);
  const [editingModifierOption, setEditingModifierOption] = useState<PosModifierOption | null>(null);
  const [editingSetupPack, setEditingSetupPack] = useState<PosSetupPack | null>(null);
  const [selectedSetupPack, setSelectedSetupPack] = useState<PosSetupPack | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [modifierGroupForm, setModifierGroupForm] = useState<ModifierGroupForm>(emptyModifierGroupForm);
  const [modifierOptionForm, setModifierOptionForm] = useState<ModifierOptionForm>(emptyModifierOptionForm);
  const [setupPackForm, setSetupPackForm] = useState<SetupPackForm>(emptySetupPackForm);

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
    loadAll();
  }, []);

  const applyCompanyFilter = (query: any) => {
    if (!companyId) return query.is("company_id", null);
    return query.or(`company_id.eq.${companyId},company_id.is.null`);
  };

  const scopedQuery = (query: any) => {
    if (!companyId) return query;
    return query.eq("company_id", companyId);
  };

  const nextSortOrder = (items: { sort_order: number | null }[]) => {
    const highest = items.reduce(
      (max, item) => Math.max(max, Number(item.sort_order || 0)),
      0,
    );

    return highest + 1;
  };

  const loadAll = async () => {
    setLoading(true);
    setMessage("");

    const tableQuery = applyCompanyFilter(
      supabase.from("pos_tables").select("*").order("sort_order", { ascending: true }),
    );

    const orderTypeQuery = applyCompanyFilter(
      supabase.from("pos_order_types").select("*").order("sort_order", { ascending: true }),
    );

    const paymentQuery = applyCompanyFilter(
      supabase.from("pos_payment_methods").select("*").order("sort_order", { ascending: true }),
    );

    const stationQuery = applyCompanyFilter(
      supabase.from("pos_production_stations").select("*").order("sort_order", { ascending: true }),
    );

    const categoryQuery = scopedQuery(
      supabase
        .from("pos_categories")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true }),
    );

    const productQuery = scopedQuery(
      supabase
        .from("pos_menu_items")
        .select(
          `
          *,
          category:pos_categories (
            id,
            name,
            category_code,
            status
          )
        `,
        )
        .order("name", { ascending: true }),
    );

    const settingsQuery = applyCompanyFilter(
      supabase.from("pos_settings").select("*").order("setting_key", { ascending: true }),
    );

    const modifierGroupQuery = applyCompanyFilter(
      supabase
        .from("pos_modifier_groups")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("group_name", { ascending: true }),
    );

    const modifierOptionQuery = applyCompanyFilter(
      supabase
        .from("pos_modifier_options")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("option_name", { ascending: true }),
    );

    const setupPackQuery = applyCompanyFilter(
      supabase
        .from("pos_setup_packs")
        .select("*")
        .order("pack_name", { ascending: true }),
    );

    const setupPackGroupQuery = applyCompanyFilter(
      supabase
        .from("pos_setup_pack_groups")
        .select("*")
        .order("created_at", { ascending: true }),
    );

    const [
      tableResult,
      orderTypeResult,
      paymentResult,
      stationResult,
      categoryResult,
      productResult,
      settingsResult,
      modifierGroupResult,
      modifierOptionResult,
      setupPackResult,
      setupPackGroupResult,
    ] = await Promise.all([
      tableQuery,
      orderTypeQuery,
      paymentQuery,
      stationQuery,
      categoryQuery,
      productQuery,
      settingsQuery,
      modifierGroupQuery,
      modifierOptionQuery,
      setupPackQuery,
      setupPackGroupQuery,
    ]);

    const firstError =
      tableResult.error ||
      orderTypeResult.error ||
      paymentResult.error ||
      stationResult.error ||
      categoryResult.error ||
      productResult.error ||
      settingsResult.error ||
      modifierGroupResult.error ||
      modifierOptionResult.error ||
      setupPackResult.error ||
      setupPackGroupResult.error;

    if (firstError) setMessage(firstError.message);

    setTables((tableResult.data || []) as PosTable[]);
    setOrderTypes((orderTypeResult.data || []) as PosOption[]);
    setPaymentMethods((paymentResult.data || []) as PosOption[]);
    setProductionStations((stationResult.data || []) as PosOption[]);
    setCategories((categoryResult.data || []) as PosCategory[]);
    setProducts((productResult.data || []) as PosMenuItem[]);
    setSettings((settingsResult.data || []) as PosSetting[]);
    setModifierGroups((modifierGroupResult.data || []) as PosModifierGroup[]);
    setModifierOptions((modifierOptionResult.data || []) as PosModifierOption[]);
    setSetupPacks((setupPackResult.data || []) as PosSetupPack[]);
    setSetupPackGroups((setupPackGroupResult.data || []) as PosSetupPackGroup[]);

    setLoading(false);
  };

  const getSettingValue = (key: string) =>
    settings.find((setting) => setting.setting_key === key)?.setting_value || "";

  const saveSetting = async (key: string, value: string) => {
    const existing = settings.find((setting) => setting.setting_key === key);

    setMessage("");

    if (existing) {
      const { error } = await supabase
        .from("pos_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString() })
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

    await loadAll();
  };

  const addTable = async () => {
    if (!newTableName.trim()) return;

    setMessage("");

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
    await loadAll();
  };

  const addOption = async (
    tableName: "pos_order_types" | "pos_payment_methods" | "pos_production_stations",
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

    setMessage("");

    const payload: any = {
      company_id: companyId,
      name: config.name.trim(),
      code: cleanCode(config.code || config.name),
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
    await loadAll();
  };

  const toggleActive = async (tableName: string, id: string, current: boolean) => {
    setMessage("");

    const { error } = await supabase
      .from(tableName)
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };

  const deleteRow = async (tableName: string, id: string) => {
    const confirmed = window.confirm("Delete this setup record?");
    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase.from(tableName).delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category: PosCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || "",
      category_code: category.category_code || "",
      description: category.description || "",
      requires_production: category.requires_production !== false,
      production_station_id: category.production_station_id || "",
      status: category.status || "active",
    });
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    if (saving) return;
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryModalOpen(false);
  };

  const saveCategory = async () => {
    setMessage("");

    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    if (!categoryForm.name.trim()) {
      setMessage("Category name is required.");
      return;
    }

    setSaving(true);

    const station = productionStations.find(
      (item) => item.id === categoryForm.production_station_id,
    );

    const payload = {
      company_id: companyId,
      name: categoryForm.name.trim(),
      category_code: categoryForm.category_code.trim() || null,
      description: categoryForm.description.trim() || null,
      requires_production: Boolean(categoryForm.requires_production),
      production_station_id: categoryForm.requires_production
        ? categoryForm.production_station_id || null
        : null,
      production_area: categoryForm.requires_production ? station?.code || null : null,
      status: categoryForm.status || "active",
      updated_at: new Date().toISOString(),
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("pos_categories")
        .update(payload)
        .eq("id", editingCategory.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("pos_categories").insert({
        ...payload,
        sort_order: nextSortOrder(categories),
      });

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    await loadAll();
    setSaving(false);
    closeCategoryModal();
  };

  const toggleCategoryStatus = async (category: PosCategory) => {
    setMessage("");

    const nextStatus = category.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("pos_categories")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", category.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductModalOpen(true);
  };

  const openEditProduct = (item: PosMenuItem) => {
    setEditingProduct(item);
    setProductForm({
      item_code: item.item_code || "",
      name: item.name || "",
      description: item.description || "",
      category_id: item.category_id || "",
      setup_pack_id: item.setup_pack_id || "",
      price: String(item.price || ""),
      cost: String(item.cost || ""),
      image_url: item.image_url || "",
      is_inventory_tracked: Boolean(item.is_inventory_tracked),
      is_best_seller: Boolean(item.is_best_seller),
      is_hot: Boolean(item.is_hot),
      is_new: Boolean(item.is_new),
      status: item.status || "active",
    });
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    if (saving || uploadingImage) return;

    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductModalOpen(false);

    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const uploadImage = async (file: File) => {
    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return null;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      return null;
    }

    setUploadingImage(true);
    setMessage("");

    const extension = file.name.split(".").pop() || "jpg";
    const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
    const fileName = `${companyId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExtension}`;

    const { error } = await supabase.storage
      .from("pos-menu-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      setMessage(error.message);
      setUploadingImage(false);
      return null;
    }

    const { data } = supabase.storage
      .from("pos-menu-images")
      .getPublicUrl(fileName);

    setUploadingImage(false);

    return data.publicUrl;
  };

  const saveProduct = async () => {
    setMessage("");

    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    if (!productForm.name.trim()) {
      setMessage("Product name is required.");
      return;
    }

    if (!productForm.category_id) {
      setMessage("Category is required.");
      return;
    }

    setSaving(true);

    const payload = {
      company_id: companyId,
      category_id: productForm.category_id,
      setup_pack_id: productForm.setup_pack_id || null,
      item_code: productForm.item_code.trim() || null,
      name: productForm.name.trim(),
      description: productForm.description.trim() || null,
      price: toNumber(productForm.price),
      cost: toNumber(productForm.cost),
      image_url: productForm.image_url.trim() || null,
      is_inventory_tracked: Boolean(productForm.is_inventory_tracked),
      is_best_seller: Boolean(productForm.is_best_seller),
      is_hot: Boolean(productForm.is_hot),
      is_new: Boolean(productForm.is_new),
      status: productForm.status || "active",
      updated_at: new Date().toISOString(),
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("pos_menu_items")
        .update(payload)
        .eq("id", editingProduct.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("pos_menu_items").insert([payload]);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    await loadAll();
    setSaving(false);
    closeProductModal();
  };

  const toggleProductStatus = async (item: PosMenuItem) => {
    setMessage("");

    const nextStatus = item.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("pos_menu_items")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };

  const saveCategoryRouting = async (
    categoryId: string,
    requiresProduction: boolean,
    productionStationId: string | null,
  ) => {
    setMessage("");

    const selectedStation = productionStations.find(
      (station) => station.id === productionStationId,
    );

    const { error } = await supabase
      .from("pos_categories")
      .update({
        requires_production: requiresProduction,
        production_station_id: requiresProduction ? productionStationId : null,
        production_area: requiresProduction ? selectedStation?.code || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };


  const openAddModifierGroup = () => {
    setEditingModifierGroup(null);
    setModifierGroupForm(emptyModifierGroupForm);
    setModifierGroupModalOpen(true);
  };

  const openEditModifierGroup = (group: PosModifierGroup) => {
    setEditingModifierGroup(group);
    setModifierGroupForm({
      group_name: group.group_name || "",
      group_code: group.group_code || "",
      selection_type: group.selection_type || "single",
      min_select: String(group.min_select ?? 0),
      max_select: String(group.max_select ?? 1),
      is_required: Boolean(group.is_required),
      status: group.status || "active",
    });
    setModifierGroupModalOpen(true);
  };

  const closeModifierGroupModal = () => {
    if (saving) return;
    setEditingModifierGroup(null);
    setModifierGroupForm(emptyModifierGroupForm);
    setModifierGroupModalOpen(false);
  };

  const saveModifierGroup = async () => {
    setMessage("");

    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    if (!modifierGroupForm.group_name.trim()) {
      setMessage("Choice group name is required.");
      return;
    }

    const selectionType = modifierGroupForm.selection_type || "single";
    const isRequired = Boolean(modifierGroupForm.is_required);
    let minSelect = Math.max(0, Number(modifierGroupForm.min_select || 0));
    let maxSelect = Math.max(1, Number(modifierGroupForm.max_select || 1));

    if (selectionType === "single") {
      minSelect = isRequired ? 1 : 0;
      maxSelect = 1;
    }

    if (selectionType !== "single" && isRequired && minSelect === 0) {
      minSelect = 1;
    }

    if (maxSelect < minSelect) {
      setMessage("Max select must be greater than or equal to min select.");
      return;
    }

    setSaving(true);

    const payload = {
      company_id: companyId,
      group_name: modifierGroupForm.group_name.trim(),
      group_code:
        cleanCode(modifierGroupForm.group_code || modifierGroupForm.group_name) || null,
      selection_type: selectionType,
      min_select: minSelect,
      max_select: maxSelect,
      is_required: isRequired,
      status: modifierGroupForm.status || "active",
      updated_at: new Date().toISOString(),
    };

    if (editingModifierGroup) {
      const { error } = await supabase
        .from("pos_modifier_groups")
        .update(payload)
        .eq("id", editingModifierGroup.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("pos_modifier_groups").insert({
        ...payload,
        sort_order: nextSortOrder(modifierGroups),
      });

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    await loadAll();
    setSaving(false);
    closeModifierGroupModal();
  };

  const toggleModifierGroupStatus = async (group: PosModifierGroup) => {
    setMessage("");

    const nextStatus = group.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("pos_modifier_groups")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", group.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };

  const openAddModifierOption = (modifierGroupId: string) => {
    setSelectedModifierGroupId(modifierGroupId);
    setEditingModifierOption(null);
    setModifierOptionForm(emptyModifierOptionForm);
    setModifierOptionModalOpen(true);
  };

  const openEditModifierOption = (option: PosModifierOption) => {
    setSelectedModifierGroupId(option.modifier_group_id);
    setEditingModifierOption(option);
    setModifierOptionForm({
      option_name: option.option_name || "",
      option_code: option.option_code || "",
      price_adjustment: String(option.price_adjustment ?? 0),
      cost_adjustment: String(option.cost_adjustment ?? 0),
      sort_order: String(option.sort_order ?? ""),
      status: option.status || "active",
      quick_options: "",
    });
    setModifierOptionModalOpen(true);
  };

  const closeModifierOptionModal = () => {
    if (saving) return;
    setEditingModifierOption(null);
    setModifierOptionForm(emptyModifierOptionForm);
    setModifierOptionModalOpen(false);
  };

  const saveModifierOption = async () => {
    setMessage("");

    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    if (!selectedModifierGroupId) {
      setMessage("Select a modifier group first.");
      return;
    }

    const quickOptionLines = modifierOptionForm.quick_options
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!editingModifierOption && quickOptionLines.length > 0) {
      setSaving(true);

      const targetGroupOptions = modifierOptions.filter(
        (option) => option.modifier_group_id === selectedModifierGroupId,
      );

      const payloads = quickOptionLines.map((optionName, index) => ({
        company_id: companyId,
        modifier_group_id: selectedModifierGroupId,
        option_name: optionName,
        option_code: cleanCode(optionName) || null,
        price_adjustment: toNumber(modifierOptionForm.price_adjustment),
        cost_adjustment: toNumber(modifierOptionForm.cost_adjustment),
        sort_order: nextSortOrder(targetGroupOptions) + index,
        status: modifierOptionForm.status || "active",
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("pos_modifier_options").insert(payloads);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      await loadAll();
      setSaving(false);
      closeModifierOptionModal();
      return;
    }

    if (!modifierOptionForm.option_name.trim()) {
      setMessage("Choice option name is required.");
      return;
    }

    setSaving(true);

    const targetGroupOptions = modifierOptions.filter(
      (option) => option.modifier_group_id === selectedModifierGroupId,
    );

    const payload = {
      company_id: companyId,
      modifier_group_id: selectedModifierGroupId,
      option_name: modifierOptionForm.option_name.trim(),
      option_code:
        cleanCode(modifierOptionForm.option_code || modifierOptionForm.option_name) || null,
      price_adjustment: toNumber(modifierOptionForm.price_adjustment),
      cost_adjustment: toNumber(modifierOptionForm.cost_adjustment),
      sort_order:
        modifierOptionForm.sort_order.trim() === ""
          ? nextSortOrder(targetGroupOptions)
          : Number(modifierOptionForm.sort_order || 0),
      status: modifierOptionForm.status || "active",
      updated_at: new Date().toISOString(),
    };

    if (editingModifierOption) {
      const { error } = await supabase
        .from("pos_modifier_options")
        .update(payload)
        .eq("id", editingModifierOption.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("pos_modifier_options").insert(payload);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    await loadAll();
    setSaving(false);
    closeModifierOptionModal();
  };

  const toggleModifierOptionStatus = async (option: PosModifierOption) => {
    setMessage("");

    const nextStatus = option.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("pos_modifier_options")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", option.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };

  const deleteModifierOption = async (option: PosModifierOption) => {
    const confirmed = window.confirm("Delete this modifier option?");
    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("pos_modifier_options")
      .delete()
      .eq("id", option.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };


  const deleteModifierGroup = async (group: PosModifierGroup) => {
    const groupOptions = modifierOptions.filter(
      (option) => option.modifier_group_id === group.id,
    );

    const confirmed = window.confirm(
      groupOptions.length > 0
        ? `Delete "${group.group_name}" and its ${groupOptions.length} choice(s)? This cannot be undone.`
        : `Delete "${group.group_name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("pos_modifier_groups")
      .delete()
      .eq("id", group.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };


  const openAddSetupPack = () => {
    setEditingSetupPack(null);
    setSetupPackForm(emptySetupPackForm);
    setSetupPackModalOpen(true);
  };

  const openEditSetupPack = (pack: PosSetupPack) => {
    setEditingSetupPack(pack);
    setSetupPackForm({
      pack_name: pack.pack_name || "",
      pack_code: pack.pack_code || "",
      description: pack.description || "",
      status: pack.status || "active",
    });
    setSetupPackModalOpen(true);
  };

  const closeSetupPackModal = () => {
    if (saving) return;
    setEditingSetupPack(null);
    setSetupPackForm(emptySetupPackForm);
    setSetupPackModalOpen(false);
  };

  const saveSetupPack = async () => {
    setMessage("");

    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    if (!setupPackForm.pack_name.trim()) {
      setMessage("Setup pack name is required.");
      return;
    }

    setSaving(true);

    const payload = {
      company_id: companyId,
      pack_name: setupPackForm.pack_name.trim(),
      pack_code: cleanCode(setupPackForm.pack_code || setupPackForm.pack_name) || null,
      description: setupPackForm.description.trim() || null,
      status: setupPackForm.status || "active",
    };

    if (editingSetupPack) {
      const { error } = await supabase
        .from("pos_setup_packs")
        .update(payload)
        .eq("id", editingSetupPack.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("pos_setup_packs").insert(payload);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    await loadAll();
    setSaving(false);
    closeSetupPackModal();
  };

  const toggleSetupPackStatus = async (pack: PosSetupPack) => {
    setMessage("");

    const nextStatus = pack.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("pos_setup_packs")
      .update({ status: nextStatus })
      .eq("id", pack.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };

  const deleteSetupPack = async (pack: PosSetupPack) => {
    const productCount = products.filter((item) => item.setup_pack_id === pack.id).length;
    const confirmed = window.confirm(
      productCount > 0
        ? `Delete "${pack.pack_name}"? ${productCount} product(s) will be set back to None.`
        : `Delete "${pack.pack_name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setMessage("");

    if (productCount > 0) {
      const { error: productError } = await supabase
        .from("pos_menu_items")
        .update({ setup_pack_id: null, updated_at: new Date().toISOString() })
        .eq("setup_pack_id", pack.id);

      if (productError) {
        setMessage(productError.message);
        return;
      }
    }

    const { error: groupError } = await supabase
      .from("pos_setup_pack_groups")
      .delete()
      .eq("pack_id", pack.id);

    if (groupError) {
      setMessage(groupError.message);
      return;
    }

    const { error } = await supabase.from("pos_setup_packs").delete().eq("id", pack.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAll();
  };

  const openSetupPackGroups = (pack: PosSetupPack) => {
    setSelectedSetupPack(pack);
    setSetupPackGroupsModalOpen(true);
  };

  const closeSetupPackGroupsModal = () => {
    if (saving) return;
    setSelectedSetupPack(null);
    setSetupPackGroupsModalOpen(false);
  };

  const toggleSetupPackGroup = async (modifierGroupId: string, checked: boolean) => {
    if (!selectedSetupPack || !companyId) return;

    setMessage("");

    if (checked) {
      const currentGroups = setupPackGroups.filter(
        (item) => item.pack_id === selectedSetupPack.id,
      );

      const { error } = await supabase.from("pos_setup_pack_groups").insert({
        company_id: companyId,
        pack_id: selectedSetupPack.id,
        group_id: modifierGroupId,
      });

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("pos_setup_pack_groups")
        .delete()
        .eq("pack_id", selectedSetupPack.id)
        .eq("group_id", modifierGroupId);

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    await loadAll();
  };

  const readSheetRows = (workbook: XLSX.WorkBook, possibleNames: string[]) => {
    const sheetName =
      workbook.SheetNames.find((name) =>
        possibleNames.some((possible) => cleanCode(name) === cleanCode(possible)),
      ) || "";

    if (!sheetName) return [];

    return XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
      defval: "",
    });
  };

  const importPosWorkbook = async (file: File) => {
    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    setImporting(true);
    setMessage("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const settingsRows = readSheetRows(workbook, ["SETTINGS", "GENERAL", "POS_SETTINGS"]);
      const categoryRows = readSheetRows(workbook, ["CATEGORIES", "POS_CATEGORIES"]);
      const productRows = readSheetRows(workbook, ["PRODUCTS", "MENU_ITEMS", "POS_MENU_ITEMS"]);
      const tableRows = readSheetRows(workbook, ["TABLES", "POS_TABLES"]);
      const orderTypeRows = readSheetRows(workbook, ["ORDER_TYPES", "ORDERTYPES", "POS_ORDER_TYPES"]);
      const paymentRows = readSheetRows(workbook, ["PAYMENT_METHODS", "PAYMENTS", "POS_PAYMENT_METHODS"]);
      const stationRows = readSheetRows(workbook, ["PRODUCTION_STATIONS", "STATIONS", "POS_PRODUCTION_STATIONS"]);
      const routingRows = readSheetRows(workbook, ["CATEGORY_ROUTING", "ROUTING", "POS_CATEGORY_ROUTING"]);

      let importedCount = 0;

      for (const row of settingsRows) {
        const settingKey = normalizeText(getCell(row, ["setting_key", "key", "setting"]));
        const settingValue = normalizeText(getCell(row, ["setting_value", "value", "enabled"]));

        if (!settingKey) continue;

        await upsertSetting(settingKey, settingValue || "false");
        importedCount += 1;
      }

      let liveCategories = [...categories];

      for (const row of categoryRows) {
        const name = normalizeText(getCell(row, ["name", "category", "category_name"]));
        if (!name) continue;

        const code = normalizeText(getCell(row, ["category_code", "code"]));
        const description = normalizeText(getCell(row, ["description", "details"]));
        const sortOrder = Number(getCell(row, ["sort_order", "sort"]) || importedCount + 1);
        const requiresProductionRaw = getCell(row, ["requires_production", "queue_required", "queue", "production"]);
        const requiresProduction =
          requiresProductionRaw === "" ? true : normalizeBoolean(requiresProductionRaw);
        const status = normalizeStatus(getCell(row, ["status", "active"]));

        const existing = liveCategories.find(
          (item) =>
            cleanCode(item.category_code || "") === cleanCode(code || name) ||
            cleanCode(item.name) === cleanCode(name),
        );

        if (existing) {
          await supabase
            .from("pos_categories")
            .update({
              name,
              category_code: code || existing.category_code || makeCategoryCode(name),
              description: description || existing.description || null,
              requires_production: requiresProduction,
              sort_order: sortOrder,
              status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          const { data: created } = await supabase
            .from("pos_categories")
            .insert({
              company_id: companyId,
              name,
              category_code: code || makeCategoryCode(name),
              description: description || getPosterCategoryDescription(name),
              requires_production: requiresProduction,
              sort_order: sortOrder,
              status,
              updated_at: new Date().toISOString(),
            })
            .select("*")
            .single();

          if (created) liveCategories = [...liveCategories, created as PosCategory];
        }

        importedCount += 1;
      }

      for (const row of tableRows) {
        const tableName = normalizeText(getCell(row, ["table_name", "name", "table"]));
        if (!tableName) continue;

        const capacity = Number(getCell(row, ["capacity", "pax"]) || 0);
        const sortOrder = Number(getCell(row, ["sort_order", "sort"]) || importedCount + 1);
        const isActiveRaw = getCell(row, ["is_active", "active", "status"]);
        const isActive = isActiveRaw ? normalizeBoolean(isActiveRaw) : true;
        const existing = tables.find((item) => cleanCode(item.table_name) === cleanCode(tableName));

        if (existing) {
          await supabase
            .from("pos_tables")
            .update({ capacity, sort_order: sortOrder, is_active: isActive })
            .eq("id", existing.id);
        } else {
          await supabase.from("pos_tables").insert({
            company_id: companyId,
            table_name: tableName,
            capacity,
            status: "available",
            sort_order: sortOrder,
            is_active: isActive,
          });
        }

        importedCount += 1;
      }

      for (const row of orderTypeRows) {
        const name = normalizeText(getCell(row, ["name", "order_type", "type"]));
        const code = cleanCode(getCell(row, ["code", "order_type_code"]) || name);
        if (!name || !code) continue;

        const sortOrder = Number(getCell(row, ["sort_order", "sort"]) || importedCount + 1);
        const isActiveRaw = getCell(row, ["is_active", "active", "status"]);
        const isActive = isActiveRaw ? normalizeBoolean(isActiveRaw) : true;
        const existing = orderTypes.find((item) => cleanCode(item.code) === code);

        if (existing) {
          await supabase
            .from("pos_order_types")
            .update({ name, sort_order: sortOrder, is_active: isActive })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("pos_order_types")
            .insert({ company_id: companyId, name, code, sort_order: sortOrder, is_active: isActive });
        }

        importedCount += 1;
      }

      for (const row of paymentRows) {
        const name = normalizeText(getCell(row, ["name", "payment_method", "method"]));
        const code = cleanCode(getCell(row, ["code", "payment_code"]) || name);
        if (!name || !code) continue;

        const sortOrder = Number(getCell(row, ["sort_order", "sort"]) || importedCount + 1);
        const isActiveRaw = getCell(row, ["is_active", "active", "status"]);
        const isActive = isActiveRaw ? normalizeBoolean(isActiveRaw) : true;
        const existing = paymentMethods.find((item) => cleanCode(item.code) === code);

        if (existing) {
          await supabase
            .from("pos_payment_methods")
            .update({ name, sort_order: sortOrder, is_active: isActive })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("pos_payment_methods")
            .insert({ company_id: companyId, name, code, sort_order: sortOrder, is_active: isActive });
        }

        importedCount += 1;
      }

      let liveStations = [...productionStations];

      for (const row of stationRows) {
        const name = normalizeText(getCell(row, ["name", "station_name", "station"]));
        const code = cleanCode(getCell(row, ["code", "station_code"]) || name);
        if (!name || !code) continue;

        const printerName = normalizeText(getCell(row, ["printer_name", "printer"]));
        const sortOrder = Number(getCell(row, ["sort_order", "sort"]) || importedCount + 1);
        const isActiveRaw = getCell(row, ["is_active", "active", "status"]);
        const isActive = isActiveRaw ? normalizeBoolean(isActiveRaw) : true;
        const existing = liveStations.find((item) => cleanCode(item.code) === code);

        if (existing) {
          await supabase
            .from("pos_production_stations")
            .update({
              name,
              printer_name: printerName || null,
              sort_order: sortOrder,
              is_active: isActive,
            })
            .eq("id", existing.id);
        } else {
          const { data: created } = await supabase
            .from("pos_production_stations")
            .insert({
              company_id: companyId,
              name,
              code,
              printer_name: printerName || null,
              sort_order: sortOrder,
              is_active: isActive,
            })
            .select("*")
            .single();

          if (created) liveStations = [...liveStations, created as PosOption];
        }

        importedCount += 1;
      }

      const categoryMap = new Map<string, PosCategory>();
      liveCategories.forEach((category) => {
        categoryMap.set(cleanCode(category.name), category);
        if (category.category_code) categoryMap.set(cleanCode(category.category_code), category);
      });

      for (const row of productRows) {
        const name = normalizeText(
          getCell(row, ["name", "item_name", "product_name", "title", "dish", "product"]),
        );

        if (!name) continue;

        const itemCode = normalizeText(getCell(row, ["item_code", "code", "sku", "poster_id", "product_id", "id"]));
        const categoryText = normalizeText(getCell(row, ["category", "category_name", "group", "department", "menu_category"]));
        let category = categoryMap.get(cleanCode(categoryText));

        if (!category && categoryText) {
          const { data: createdCategory, error: categoryCreateError } = await supabase
            .from("pos_categories")
            .insert({
              company_id: companyId,
              name: categoryText,
              category_code: makeCategoryCode(categoryText),
              description: getPosterCategoryDescription(categoryText),
              requires_production: true,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .select("*")
            .single();

          if (categoryCreateError) {
            setMessage(categoryCreateError.message);
            setImporting(false);
            return;
          }

          category = createdCategory as PosCategory;
          liveCategories = [...liveCategories, category];
          categoryMap.set(cleanCode(category.name), category);
          if (category.category_code) categoryMap.set(cleanCode(category.category_code), category);
        }

        if (!category) continue;

        const duplicate = products.find((item) => {
          const sameCode = itemCode && cleanCode(item.item_code || "") === cleanCode(itemCode);
          const sameName = cleanCode(item.name) === cleanCode(name);
          return sameCode || sameName;
        });

        const payload = {
          company_id: companyId,
          category_id: category.id,
          item_code: itemCode || null,
          name,
          description: normalizeText(getCell(row, ["description", "recipe", "details", "note", "notes"])) || null,
          price: toNumber(getCell(row, ["price", "selling_price", "retail_price", "sale_price", "amount"])),
          cost: toNumber(getCell(row, ["cost", "cost_without_vat", "components_cost", "food_cost", "unit_cost"])),
          image_url: normalizeText(getCell(row, ["image_url", "image", "photo", "photo_url", "picture", "picture_url"])) || null,
          is_best_seller: normalizeBoolean(getCell(row, ["is_best_seller", "best_seller", "bestseller", "best"])),
          is_hot: normalizeBoolean(getCell(row, ["is_hot", "hot", "spicy"])),
          is_new: normalizeBoolean(getCell(row, ["is_new", "new", "new_item"])),
          is_inventory_tracked: normalizeBoolean(getCell(row, ["is_inventory_tracked", "inventory_tracked", "track_inventory", "tracked"])),
          status: normalizeStatus(getCell(row, ["status", "state"])),
          updated_at: new Date().toISOString(),
        };

        if (duplicate) {
          await supabase.from("pos_menu_items").update(payload).eq("id", duplicate.id);
        } else {
          await supabase.from("pos_menu_items").insert(payload);
        }

        importedCount += 1;
      }

      for (const row of routingRows) {
        const categoryName = normalizeText(getCell(row, ["category", "category_name", "name"]));
        const categoryCode = cleanCode(getCell(row, ["category_code", "code"]));
        const routeText = getCell(row, ["routing", "production", "requires_production", "queue_required"]);
        const stationCode = cleanCode(getCell(row, ["station", "station_code", "production_station", "production_area"]));

        if (!categoryName && !categoryCode) continue;

        const category = liveCategories.find((item) => {
          const sameCode = categoryCode && cleanCode(item.category_code || "") === categoryCode;
          const sameName = categoryName && cleanCode(item.name) === cleanCode(categoryName);
          return sameCode || sameName;
        });

        if (!category) continue;

        const requiresProduction = routeText ? normalizeBoolean(routeText) : Boolean(stationCode);
        const station = liveStations.find(
          (item) => cleanCode(item.code) === stationCode || cleanCode(item.name) === stationCode,
        );

        await supabase
          .from("pos_categories")
          .update({
            requires_production: requiresProduction,
            production_station_id: requiresProduction ? station?.id || null : null,
            production_area: requiresProduction ? station?.code || stationCode || null : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", category.id);

        importedCount += 1;
      }

      await loadAll();
      setMessage(`POS master setup import complete. ${importedCount} row(s) processed.`);
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Import failed. Make sure the workbook uses Categories, Products, Stations, Routing, Tables, PaymentMethods, OrderTypes, and General sheets.",
      );
    } finally {
      setImporting(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const upsertSetting = async (key: string, value: string) => {
    const existing = settings.find((setting) => setting.setting_key === key);

    if (existing) {
      await supabase
        .from("pos_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("pos_settings").insert({
        company_id: companyId,
        setting_key: key,
        setting_value: value,
      });
    }
  };

  const exportWorkbook = () => {
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        settings.map((setting) => ({
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
        })),
      ),
      "General",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        categories.map((category) => ({
          name: category.name,
          category_code: category.category_code || "",
          description: category.description || "",
          requires_production: category.requires_production ? "true" : "false",
          station: category.production_area || "",
          status: category.status || "active",
          sort_order: category.sort_order || "",
        })),
      ),
      "Categories",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        products.map((item) => ({
          item_code: item.item_code || "",
          name: item.name,
          category: item.category?.name || "",
          description: item.description || "",
          price: item.price || 0,
          cost: item.cost || 0,
          image_url: item.image_url || "",
          is_best_seller: item.is_best_seller ? "true" : "false",
          is_hot: item.is_hot ? "true" : "false",
          is_new: item.is_new ? "true" : "false",
          is_inventory_tracked: item.is_inventory_tracked ? "true" : "false",
          setup_pack: setupPacks.find((pack) => pack.id === item.setup_pack_id)?.pack_name || "",
          setup_pack_code: setupPacks.find((pack) => pack.id === item.setup_pack_id)?.pack_code || "",
          status: item.status || "active",
        })),
      ),
      "Products",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        setupPacks.map((pack) => ({
          pack_name: pack.pack_name,
          pack_code: pack.pack_code || "",
          description: pack.description || "",
          status: pack.status || "active",
        })),
      ),
      "SetupPacks",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        setupPackGroups.map((row) => {
          const pack = setupPacks.find((item) => item.id === row.pack_id);
          const group = modifierGroups.find((item) => item.id === row.group_id);
          return {
            setup_pack: pack?.pack_name || "",
            setup_pack_code: pack?.pack_code || "",
            choice_group: group?.group_name || "",
            choice_group_code: group?.group_code || "",
          };
        }),
      ),
      "SetupPackGroups",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        productionStations.map((station) => ({
          name: station.name,
          code: station.code,
          printer_name: station.printer_name || "",
          is_active: station.is_active ? "true" : "false",
          sort_order: station.sort_order || "",
        })),
      ),
      "Stations",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        categories.map((category) => ({
          category: category.name,
          category_code: category.category_code || "",
          routing: category.requires_production ? "QUEUE_REQUIRED" : "DIRECT_RELEASE",
          station: category.production_area || "",
        })),
      ),
      "Routing",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        tables.map((table) => ({
          table_name: table.table_name,
          capacity: table.capacity || 0,
          status: table.status,
          is_active: table.is_active ? "true" : "false",
          sort_order: table.sort_order || "",
        })),
      ),
      "Tables",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        paymentMethods.map((method) => ({
          name: method.name,
          code: method.code,
          is_active: method.is_active ? "true" : "false",
          sort_order: method.sort_order || "",
        })),
      ),
      "PaymentMethods",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        orderTypes.map((type) => ({
          name: type.name,
          code: type.code,
          is_active: type.is_active ? "true" : "false",
          sort_order: type.sort_order || "",
        })),
      ),
      "OrderTypes",
    );

    XLSX.writeFile(
      workbook,
      `POS_MASTER_SETUP_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();

    if (!term) return categories;

    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(term) ||
        String(category.category_code || "").toLowerCase().includes(term) ||
        String(category.description || "").toLowerCase().includes(term) ||
        String(category.status || "").toLowerCase().includes(term)
      );
    });
  }, [categories, categorySearch]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();

    return products.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        String(item.item_code || "").toLowerCase().includes(term) ||
        String(item.description || "").toLowerCase().includes(term) ||
        String(item.category?.name || "").toLowerCase().includes(term);

      const matchesCategory =
        productCategoryFilter === "all" || item.category_id === productCategoryFilter;

      const matchesStatus =
        productStatusFilter === "all" || item.status === productStatusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, productSearch, productCategoryFilter, productStatusFilter]);


  const filteredModifierGroups = useMemo(() => {
    const term = modifierSearch.trim().toLowerCase();

    if (!term) return modifierGroups;

    return modifierGroups.filter((group) => {
      return (
        group.group_name.toLowerCase().includes(term) ||
        String(group.group_code || "").toLowerCase().includes(term) ||
        String(group.selection_type || "").toLowerCase().includes(term) ||
        String(group.status || "").toLowerCase().includes(term)
      );
    });
  }, [modifierGroups, modifierSearch]);

  const filteredSetupPacks = useMemo(() => {
    const term = setupPackSearch.trim().toLowerCase();

    if (!term) return setupPacks;

    return setupPacks.filter((pack) => {
      return (
        pack.pack_name.toLowerCase().includes(term) ||
        String(pack.pack_code || "").toLowerCase().includes(term) ||
        String(pack.description || "").toLowerCase().includes(term) ||
        String(pack.status || "").toLowerCase().includes(term)
      );
    });
  }, [setupPacks, setupPackSearch]);

  const activeCategories = categories.filter((category) => category.status === "active");
  const activeProducts = products.filter((item) => item.status === "active");
  const routedCategories = categories.filter((category) => category.requires_production !== false);
  const directCategories = categories.filter((category) => category.requires_production === false);

  return (
    <PageGuard moduleKey="pos_settings">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="POS / SETUP CENTER" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  POS
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  POS Setup Center
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Configure POS behavior, categories, products, stations, routing,
                  payments, setup packs, tables, and master import/export from one controlled setup page.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) importPosWorkbook(file);
                  }}
                />

                <button
                  onClick={() => excelInputRef.current?.click()}
                  disabled={importing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                >
                  <Upload size={16} />
                  {importing ? "Importing..." : "Import Workbook"}
                </button>

                <button
                  onClick={exportWorkbook}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <Download size={16} />
                  Export Workbook
                </button>

                <button
                  onClick={loadAll}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </section>

            {message && (
              <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700 shadow-sm">
                {message}
              </section>
            )}

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Categories" value={String(categories.length)} helper={`${routedCategories.length} queued • ${directCategories.length} direct`} />
              <KpiCard label="Products" value={String(products.length)} helper={`${activeProducts.length} active menu items`} tone="success" />
              <KpiCard label="Stations" value={String(productionStations.length)} helper="Kitchen, bar, desk, service stations" tone="info" />
              <KpiCard label="Payments" value={String(paymentMethods.length)} helper="Active and inactive payment methods" tone="warning" />
            </section>

            <section className="mb-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex min-w-max gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
                      activeTab === tab.key
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            {loading ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500 shadow-sm">
                Loading POS setup center...
              </section>
            ) : (
              <>
                {activeTab === "general" && (
                  <GeneralTab
                    settings={settings}
                    orderTypes={orderTypes}
                    paymentMethods={paymentMethods}
                    productionStations={productionStations}
                    getSettingValue={getSettingValue}
                    saveSetting={saveSetting}
                  />
                )}

                {activeTab === "categories" && (
                  <CategoriesTab
                    categories={filteredCategories}
                    allCategories={categories}
                    categorySearch={categorySearch}
                    setCategorySearch={setCategorySearch}
                    openAddCategory={openAddCategory}
                    openEditCategory={openEditCategory}
                    toggleCategoryStatus={toggleCategoryStatus}
                  />
                )}

                {activeTab === "products" && (
                  <ProductsTab
                    products={filteredProducts}
                    allProducts={products}
                    categories={categories}
                    setupPacks={setupPacks}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    productCategoryFilter={productCategoryFilter}
                    setProductCategoryFilter={setProductCategoryFilter}
                    productStatusFilter={productStatusFilter}
                    setProductStatusFilter={setProductStatusFilter}
                    openAddProduct={openAddProduct}
                    openEditProduct={openEditProduct}
                    toggleProductStatus={toggleProductStatus}
                  />
                )}

                {activeTab === "choice_groups" && (
                  <ModifiersTab
                    groups={filteredModifierGroups}
                    allGroups={modifierGroups}
                    options={modifierOptions}
                    modifierSearch={modifierSearch}
                    setModifierSearch={setModifierSearch}
                    openAddGroup={openAddModifierGroup}
                    openEditGroup={openEditModifierGroup}
                    toggleGroupStatus={toggleModifierGroupStatus}
                    deleteGroup={deleteModifierGroup}
                    openAddOption={openAddModifierOption}
                    openEditOption={openEditModifierOption}
                    toggleOptionStatus={toggleModifierOptionStatus}
                    deleteOption={deleteModifierOption}
                  />
                )}

                {activeTab === "setup_packs" && (
                  <SetupPacksTab
                    packs={filteredSetupPacks}
                    allPacks={setupPacks}
                    groups={modifierGroups}
                    packGroups={setupPackGroups}
                    products={products}
                    setupPackSearch={setupPackSearch}
                    setSetupPackSearch={setSetupPackSearch}
                    openAddPack={openAddSetupPack}
                    openEditPack={openEditSetupPack}
                    togglePackStatus={toggleSetupPackStatus}
                    deletePack={deleteSetupPack}
                    openAssignGroups={openSetupPackGroups}
                  />
                )}

                {activeTab === "stations" && (
                  <StationsTab
                    productionStations={productionStations}
                    newStationName={newStationName}
                    setNewStationName={setNewStationName}
                    newStationCode={newStationCode}
                    setNewStationCode={setNewStationCode}
                    newPrinterName={newPrinterName}
                    setNewPrinterName={setNewPrinterName}
                    addStation={() => addOption("pos_production_stations")}
                    toggleActive={toggleActive}
                    deleteRow={deleteRow}
                  />
                )}

                {activeTab === "routing" && (
                  <RoutingTab
                    categories={categories}
                    productionStations={productionStations}
                    onSave={saveCategoryRouting}
                  />
                )}

                {activeTab === "payments" && (
                  <PaymentsTab
                    paymentMethods={paymentMethods}
                    orderTypes={orderTypes}
                    newPaymentName={newPaymentName}
                    setNewPaymentName={setNewPaymentName}
                    newPaymentCode={newPaymentCode}
                    setNewPaymentCode={setNewPaymentCode}
                    newOrderTypeName={newOrderTypeName}
                    setNewOrderTypeName={setNewOrderTypeName}
                    newOrderTypeCode={newOrderTypeCode}
                    setNewOrderTypeCode={setNewOrderTypeCode}
                    addPayment={() => addOption("pos_payment_methods")}
                    addOrderType={() => addOption("pos_order_types")}
                    toggleActive={toggleActive}
                    deleteRow={deleteRow}
                  />
                )}

                {activeTab === "tables" && (
                  <TablesTab
                    tables={tables}
                    newTableName={newTableName}
                    setNewTableName={setNewTableName}
                    newTableCapacity={newTableCapacity}
                    setNewTableCapacity={setNewTableCapacity}
                    addTable={addTable}
                    toggleActive={toggleActive}
                    deleteRow={deleteRow}
                  />
                )}

                {activeTab === "import_export" && (
                  <ImportExportTab
                    importing={importing}
                    importClick={() => excelInputRef.current?.click()}
                    exportWorkbook={exportWorkbook}
                  />
                )}
              </>
            )}
          </div>
        </main>

        {categoryModalOpen && (
          <CategoryModal
            form={categoryForm}
            setForm={setCategoryForm}
            editing={Boolean(editingCategory)}
            productionStations={productionStations}
            saving={saving}
            onClose={closeCategoryModal}
            onSave={saveCategory}
          />
        )}

        {modifierGroupModalOpen && (
          <ModifierGroupModal
            form={modifierGroupForm}
            setForm={setModifierGroupForm}
            editing={Boolean(editingModifierGroup)}
            saving={saving}
            onClose={closeModifierGroupModal}
            onSave={saveModifierGroup}
          />
        )}

        {modifierOptionModalOpen && (
          <ModifierOptionModal
            form={modifierOptionForm}
            setForm={setModifierOptionForm}
            editing={Boolean(editingModifierOption)}
            saving={saving}
            groupName={
              modifierGroups.find((group) => group.id === selectedModifierGroupId)
                ?.group_name || "Choice Group"
            }
            onClose={closeModifierOptionModal}
            onSave={saveModifierOption}
          />
        )}

        {setupPackModalOpen && (
          <SetupPackModal
            form={setupPackForm}
            setForm={setSetupPackForm}
            editing={Boolean(editingSetupPack)}
            saving={saving}
            onClose={closeSetupPackModal}
            onSave={saveSetupPack}
          />
        )}

        {setupPackGroupsModalOpen && selectedSetupPack && (
          <SetupPackGroupsModal
            pack={selectedSetupPack}
            groups={modifierGroups}
            packGroups={setupPackGroups}
            options={modifierOptions}
            saving={saving}
            onToggle={toggleSetupPackGroup}
            onClose={closeSetupPackGroupsModal}
          />
        )}

        {productModalOpen && (
          <ProductModal
            form={productForm}
            setForm={setProductForm}
            editing={Boolean(editingProduct)}
            categories={categories}
            setupPacks={setupPacks}
            saving={saving}
            uploadingImage={uploadingImage}
            imageInputRef={imageInputRef}
            uploadImage={uploadImage}
            onClose={closeProductModal}
            onSave={saveProduct}
          />
        )}
      </div>
    </PageGuard>
  );
}

function GeneralTab({
  settings,
  orderTypes,
  paymentMethods,
  productionStations,
  getSettingValue,
  saveSetting,
}: {
  settings: PosSetting[];
  orderTypes: PosOption[];
  paymentMethods: PosOption[];
  productionStations: PosOption[];
  getSettingValue: (key: string) => string;
  saveSetting: (key: string, value: string) => void;
}) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            General
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Feature Controls
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Turn POS capabilities on or off without changing terminal code.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-2">
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

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Defaults
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Terminal Defaults
          </h2>
        </div>

        <div className="space-y-4 p-6">
          <DefaultSelect
            label="Default Order Type"
            value={getSettingValue("default_order_type")}
            options={orderTypes}
            onSave={(value) => saveSetting("default_order_type", value)}
          />

          <DefaultSelect
            label="Default Payment Method"
            value={getSettingValue("default_payment_method")}
            options={paymentMethods}
            onSave={(value) => saveSetting("default_payment_method", value)}
          />

          <DefaultSelect
            label="Default Production Station"
            value={getSettingValue("default_production_station")}
            options={productionStations}
            onSave={(value) => saveSetting("default_production_station", value)}
          />

          <DefaultInput
            label="Service Charge Percent"
            value={getSettingValue("service_charge_percent")}
            onSave={(value) => saveSetting("service_charge_percent", value)}
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold leading-5 text-slate-600">
            {settings.length} saved setting records detected.
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoriesTab({
  categories,
  allCategories,
  categorySearch,
  setCategorySearch,
  openAddCategory,
  openEditCategory,
  toggleCategoryStatus,
}: {
  categories: PosCategory[];
  allCategories: PosCategory[];
  categorySearch: string;
  setCategorySearch: (value: string) => void;
  openAddCategory: () => void;
  openEditCategory: (category: PosCategory) => void;
  toggleCategoryStatus: (category: PosCategory) => void;
}) {
  const activeCount = allCategories.filter((category) => category.status === "active").length;
  const inactiveCount = allCategories.length - activeCount;
  const routedCount = allCategories.filter((category) => category.requires_production !== false).length;
  const directCount = allCategories.filter((category) => category.requires_production === false).length;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Categories" value={String(allCategories.length)} helper="All configured groups." />
        <KpiCard label="Active" value={String(activeCount)} helper="Visible in setup." tone="success" />
        <KpiCard label="Inactive" value={String(inactiveCount)} helper="Hidden or disabled." tone="danger" />
        <KpiCard label="Queue / Direct" value={`${routedCount}/${directCount}`} helper="Queued vs direct release." tone="warning" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Search category, code, description..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pl-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <button
            onClick={openAddCategory}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            <Plus size={16} />
            Add Category
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Category Ledger
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            POS Categories
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Category", "Code", "Production", "Station", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm font-semibold text-slate-500">
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="transition-all duration-200 hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">{category.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{category.description || "POS Category"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone="info">{category.category_code || "NO CODE"}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={category.requires_production === false ? "neutral" : "success"}>
                        {category.requires_production === false ? "DIRECT RELEASE" : "QUEUE REQUIRED"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">{category.production_area || "—"}</td>
                    <td className="px-5 py-4">
                      <Badge tone={category.status === "active" ? "success" : "neutral"}>{category.status || "active"}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditCategory(category)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => toggleCategoryStatus(category)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                          {category.status === "active" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProductsTab({
  products,
  allProducts,
  categories,
  setupPacks,
  productSearch,
  setProductSearch,
  productCategoryFilter,
  setProductCategoryFilter,
  productStatusFilter,
  setProductStatusFilter,
  openAddProduct,
  openEditProduct,
  toggleProductStatus,
}: {
  products: PosMenuItem[];
  allProducts: PosMenuItem[];
  categories: PosCategory[];
  setupPacks: PosSetupPack[];
  productSearch: string;
  setProductSearch: (value: string) => void;
  productCategoryFilter: string;
  setProductCategoryFilter: (value: string) => void;
  productStatusFilter: string;
  setProductStatusFilter: (value: string) => void;
  openAddProduct: () => void;
  openEditProduct: (product: PosMenuItem) => void;
  toggleProductStatus: (product: PosMenuItem) => void;
}) {
  const activeCount = allProducts.filter((item) => item.status === "active").length;
  const inactiveCount = allProducts.length - activeCount;
  const withImageCount = allProducts.filter((item) => item.image_url).length;
  const catalogValue = allProducts.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const setupPackMap = useMemo(() => new Map(setupPacks.map((pack) => [pack.id, pack])), [setupPacks]);
  const withSetupPackCount = allProducts.filter((item) => item.setup_pack_id).length;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Products" value={String(allProducts.length)} />
        <KpiCard label="Active" value={String(activeCount)} tone="success" />
        <KpiCard label="Inactive" value={String(inactiveCount)} tone="danger" />
        <KpiCard label="Catalog Value" value={peso(catalogValue)} helper={`${withImageCount} with images`} tone="warning" />
        <KpiCard label="With Setup Pack" value={String(withSetupPackCount)} helper="Ready for modifier modal" tone="info" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3 xl:max-w-4xl">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search product..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pl-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <select
              value={productCategoryFilter}
              onChange={(event) => setProductCategoryFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={productStatusFilter}
              onChange={(event) => setProductStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            onClick={openAddProduct}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Product Ledger
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            POS Products
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr>
                {["Product", "Category", "Setup Pack", "Price", "Cost", "Badges", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center text-sm font-semibold text-slate-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((item) => (
                  <tr key={item.id} className="transition-all duration-200 hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-950">{item.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.item_code || "No code"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{item.category?.name || "—"}</td>
                    <td className="px-5 py-4">
                      {item.setup_pack_id && setupPackMap.get(item.setup_pack_id) ? (
                        <Badge tone="info">{setupPackMap.get(item.setup_pack_id)?.pack_name}</Badge>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-950">{peso(item.price)}</td>
                    <td className="px-5 py-4">{peso(item.cost || 0)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.is_best_seller && <Badge tone="success">BEST</Badge>}
                        {item.is_hot && <Badge tone="danger">HOT</Badge>}
                        {item.is_new && <Badge tone="info">NEW</Badge>}
                        {!item.is_best_seller && !item.is_hot && !item.is_new && <span className="text-xs font-semibold text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={item.status === "active" ? "success" : "neutral"}>{item.status || "active"}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditProduct(item)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => toggleProductStatus(item)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                          {item.status === "active" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}


function ModifiersTab({
  groups,
  allGroups,
  options,
  modifierSearch,
  setModifierSearch,
  openAddGroup,
  openEditGroup,
  toggleGroupStatus,
  deleteGroup,
  openAddOption,
  openEditOption,
  toggleOptionStatus,
  deleteOption,
}: {
  groups: PosModifierGroup[];
  allGroups: PosModifierGroup[];
  options: PosModifierOption[];
  modifierSearch: string;
  setModifierSearch: (value: string) => void;
  openAddGroup: () => void;
  openEditGroup: (group: PosModifierGroup) => void;
  toggleGroupStatus: (group: PosModifierGroup) => void;
  deleteGroup: (group: PosModifierGroup) => void;
  openAddOption: (modifierGroupId: string) => void;
  openEditOption: (option: PosModifierOption) => void;
  toggleOptionStatus: (option: PosModifierOption) => void;
  deleteOption: (option: PosModifierOption) => void;
}) {
  const activeGroups = allGroups.filter((group) => group.status === "active");
  const requiredGroups = allGroups.filter((group) => group.is_required);
  const activeOptions = options.filter((option) => option.status === "active");

  const optionsByGroup = useMemo(() => {
    const map = new Map<string, PosModifierOption[]>();

    options.forEach((option) => {
      const current = map.get(option.modifier_group_id) || [];
      map.set(option.modifier_group_id, [...current, option]);
    });

    return map;
  }, [options]);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Choice Groups" value={String(allGroups.length)} helper={`${activeGroups.length} active groups`} />
        <KpiCard label="Choices" value={String(options.length)} helper={`${activeOptions.length} active options`} tone="success" />
        <KpiCard label="Required Choices" value={String(requiredGroups.length)} helper="Must be selected before add to cart." tone="warning" />
        <KpiCard label="Setup Packs" value="Smart" helper="Template-ready, no hardcoded setup." tone="info" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              value={modifierSearch}
              onChange={(event) => setModifierSearch(event.target.value)}
              placeholder="Search setup choice group, code, type..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pl-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <button
            onClick={openAddGroup}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            <Plus size={16} />
            Add Choice Group
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {groups.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500 shadow-sm">
            No choice groups found. Create reusable groups like Egg Option, Rice Type, Bread Choice, Sugar Level, or any client-specific setup.
          </div>
        ) : (
          groups.map((group) => {
            const groupOptions = optionsByGroup.get(group.id) || [];
            const activeGroupOptions = groupOptions.filter((option) => option.status === "active");

            return (
              <div key={group.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Choice Group
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      {group.group_name}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="info">{group.group_code || "NO CODE"}</Badge>
                      <Badge tone={group.selection_type === "single" ? "success" : "warning"}>
                        {group.selection_type.replaceAll("_", " ")}
                      </Badge>
                      <Badge tone={group.is_required ? "warning" : "neutral"}>
                        {group.is_required ? "REQUIRED" : "OPTIONAL"}
                      </Badge>
                      <Badge tone={group.status === "active" ? "success" : "neutral"}>
                        {group.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      Min {group.min_select} • Max {group.max_select} • {activeGroupOptions.length} active options
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openAddOption(group.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                    >
                      <Plus size={15} />
                      Add Choice
                    </button>

                    <button
                      onClick={() => openEditGroup(group)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      <Edit size={15} />
                    </button>

                    <button
                      onClick={() => toggleGroupStatus(group)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      {group.status === "active" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                    </button>

                    <button
                      onClick={() => deleteGroup(group)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-[0.98]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Option", "Code", "Price Adj.", "Cost Adj.", "Status", "Actions"].map((header) => (
                          <th key={header} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                      {groupOptions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                            No choices yet. Add choices for this group.
                          </td>
                        </tr>
                      ) : (
                        groupOptions.map((option) => (
                          <tr key={option.id} className="transition-all duration-200 hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <p className="font-black text-slate-950">{option.option_name}</p>
                              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                Sort {option.sort_order ?? 0}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <Badge tone="info">{option.option_code || "NO CODE"}</Badge>
                            </td>
                            <td className="px-5 py-4 font-black text-slate-950">
                              {peso(option.price_adjustment)}
                            </td>
                            <td className="px-5 py-4">
                              {peso(option.cost_adjustment)}
                            </td>
                            <td className="px-5 py-4">
                              <Badge tone={option.status === "active" ? "success" : "neutral"}>{option.status}</Badge>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openEditOption(option)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                                  <Edit size={15} />
                                </button>
                                <button onClick={() => toggleOptionStatus(option)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                                  {option.status === "active" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                                </button>
                                <button onClick={() => deleteOption(option)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-[0.98]">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}


function SetupPacksTab({
  packs,
  allPacks,
  groups,
  packGroups,
  products,
  setupPackSearch,
  setSetupPackSearch,
  openAddPack,
  openEditPack,
  togglePackStatus,
  deletePack,
  openAssignGroups,
}: {
  packs: PosSetupPack[];
  allPacks: PosSetupPack[];
  groups: PosModifierGroup[];
  packGroups: PosSetupPackGroup[];
  products: PosMenuItem[];
  setupPackSearch: string;
  setSetupPackSearch: (value: string) => void;
  openAddPack: () => void;
  openEditPack: (pack: PosSetupPack) => void;
  togglePackStatus: (pack: PosSetupPack) => void;
  deletePack: (pack: PosSetupPack) => void;
  openAssignGroups: (pack: PosSetupPack) => void;
}) {
  const activePacks = allPacks.filter((pack) => pack.status === "active");
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

  const groupsByPack = useMemo(() => {
    const map = new Map<string, PosSetupPackGroup[]>();

    packGroups.forEach((row) => {
      const current = map.get(row.pack_id) || [];
      map.set(row.pack_id, [...current, row]);
    });

    return map;
  }, [packGroups]);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Setup Packs" value={String(allPacks.length)} helper={`${activePacks.length} active packs`} tone="info" />
        <KpiCard label="Choice Groups" value={String(groups.length)} helper="Reusable option groups" />
        <KpiCard label="Assigned Groups" value={String(packGroups.length)} helper="Pack to group links" tone="success" />
        <KpiCard label="Product Links" value={String(products.filter((item) => item.setup_pack_id).length)} helper="Products with setup pack" tone="warning" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              OPSCORE Smart Setup Packs
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Import Menu → Assign Setup Packs → Go Live
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
              Setup Packs are templates made of Choice Groups. Products get assigned one pack. Beer and simple direct-sale items can stay as None.
            </p>
          </div>

          <button
            onClick={openAddPack}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            <Plus size={16} />
            Add Setup Pack
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative w-full lg:max-w-md">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            value={setupPackSearch}
            onChange={(event) => setSetupPackSearch(event.target.value)}
            placeholder="Search setup pack, code, description..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pl-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Setup Pack Ledger
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Reusable Product Templates
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr>
                {["Setup Pack", "Choice Groups", "Products", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {packs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-sm font-semibold text-slate-500">
                    No setup packs found. Create packs like Breakfast Pack, Rice Meal Pack, Coffee Pack, or Cocktail Pack.
                  </td>
                </tr>
              ) : (
                packs.map((pack) => {
                  const assignedRows = groupsByPack.get(pack.id) || [];
                  const productCount = products.filter((item) => item.setup_pack_id === pack.id).length;

                  return (
                    <tr key={pack.id} className="transition-all duration-200 hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">{pack.pack_name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{pack.pack_code || "No code"}</p>
                        {pack.description && <p className="mt-1 max-w-xl text-xs font-medium text-slate-500">{pack.description}</p>}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex max-w-md flex-wrap gap-1.5">
                          {assignedRows.length === 0 ? (
                            <span className="text-xs font-semibold text-slate-400">No groups assigned</span>
                          ) : (
                            assignedRows.map((row) => (
                              <Badge key={row.id} tone="info">
                                {groupMap.get(row.group_id)?.group_name || "Unknown Group"}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-black text-slate-950">{productCount}</td>
                      <td className="px-5 py-4">
                        <Badge tone={pack.status === "active" ? "success" : "neutral"}>{pack.status || "active"}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openAssignGroups(pack)} className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]">
                            Assign Groups
                          </button>
                          <button onClick={() => openEditPack(pack)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => togglePackStatus(pack)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
                            {pack.status === "active" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                          </button>
                          <button onClick={() => deletePack(pack)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-[0.98]">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StationsTab({
  productionStations,
  newStationName,
  setNewStationName,
  newStationCode,
  setNewStationCode,
  newPrinterName,
  setNewPrinterName,
  addStation,
  toggleActive,
  deleteRow,
}: {
  productionStations: PosOption[];
  newStationName: string;
  setNewStationName: (value: string) => void;
  newStationCode: string;
  setNewStationCode: (value: string) => void;
  newPrinterName: string;
  setNewPrinterName: (value: string) => void;
  addStation: () => void;
  toggleActive: (tableName: string, id: string, current: boolean) => void;
  deleteRow: (tableName: string, id: string) => void;
}) {
  return (
    <SettingsCollection
      label="Stations"
      title="Production Stations"
      helper="Create stations for kitchen, bar, front desk, housekeeping, maintenance, and future service routing."
      inputs={
        <>
          <input value={newStationName} onChange={(e) => setNewStationName(e.target.value)} placeholder="Station name" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          <input value={newStationCode} onChange={(e) => setNewStationCode(e.target.value)} placeholder="Code" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          <input value={newPrinterName} onChange={(e) => setNewPrinterName(e.target.value)} placeholder="Printer name optional" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          <button onClick={addStation} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]">
            <Plus size={16} />
            Add Station
          </button>
        </>
      }
    >
      {productionStations.map((item) => (
        <RowCard key={item.id} title={item.name} helper={`${item.code}${item.printer_name ? ` • ${item.printer_name}` : ""}`} isActive={item.is_active} onToggle={() => toggleActive("pos_production_stations", item.id, item.is_active)} onDelete={() => deleteRow("pos_production_stations", item.id)} />
      ))}
    </SettingsCollection>
  );
}

function RoutingTab({
  categories,
  productionStations,
  onSave,
}: {
  categories: PosCategory[];
  productionStations: PosOption[];
  onSave: (categoryId: string, requiresProduction: boolean, productionStationId: string | null) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Routing
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950">
          Category Routing
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
          Set each category as Queue Required or Direct Release. Queue required
          items go to the selected production station.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[900px]">
          <thead className="bg-slate-50">
            <tr>
              {["Category", "Release Mode", "Station", "Current Route"].map((header) => (
                <th key={header} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-14 text-center text-sm font-semibold text-slate-500">
                  No categories found. Add categories first.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <CategoryRoutingRow key={category.id} category={category} productionStations={productionStations} onSave={onSave} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PaymentsTab({
  paymentMethods,
  orderTypes,
  newPaymentName,
  setNewPaymentName,
  newPaymentCode,
  setNewPaymentCode,
  newOrderTypeName,
  setNewOrderTypeName,
  newOrderTypeCode,
  setNewOrderTypeCode,
  addPayment,
  addOrderType,
  toggleActive,
  deleteRow,
}: {
  paymentMethods: PosOption[];
  orderTypes: PosOption[];
  newPaymentName: string;
  setNewPaymentName: (value: string) => void;
  newPaymentCode: string;
  setNewPaymentCode: (value: string) => void;
  newOrderTypeName: string;
  setNewOrderTypeName: (value: string) => void;
  newOrderTypeCode: string;
  setNewOrderTypeCode: (value: string) => void;
  addPayment: () => void;
  addOrderType: () => void;
  toggleActive: (tableName: string, id: string, current: boolean) => void;
  deleteRow: (tableName: string, id: string) => void;
}) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <SettingsCollection
        label="Payments"
        title="Payment Methods"
        helper="Configure Cash, GCash, Bank, and future charge methods."
        inputs={
          <>
            <input value={newPaymentName} onChange={(e) => setNewPaymentName(e.target.value)} placeholder="Payment method name" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            <input value={newPaymentCode} onChange={(e) => setNewPaymentCode(e.target.value)} placeholder="Code" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            <button onClick={addPayment} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]">
              <Plus size={16} />
              Add Method
            </button>
          </>
        }
      >
        {paymentMethods.map((item) => (
          <RowCard key={item.id} title={item.name} helper={item.code} isActive={item.is_active} onToggle={() => toggleActive("pos_payment_methods", item.id, item.is_active)} onDelete={() => deleteRow("pos_payment_methods", item.id)} />
        ))}
      </SettingsCollection>

      <SettingsCollection
        label="Orders"
        title="Order Types"
        helper="Configure dine-in, takeout, delivery, room service, and future order types."
        inputs={
          <>
            <input value={newOrderTypeName} onChange={(e) => setNewOrderTypeName(e.target.value)} placeholder="Order type name" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            <input value={newOrderTypeCode} onChange={(e) => setNewOrderTypeCode(e.target.value)} placeholder="Code" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            <button onClick={addOrderType} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]">
              <Plus size={16} />
              Add Type
            </button>
          </>
        }
      >
        {orderTypes.map((item) => (
          <RowCard key={item.id} title={item.name} helper={item.code} isActive={item.is_active} onToggle={() => toggleActive("pos_order_types", item.id, item.is_active)} onDelete={() => deleteRow("pos_order_types", item.id)} />
        ))}
      </SettingsCollection>
    </section>
  );
}

function TablesTab({
  tables,
  newTableName,
  setNewTableName,
  newTableCapacity,
  setNewTableCapacity,
  addTable,
  toggleActive,
  deleteRow,
}: {
  tables: PosTable[];
  newTableName: string;
  setNewTableName: (value: string) => void;
  newTableCapacity: string;
  setNewTableCapacity: (value: string) => void;
  addTable: () => void;
  toggleActive: (tableName: string, id: string, current: boolean) => void;
  deleteRow: (tableName: string, id: string) => void;
}) {
  return (
    <SettingsCollection
      label="Tables"
      title="Table Setup"
      helper="Future-ready table setup for dine-in, pool, sports bar, and restaurant seating."
      inputs={
        <>
          <input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Table name" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          <input type="number" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} placeholder="Capacity" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          <button onClick={addTable} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]">
            <Plus size={16} />
            Add Table
          </button>
        </>
      }
    >
      {tables.map((table) => (
        <RowCard key={table.id} title={table.table_name} helper={`Capacity: ${table.capacity || 0} • Status: ${table.status}`} isActive={table.is_active} onToggle={() => toggleActive("pos_tables", table.id, table.is_active)} onDelete={() => deleteRow("pos_tables", table.id)} />
      ))}
    </SettingsCollection>
  );
}

function ImportExportTab({
  importing,
  importClick,
  exportWorkbook,
}: {
  importing: boolean;
  importClick: () => void;
  exportWorkbook: () => void;
}) {
  const sheets = [
    "General",
    "Categories",
    "Products",
    "Stations",
    "Routing",
    "Tables",
    "PaymentMethods",
    "OrderTypes",
  ];

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Import Center
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            POS_MASTER_SETUP.xlsx
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Upload one workbook to configure categories, products, stations,
            routing, tables, payment methods, order types, and general settings.
          </p>
        </div>

        <div className="p-6">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <FileSpreadsheet size={42} className="mx-auto text-slate-400" />
            <h3 className="mt-4 text-xl font-black text-slate-950">
              Upload POS Master Workbook
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
              Existing records are updated when codes or names match. New records
              are inserted under the active company.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={importClick}
                disabled={importing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
              >
                <Upload size={16} />
                {importing ? "Importing..." : "Import Workbook"}
              </button>

              <button
                onClick={exportWorkbook}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                <Download size={16} />
                Export Current Setup
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Workbook Sheets
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Required Structure
          </h2>
        </div>

        <div className="space-y-3 p-6">
          {sheets.map((sheet) => (
            <div key={sheet} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
              {sheet}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryRoutingRow({
  category,
  productionStations,
  onSave,
}: {
  category: PosCategory;
  productionStations: PosOption[];
  onSave: (categoryId: string, requiresProduction: boolean, productionStationId: string | null) => void;
}) {
  const [requiresProduction, setRequiresProduction] = useState(Boolean(category.requires_production));
  const [productionStationId, setProductionStationId] = useState(category.production_station_id || "");

  useEffect(() => {
    setRequiresProduction(Boolean(category.requires_production));
    setProductionStationId(category.production_station_id || "");
  }, [category.requires_production, category.production_station_id]);

  const activeStations = productionStations.filter((station) => station.is_active);
  const selectedStation = productionStations.find((station) => station.id === productionStationId);

  return (
    <tr className="transition-all duration-200 hover:bg-slate-50">
      <td className="px-5 py-4">
        <p className="font-black text-slate-950">{category.name}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">
          {category.category_code || "No code"}
        </p>
      </td>

      <td className="px-5 py-4">
        <button
          onClick={() => {
            const nextValue = !requiresProduction;
            setRequiresProduction(nextValue);

            if (!nextValue) {
              setProductionStationId("");
              onSave(category.id, false, null);
            } else {
              onSave(category.id, true, productionStationId || null);
            }
          }}
          className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
            requiresProduction
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          {requiresProduction ? "QUEUE REQUIRED" : "DIRECT RELEASE"}
        </button>
      </td>

      <td className="px-5 py-4">
        <select
          value={productionStationId}
          disabled={!requiresProduction}
          onChange={(event) => {
            const nextStationId = event.target.value;
            setProductionStationId(nextStationId);
            onSave(category.id, true, nextStationId || null);
          }}
          className="h-11 min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">No station selected</option>
          {activeStations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name}
            </option>
          ))}
        </select>
      </td>

      <td className="px-5 py-4">
        <Badge tone={requiresProduction && selectedStation ? "info" : requiresProduction ? "warning" : "neutral"}>
          {requiresProduction && selectedStation
            ? selectedStation.code
            : requiresProduction
              ? "NEEDS STATION"
              : "DIRECT"}
        </Badge>
      </td>
    </tr>
  );
}

function SettingsCollection({
  label,
  title,
  helper,
  inputs,
  children,
}: {
  label: string;
  title: string;
  helper: string;
  inputs: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
      </div>

      <div className="border-b border-slate-100 p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">{inputs}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-2">
        {children}
      </div>
    </section>
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
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="truncate font-black text-slate-950">{title}</p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-500">{helper}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onToggle}
          className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
            isActive
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </button>

        <button
          onClick={onDelete}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
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
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="font-black text-slate-950">{label}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{helper}</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {settingKey}
        </p>
      </div>

      <button
        onClick={() => onSave(settingKey, enabled ? "false" : "true")}
        className={`inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-4 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
          enabled
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-slate-200 bg-slate-100 text-slate-700"
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
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>

      <div className="mt-2 flex gap-2">
        <select
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
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
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>

      <div className="mt-2 flex gap-2">
        <input
          type="number"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder="0"
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />

        <button
          onClick={() => onSave(currentValue)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
        >
          <Save size={16} />
        </button>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  const toneClass = {
    neutral: "border-slate-200 bg-white text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    danger: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${toneClass}`}>
        {label}
      </div>
      <p className="text-3xl font-black tracking-tight text-slate-950">{value}</p>
      {helper && <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>}
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${toneClass}`}>
      {children}
    </span>
  );
}


function ModifierGroupModal({
  form,
  setForm,
  editing,
  saving,
  onClose,
  onSave,
}: {
  form: ModifierGroupForm;
  setForm: React.Dispatch<React.SetStateAction<ModifierGroupForm>>;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Smart Setup Packs
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editing ? "Edit Choice Group" : "Add Choice Group"}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Create reusable choice groups for OPSCORE Smart Setup Packs. No setup data is hardcoded.
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <Field label="Group Name">
            <input
              value={form.group_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, group_name: event.target.value }))
              }
              placeholder="Example: Egg Option"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </Field>

          <Field label="Group Code">
            <input
              value={form.group_code}
              onChange={(event) =>
                setForm((current) => ({ ...current, group_code: event.target.value }))
              }
              placeholder="Auto if blank"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </Field>

          <Field label="Selection Type">
            <select
              value={form.selection_type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  selection_type: event.target.value,
                  min_select: event.target.value === "single" ? (current.is_required ? "1" : "0") : current.min_select,
                  max_select: event.target.value === "single" ? "1" : current.max_select,
                }))
              }
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="single">Single Select</option>
              <option value="multi">Multi Select</option>
              <option value="quantity">Quantity Select</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <Field label="Minimum Select">
            <input
              type="number"
              value={form.selection_type === "single" ? (form.is_required ? "1" : "0") : form.min_select}
              disabled={form.selection_type === "single"}
              onChange={(event) =>
                setForm((current) => ({ ...current, min_select: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </Field>

          <Field label="Maximum Select">
            <input
              type="number"
              value={form.selection_type === "single" ? "1" : form.max_select}
              disabled={form.selection_type === "single"}
              onChange={(event) =>
                setForm((current) => ({ ...current, max_select: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </Field>

          <div className="md:col-span-2">
            <CheckOption
              label="Required before item can be added to cart"
              checked={form.is_required}
              onChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  is_required: checked,
                  min_select: current.selection_type === "single" ? (checked ? "1" : "0") : current.min_select,
                  max_select: current.selection_type === "single" ? "1" : current.max_select,
                }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Choice Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModifierOptionModal({
  form,
  setForm,
  editing,
  saving,
  groupName,
  onClose,
  onSave,
}: {
  form: ModifierOptionForm;
  setForm: React.Dispatch<React.SetStateAction<ModifierOptionForm>>;
  editing: boolean;
  saving: boolean;
  groupName: string;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Choice Option
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editing ? "Edit Choice" : "Add Choice"}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Choice Group: {groupName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <Field label="Choice Name">
            <input
              value={form.option_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, option_name: event.target.value }))
              }
              placeholder="Example: Scrambled"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </Field>

          <Field label="Choice Code">
            <input
              value={form.option_code}
              onChange={(event) =>
                setForm((current) => ({ ...current, option_code: event.target.value }))
              }
              placeholder="Auto if blank"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </Field>

          <Field label="Price Adjustment">
            <input
              type="number"
              value={form.price_adjustment}
              onChange={(event) =>
                setForm((current) => ({ ...current, price_adjustment: event.target.value }))
              }
              placeholder="0"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </Field>

          <Field label="Cost Adjustment">
            <input
              type="number"
              value={form.cost_adjustment}
              onChange={(event) =>
                setForm((current) => ({ ...current, cost_adjustment: event.target.value }))
              }
              placeholder="0"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </Field>

          <Field label="Sort Order">
            <input
              type="number"
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: event.target.value }))
              }
              placeholder="Auto"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          {!editing && (
            <div className="md:col-span-2">
              <Field label="Quick Add Choices">
                <textarea
                  value={form.quick_options}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quick_options: event.target.value }))
                  }
                  placeholder={"Sunny Side Up\nScrambled\nPoached\nBoiled"}
                  className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </Field>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Add one choice per line. Price and cost adjustment above will apply to all quick-added choices.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Choice"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({
  form,
  setForm,
  editing,
  productionStations,
  saving,
  onClose,
  onSave,
}: {
  form: CategoryForm;
  setForm: React.Dispatch<React.SetStateAction<CategoryForm>>;
  editing: boolean;
  productionStations: PosOption[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Category
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editing ? "Edit Category" : "Add Category"}
            </h2>
          </div>

          <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Category Name">
            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </Field>

          <Field label="Code">
            <input value={form.category_code} onChange={(e) => setForm((current) => ({ ...current, category_code: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </Field>

          <Field label="Release Mode">
            <select value={form.requires_production ? "queue" : "direct"} onChange={(e) => setForm((current) => ({ ...current, requires_production: e.target.value === "queue", production_station_id: e.target.value === "direct" ? "" : current.production_station_id }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
              <option value="queue">Queue Required</option>
              <option value="direct">Direct Release</option>
            </select>
          </Field>

          <Field label="Production Station">
            <select disabled={!form.requires_production} value={form.production_station_id} onChange={(e) => setForm((current) => ({ ...current, production_station_id: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-400">
              <option value="">No station selected</option>
              {productionStations.filter((station) => station.is_active).map((station) => (
                <option key={station.id} value={station.id}>{station.name}</option>
              ))}
            </select>
          </Field>


          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="min-h-[84px] w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 md:col-span-2" />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={saving} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save Category"}
          </button>
        </div>
      </div>
    </div>
  );
}


function SetupPackModal({
  form,
  setForm,
  editing,
  saving,
  onClose,
  onSave,
}: {
  form: SetupPackForm;
  setForm: React.Dispatch<React.SetStateAction<SetupPackForm>>;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Setup Pack
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editing ? "Edit Setup Pack" : "Add Setup Pack"}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              A Setup Pack is a reusable template made of Choice Groups.
            </p>
          </div>

          <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Setup Pack Name">
            <input value={form.pack_name} onChange={(e) => setForm((current) => ({ ...current, pack_name: e.target.value }))} placeholder="Breakfast Pack" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </Field>

          <Field label="Pack Code">
            <input value={form.pack_code} onChange={(e) => setForm((current) => ({ ...current, pack_code: e.target.value }))} placeholder="BREAKFAST_PACK" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </Field>

          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Egg Option, Bread Option, Side Option..." className="min-h-[84px] w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={saving} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save Setup Pack"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupPackGroupsModal({
  pack,
  groups,
  packGroups,
  options,
  saving,
  onToggle,
  onClose,
}: {
  pack: PosSetupPack;
  groups: PosModifierGroup[];
  packGroups: PosSetupPackGroup[];
  options: PosModifierOption[];
  saving: boolean;
  onToggle: (modifierGroupId: string, checked: boolean) => void;
  onClose: () => void;
}) {
  const assignedGroupIds = new Set(
    packGroups.filter((row) => row.pack_id === pack.id).map((row) => row.group_id),
  );

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/35 p-4">
      <div className="max-h-[calc(100vh-48px)] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Assign Choice Groups
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {pack.pack_name}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Tick reusable Choice Groups to include in this Setup Pack.
            </p>
          </div>

          <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              No Choice Groups available. Create Choice Groups first.
            </div>
          ) : (
            groups.map((group) => {
              const optionCount = options.filter((option) => option.modifier_group_id === group.id).length;
              const checked = assignedGroupIds.has(group.id);

              return (
                <label key={group.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={saving}
                    onChange={(event) => onToggle(group.id, event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{group.group_name}</p>
                      <Badge tone={group.status === "active" ? "success" : "neutral"}>{group.status}</Badge>
                      <Badge tone="info">{group.selection_type}</Badge>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {group.group_code || "No code"} • {optionCount} choice(s) • Min {group.min_select} / Max {group.max_select}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={saving} className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductModal({
  form,
  setForm,
  editing,
  categories,
  setupPacks,
  saving,
  uploadingImage,
  imageInputRef,
  uploadImage,
  onClose,
  onSave,
}: {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  editing: boolean;
  categories: PosCategory[];
  setupPacks: PosSetupPack[];
  saving: boolean;
  uploadingImage: boolean;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  uploadImage: (file: File) => Promise<string | null>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/35 p-4">
      <div className="max-h-[calc(100vh-48px)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Product
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editing ? "Edit Product" : "Add Product"}
            </h2>
          </div>

          <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
            <X size={18} />
          </button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const publicUrl = await uploadImage(file);
            if (publicUrl) {
              setForm((current) => ({ ...current, image_url: publicUrl }));
            }
          }}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Product Name">
            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </Field>

          <Field label="Item Code">
            <input value={form.item_code} onChange={(e) => setForm((current) => ({ ...current, item_code: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </Field>

          <Field label="Category">
            <select value={form.category_id} onChange={(e) => setForm((current) => ({ ...current, category_id: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
              <option value="">Select category</option>
              {categories.filter((category) => category.status === "active").map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <Field label="Setup Pack">
            <select
              value={form.setup_pack_id}
              onChange={(e) => setForm((current) => ({ ...current, setup_pack_id: e.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">None</option>
              {setupPacks
                .filter((pack) => pack.status === "active")
                .map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.pack_name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Price">
            <input type="number" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </Field>

          <Field label="Cost">
            <input type="number" value={form.cost} onChange={(e) => setForm((current) => ({ ...current, cost: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </Field>

          <Field label="Image URL">
            <div className="flex gap-2">
              <input value={form.image_url} onChange={(e) => setForm((current) => ({ ...current, image_url: e.target.value }))} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {uploadingImage ? "Uploading..." : "Upload"}
              </button>
            </div>
          </Field>

          <Field label="Flags">
            <div className="grid grid-cols-2 gap-2">
              <CheckOption label="Best Seller" checked={form.is_best_seller} onChange={(checked) => setForm((current) => ({ ...current, is_best_seller: checked }))} />
              <CheckOption label="Hot" checked={form.is_hot} onChange={(checked) => setForm((current) => ({ ...current, is_hot: checked }))} />
              <CheckOption label="New" checked={form.is_new} onChange={(checked) => setForm((current) => ({ ...current, is_new: checked }))} />
              <CheckOption label="Inventory" checked={form.is_inventory_tracked} onChange={(checked) => setForm((current) => ({ ...current, is_inventory_tracked: checked }))} />
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="min-h-[84px] w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={saving || uploadingImage} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving || uploadingImage} className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}
