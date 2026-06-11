"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
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

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const [importing, setImporting] = useState(false);

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  const loadCategories = async () => {
    setLoading(true);

    let query = supabase
      .from("pos_categories")
      .select("*")
      .order("name", { ascending: true });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setCategories([]);
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

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
    if (!companyId) {
      alert("Company not detected. Please login again.");
      return;
    }

    if (!form.name.trim()) {
      alert("Category name is required.");
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
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("pos_categories").insert([payload]);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    await loadCategories();

    setSaving(false);
    closeModal();
  };

  const toggleStatus = async (category: Category) => {
    const nextStatus = category.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("pos_categories")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (error) {
      alert(error.message);
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
      alert("Company not detected. Please login again.");
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        alert("CSV file is empty or missing data rows.");
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
        alert("CSV must include a name column.");
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
                ? !["false", "no", "n", "0", "off", "direct", "direct_release"].includes(
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
        alert("No valid categories found.");
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
        alert("No new categories to import. Existing names were skipped.");
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("pos_categories").insert(newRows);

      if (error) {
        alert(error.message);
        setImporting(false);
        return;
      }

      await loadCategories();

      alert(`Import successful. ${newRows.length} categories added.`);
    } catch (error: any) {
      alert(error?.message || "Import failed.");
    }

    setImporting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <PageGuard moduleKey="pos_categories">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          <section className="mb-8 overflow-hidden rounded-[2rem] border border-blue-300/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
                  OPSCORE POS
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                  Categories
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                  Manage POS category groups, short codes, reporting labels, and
                  cashier menu organization.
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
                  className="flex items-center gap-2 rounded-2xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-xs font-black text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload size={16} />
                  {importing ? "Importing..." : "Import CSV"}
                </button>

                <button
                  onClick={exportCsv}
                  className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  <Download size={16} />
                  Export CSV
                </button>

                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
                >
                  <Plus size={16} />
                  Add Category
                </button>
              </div>
            </div>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-blue-300/10 bg-white/[0.035] p-5 shadow-xl shadow-black/20">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Total Categories
              </p>
              <p className="mt-3 text-3xl font-black text-white">
                {categories.length}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/10 p-5 shadow-xl shadow-black/20">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Active
              </p>
              <p className="mt-3 text-3xl font-black text-emerald-200">
                {activeCount}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-red-400/15 bg-red-500/10 p-5 shadow-xl shadow-black/20">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
                Inactive
              </p>
              <p className="mt-3 text-3xl font-black text-red-200">
                {inactiveCount}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-amber-400/15 bg-amber-500/10 p-5 shadow-xl shadow-black/20">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                Production Required
              </p>
              <p className="mt-3 text-3xl font-black text-amber-100">
                {productionRequiredCount}
              </p>
            </div>
          </section>

          <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search category, code, description..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
              />
            </div>

            <button
              onClick={loadCategories}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-blue-300/10 bg-white/[0.035] shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-blue-300/10 bg-slate-950/80">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Category
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Code
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Description
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Production
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Loading categories...
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category) => (
                      <tr
                        key={category.id}
                        className="border-b border-slate-800/80 transition hover:bg-blue-500/5"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-blue-300/10 bg-blue-500/10 p-2 text-blue-200">
                              <ClipboardList size={16} />
                            </div>

                            <div>
                              <p className="font-black text-white">
                                {category.name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                POS Category
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {category.category_code ? (
                            <span className="inline-flex rounded-full border border-blue-300/15 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
                              {category.category_code}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-600">-</span>
                          )}
                        </td>

                        <td className="max-w-xl px-5 py-4 text-sm text-slate-400">
                          {category.description || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {category.requires_production === false ? (
                            <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-xs font-black text-slate-400">
                              Direct Release
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">
                              Queue Required
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {category.status === "active" ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                              <CheckCircle2 size={13} />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">
                              <XCircle size={13} />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(category)}
                              className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-300 transition hover:border-blue-300/30 hover:text-white"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              onClick={() => toggleStatus(category)}
                              className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-300 transition hover:border-blue-300/30 hover:text-white"
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

          {modalOpen && (
            <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-blue-300/10 bg-slate-950 shadow-2xl shadow-black">
                <div className="flex items-center justify-between border-b border-blue-300/10 p-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                      POS Category
                    </p>
                    <h2 className="mt-1 text-xl font-black text-white">
                      {editingCategory ? "Edit Category" : "Add Category"}
                    </h2>
                  </div>

                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
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
                      className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
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
                      placeholder="Example: BM, A&P, MD"
                      className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
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
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
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
                      className={`mt-2 w-full rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                        form.requires_production
                          ? "border-amber-300/20 bg-amber-500/10 text-amber-200"
                          : "border-slate-700 bg-slate-900 text-slate-400"
                      }`}
                    >
                      {form.requires_production
                        ? "ON — Items enter Production Queue"
                        : "OFF — Direct Release / Skip Queue"}
                    </button>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Turn ON for food or cooked items. Turn OFF for beer,
                      bottled drinks, snacks, and items that do not need kitchen
                      preparation.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
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
                      className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-blue-300/10 p-5">
                  <button
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-2xl border border-slate-700 px-5 py-3 text-xs font-black text-slate-300 transition hover:bg-slate-900 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveCategory}
                    disabled={saving}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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
