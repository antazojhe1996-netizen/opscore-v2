"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
  XCircle,
} from "lucide-react";

type Category = {
  id: string;
  company_id: string;
  name: string;
  category_code: string | null;
  description: string | null;
  requires_production: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

type CategoryForm = {
  name: string;
  category_code: string;
  description: string;
  requires_production: boolean;
  status: string;
};

const emptyForm: CategoryForm = {
  name: "",
  category_code: "",
  description: "",
  requires_production: true,
  status: "active",
};

export default function POSCategoriesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setMessage("");

    let query = supabase
      .from("pos_categories")
      .select("*")
      .order("name", { ascending: true });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      setCategories([]);
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  };

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return categories;

    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(term) ||
        String(category.category_code || "").toLowerCase().includes(term) ||
        String(category.description || "").toLowerCase().includes(term) ||
        String(category.status || "").toLowerCase().includes(term)
      );
    });
  }, [categories, search]);

  const activeCount = categories.filter(
    (category) => category.status === "active",
  ).length;

  const inactiveCount = categories.filter(
    (category) => category.status !== "active",
  ).length;

  const productionRequiredCount = categories.filter(
    (category) => category.requires_production !== false,
  ).length;

  const openAddModal = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      category_code: category.category_code || "",
      description: category.description || "",
      requires_production: category.requires_production !== false,
      status: category.status || "active",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingCategory(null);
    setForm(emptyForm);
  };

  const saveCategory = async () => {
    setMessage("");

    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    if (!form.name.trim()) {
      setMessage("Category name is required.");
      return;
    }

    setSaving(true);

    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      category_code: form.category_code.trim() || null,
      description: form.description.trim() || null,
      requires_production: Boolean(form.requires_production),
      status: form.status || "active",
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
      const { error } = await supabase.from("pos_categories").insert([payload]);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    await loadCategories();

    setSaving(false);
    closeModal();
  };

  const toggleStatus = async (category: Category) => {
    setMessage("");

    const nextStatus = category.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("pos_categories")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadCategories();
  };

  const exportCsv = () => {
    const headers = [
      "name",
      "category_code",
      "description",
      "requires_production",
      "status",
    ];

    const rows = filteredCategories.map((category) => [
      category.name,
      category.category_code || "",
      category.description || "",
      category.requires_production === false ? "false" : "true",
      category.status || "active",
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
    link.download = `opscore_pos_categories_${new Date()
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

  const normalizeHeader = (header: string) =>
    header.toLowerCase().trim().replace(/\s+/g, "_");

  const importCsv = async (file: File) => {
    if (!companyId) {
      setMessage("Company not detected. Please login again.");
      return;
    }

    setImporting(true);
    setMessage("");

    try {
      const text = await file.text();

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setMessage("CSV file is empty or missing data rows.");
        setImporting(false);
        return;
      }

      const headers = parseCsvLine(lines[0]).map(normalizeHeader);

      const nameIndex = headers.indexOf("name");
      const codeIndex =
        headers.indexOf("category_code") >= 0
          ? headers.indexOf("category_code")
          : headers.indexOf("code");
      const descriptionIndex = headers.indexOf("description");
      const requiresProductionIndex =
        headers.indexOf("requires_production") >= 0
          ? headers.indexOf("requires_production")
          : headers.indexOf("production_required");
      const statusIndex = headers.indexOf("status");

      if (nameIndex === -1) {
        setMessage("CSV must include a name column.");
        setImporting(false);
        return;
      }

      const parsedRows = lines
        .slice(1)
        .map((line) => {
          const values = parseCsvLine(line);

          return {
            company_id: companyId,
            name: String(values[nameIndex] || "").trim(),
            category_code:
              codeIndex >= 0
                ? String(values[codeIndex] || "").trim() || null
                : null,
            description:
              descriptionIndex >= 0
                ? String(values[descriptionIndex] || "").trim() || null
                : null,
            requires_production:
              requiresProductionIndex >= 0
                ? ![
                    "false",
                    "no",
                    "n",
                    "0",
                    "off",
                    "direct",
                    "direct_release",
                  ].includes(
                    String(values[requiresProductionIndex] || "")
                      .trim()
                      .toLowerCase(),
                  )
                : true,
            status:
              statusIndex >= 0
                ? String(values[statusIndex] || "active").trim().toLowerCase()
                : "active",
            updated_at: new Date().toISOString(),
          };
        })
        .filter((row) => row.name);

      if (parsedRows.length === 0) {
        setMessage("No valid categories found.");
        setImporting(false);
        return;
      }

      const existingNames = new Set(
        categories.map((category) => category.name.trim().toLowerCase()),
      );

      const newRows = parsedRows.filter(
        (row) => !existingNames.has(row.name.trim().toLowerCase()),
      );

      if (newRows.length === 0) {
        setMessage("No new categories to import. Existing names were skipped.");
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("pos_categories").insert(newRows);

      if (error) {
        setMessage(error.message);
        setImporting(false);
        return;
      }

      await loadCategories();
      setMessage(`Import successful. ${newRows.length} categories added.`);
    } catch (error: any) {
      setMessage(error?.message || "Import failed.");
    }

    setImporting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <PageGuard moduleKey="pos_categories">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="POS / CATEGORIES" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  POS
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Categories
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Manage POS category groups, short codes, production routing
                  flags, reporting labels, and cashier menu organization.
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
                    if (file) importCsv(file);
                  }}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                >
                  <Upload size={16} />
                  {importing ? "Importing..." : "Import CSV"}
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
                  Add Category
                </button>
              </div>
            </section>

            {message && (
              <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700 shadow-sm">
                {message}
              </section>
            )}

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total Categories"
                value={String(categories.length)}
                helper="All configured POS categories."
              />
              <KpiCard
                label="Active"
                value={String(activeCount)}
                helper="Visible categories in POS setup."
                tone="success"
              />
              <KpiCard
                label="Inactive"
                value={String(inactiveCount)}
                helper="Hidden or disabled categories."
                tone="danger"
              />
              <KpiCard
                label="Production Required"
                value={String(productionRequiredCount)}
                helper="Categories routed to production queue."
                tone="warning"
              />
            </section>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search category, code, description..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pl-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <button
                  onClick={loadCategories}
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
                  Category Ledger
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  POS Category List
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Category",
                        "Code",
                        "Description",
                        "Production",
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
                          colSpan={6}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading categories...
                        </td>
                      </tr>
                    ) : filteredCategories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          No categories found.
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((category) => (
                        <tr
                          key={category.id}
                          className="transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                                <ClipboardList size={16} />
                              </div>

                              <div>
                                <p className="font-black text-slate-950">
                                  {category.name}
                                </p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                  POS Category
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {category.category_code ? (
                              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">
                                {category.category_code}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-slate-400">
                                -
                              </span>
                            )}
                          </td>

                          <td className="max-w-xl px-5 py-4 text-sm font-semibold text-slate-600">
                            {category.description || "-"}
                          </td>

                          <td className="px-5 py-4">
                            {category.requires_production === false ? (
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
                                Direct Release
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                                Queue Required
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {category.status === "active" ? (
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
                                onClick={() => openEditModal(category)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>

                              <button
                                onClick={() => toggleStatus(category)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                                title={
                                  category.status === "active"
                                    ? "Deactivate"
                                    : "Activate"
                                }
                              >
                                {category.status === "active" ? (
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
            <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/35 p-4">
              <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                      POS Category
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      {editingCategory ? "Edit Category" : "Add Category"}
                    </h2>
                  </div>

                  <button
                    onClick={closeModal}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Category Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Example: Beverages"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Category Code
                    </label>
                    <input
                      value={form.category_code}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          category_code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Example: BEV"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Optional description"
                      rows={4}
                      className="mt-2 min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Production Required
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          requires_production: !prev.requires_production,
                        }))
                      }
                      className={
                        form.requires_production
                          ? "mt-2 h-11 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 text-left text-sm font-bold text-amber-700 transition-all duration-200 active:scale-[0.98]"
                          : "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-left text-sm font-bold text-slate-700 transition-all duration-200 active:scale-[0.98]"
                      }
                    >
                      {form.requires_production
                        ? "ON — Items enter Production Queue"
                        : "OFF — Direct Release / Skip Queue"}
                    </button>

                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                      Turn ON for cooked/prepared items. Turn OFF for bottled
                      drinks, packaged items, and direct release categories.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    onClick={closeModal}
                    disabled={saving}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveCategory}
                    disabled={saving}
                    className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Category"}
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
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-white text-slate-500";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-xs font-semibold leading-5">{helper}</p>
    </div>
  );
}


