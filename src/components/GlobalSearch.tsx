import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Users, Briefcase, FileBadge, UserCircle2, CalendarCheck } from "lucide-react";
import { useStoreState } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

type Panel = "admin" | "manager" | "employee" | "finance";

type Result = {
  id: string;
  label: string;
  sub?: string;
  group: string;
  icon: typeof Users;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
};

export function GlobalSearch({ panel }: { panel: Panel }) {
  const { t, dir } = useI18n();
  const state = useStoreState();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        (wrapRef.current?.querySelector("input") as HTMLInputElement | null)?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Result[] = [];
    const match = (s: any) => String(s ?? "").toLowerCase().includes(term);

    // Leads
    for (const l of state.leads || []) {
      if (out.length >= 30) break;
      if (match(l.company) || match(l.contact) || match(l.id) || match(l.owner) || match(l.industry)) {
        out.push({
          id: `lead-${l.id}`,
          label: l.company || l.id,
          sub: [l.contact, l.id].filter(Boolean).join(" · "),
          group: t("leads"),
          icon: Users,
          to: `/${panel}/leads/$leadId`,
          params: { leadId: String(l.id) },
        });
      }
    }
    // Activities (admin/manager/employee only have detail route)
    if (panel !== "finance") {
      for (const a of state.activities || []) {
        if (out.length >= 50) break;
        if (match(a.title) || match(a.owner) || match(a.type) || match(a.id)) {
          out.push({
            id: `act-${a.id}`,
            label: a.title,
            sub: [a.type, a.owner].filter(Boolean).join(" · "),
            group: t("activities"),
            icon: CalendarCheck,
            to: `/${panel}/activities/$activityId`,
            params: { activityId: String(a.id) },
          });
        }
      }
    }
    // Projects
    for (const p of state.projects || []) {
      if (out.length >= 70) break;
      if (match(p.name) || match((p as any).client) || match(p.id)) {
        if (panel === "admin" || panel === "manager") {
          out.push({
            id: `proj-${p.id}`,
            label: p.name,
            sub: [(p as any).client, p.id].filter(Boolean).join(" · "),
            group: t("projects"),
            icon: Briefcase,
            to: `/${panel}/projects/$projectId`,
            params: { projectId: String(p.id) },
          });
        } else if (panel === "employee") {
          out.push({
            id: `proj-${p.id}`,
            label: p.name,
            sub: (p as any).client,
            group: t("projects"),
            icon: Briefcase,
            to: `/employee/projects`,
          });
        }
      }
    }
    // Quotations / Offers
    for (const qn of state.quotations || []) {
      if (out.length >= 90) break;
      const anyQ = qn as any;
      const label = anyQ.title || anyQ.name || anyQ.id;
      if (match(label) || match(anyQ.client) || match(anyQ.id)) {
        const to =
          panel === "finance"
            ? `/finance/quotations/$quotationId`
            : `/${panel}/offers/$quotationId`;
        out.push({
          id: `quo-${anyQ.id}`,
          label: String(label),
          sub: [anyQ.client, anyQ.id].filter(Boolean).join(" · "),
          group: t("offers"),
          icon: FileBadge,
          to,
          params: { quotationId: String(anyQ.id) },
        });
      }
    }
    // Employees (admin/manager have detail)
    if (panel === "admin" || panel === "manager") {
      for (const e of state.employees || []) {
        if (out.length >= 110) break;
        if (match(e.name) || match((e as any).email) || match((e as any).role) || match(e.id)) {
          out.push({
            id: `emp-${e.id}`,
            label: e.name,
            sub: [(e as any).role, (e as any).department].filter(Boolean).join(" · "),
            group: t("employees"),
            icon: UserCircle2,
            to: `/${panel}/employees/$employeeId`,
            params: { employeeId: String(e.id) },
          });
        }
      }
    }
    return out.slice(0, 40);
  }, [q, state, panel, t]);

  useEffect(() => { setHi(0); }, [q]);

  function pick(r: Result) {
    setOpen(false);
    setQ("");
    navigate({ to: r.to as any, params: r.params as any, search: r.search as any });
  }

  // Group results
  const grouped = useMemo(() => {
    const m = new Map<string, Result[]>();
    for (const r of results) {
      const arr = m.get(r.group) || [];
      arr.push(r);
      m.set(r.group, arr);
    }
    return Array.from(m.entries());
  }, [results]);

  return (
    <div ref={wrapRef} className="relative ms-auto hidden max-w-md flex-1 md:block">
      <Search
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        style={{ insetInlineStart: "0.75rem" }}
      />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && results[hi]) { e.preventDefault(); pick(results[hi]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        placeholder={t("search")}
        className="h-10 w-full rounded-lg border border-border bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        style={{ paddingInlineStart: "2.25rem", paddingInlineEnd: "0.75rem" }}
        dir={dir}
      />
      {open && q && (
        <div className="absolute start-0 end-0 top-full mt-2 max-h-[420px] overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl z-50">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {dir === "rtl" ? "لا توجد نتائج" : "No results"}
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="py-1">
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </div>
                {items.map((r) => {
                  const idx = results.indexOf(r);
                  const Icon = r.icon;
                  const active = idx === hi;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onMouseEnter={() => setHi(idx)}
                      onClick={() => pick(r)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-start text-sm transition-colors ${
                        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.label}</div>
                        {r.sub && <div className="truncate text-xs text-muted-foreground">{r.sub}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
