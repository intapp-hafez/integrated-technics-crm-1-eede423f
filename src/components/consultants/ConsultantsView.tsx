import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useStoreState, actions, type Consultant } from "@/lib/store";
import { ConsultantModal } from "./ConsultantModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Users,
  Search,
  Plus,
  Download,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  Building,
} from "lucide-react";

interface ConsultantsViewProps {
  panel: "admin" | "manager";
}

const PAGE_SIZE = 10;

export function ConsultantsView({ panel }: ConsultantsViewProps) {
  const { t, lang, dir } = useI18n();
  const isAr = lang === "ar";
  const { consultants } = useStoreState();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    toast.success(isAr ? "تم النسخ إلى الحافظة" : "Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = consultants.length;
    const active = consultants.filter((c) => c.status === "active").length;
    const inactive = consultants.filter((c) => c.status === "inactive").length;
    return { total, active, inactive };
  }, [consultants]);

  // Generate stable deterministic sequential codes (e.g., Co-001, Co-002, ...)
  const consultantCodeMap = useMemo(() => {
    const sorted = [...consultants].sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });
    const map = new Map<string, string>();
    sorted.forEach((c, index) => {
      const numStr = String(index + 1).padStart(3, "0");
      map.set(c.id, `Co-${numStr}`);
    });
    return map;
  }, [consultants]);

  // Filtered dataset
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return consultants.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q) {
        const code = (consultantCodeMap.get(c.id) || "").toLowerCase();
        const matchCode = code.includes(q);
        const matchName = (c.fullName || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchAddress = (c.address || "").toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchPhone && !matchEmail && !matchAddress) return false;
      }
      return true;
    });
  }, [consultants, search, statusFilter, consultantCodeMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleOpenAdd = () => {
    setEditingConsultant(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Consultant) => {
    setEditingConsultant(c);
    setModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      actions.deleteConsultant(deleteId);
      toast.success(t("consultantDeletedSuccess"));
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error(isAr ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    const data = filtered.map((c, idx) => ({
      [isAr ? "كود الاستشاري" : "Consultant ID"]: consultantCodeMap.get(c.id) || `Co-${String(idx + 1).padStart(3, "0")}`,
      [isAr ? "الاسم الكامل" : "Full Name"]: c.fullName,
      [isAr ? "رقم الهاتف" : "Phone"]: c.phone || "—",
      [isAr ? "البريد الإلكتروني" : "Email"]: c.email || "—",
      [isAr ? "العنوان" : "Address"]: c.address || "—",
      [isAr ? "الحالة" : "Status"]: c.status === "active" ? (isAr ? "نشط" : "Active") : isAr ? "غير نشط" : "Inactive",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consultants");
    XLSX.writeFile(wb, `consultants_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(isAr ? "تم تصدير ملف إكسل بنجاح" : "Excel file exported successfully");
  };

  const COLOR_BADGES = [
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
    "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span>{isAr ? "الدليل" : "Directory"}</span>
            <span>›</span>
            <span className="text-foreground">{t("consultants")}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-black text-foreground">
            {t("consultants")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("consultantsDesc")}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-xs transition hover:bg-secondary"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            <span>{isAr ? "تصدير" : "Export"}</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>{t("addConsultant")}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground">{t("allConsultants")}</div>
            <div className="text-2xl font-black text-foreground">{metrics.total}</div>
          </div>
        </div>

        {/* Active */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground">{isAr ? "استشاريين نشطين" : "Active Consultants"}</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.active}</div>
          </div>
        </div>

        {/* Inactive */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground">{isAr ? "استشاريين غير نشطين" : "Inactive Consultants"}</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.inactive}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs">
        {/* Search Input */}
        <div className="relative min-w-[260px] flex-1 sm:max-w-md">
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchConsultants")}
            className="w-full rounded-xl border border-border bg-background py-2 pe-3 ps-10 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1">
          <button
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isAr ? "الكل" : "All"} ({metrics.total})
          </button>
          <button
            onClick={() => {
              setStatusFilter("active");
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-xs dark:bg-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("activeStatus")} ({metrics.active})
          </button>
          <button
            onClick={() => {
              setStatusFilter("inactive");
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "inactive"
                ? "bg-rose-600 text-white shadow-xs dark:bg-rose-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("inactiveStatus")} ({metrics.inactive})
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="border-b border-border bg-secondary/40 font-bold text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 text-start whitespace-nowrap">{t("consultantFullName")}</th>
                <th className="px-5 py-3.5 text-start whitespace-nowrap">{t("consultantPhone")}</th>
                <th className="px-5 py-3.5 text-start whitespace-nowrap">{t("consultantEmail")}</th>
                <th className="px-5 py-3.5 text-start whitespace-nowrap">{t("consultantAddress")}</th>
                <th className="px-5 py-3.5 text-start whitespace-nowrap">{t("status")}</th>
                <th className="px-5 py-3.5 text-end whitespace-nowrap">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-3">
                        <UserCheck className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-foreground">{t("noConsultantsFound")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {search || statusFilter !== "all"
                          ? isAr
                            ? "جرب تعديل كلمات البحث أو الفلاتر"
                            : "Try adjusting your search query or filter"
                          : isAr
                            ? "ابدأ بإضافة أول استشاري في النظام"
                            : "Get started by adding the first consultant"}
                      </p>
                      {!search && statusFilter === "all" && (
                        <button
                          onClick={handleOpenAdd}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{t("addConsultant")}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((consultant, idx) => {
                  const initials = consultant.fullName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const colorClass = COLOR_BADGES[idx % COLOR_BADGES.length];

                  return (
                    <tr key={consultant.id} className="transition hover:bg-secondary/40">
                      {/* Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs ${colorClass}`}
                          >
                            {initials || "CO"}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{consultant.fullName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                                {consultantCodeMap.get(consultant.id) || "Co-001"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {consultant.phone ? (
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a
                              href={`tel:${consultant.phone}`}
                              dir="ltr"
                              className="hover:text-primary hover:underline"
                            >
                              {consultant.phone}
                            </a>
                            <button
                              onClick={() => copyToClipboard(consultant.phone!, `phone-${consultant.id}`)}
                              className="text-muted-foreground/60 hover:text-foreground p-0.5 rounded transition"
                              title={isAr ? "نسخ الهاتف" : "Copy Phone"}
                            >
                              {copiedField === `phone-${consultant.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {consultant.email ? (
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a
                              href={`mailto:${consultant.email}`}
                              dir="ltr"
                              className="hover:text-primary hover:underline"
                            >
                              {consultant.email}
                            </a>
                            <button
                              onClick={() => copyToClipboard(consultant.email!, `email-${consultant.id}`)}
                              className="text-muted-foreground/60 hover:text-foreground p-0.5 rounded transition"
                              title={isAr ? "نسخ البريد" : "Copy Email"}
                            >
                              {copiedField === `email-${consultant.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="px-5 py-4">
                        {consultant.address ? (
                          <div className="flex items-center gap-1.5 text-foreground font-medium max-w-xs truncate">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span title={consultant.address} className="truncate">
                              {consultant.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button
                          onClick={() => actions.toggleConsultantStatus(consultant.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-xs transition hover:opacity-85 ${
                            consultant.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                          }`}
                          title={isAr ? "انقر لتبديل الحالة" : "Click to toggle status"}
                        >
                          {consultant.status === "active" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                          <span>
                            {consultant.status === "active" ? t("activeStatus") : t("inactiveStatus")}
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-end whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(consultant)}
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                            title={t("editConsultant")}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(consultant.id)}
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            title={t("deleteConsultant")}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
          <div>
            {isAr ? "عرض" : "Showing"}{" "}
            <span className="font-bold text-foreground">
              {paginated.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}
            </span>{" "}
            {isAr ? "إلى" : "to"}{" "}
            <span className="font-bold text-foreground">
              {Math.min(page * PAGE_SIZE, filtered.length)}
            </span>{" "}
            {isAr ? "من أصل" : "of"}{" "}
            <span className="font-bold text-foreground">{filtered.length}</span>{" "}
            {isAr ? "استشاري" : "consultants"}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border p-1.5 text-foreground hover:bg-secondary disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((pageNum) => {
                if (totalPages <= 7) return true;
                if (pageNum === 1 || pageNum === totalPages) return true;
                if (Math.abs(pageNum - page) <= 1) return true;
                return false;
              })
              .reduce<(number | string)[]>((acc, pageNum, idx, arr) => {
                if (
                  idx > 0 &&
                  typeof pageNum === "number" &&
                  typeof arr[idx - 1] === "number" &&
                  pageNum - (arr[idx - 1] as number) > 1
                ) {
                  acc.push("...");
                }
                acc.push(pageNum);
                return acc;
              }, [])
              .map((item, idx) => {
                if (typeof item === "string") {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs">
                      {item}
                    </span>
                  );
                }
                return (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                      page === item
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="rounded-lg border border-border p-1.5 text-foreground hover:bg-secondary disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <ConsultantModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        consultant={editingConsultant}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-start">
            <DialogTitle className="text-lg font-black text-foreground">
              {t("deleteConsultant")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {t("confirmDeleteConsultant")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="rounded-xl text-xs font-bold"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              className="rounded-xl text-xs font-bold"
            >
              {isAr ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
