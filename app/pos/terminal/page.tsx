"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import {
  Banknote,
  Building2,
  ChefHat,
  Clock3,
  Coffee,
  CreditCard,
  Menu,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Smartphone,
  Tag,
  Trash2,
  Undo2,
  Utensils,
  Wine,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  category_code: string | null;
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
  category?: {
    id: string;
    name: string;
    category_code: string | null;
  } | null;
};

type CartItem = {
  id: string;
  item_code: string | null;
  name: string;
  price: number;
  qty: number;
};

type MenuMode = "food" | "bar" | "coffee" | "promo";

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const isBarCategory = (categoryName: string) => {
  const name = categoryName.toUpperCase();

  return (
    name.includes("BEER") ||
    name.includes("LIQUOR") ||
    name.includes("WINE") ||
    name.includes("COCKTAIL") ||
    name.includes("ALCOHOL") ||
    name.includes("BEVERAGE") ||
    name.includes("JUICE") ||
    name.includes("SHAKE") ||
    name.includes("DRINK")
  );
};

const isCoffeeCategory = (categoryName: string) =>
  categoryName.toUpperCase().includes("COFFEE");

const isPromoCategory = (categoryName: string) =>
  categoryName.toUpperCase().includes("PROMO");

const isFoodCategory = (categoryName: string) =>
  !isBarCategory(categoryName) &&
  !isCoffeeCategory(categoryName) &&
  !isPromoCategory(categoryName);

const getCategoryRank = (categoryName: string) => {
  const name = categoryName.toUpperCase();

  if (name.includes("BREAKFAST")) return 10;
  if (name.includes("APPETIZERS")) return 20;
  if (name.includes("MAIN")) return 30;
  if (name.includes("FILIPINO")) return 40;
  if (name.includes("SILOG")) return 50;
  if (name.includes("PASTA")) return 60;
  if (name.includes("NOODLES")) return 70;
  if (name.includes("SANDWICH")) return 80;
  if (name.includes("BURGER")) return 90;
  if (name.includes("SOUP")) return 100;
  if (name.includes("SALAD")) return 110;
  if (name.includes("SIDES")) return 120;

  if (name.includes("BEER")) return 200;
  if (name.includes("LIQUOR")) return 210;
  if (name.includes("WINE")) return 220;
  if (name.includes("COCKTAIL")) return 230;
  if (name.includes("BEVERAGE")) return 240;
  if (name.includes("JUICE")) return 250;
  if (name.includes("COFFEE")) return 260;
  if (name.includes("SHAKE")) return 270;
  if (name.includes("ICE")) return 280;
  if (name.includes("PROMO")) return 300;

  return 999;
};

const shortCategoryName = (name: string) => {
  const value = name.toUpperCase();

  if (value.includes("APPETIZERS")) return "Pulutan";
  if (value.includes("BREAKFAST")) return "Breakfast";
  if (value.includes("MAIN DISHES")) return "Main";
  if (value.includes("FILIPINO")) return "Ulam";
  if (value.includes("SILOG")) return "Silog";
  if (value.includes("NOODLES")) return "Noodles";
  if (value.includes("PASTA")) return "Pasta";
  if (value.includes("SANDWICH")) return "Sandwich";
  if (value.includes("BURGERS")) return "Burgers";
  if (value.includes("SOUP")) return "Soup";
  if (value.includes("SALAD")) return "Salad";
  if (value.includes("BEVERAGE")) return "Beverages";
  if (value.includes("LIQUOR")) return "Liquor";
  if (value.includes("BEER")) return "Beer";
  if (value.includes("COCKTAIL")) return "Cocktails";
  if (value.includes("SHAKE")) return "Shakes";
  if (value.includes("ICE")) return "Ice Cream";
  if (value.includes("COFFEE")) return "Coffee";
  if (value.includes("PROMO")) return "Promo";

  return name;
};

const getCategoryIcon = (name: string) => {
  const value = name.toUpperCase();

  if (value.includes("BREAKFAST")) return "🍳";
  if (value.includes("APPETIZERS")) return "🍢";
  if (value.includes("MAIN")) return "🍽️";
  if (value.includes("FILIPINO") || value.includes("SILOG")) return "🍚";
  if (value.includes("PASTA") || value.includes("NOODLES")) return "🍝";
  if (value.includes("BURGER") || value.includes("SANDWICH")) return "🍔";
  if (value.includes("BEER")) return "🍺";
  if (value.includes("LIQUOR")) return "🥃";
  if (value.includes("COCKTAIL")) return "🍸";
  if (value.includes("SHAKE") || value.includes("JUICE")) return "🥤";
  if (value.includes("COFFEE")) return "☕";
  if (value.includes("PROMO")) return "🏷️";

  return "•";
};

