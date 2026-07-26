import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { Plus, Search, Pencil, Trash2, Box, Briefcase } from "lucide-react";
import { useState, useMemo } from "react";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { sbAddCatalogItem, sbUpdateCatalogItem, sbDeleteCatalogItem, sbAddCatalogCategory, sbUpdateCatalogCategory, sbDeleteCatalogCategory, newUuid } from "@/lib/supabaseWrites";
import { toast } from "sonner";
import type { CatalogItem, CatalogCategory } from "@/lib/store";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/services-items")({
  component: AdminCatalogPage,
  head: () => ({ meta: [{ title: "Systems · INT-CRM" }] }),
});

function AdminCatalogPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { catalogItems = [], catalogCategories = [] } = useStoreState();
  const { profile, role } = useAuth();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "item" | "service">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<CatalogItem | "new" | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  const user = {
    name: lang === "ar" ? (profile?.full_name_ar ?? profile?.full_name_en ?? "") : (profile?.full_name_en ?? ""),
    role: role ? t(role as any) : t("admin"),
    initials: (profile?.full_name_en || "U")[0].toUpperCase(),
    photo: profile?.avatar_url ?? "",
  };

  const { confirm, ConfirmDialog } = useConfirm();

  const categories = useMemo(() => {
    return catalogCategories.map((c) => c.name).sort((a, b) => a.localeCompare(b));
  }, [catalogCategories]);

  const filtered = useMemo(() => {
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

  const handleDelete = async (id: string) => {
    if (await confirm({ title: isAr ? "حذف العنصر؟" : "Delete Item?", message: isAr ? "لا يمكن التراجع عن هذا الإجراء." : "This action cannot be undone.", confirmLabel: isAr ? "حذف" : "Delete", variant: "danger" })) {
      toast.promise(sbDeleteCatalogItem(id), {
        loading: isAr ? "جاري الحذف..." : "Deleting...",
        success: isAr ? "تم החذف بنجاح" : "Item deleted successfully",
        error: isAr ? "فشل الحذف" : "Failed to delete item",
      });
    }
  };

  return (
    <AppShell panel="admin" user={user} pageTitle={isAr ? "الخدمات والمنتجات" : "Systems"}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? "البحث بالوصف أو التصنيف..." : "Search description or category..."}
            className="h-9 w-full rounded-lg border border-border bg-card ps-9 pe-3 text-xs outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs focus:border-primary focus:outline-none"
          >
            <option value="all">{isAr ? "كل الأنواع" : "All Types"}</option>
            <option value="item">{isAr ? "منتجات" : "Items"}</option>
            <option value="service">{isAr ? "خدمات" : "Services"}</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs focus:border-primary focus:outline-none"
          >
            <option value="all">{isAr ? "كل التصنيفات" : "All Categories"}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCategoriesModal(true)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-transform active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
          >
            {isAr ? "إدارة التصنيفات" : "Manage Categories"}
          </button>
          <button
            onClick={() => setEditingItem("new")}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.98] hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            {isAr ? "إضافة عنصر" : "Add System"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "النوع" : "Type"}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "الاسم" : "Name"}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "التصنيف" : "Category"}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "الوصف" : "Description"}
                </th>
                <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="transition hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                      {item.type === "item" ? (
                        <Box className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Briefcase className="h-3 w-3 text-emerald-500" />
                      )}
                      <span className="capitalize">{item.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.description}</td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="rounded p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                        title={isAr ? "تعديل" : "Edit"}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded p-1 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                        title={isAr ? "حذف" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {isAr ? "لا توجد عناصر لعرضها" : "No items to show"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingItem && (
        <ItemModal
          item={editingItem === "new" ? null : editingItem}
          onClose={() => setEditingItem(null)}
          isAr={isAr}
          categories={catalogCategories}
        />
      )}
      {showCategoriesModal && (
        <CategoriesModal
          categories={catalogCategories}
          onClose={() => setShowCategoriesModal(false)}
          isAr={isAr}
        />
      )}
      <ConfirmDialog />
    </AppShell>
  );
}

