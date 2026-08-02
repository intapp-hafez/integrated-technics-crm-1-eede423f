import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { Box, Briefcase, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { sbDeleteCatalogItem } from "@/lib/supabaseWrites";
import { toast } from "sonner";
import type { CatalogItem } from "@/lib/store";
import { ItemModal, CategoriesModal } from "./admin.services-items";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/manager/services-items")({
  component: ManagerCatalogPage,
  head: () => ({ meta: [{ title: "Systems · INT-CRM" }] }),
});

function ManagerCatalogPage() {
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
    name:
      lang === "ar"
        ? (profile?.full_name_ar ?? profile?.full_name_en ?? "")
        : (profile?.full_name_en ?? ""),
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

  return (
    <AppShell panel="manager" user={user} pageTitle={isAr ? "الخدمات والمنتجات" : "Systems"}>
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