const getProductVisual = (productName: string, categoryName: string) => {
  const value = `${productName} ${categoryName}`.toUpperCase();

  if (
    value.includes("BREAKFAST") ||
    value.includes("OMELETTE") ||
    value.includes("EGG")
  ) {
    return "🍳";
  }

  if (value.includes("BURGER") || value.includes("SANDWICH")) return "🍔";
  if (value.includes("RIB") || value.includes("BEEF") || value.includes("CHICKEN")) return "🍖";
  if (value.includes("PASTA") || value.includes("CARBONARA") || value.includes("NOODLES")) return "🍝";
  if (value.includes("SALAD")) return "🥗";
  if (value.includes("BEER")) return "🍺";
  if (value.includes("LIQUOR") || value.includes("VODKA") || value.includes("RUM")) return "🥃";
  if (value.includes("COFFEE")) return "☕";
  if (value.includes("SHAKE") || value.includes("JUICE")) return "🥤";

  return getCategoryIcon(categoryName);
};

export default function POSTerminalPage() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [menuMode, setMenuMode] = useState<MenuMode>("food");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  const loadTerminalData = async () => {
    setLoading(true);

    let categoryQuery = supabase
      .from("pos_categories")
      .select("id, name, category_code")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (companyId) {
      categoryQuery = categoryQuery.eq("company_id", companyId);
    }

    const { data: categoryData, error: categoryError } = await categoryQuery;

    if (categoryError) {
      alert(categoryError.message);
      setLoading(false);
      return;
    }

    let productQuery = supabase
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
          category_code
        )
      `,
      )
      .eq("status", "active")
      .order("name", { ascending: true });

    if (companyId) {
      productQuery = productQuery.eq("company_id", companyId);
    }

    const { data: productData, error: productError } = await productQuery;

    if (productError) {
      alert(productError.message);
      setLoading(false);
      return;
    }

setCategories((categoryData || []) as unknown as Category[]);
setProducts((productData || []) as unknown as Product[]);    setLoading(false);
  };

  useEffect(() => {
    loadTerminalData();
  }, []);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const rankA = getCategoryRank(a.name);
      const rankB = getCategoryRank(b.name);

      if (rankA !== rankB) return rankA - rankB;

      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const modeCategories = useMemo(() => {
    return sortedCategories.filter((category) => {
      if (menuMode === "bar") return isBarCategory(category.name);
      if (menuMode === "coffee") return isCoffeeCategory(category.name);
      if (menuMode === "promo") return isPromoCategory(category.name);
      return isFoodCategory(category.name);
    });
  }, [sortedCategories, menuMode]);

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
      const categoryName = product.category?.name || "";
      const productName = product.name.toLowerCase();

      const matchesMode =
        (menuMode === "bar" && isBarCategory(categoryName)) ||
        (menuMode === "coffee" && isCoffeeCategory(categoryName)) ||
        (menuMode === "promo" &&
          (isPromoCategory(categoryName) || productName.includes("promo"))) ||
        (menuMode === "food" && isFoodCategory(categoryName));

      const matchesCategory =
        !selectedCategory || product.category_id === selectedCategory;

      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        String(product.item_code || "").toLowerCase().includes(term) ||
        String(product.category?.name || "").toLowerCase().includes(term);

      return matchesMode && matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search, menuMode]);

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

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.qty,
    0,
  );

  const serviceCharge = 0;
  const grandTotal = subtotal + serviceCharge;
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const setMode = (mode: MenuMode) => {
    setMenuMode(mode);
    setSearch("");

    const nextCategory = sortedCategories.find((category) => {
      if (mode === "bar") return isBarCategory(category.name);
      if (mode === "coffee") return isCoffeeCategory(category.name);
      if (mode === "promo") return isPromoCategory(category.name);
      return isFoodCategory(category.name);
    });

    setSelectedCategory(nextCategory?.id || "");
  };

  const mainModes: {
    key: MenuMode;
    label: string;
    icon: React.ReactNode;
    activeClass: string;
  }[] = [
    {
      key: "food",
      label: "Food",
      icon: <Utensils size={16} />,
      activeClass:
        "bg-[#111720] text-white ring-white/10 border-b-[3px] border-amber-400",
    },
    {
      key: "bar",
      label: "Bar",
      icon: <Wine size={16} />,
      activeClass:
        "bg-[#111720] text-white ring-white/10 border-b-[3px] border-slate-300",
    },
    {
      key: "coffee",
      label: "Coffee",
      icon: <Coffee size={16} />,
      activeClass:
        "bg-[#111720] text-white ring-white/10 border-b-[3px] border-stone-300",
    },
    {
      key: "promo",
      label: "Promo",
      icon: <Tag size={16} />,
      activeClass:
        "bg-[#111720] text-white ring-white/10 border-b-[3px] border-emerald-400",
    },
  ];

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

        <main className="h-screen overflow-hidden p-2">
          <section className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-2">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-[#0b1017] p-2 shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <div className="mb-1.5 grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto_auto] items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d1219] text-white ring-1 ring-white/15 transition hover:bg-[#141b25]"
                  title="Open OPSCORE menu"
                >
                  <Menu size={20} />
                </button>

                <button className="h-10 rounded-xl bg-emerald-500/10 px-4 text-[12px] font-black text-emerald-200 ring-1 ring-emerald-400/25">
                  DINE IN
                </button>

                <button className="h-10 rounded-xl bg-amber-500/10 px-4 text-[12px] font-black text-amber-300 ring-1 ring-amber-400/35">
                  TABLE 4
                </button>

                <div className="min-w-0">
                  {showSearch ? (
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
                        className="h-10 w-full rounded-xl bg-[#0d1219] px-3 pl-9 text-xs font-semibold text-white outline-none ring-1 ring-white/15 transition placeholder:text-slate-500 focus:ring-amber-400/50"
                      />
                    </div>
                  ) : (
                    <div className="h-10" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSearch((value) => !value);
                    if (showSearch) setSearch("");
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                    showSearch
                      ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/35"
                      : "bg-[#0d1219] text-slate-200 ring-1 ring-white/15 hover:bg-[#141b25]"
                  }`}
                  title="Search"
                >
                  {showSearch ? <X size={18} /> : <Search size={18} />}
                </button>

                <button
                  onClick={loadTerminalData}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d1219] text-slate-300 ring-1 ring-white/15 transition hover:bg-[#141b25]"
                  title="Refresh"
                >
                  <RefreshCw size={17} />
                </button>
              </div>

              <div className="mb-1.5 grid grid-cols-4 gap-1.5">
                {mainModes.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setMode(mode.key)}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-black uppercase tracking-wide ring-1 transition ${
                      menuMode === mode.key
                        ? mode.activeClass
                        : "bg-[#0d1219] text-slate-300 ring-white/10 hover:bg-[#141b25] hover:text-white"
                    }`}
                  >
                    {mode.icon}
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="mb-2 flex h-10 items-center gap-1.5 overflow-x-auto rounded-xl bg-[#080c12] px-2 ring-1 ring-white/10">
                {modeCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide transition ${
                      selectedCategory === category.id
                        ? "bg-amber-500/5 text-white ring-1 ring-amber-400"
                        : "bg-[#0d1219] text-slate-400 ring-1 ring-white/10 hover:bg-[#141b25] hover:text-slate-200"
                    }`}
                    title={category.name}
                  >
                    {shortCategoryName(category.name)}
                  </button>
                ))}
              </div>

              <div className="mb-1 flex items-center justify-between px-1">
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
                  <div className="grid grid-cols-5 gap-2">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="group overflow-hidden rounded-xl bg-[#151d29] text-left shadow-lg shadow-black/40 ring-1 ring-white/10 transition hover:bg-[#1a2431] hover:ring-amber-400/40 active:scale-[0.98]"
                      >
                        <div className="relative h-[82px] overflow-hidden bg-[#070b10]">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#202936] to-[#0d1219] text-3xl">
                              {getProductVisual(
                                product.name,
                                product.category?.name || "No Category",
                              )}
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

                        <div className="flex min-h-[58px] flex-col justify-between px-2 py-2">
                          <p className="line-clamp-2 min-h-[32px] text-[13px] font-black leading-[16px] tracking-[-0.02em] text-white">
                            {product.name}
                          </p>

                          <p className="text-[12px] font-black leading-none text-amber-400">
                            {peso(Number(product.price || 0))}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2 grid grid-cols-5 gap-1.5">
                <button className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500/10 text-[11px] font-black text-emerald-200 ring-1 ring-emerald-400/20">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-base text-white ring-1 ring-white/15">
                    N
                  </span>
                  Quick Cash
                </button>

                <button
                  disabled
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0d1219] text-[11px] font-black text-slate-400 ring-1 ring-white/10"
                >
                  <CreditCard size={15} />
                  Drawer
                </button>

                <button
                  disabled
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0d1219] text-[11px] font-black text-slate-400 ring-1 ring-white/10"
                >
                  <Clock3 size={15} />
                  Hold
                </button>

                <button
                  disabled
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0d1219] text-[11px] font-black text-slate-400 ring-1 ring-white/10"
                >
                  <Undo2 size={15} />
                  Recall
                </button>

                <button
                  disabled
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500/10 text-[11px] font-black text-red-400 ring-1 ring-red-400/25"
                >
                  <Trash2 size={15} />
                  Void
                </button>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-[#0b1017] shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <div className="shrink-0 border-b border-white/10 px-3 py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ReceiptText size={15} className="text-amber-300" />
                        <p className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Table 4
                        </p>
                      </div>

                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        {totalItems} item(s)
                      </p>
                    </div>

                    <p className="mt-2 text-[34px] font-black leading-none tracking-[-0.06em] text-white">
                      {peso(grandTotal)}
                    </p>
                  </div>

                  <button
                    onClick={clearCart}
                    disabled={cart.length === 0}
                    className="rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-black text-red-300 ring-1 ring-red-400/25 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                {cart.length === 0 ? (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 p-5 text-center">
                    <ShoppingBag size={42} className="mb-5 text-slate-600" />
                    <p className="text-base font-black uppercase tracking-wide text-slate-300">
                      Ready for Order
                    </p>
                    <p className="mt-2 max-w-[180px] text-xs font-semibold leading-5 text-slate-500">
                      Tap a menu item to start transaction.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {cart.map((item) => (
                      <div key={item.id} className="py-2">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-black leading-4 text-white">
                              {item.name}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
                              {item.qty} × {peso(Number(item.price || 0))}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <p className="min-w-[70px] text-right text-[11px] font-black leading-4 text-white">
                              {peso(Number(item.price || 0) * item.qty)}
                            </p>

                            <button
                              onClick={() => decreaseQty(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#111821] text-slate-300 ring-1 ring-white/10 transition hover:bg-[#17202b]"
                            >
                              <Minus size={13} />
                            </button>

                            <button
                              onClick={() => increaseQty(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-black transition hover:bg-amber-400"
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

              <div className="shrink-0 p-3 ring-1 ring-white/10">
                <div className="rounded-xl bg-[#101620] px-3 py-3 ring-1 ring-white/10">
                  <div className="grid grid-cols-2 gap-y-2 text-[12px] font-semibold text-slate-400">
                    <span>Subtotal</span>
                    <span className="text-right">{peso(subtotal)}</span>

                    <span>Service Charge</span>
                    <span className="text-right">{peso(serviceCharge)}</span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
                  <button
                    disabled
                    className="flex h-9 items-center justify-between rounded-xl bg-[#101620] px-3 text-left text-[11px] font-black text-slate-400 ring-1 ring-white/10"
                  >
                    <span>Actions</span>
                    <span className="text-[11px] text-slate-500">
                      Disc / Promo / Notes
                    </span>
                  </button>

                  <button
                    disabled
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-300 ring-1 ring-red-400/20"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-2">
                  <button className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-[11px] font-black text-white shadow-lg shadow-emerald-950/30">
                    <Banknote size={15} />
                    Cash
                  </button>

                  <button className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-[11px] font-black text-white shadow-lg shadow-blue-950/30">
                    <Smartphone size={15} />
                    GCash
                  </button>

                  <button className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-700 text-[11px] font-black text-white shadow-lg shadow-black/30">
                    <CreditCard size={15} />
                    Card
                  </button>

                  <button className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-[11px] font-black text-black shadow-lg shadow-amber-950/30">
                    <Building2 size={15} />
                    Room
                  </button>
                </div>

                <button
                  disabled={cart.length === 0}
                  className="mt-2 h-14 w-full rounded-xl bg-amber-500 text-[15px] font-black tracking-wide text-black shadow-xl shadow-amber-950/40 transition hover:bg-amber-400 disabled:bg-amber-500/45 disabled:text-black/70"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ChefHat size={20} />
                    SEND TO KITCHEN
                  </span>
                </button>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}
