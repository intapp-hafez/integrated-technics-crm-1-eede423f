import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Mail, Phone, Building2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const Route = createFileRoute("/admin/clients")({
  component: AdminClientsPage,
  head: () => ({ meta: [{ title: "Clients · Admin" }] }),
});

type ProjectLite = { id: string; name_en: string | null; name_ar: string | null; status: string | null };
type ClientRow = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  email: string | null;
  phone: string | null;
  projects: ProjectLite[];
};

type SortKey = "name" | "email" | "phone" | "projects";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

function AdminClientsPage() {
  const { t, dir, lang } = useI18n();
  const isAr = lang === "ar";
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: clients, error: cErr }, { data: projects, error: pErr }] = await Promise.all([
        supabase.from("clients").select("id, name_en, name_ar, email, phone").order("name_en"),
        supabase.from("projects").select("id, name_en, name_ar, status, client_id"),
      ]);
      if (cErr || pErr) {
        console.error(cErr || pErr);
        setRows([]);
      } else {
        const byClient = new Map<string, ProjectLite[]>();
        (projects || []).forEach((p: any) => {
          if (!p.client_id) return;
          const list = byClient.get(p.client_id) || [];
          list.push({ id: p.id, name_en: p.name_en, name_ar: p.name_ar, status: p.status });
          byClient.set(p.client_id, list);
        });
        setRows(
          (clients || []).map((c: any) => ({
            ...c,
            projects: byClient.get(c.id) || [],
          })),
        );
      }
      setLoading(false);
    })();
  }, []);

  const allStages = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((c) => c.projects.forEach((p) => p.status && s.add(p.status)));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = rows.filter((c) => {
      if (
        ql &&
        !(
          (c.name_en || "").toLowerCase().includes(ql) ||
          (c.name_ar || "").toLowerCase().includes(ql) ||
          (c.email || "").toLowerCase().includes(ql) ||
          (c.phone || "").toLowerCase().includes(ql)
        )
      )
        return false;
      if (stageFilter !== "all" && !c.projects.some((p) => p.status === stageFilter)) return false;
      return true;
    });

    const getVal = (c: ClientRow): string | number => {
      switch (sortKey) {
        case "name":
          return ((isAr ? c.name_ar : c.name_en) || c.name_en || "").toLowerCase();
        case "email":
          return (c.email || "").toLowerCase();
        case "phone":
          return (c.phone || "").toLowerCase();
        case "projects":
          return c.projects.length;
      }
    };
    list = [...list].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, q, stageFilter, sortKey, sortDir, isAr]);

  useEffect(() => {
    setPage(1);
  }, [q, stageFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      {sortKey === k ? (
        sortDir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : null}
    </button>
  );

  return (
    <AppShell
      panel="admin"
      user={{ name: "", role: t("admin" as any), initials: "" }}
      pageTitle={isAr ? "العملاء" : "Clients"}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? "بحث بالاسم أو البريد أو الهاتف..." : "Search by name, email, or phone..."}
            className="h-10 w-full rounded-lg border border-border bg-background ps-9 pe-3 text-sm"
            dir={dir}
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="all">{isAr ? "كل المراحل" : "All stages"}</option>
          {allStages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="ms-auto text-xs text-muted-foreground">
          {filtered.length} {isAr ? "نتيجة" : "results"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {isAr ? "جارٍ التحميل..." : "Loading..."}
          </div>
        ) : pageRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{isAr ? "لا يوجد عملاء" : "No clients found"}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start"><SortHeader k="name" label={isAr ? "الاسم" : "Name"} /></th>
                    <th className="px-4 py-3 text-start"><SortHeader k="phone" label={isAr ? "الهاتف" : "Phone"} /></th>
                    <th className="px-4 py-3 text-start"><SortHeader k="email" label={isAr ? "البريد" : "Email"} /></th>
                    <th className="px-4 py-3 text-start"><SortHeader k="projects" label={isAr ? "الحسابات" : "Accounts"} /></th>
                    <th className="px-4 py-3 text-start">{isAr ? "مرحلة الحساب" : "Account Stage"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageRows.map((c) => {
                    const name = (isAr ? c.name_ar : c.name_en) || c.name_en || c.name_ar || "—";
                    return (
                      <tr key={c.id} className="hover:bg-accent/40">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.phone ? (
                            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                              <Phone className="h-3.5 w-3.5" /> {c.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                              <Mail className="h-3.5 w-3.5" /> {c.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.projects.length === 0 ? (
                            <span className="text-xs text-muted-foreground">{isAr ? "لا يوجد" : "None"}</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {c.projects.slice(0, 3).map((p) => (
                                <span key={p.id} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-foreground">
                                  {(isAr ? p.name_ar : p.name_en) || p.name_en || "—"}
                                </span>
                              ))}
                              {c.projects.length > 3 && (
                                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">+{c.projects.length - 3}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.projects.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(c.projects.map((p) => p.status).filter(Boolean))).map((s) => (
                                <StatusBadge key={s as string} status={s as string} />
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                {isAr ? "صفحة" : "Page"} {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-accent disabled:opacity-50"
                >
                  <ChevronLeft className="h-3 w-3" /> {isAr ? "السابق" : "Prev"}
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-accent disabled:opacity-50"
                >
                  {isAr ? "التالي" : "Next"} <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