export function ItemModal({ item, onClose, isAr, categories }: { item: CatalogItem | null; onClose: () => void; isAr: boolean; categories: CatalogCategory[] }) {
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
          {item ? (isAr ? "تعديل العنصر" : "Edit System") : isAr ? "إضافة عنصر" : "Add System"}
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
                {isAr ? "منتج" : "Item"}
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

export function CategoriesModal({ categories, onClose, isAr }: { categories: CatalogCategory[]; onClose: () => void; isAr: boolean }) {
  const [name, setName] = useState("");
  const [managers, setManagers] = useState<{ name: string; email: string }[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editManagers, setEditManagers] = useState<{ name: string; email: string }[]>([]);

  const { confirm, ConfirmDialog } = useConfirm();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const promise = sbAddCatalogCategory({ id: newUuid(), name: name.trim(), managers });
    toast.promise(promise, {
      loading: isAr ? "جاري الإضافة..." : "Adding...",
      success: isAr ? "تمت الإضافة بنجاح" : "Category added successfully",
      error: isAr ? "فشل الإضافة" : "Failed to add category",
    });
    setName("");
    setManagers([]);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const promise = sbUpdateCatalogCategory(editingId, { name: editName.trim(), managers: editManagers });
    toast.promise(promise, {
      loading: isAr ? "جاري الحفظ..." : "Saving...",
      success: isAr ? "تم الحفظ بنجاح" : "Category saved successfully",
      error: isAr ? "فشل الحفظ" : "Failed to save category",
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: isAr ? "حذف التصنيف؟" : "Delete Category?", message: isAr ? "قد يتأثر العناصر المرتبطة بهذا التصنيف." : "Items linked to this category may be affected.", confirmLabel: isAr ? "حذف" : "Delete", variant: "danger" })) {
      toast.promise(sbDeleteCatalogCategory(id), {
        loading: isAr ? "جاري الحذف..." : "Deleting...",
        success: isAr ? "تم الحذف بنجاح" : "Category deleted successfully",
        error: isAr ? "فشل الحذف" : "Failed to delete category",
      });
    }
  };

  const renderManagerInputs = (
    list: { name: string; email: string }[],
    setList: (m: { name: string; email: string }[]) => void
  ) => (
    <div className="space-y-2 mt-2">
      {list.map((m, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            value={m.name}
            onChange={(e) => {
              const cp = [...list];
              cp[idx].name = e.target.value;
              setList(cp);
            }}
            placeholder={isAr ? "اسم المدير" : "Manager Name"}
            className="h-8 flex-1 rounded-md border border-border bg-transparent px-2 text-xs outline-none focus:border-primary"
          />
          <input
            value={m.email}
            onChange={(e) => {
              const cp = [...list];
              cp[idx].email = e.target.value;
              setList(cp);
            }}
            placeholder={isAr ? "البريد الإلكتروني" : "Email"}
            className="h-8 flex-1 rounded-md border border-border bg-transparent px-2 text-xs outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setList(list.filter((_, i) => i !== idx))}
            className="text-muted-foreground hover:text-rose-500"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setList([...list, { name: "", email: "" }])}
        className="text-xs text-primary hover:underline"
      >
        + {isAr ? "إضافة مدير" : "Add Manager"}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {isAr ? "إدارة التصنيفات" : "Manage Categories"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleAdd} className="mb-6 rounded-lg border border-border p-4 bg-muted/20">
          <h3 className="text-sm font-semibold mb-3">{isAr ? "إضافة تصنيف جديد" : "Add New Category"}</h3>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? "اسم التصنيف الجديد..." : "New category name..."}
              className="h-10 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
              required
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] hover:bg-primary/90"
            >
              {isAr ? "إضافة" : "Add"}
            </button>
          </div>
          {renderManagerInputs(managers, setManagers)}
        </form>

        <div className="max-h-[350px] overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {categories.map((c) => (
                <tr key={c.id} className="transition hover:bg-primary/5">
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <div className="space-y-3">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
                        />
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">{isAr ? "المدراء" : "Managers"}</label>
                          {renderManagerInputs(editManagers, setEditManagers)}
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                          >
                            {isAr ? "إلغاء" : "Cancel"}
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            {isAr ? "حفظ" : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-foreground">{c.name}</div>
                        {c.managers && c.managers.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {c.managers.map((m, i) => (
                              <div key={i}>• {m.name} ({m.email})</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end align-top">
                    {editingId !== c.id && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                            setEditManagers(c.managers || []);
                          }}
                          className="rounded p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                          title={isAr ? "تعديل" : "Edit"}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="rounded p-1 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                          title={isAr ? "حذف" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                    {isAr ? "لا توجد تصنيفات" : "No categories found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
}
