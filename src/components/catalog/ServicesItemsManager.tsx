import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Box,
  Briefcase,
  Layers,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Mail,
  User,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import {
  sbAddCatalogItem,
  sbUpdateCatalogItem,
  sbDeleteCatalogItem,
  sbAddCatalogCategory,
  sbUpdateCatalogCategory,
  sbDeleteCatalogCategory,
  newUuid,
} from "@/lib/supabaseWrites";
import { toast } from "sonner";
import type { CatalogItem, CatalogCategory } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 12;

interface ServicesItemsManagerProps {
  panel: "admin" | "manager";
}

export function ServicesItemsManager({ panel }: ServicesItemsManagerProps) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { catalogItems = [], catalogCategories = [] } = useStoreState();
  const { profile, role } = useAuth();

  // Active tab: "systems" | "categories"
  const [activeTab, setActiveTab] = useState<"systems" | "categories">("systems");

  // Systems state & filters
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "item" | "service">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [systemPage, setSystemPage] = useState(1);
  const [editingItem, setEditingItem] = useState<CatalogItem | "new" | null>(null);

  // Categories state & filters
  const [catQ, setCatQ] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const [showAddCategoryCard, setShowAddCategoryCard] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatManagers, setNewCatManagers] = useState<{ name: string; email: string }[]>([]);

  // Inline editing state for category
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatManagers, setEditCatManagers] = useState<{ name: string; email: string }[]>([]);

  const user = {
    name:
      lang === "ar"
        ? (profile?.full_name_ar ?? profile?.full_name_en ?? "")
        : (profile?.full_name_en ?? ""),
    role: role ? t(role as any) : t("admin"),
    initials: (profile?.full_name_en || "U")[0].toUpperCase(),
    photo: profile?.avatar_url ?? "",
  };

  const { confirm, ConfirmDialog } = useConfirm();

  // Reset system pagination on filter change
  useEffect(() => {
    setSystemPage(1);
  }, [q, typeFilter, categoryFilter]);

  // Reset category pagination on search change
  useEffect(() => {
    setCategoryPage(1);
  }, [catQ]);

  const categories = useMemo(() => {
    return catalogCategories.map((c) => c.name).sort((a, b) => a.localeCompare(b));
  }, [catalogCategories]);

  // Map category name -> items count
  const itemsCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of catalogItems) {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    }
    return counts;
  }, [catalogItems]);

  // Filtered Systems
  const filteredSystems = useMemo(() => {
    return catalogItems.filter((i: CatalogItem) => {
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (q) {
        const query = q.toLowerCase();
        if (
          !i.name.toLowerCase().includes(query) &&
          !i.description.toLowerCase().includes(query) &&
          !i.category.toLowerCase().includes(query)
        )
          return false;
      }
      return true;
    });
  }, [catalogItems, q, typeFilter, categoryFilter]);

  // Paginated Systems
  const totalSystemPages = Math.max(1, Math.ceil(filteredSystems.length / PAGE_SIZE));
  const paginatedSystems = useMemo(() => {
    const start = (systemPage - 1) * PAGE_SIZE;
    return filteredSystems.slice(start, start + PAGE_SIZE);
  }, [filteredSystems, systemPage]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return catalogCategories.filter((c: CatalogCategory) => {
      if (!catQ) return true;
      const query = catQ.toLowerCase();
      const matchName = c.name.toLowerCase().includes(query);
      const matchManagers = (c.managers || []).some(
        (m) => m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query),
      );
      return matchName || matchManagers;
    });
  }, [catalogCategories, catQ]);

  // Paginated Categories
  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const paginatedCategories = useMemo(() => {
    const start = (categoryPage - 1) * PAGE_SIZE;
    return filteredCategories.slice(start, start + PAGE_SIZE);
  }, [filteredCategories, categoryPage]);

  // Handle Delete System Item
  const handleDeleteItem = async (id: string) => {
    if (
      await confirm({
        title: isAr ? "حذف العنصر؟" : "Delete Item?",
        message: isAr ? "لا يمكن التراجع عن هذا الإجراء." : "This action cannot be undone.",
        confirmLabel: isAr ? "حذف" : "Delete",
        variant: "danger",
      })
    ) {
      toast.promise(sbDeleteCatalogItem(id), {
        loading: isAr ? "جاري الحذف..." : "Deleting...",
        success: isAr ? "تم الحذف بنجاح" : "Item deleted successfully",
        error: isAr ? "فشل الحذف" : "Failed to delete item",
      });
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    const count = itemsCountByCategory.get(name) || 0;
    const warningText =
      count > 0
        ? isAr
          ? `يحتوي هذا التصنيف على ${count} عنصر. قد يتأثر العناصر المرتبطة به.`
          : `This category has ${count} system(s) linked to it. Items linked to it may be affected.`
        : isAr
          ? "لا يمكن التراجع عن هذا الإجراء."
          : "This action cannot be undone.";

    if (
      await confirm({
        title: isAr ? `حذف تصنيف "${name}"؟` : `Delete Category "${name}"?`,
        message: warningText,
        confirmLabel: isAr ? "حذف" : "Delete",
        variant: "danger",
      })
    ) {
      toast.promise(sbDeleteCatalogCategory(id), {
        loading: isAr ? "جاري الحذف..." : "Deleting...",
        success: isAr ? "تم حذف التصنيف بنجاح" : "Category deleted successfully",
        error: isAr ? "فشل حذف التصنيف" : "Failed to delete category",
      });
    }
  };

  // Handle Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const cleanedManagers = newCatManagers.filter((m) => m.name.trim() || m.email.trim());
    const promise = sbAddCatalogCategory({
      id: newUuid(),
      name: newCatName.trim(),
      managers: cleanedManagers,
    });

    toast.promise(promise, {
      loading: isAr ? "جاري إضافة التصنيف..." : "Adding category...",
      success: isAr ? "تمت إضافة التصنيف بنجاح" : "Category added successfully",
      error: isAr ? "فشل إضافة التصنيف" : "Failed to add category",
    });

    setNewCatName("");
    setNewCatManagers([]);
    setShowAddCategoryCard(false);
  };

  // Start Inline Editing Category
  const startEditingCategory = (cat: CatalogCategory) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatManagers(
      (cat.managers || []).map((m) => ({ name: m.name || "", email: m.email || "" })),
    );
  };

  // Cancel Inline Editing
  const cancelEditingCategory = () => {
    setEditingCatId(null);
    setEditCatName("");
    setEditCatManagers([]);
  };

  // Save Inline Editing Category
  const saveEditingCategory = async (catId: string) => {
    if (!editCatName.trim()) {
      toast.error(isAr ? "يرجى إدخال اسم التصنيف" : "Category name cannot be empty");
      return;
    }

    const cleanedManagers = editCatManagers.filter((m) => m.name.trim() || m.email.trim());
    const promise = sbUpdateCatalogCategory(catId, {
      name: editCatName.trim(),
      managers: cleanedManagers,
    });

    toast.promise(promise, {
      loading: isAr ? "جاري حفظ التعديلات..." : "Saving changes...",
      success: isAr ? "تم حفظ التصنيف بنجاح" : "Category updated successfully",
      error: isAr ? "فشل حفظ التصنيف" : "Failed to update category",
    });

    setEditingCatId(null);
  };

  return (
    <AppShell panel={panel} user={user} pageTitle={isAr ? "الأنظمة والتصنيفات" : "Systems & Categories"}>
      {/* Header Tabs */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isAr ? "إدارة الأنظمة والخدمات" : "Systems & Services Management"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr
              ? "إدارة قائمة الأنظمة والمنتجات والخدمات وتصنيفاتها ومدراء الأقسام"
              : "Manage systems, services, items catalog, categories, and category managers"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("systems")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "systems"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Box className="h-4 w-4" />
            <span>{isAr ? "الأنظمة والخدمات" : "Systems & Services"}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "systems"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {catalogItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "categories"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>{isAr ? "إدارة التصنيفات" : "Manage Categories"}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "categories"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {catalogCategories.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: SYSTEMS & SERVICES */}
      {activeTab === "systems" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isAr ? "البحث بالاسم أو الوصف أو التصنيف..." : "Search name, description, category..."}
                className="h-9 w-full rounded-lg border border-border bg-card ps-9 pe-3 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs focus:border-primary focus:outline-none"
              >
                <option value="all">{isAr ? "كل الأنواع" : "All Types"}</option>
                <option value="item">{isAr ? "منتجات / أنظمة" : "Items / Systems"}</option>
                <option value="service">{isAr ? "خدمات" : "Services"}</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 max-w-[200px] truncate rounded-lg border border-border bg-card px-2.5 text-xs focus:border-primary focus:outline-none"
              >
                <option value="all">{isAr ? "كل التصنيفات" : "All Categories"}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setEditingItem("new")}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.98] hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                {isAr ? "إضافة نظام" : "Add System"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">
                      {isAr ? "النوع" : "Type"}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-64">
                      {isAr ? "الاسم" : "Name"}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-56">
                      {isAr ? "التصنيف" : "Category"}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {isAr ? "الوصف" : "Description"}
                    </th>
                    <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-24">
                      {isAr ? "الإجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedSystems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-primary/5">
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                          {item.type === "item" ? (
                            <Box className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Briefcase className="h-3 w-3 text-emerald-500" />
                          )}
                          <span className="capitalize">
                            {item.type === "item" ? (isAr ? "منتج" : "Item") : isAr ? "خدمة" : "Service"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="rounded p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="rounded p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedSystems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {isAr ? "لا توجد أنظمة مطابقة لعرضها" : "No systems found matching your search"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Systems */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3 bg-card text-xs text-muted-foreground">
              <div>
                {filteredSystems.length > 0 ? (
                  <span>
                    {isAr
                      ? `عرض ${(systemPage - 1) * PAGE_SIZE + 1} - ${Math.min(
                          systemPage * PAGE_SIZE,
                          filteredSystems.length,
                        )} من ${filteredSystems.length} نظام`
                      : `Showing ${(systemPage - 1) * PAGE_SIZE + 1} to ${Math.min(
                          systemPage * PAGE_SIZE,
                          filteredSystems.length,
                        )} of ${filteredSystems.length} systems`}
                  </span>
                ) : (
                  <span>{isAr ? "0 أنظمة" : "0 systems"}</span>
                )}
              </div>

              {totalSystemPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={systemPage === 1}
                    onClick={() => setSystemPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                    title={isAr ? "السابق" : "Previous"}
                  >
                    {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalSystemPages }, (_, idx) => idx + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSystemPage(p)}
                        className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition ${
                          systemPage === p
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border border-border bg-card text-foreground hover:bg-secondary"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={systemPage === totalSystemPages}
                    onClick={() => setSystemPage((p) => Math.min(totalSystemPages, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                    title={isAr ? "التالي" : "Next"}
                  >
                    {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: MANAGE CATEGORIES */}
      {activeTab === "categories" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={catQ}
                onChange={(e) => setCatQ(e.target.value)}
                placeholder={isAr ? "البحث في التصنيفات أو المدراء..." : "Search categories or managers..."}
                className="h-9 w-full rounded-lg border border-border bg-card ps-9 pe-3 text-xs outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => setShowAddCategoryCard(!showAddCategoryCard)}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.98] hover:bg-primary/90"
            >
              {showAddCategoryCard ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  {isAr ? "إلغاء الإضافة" : "Cancel"}
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  {isAr ? "إضافة تصنيف جديد" : "Add New Category"}
                </>
              )}
            </button>
          </div>

          {/* Collapsible Add Category Card */}
          {showAddCategoryCard && (
            <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  {isAr ? "إضافة تصنيف جديد" : "Add New Category"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryCard(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isAr ? "اسم التصنيف *" : "Category Name *"}
                  </label>
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={isAr ? "مثال: Security & Surveillance" : "e.g., Security & Surveillance"}
                    required
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {isAr ? "مدراء التصنيف (اختياري)" : "Category Managers (Optional)"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewCatManagers([...newCatManagers, { name: "", email: "" }])}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <UserPlus className="h-3 w-3" />
                      {isAr ? "إضافة مدير" : "Add Manager"}
                    </button>
                  </div>

                  {newCatManagers.length > 0 ? (
                    <div className="space-y-2">
                      {newCatManagers.map((m, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            value={m.name}
                            onChange={(e) => {
                              const list = [...newCatManagers];
                              list[idx].name = e.target.value;
                              setNewCatManagers(list);
                            }}
                            placeholder={isAr ? "اسم المدير" : "Manager Name"}
                            className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-xs outline-none focus:border-primary"
                          />
                          <input
                            type="email"
                            value={m.email}
                            onChange={(e) => {
                              const list = [...newCatManagers];
                              list[idx].email = e.target.value;
                              setNewCatManagers(list);
                            }}
                            placeholder={isAr ? "البريد الإلكتروني" : "Manager Email"}
                            className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-xs outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setNewCatManagers(newCatManagers.filter((_, i) => i !== idx))}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                            title={isAr ? "إزالة" : "Remove"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/70 italic">
                      {isAr
                        ? "لم يتم تعيين مدراء لهذا التصنيف بعد. يمكنك إضافتهم الآن أو لاحقاً."
                        : "No managers added yet. You can add them now or edit them inline later."}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryCard(false)}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {isAr ? "حفظ التصنيف" : "Save Category"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories Table with Inline Row Editing */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-72">
                      {isAr ? "اسم التصنيف" : "Category Name"}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-36">
                      {isAr ? "عدد الأنظمة" : "Systems Count"}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {isAr ? "المدراء المسؤولين" : "Assigned Managers"}
                    </th>
                    <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-36">
                      {isAr ? "الإجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedCategories.map((cat) => {
                    const isEditing = editingCatId === cat.id;
                    const count = itemsCountByCategory.get(cat.name) || 0;

                    return (
                      <tr
                        key={cat.id}
                        className={`transition ${isEditing ? "bg-primary/5" : "hover:bg-primary/5"}`}
                      >
                        {/* Column 1: Category Name */}
                        <td className="px-4 py-3.5 align-top">
                          {isEditing ? (
                            <div>
                              <input
                                autoFocus
                                value={editCatName}
                                onChange={(e) => setEditCatName(e.target.value)}
                                className="h-9 w-full rounded-lg border border-primary bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={isAr ? "اسم التصنيف" : "Category Name"}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 font-bold text-foreground">
                              <Layers className="h-4 w-4 text-primary shrink-0" />
                              <span>{cat.name}</span>
                            </div>
                          )}
                        </td>

                        {/* Column 2: Systems Count */}
                        <td className="px-4 py-3.5 align-top">
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground border border-border">
                            <Box className="h-3 w-3 text-blue-500" />
                            {count} {isAr ? "نظام" : "items"}
                          </span>
                        </td>

                        {/* Column 3: Managers (Editable inline inside row) */}
                        <td className="px-4 py-3.5 align-top">
                          {isEditing ? (
                            <div className="space-y-2">
                              {editCatManagers.map((m, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <input
                                    value={m.name}
                                    onChange={(e) => {
                                      const updated = [...editCatManagers];
                                      updated[idx].name = e.target.value;
                                      setEditCatManagers(updated);
                                    }}
                                    placeholder={isAr ? "اسم المدير" : "Manager Name"}
                                    className="h-8 flex-1 rounded-md border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
                                  />
                                  <input
                                    type="email"
                                    value={m.email}
                                    onChange={(e) => {
                                      const updated = [...editCatManagers];
                                      updated[idx].email = e.target.value;
                                      setEditCatManagers(updated);
                                    }}
                                    placeholder={isAr ? "البريد الإلكتروني" : "Manager Email"}
                                    className="h-8 flex-1 rounded-md border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditCatManagers(editCatManagers.filter((_, i) => i !== idx))
                                    }
                                    className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                                    title={isAr ? "إزالة المدير" : "Remove Manager"}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() =>
                                  setEditCatManagers([...editCatManagers, { name: "", email: "" }])
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {isAr ? "إضافة مدير جديد" : "Add Manager"}
                              </button>
                            </div>
                          ) : (
                            <div>
                              {cat.managers && cat.managers.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {cat.managers.map((m, i) => (
                                    <div
                                      key={i}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-2.5 py-1 text-xs"
                                    >
                                      <span className="font-medium text-foreground">{m.name || "—"}</span>
                                      {m.email && (
                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                          <Mail className="h-2.5 w-2.5" />
                                          {m.email}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">
                                  {isAr ? "لا يوجد مدراء معينين" : "No managers assigned"}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Column 4: Actions (Save/Cancel in edit mode, Edit/Delete in normal mode) */}
                        <td className="px-4 py-3.5 text-end align-top">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => saveEditingCategory(cat.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
                                title={isAr ? "حفظ التعديلات" : "Save changes"}
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>{isAr ? "حفظ" : "Save"}</span>
                              </button>
                              <button
                                onClick={cancelEditingCategory}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                                title={isAr ? "إلغاء" : "Cancel"}
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>{isAr ? "إلغاء" : "Cancel"}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditingCategory(cat)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                title={isAr ? "تعديل في السطر" : "Edit inline"}
                              >
                                <Pencil className="h-3 w-3" />
                                <span>{isAr ? "تعديل" : "Edit"}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                                title={isAr ? "حذف" : "Delete"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedCategories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {isAr ? "لا توجد تصنيفات مطابقة" : "No categories found matching your search"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Categories */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3 bg-card text-xs text-muted-foreground">
              <div>
                {filteredCategories.length > 0 ? (
                  <span>
                    {isAr
                      ? `عرض ${(categoryPage - 1) * PAGE_SIZE + 1} - ${Math.min(
                          categoryPage * PAGE_SIZE,
                          filteredCategories.length,
                        )} من ${filteredCategories.length} تصنيف`
                      : `Showing ${(categoryPage - 1) * PAGE_SIZE + 1} to ${Math.min(
                          categoryPage * PAGE_SIZE,
                          filteredCategories.length,
                        )} of ${filteredCategories.length} categories`}
                  </span>
                ) : (
                  <span>{isAr ? "0 تصنيفات" : "0 categories"}</span>
                )}
              </div>

              {totalCategoryPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={categoryPage === 1}
                    onClick={() => setCategoryPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                    title={isAr ? "السابق" : "Previous"}
                  >
                    {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalCategoryPages }, (_, idx) => idx + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCategoryPage(p)}
                        className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition ${
                          categoryPage === p
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border border-border bg-card text-foreground hover:bg-secondary"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={categoryPage === totalCategoryPages}
                    onClick={() => setCategoryPage((p) => Math.min(totalCategoryPages, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                    title={isAr ? "التالي" : "Next"}
                  >
                    {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* System Item Modal */}
      {editingItem && (
        <ItemModal
          item={editingItem === "new" ? null : editingItem}
          onClose={() => setEditingItem(null)}
          isAr={isAr}
          categories={catalogCategories}
        />
      )}

      <ConfirmDialog />
    </AppShell>
  );
}

export function ItemModal({
  item,
  onClose,
  isAr,
  categories,
}: {
  item: CatalogItem | null;
  onClose: () => void;
  isAr: boolean;
  categories: CatalogCategory[];
}) {
  const [name, setName] = useState(item?.name || "");
  const [type, setType] = useState<"item" | "service">(item?.type || "item");
  const [category, setCategory] = useState(item?.category || (categories[0]?.name ?? ""));
  const [description, setDescription] = useState(item?.description || "");
  const [costPrice, setCostPrice] = useState(item?.costPrice?.toString() || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !description.trim()) return;

    const payload: Partial<CatalogItem> = {
      id: item?.id || newUuid(),
      name: name.trim(),
      type,
      category: category.trim(),
      description: description.trim(),
      costPrice: costPrice.trim() ? Number(costPrice) : undefined,
    };

    const promise = item ? sbUpdateCatalogItem(item.id, payload) : sbAddCatalogItem(payload);

    toast.promise(promise, {
      loading: isAr ? "جاري الحفظ..." : "Saving...",
      success: isAr ? "تم الحفظ بنجاح" : "Item saved successfully",
      error: isAr ? "فشل الحفظ" : "Failed to save item",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {item ? (isAr ? "تعديل النظام" : "Edit System") : isAr ? "إضافة نظام" : "Add System"}
        </h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAr ? "النوع" : "Type"}
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="type"
                  checked={type === "item"}
                  onChange={() => setType("item")}
                  className="text-primary focus:ring-primary/20"
                />
                {isAr ? "منتج / نظام" : "Item / System"}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="type"
                  checked={type === "service"}
                  onChange={() => setType("service")}
                  className="text-primary focus:ring-primary/20"
                />
                {isAr ? "خدمة" : "Service"}
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAr ? "الاسم" : "Name"}
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAr ? "التصنيف" : "Category"}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
            >
              <option value="" disabled>
                {isAr ? "اختر تصنيف..." : "Select a category..."}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAr ? "الوصف" : "Description"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="w-full rounded-lg border border-border bg-transparent p-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform active:scale-[0.98] hover:bg-primary/90"
            >
              {isAr ? "حفظ" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
