"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  Download,
  Edit,
  Flame,
  ImageIcon,
  Package,
  Plus,
  RefreshCw,
  Search,
  Star,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  category_code?: string | null;
  status: string;
};

type MenuItem = {
  id: string;
  company_id: string;
  category_id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  is_inventory_tracked: boolean;
  status: string;
  image_url?: string | null;
  is_best_seller?: boolean | null;
  is_hot?: boolean | null;
  is_new?: boolean | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
};

type ItemForm = {
  item_code: string;
  name: string;
  description: string;
  category_id: string;
  price: string;
  cost: string;
  is_inventory_tracked: boolean;
  status: string;
  image_url: string;
  is_best_seller: boolean;
  is_hot: boolean;
  is_new: boolean;
};

const emptyForm: ItemForm = {
  item_code: "",
  name: "",
  description: "",
  category_id: "",
  price: "",
  cost: "",
  is_inventory_tracked: false,
  status: "active",
  image_url: "",
  is_best_seller: false,
  is_hot: false,
  is_new: false,
};

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const normalizeHeader = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getCell = (row: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    if (row[normalizedKey] !== undefined && row[normalizedKey] !== null) {
      return row[normalizedKey];
    }
  }

  return "";
};

const toNumber = (value: any) => {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[₱$]/g, "")
    .trim();

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value: any) => String(value ?? "").trim();

const normalizeStatus = (value: any) => {
  const text = normalizeText(value).toLowerCase();

  if (!text) return "active";

  if (
    ["inactive", "disabled", "archived", "deleted", "not active"].includes(text)
  ) {
    return "inactive";
  }

  return "active";
};

const normalizeBoolean = (value: any) => {
  const text = normalizeText(value).toLowerCase();

  return ["true", "yes", "y", "1", "best", "hot", "new"].includes(text);
};

const makeCategoryCode = (categoryName: string) => {
  const cleaned = categoryName
    .replace(/^\d+\s*/g, "")
    .trim()
    .toUpperCase();

  return cleaned.slice(0, 20) || categoryName.trim().toUpperCase().slice(0, 20);
};

const getPosterCategoryDescription = (categoryName: string) => {
  const upper = categoryName.toUpperCase();

  if (upper.includes("BEER")) {
    return "Beer, bottled beer, canned beer, and beer products";
  }

  if (
    upper.includes("LIQUOR") ||
    upper.includes("VODKA") ||
    upper.includes("WHISKY") ||
    upper.includes("GIN") ||
    upper.includes("RUM") ||
    upper.includes("TEQUILA")
  ) {
    return "Liquor, spirits, and alcoholic beverages";
  }

  if (upper.includes("JUICE")) return "Juices and fruit drink products";
  if (upper.includes("COFFEE")) return "Coffee and ready-to-drink coffee products";
  if (upper.includes("SHAKE")) return "Shakes and blended drink products";
  if (upper.includes("ICE")) return "Ice cream and cold dessert products";
  if (upper.includes("BEVERAGE")) return "Beverages and drink products";

  return "Auto-created POS category from Poster import";
};

