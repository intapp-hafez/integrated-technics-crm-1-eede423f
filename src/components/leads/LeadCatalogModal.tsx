import { useState } from "react";
import { Loader2, X, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { sbAddLeadCatalogItem } from "@/lib/supabaseWrites";
import type { CatalogItem } from "@/lib/store";

export function LeadCatalogModal({
  leadId,
  catalogItems,
  isAr,
  onClose,
}: {
  leadId: string;
  catalogItems: CatalogItem[];
  isAr: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const filtered = catalogItems.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const toggleItem = (item: CatalogItem) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = 1;
      }
      return next;
    });
  };

  const updateQuantity = (item: CatalogItem, qty: number) => {
    if (qty < 1) return;
    setSelectedItems((prev) => ({ ...prev, [item.id]: qty }));
  };

  const handleConfirm = async () => {
    const keys = Object.keys(selectedItems);
    if (keys.length === 0) return onClose();

    setSaving(true);
    try {
      for (const id of keys) {
        await sbAddLeadCatalogItem({
          leadId,
          catalogItemId: id,
          quantity: selectedItems[id],
        });
      }
      toast.success(isAr ? "تم الإضافة بنجاح" : "Items added successfully");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Error saving items");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold text-foreground">
            {isAr ? "إضافة خدمات / منتجات" : "Add Systems"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={isAr ? "ابحث بالاسم أو التصنيف..." : "Search by name or category..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-32 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary px-3 py-2"
          >
            <option value="all">{isAr ? "????" : "All"}</option>
            <option value="item">{isAr ? "??????" : "Items"}</option>
            <option value="service">{isAr ? "?????" : "Services"}</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {isAr ? "لا توجد نتائج" : "No items found"}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((item) => {
                const isSelected = !!selectedItems[item.id];
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div 
                      className="flex-1 flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleItem(item)}
                    >
                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.category} • {item.type} {item.costPrice ? `• $${item.costPrice}` : ""}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">{isAr ? "الكمية:" : "Qty:"}</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedItems[item.id]}
                          onChange={(e) => updateQuantity(item, parseInt(e.target.value) || 1)}
                          className="w-16 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 flex justify-end gap-3 bg-card/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || Object.keys(selectedItems).length === 0}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAr ? "تأكيد الإضافة" : "Confirm Addition"}
          </button>
        </div>
      </div>
    </div>
  );
}