export default function POSMenuItemsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  const loadCategories = async () => {
    setMessage("");

    let query = supabase
      .from("pos_categories")
      .select("id, name, category_code, status")
      .order("name", { ascending: true });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      setCategories([]);
      return;
    }

    setCategories(data || []);
  };

  const loadItems = async () => {
    setLoading(true);
    setMessage("");

    let query = supabase
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
      .order("name", { ascending: true });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data || []) as MenuItem[]);
    setLoading(false);
  };

  const reloadAll = async () => {
    await loadCategories();
    await loadItems();
  };

  useEffect(() => {
    reloadAll();
  }, []);

  const activeCategories = categories.filter(
    (category) => category.status === "active",
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        String(item.item_code || "").toLowerCase().includes(term) ||
        String(item.description || "").toLowerCase().includes(term) ||
        String(item.category?.name || "").toLowerCase().includes(term);

      const matchesCategory =
        categoryFilter === "all" || item.category_id === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const activeCount = items.filter((item) => item.status === "active").length;
  const inactiveCount = items.filter((item) => item.status !== "active").length;
  const catalogValue = items.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );
  const withImageCount = items.filter((item) => item.image_url).length;

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);

    setForm({
      item_code: item.item_code || "",
      name: item.name || "",
      description: item.description || "",
      category_id: item.category_id || "",
      price: String(item.price || ""),
      cost: String(item.cost || ""),
      is_inventory_tracked: Boolean(item.is_inventory_tracked),
      status: item.status || "active",
      image_url: item.image_url || "",
      is_best_seller: Boolean(item.is_best_seller),
      is_hot: Boolean(item.is_hot),
      is_new: Boolean(item.is_new),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || uploadingImage) return;

    setEditingItem(null);
    setForm(emptyForm);
    setModalOpen(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
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

  const saveItem = async () => {
    setMessage("");

    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    if (!form.name.trim()) {
      setMessage("Item name is required.");
      return;
    }

    if (!form.category_id) {
      setMessage("Category is required.");
      return;
    }

    setSaving(true);

    const payload = {
      company_id: companyId,
      category_id: form.category_id,
      item_code: form.item_code.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: toNumber(form.price),
      cost: toNumber(form.cost),
      is_inventory_tracked: Boolean(form.is_inventory_tracked),
      status: form.status || "active",
      image_url: form.image_url.trim() || null,
      is_best_seller: Boolean(form.is_best_seller),
      is_hot: Boolean(form.is_hot),
      is_new: Boolean(form.is_new),
      updated_at: new Date().toISOString(),
    };

    if (editingItem) {
      const { error } = await supabase
        .from("pos_menu_items")
        .update(payload)
        .eq("id", editingItem.id);

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

    await loadItems();
    setSaving(false);
    closeModal();
  };

  const toggleStatus = async (item: MenuItem) => {
    setMessage("");

    const nextStatus = item.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("pos_menu_items")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadItems();
  };

  const exportCsv = () => {
    const headers = [
      "item_code",
      "name",
      "category",
      "description",
      "price",
      "cost",
      "image_url",
      "is_best_seller",
      "is_hot",
      "is_new",
      "is_inventory_tracked",
      "status",
    ];

    const rows = filteredItems.map((item) => [
      item.item_code || "",
      item.name,
      item.category?.name || "",
      item.description || "",
      item.price || 0,
      item.cost || 0,
      item.image_url || "",
      item.is_best_seller ? "true" : "false",
      item.is_hot ? "true" : "false",
      item.is_new ? "true" : "false",
      item.is_inventory_tracked ? "true" : "false",
      item.status || "active",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            const escaped = value.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `opscore_pos_menu_items_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"' && insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());

    return values;
  };

  const readCsvFile = async (file: File) => {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean) as any[];

    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map(normalizeHeader);

    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const row: Record<string, any> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });

      return row;
    });
  };

  const readExcelFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    const matrix = XLSX.utils.sheet_to_json<any[]>(firstSheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    const headerRowIndex = matrix.findIndex((row) => {
      const normalizedCells = row.map((cell) => normalizeHeader(String(cell)));

      return (
        normalizedCells.includes("title") ||
        normalizedCells.includes("name") ||
        normalizedCells.includes("item_name") ||
        normalizedCells.includes("product_name")
      );
    });

    if (headerRowIndex === -1) return [];

    const headers = matrix[headerRowIndex].map((cell) =>
      normalizeHeader(String(cell)),
    );

    return matrix
      .slice(headerRowIndex + 1)
      .map((row) => {
        const normalizedRow: Record<string, any> = {};

        headers.forEach((header, index) => {
          if (!header) return;
          normalizedRow[header] = row[index] ?? "";
        });

        return normalizedRow;
      })
      .filter((row) =>
        Object.values(row).some((value) => String(value).trim()),
      );
  };

  const importFile = async (file: File) => {
    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    if (categories.length === 0) {
      setMessage("Please add/import categories first.");
      return;
    }

    setImporting(true);
    setMessage("");

    try {
      const lowerName = file.name.toLowerCase();

      const rows =
        lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")
          ? await readExcelFile(file)
          : await readCsvFile(file);

      if (rows.length === 0) {
        setMessage("File is empty or missing data rows.");
        setImporting(false);
        return;
      }

      let liveCategories = [...categories];
      let categoryMap = new Map<string, Category>();

      const rebuildCategoryMap = () => {
        categoryMap = new Map<string, Category>();

        liveCategories.forEach((category) => {
          categoryMap.set(category.name.trim().toLowerCase(), category);

          if (category.category_code) {
            categoryMap.set(
              category.category_code.trim().toLowerCase(),
              category,
            );
          }
        });
      };

      rebuildCategoryMap();

      const discoveredCategoryNames = Array.from(
        new Set(
          rows
            .map((row) =>
              normalizeText(
                getCell(row, [
                  "category",
                  "category_name",
                  "group",
                  "department",
                  "menu_category",
                ]),
              ),
            )
            .filter(Boolean)
            .map((categoryName) => categoryName.trim()),
        ),
      );

      const missingCategoryNames = discoveredCategoryNames.filter(
        (categoryName) => !categoryMap.has(categoryName.toLowerCase()),
      );

      let autoCreatedCategories = 0;

      if (missingCategoryNames.length > 0) {
        const categoryPayloads = missingCategoryNames.map((categoryName) => ({
          company_id: companyId,
          name: categoryName,
          category_code: makeCategoryCode(categoryName),
          description: getPosterCategoryDescription(categoryName),
          status: "active",
          updated_at: new Date().toISOString(),
        }));

        const { data: createdCategories, error: categoryCreateError } =
          await supabase
            .from("pos_categories")
            .insert(categoryPayloads)
            .select("id, name, category_code, status");

        if (categoryCreateError) {
          setMessage(categoryCreateError.message);
          setImporting(false);
          return;
        }

        liveCategories = [
          ...liveCategories,
          ...((createdCategories || []) as Category[]),
        ];

        autoCreatedCategories = createdCategories?.length || 0;
        rebuildCategoryMap();
        setCategories(liveCategories);
      }

      const existingKeys = new Set(
        items.map((item) =>
          String(item.item_code || item.name)
            .trim()
            .toLowerCase(),
        ),
      );

      let skippedNoName = 0;
      let skippedNoCategory = 0;
      let skippedDuplicate = 0;

      const payloads = rows
        .map((row) => {
          const itemCode = normalizeText(
            getCell(row, [
              "item_code",
              "code",
              "sku",
              "posterid",
              "poster_id",
              "product_id",
              "id",
            ]),
          );

          const name = normalizeText(
            getCell(row, [
              "name",
              "item_name",
              "product_name",
              "title",
              "dish",
              "product",
            ]),
          );

          const categoryName = normalizeText(
            getCell(row, [
              "category",
              "category_name",
              "group",
              "department",
              "menu_category",
            ]),
          );

          const category = categoryMap.get(categoryName.toLowerCase());

          if (!name) {
            skippedNoName += 1;
            return null;
          }

          if (!category) {
            skippedNoCategory += 1;
            return null;
          }

          const duplicateKey = String(itemCode || name).trim().toLowerCase();

          if (existingKeys.has(duplicateKey)) {
            skippedDuplicate += 1;
            return null;
          }

          existingKeys.add(duplicateKey);

          const price = toNumber(
            getCell(row, [
              "price",
              "selling_price",
              "retail_price",
              "sale_price",
              "amount",
            ]),
          );

          const cost = toNumber(
            getCell(row, [
              "cost",
              "cost_without_vat",
              "components_cost",
              "food_cost",
              "unit_cost",
            ]),
          );

          const description = normalizeText(
            getCell(row, [
              "description",
              "recipe",
              "details",
              "note",
              "notes",
            ]),
          );

          const imageUrl = normalizeText(
            getCell(row, [
              "image_url",
              "image",
              "photo",
              "photo_url",
              "picture",
              "picture_url",
            ]),
          );

          const isInventoryTracked = normalizeBoolean(
            getCell(row, [
              "is_inventory_tracked",
              "inventory_tracked",
              "track_inventory",
              "tracked",
            ]),
          );

          const isBestSeller = normalizeBoolean(
            getCell(row, [
              "is_best_seller",
              "best_seller",
              "bestseller",
              "best",
            ]),
          );

          const isHot = normalizeBoolean(
            getCell(row, ["is_hot", "hot", "spicy"]),
          );

          const isNew = normalizeBoolean(
            getCell(row, ["is_new", "new", "new_item"]),
          );

          return {
            company_id: companyId,
            category_id: category.id,
            item_code: itemCode || null,
            name,
            description: description || null,
            price,
            cost,
            image_url: imageUrl || null,
            is_best_seller: isBestSeller,
            is_hot: isHot,
            is_new: isNew,
            is_inventory_tracked: isInventoryTracked,
            status: normalizeStatus(getCell(row, ["status", "state"])),
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean) as any[];

      if (payloads.length === 0) {
        setMessage(
          `No valid items to import. No name: ${skippedNoName}. No category match: ${skippedNoCategory}. Duplicates: ${skippedDuplicate}.`,
        );
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("pos_menu_items").insert(payloads);

      if (error) {
        setMessage(error.message);
        setImporting(false);
        return;
      }

      await loadItems();

      setMessage(
        `Import successful. ${payloads.length} items added. Auto-created categories: ${autoCreatedCategories}. Skipped no name: ${skippedNoName}. Skipped no category match: ${skippedNoCategory}. Skipped duplicates: ${skippedDuplicate}.`,
      );
    } catch (error: any) {
      setMessage(error?.message || "Import failed.");
    }

    setImporting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

    return (
    <PageGuard moduleKey="pos_menu_items">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="POS / MENU ITEMS" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  POS
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Menu Items
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Manage sellable POS products, photos, badges, category
                  mapping, pricing, cost, inventory tracking flags, and item
                  status.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) importFile(file);
                  }}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                >
                  <Upload size={16} />
                  {importing ? "Importing..." : "Import CSV / Excel"}
                </button>

                <button
                  onClick={exportCsv}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <Download size={16} />
                  Export CSV
                </button>

                <button
                  onClick={openAddModal}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
            </section>

            {message && (
              <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700 shadow-sm">
                {message}
              </section>
            )}

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <KpiCard label="Total Items" value={String(items.length)} />
              <KpiCard
                label="Active"
                value={String(activeCount)}
                tone="success"
              />
              <KpiCard
                label="Inactive"
                value={String(inactiveCount)}
                tone="danger"
              />
              <KpiCard
                label="With Photos"
                value={String(withImageCount)}
                tone="info"
              />
              <KpiCard
                label="Catalog Value"
                value={peso(catalogValue)}
                tone="warning"
              />
            </section>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_180px_auto]">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search item, code, category..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pl-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <button
                  onClick={reloadAll}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Product Ledger
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  POS Menu Items
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Item",
                        "Photo",
                        "Category",
                        "Price",
                        "Cost",
                        "Badges",
                        "Inventory",
                        "Status",
                        "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading menu items...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          No menu items found.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          className="transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                                <Package size={16} />
                              </div>

                              <div>
                                <p className="font-black text-slate-950">
                                  {item.name}
                                </p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                  {item.item_code || "No item code"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-14 w-20 rounded-xl object-cover ring-1 ring-slate-200"
                              />
                            ) : (
                              <div className="flex h-14 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                                <ImageIcon size={18} />
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {item.category?.name || "-"}
                          </td>

                          <td className="px-5 py-4 text-right font-black text-slate-950">
                            {peso(Number(item.price || 0))}
                          </td>

                          <td className="px-5 py-4 text-right text-slate-600">
                            {peso(Number(item.cost || 0))}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {item.is_best_seller && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                                  <Star size={11} />
                                  BEST
                                </span>
                              )}

                              {item.is_hot && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                                  <Flame size={11} />
                                  HOT
                                </span>
                              )}

                              {item.is_new && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                  <Sparkles size={11} />
                                  NEW
                                </span>
                              )}

                              {!item.is_best_seller &&
                                !item.is_hot &&
                                !item.is_new && (
                                  <span className="text-xs font-semibold text-slate-400">
                                    -
                                  </span>
                                )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {item.is_inventory_tracked ? (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">
                                Tracked
                              </span>
                            ) : (
                              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
                                Not Tracked
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {item.status === "active" ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                                <CheckCircle2 size={13} />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-700">
                                <XCircle size={13} />
                                Inactive
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditModal(item)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>

                              <button
                                onClick={() => toggleStatus(item)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                                title={
                                  item.status === "active"
                                    ? "Deactivate"
                                    : "Activate"
                                }
                              >
                                {item.status === "active" ? (
                                  <XCircle size={16} />
                                ) : (
                                  <CheckCircle2 size={16} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {modalOpen && (
            <div className="fixed inset-0 z-[10050] flex justify-end bg-slate-950/35">
              <div className="flex h-[calc(100vh-64px)] w-full max-w-[820px] flex-col border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 p-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                      POS Menu Item
                    </p>

                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      {editingItem ? "Edit Item" : "Add Item"}
                    </h2>
                  </div>

                  <button
                    onClick={closeModal}
                    disabled={saving || uploadingImage}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Item Code">
                      <input
                        value={form.item_code}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            item_code: event.target.value,
                          }))
                        }
                        placeholder="Example: SML001"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </Field>

                    <Field label="Category">
                      <select
                        value={form.category_id}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            category_id: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select category</option>
                        {activeCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <div className="md:col-span-2">
                      <Field label="Item Name">
                        <input
                          value={form.name}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Example: American Breakfast"
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </Field>
                    </div>

                    <div className="md:col-span-2">
                      <Field label="Product Image">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr]">
                          <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            {form.image_url ? (
                              <img
                                src={form.image_url}
                                alt="Product preview"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon size={30} />
                                <p className="mt-2 text-[11px] font-bold uppercase">
                                  No Photo
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col justify-center gap-3">
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;

                                const publicUrl = await uploadImage(file);

                                if (!publicUrl) return;

                                setForm((prev) => ({
                                  ...prev,
                                  image_url: publicUrl,
                                }));
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                            >
                              <Upload size={16} />
                              {uploadingImage ? "Uploading..." : "Upload Image"}
                            </button>

                            <input
                              value={form.image_url}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  image_url: event.target.value,
                                }))
                              }
                              placeholder="Or paste image URL"
                              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />

                            {form.image_url && (
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    image_url: "",
                                  }))
                                }
                                className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                              >
                                Remove Image
                              </button>
                            )}
                          </div>
                        </div>
                      </Field>
                    </div>

                    <Field label="Price">
                      <input
                        value={form.price}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            price: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </Field>

                    <Field label="Cost">
                      <input
                        value={form.cost}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            cost: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </Field>

                    <div className="md:col-span-2">
                      <Field label="Description">
                        <textarea
                          value={form.description}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Optional description"
                          rows={3}
                          className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </Field>
                    </div>

                    <div className="md:col-span-2">
                      <Field label="POS Badges">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <ToggleButton
                            active={form.is_best_seller}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                is_best_seller: !prev.is_best_seller,
                              }))
                            }
                            label="Best Seller"
                            icon={<Star size={15} />}
                            tone="warning"
                          />

                          <ToggleButton
                            active={form.is_hot}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                is_hot: !prev.is_hot,
                              }))
                            }
                            label="Hot"
                            icon={<Flame size={15} />}
                            tone="danger"
                          />

                          <ToggleButton
                            active={form.is_new}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                is_new: !prev.is_new,
                              }))
                            }
                            label="New"
                            icon={<Sparkles size={15} />}
                            tone="success"
                          />
                        </div>
                      </Field>
                    </div>

                    <Field label="Inventory Tracking">
                      <ToggleButton
                        active={form.is_inventory_tracked}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            is_inventory_tracked:
                              !prev.is_inventory_tracked,
                          }))
                        }
                        label={
                          form.is_inventory_tracked
                            ? "Tracked"
                            : "Not Tracked"
                        }
                        tone="info"
                      />
                    </Field>

                    <Field label="Status">
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            status: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white/95 p-6">
                  <button
                    onClick={closeModal}
                    disabled={saving || uploadingImage}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveItem}
                    disabled={saving || uploadingImage}
                    className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : uploadingImage
                        ? "Uploading..."
                        : "Save Item"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PageGuard>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "info"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-500";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
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
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  icon,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info";
}) {
  const activeClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "info"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all duration-200 active:scale-[0.98]",
        active
          ? activeClass
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}


