import { createFileRoute } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState, type HistoryModule } from "@/lib/store";
import { useMemo, useState } from "react";
import { Filter, Workflow, Users, Briefcase, UserCircle2, CalendarCheck, Settings as SettingsIcon, Search } from "lucide-react";

export const Route = createFileRoute("/admin/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Audit & History · INT-CRM" }] }),
});

const MODULES: { key: HistoryModule | "all"; label: string; icon: any; tone: string; i18nKey: any }[] = [
  { key: "all", label: "All", icon: Filter, tone: "text-foreground", i18nKey: "all" },
  { key: "lead", label: "Leads", icon: Users, tone: "text-sky-600", i18nKey: "leads" },
  { key: "pipeline", label: "Pipeline", icon: Workflow, tone: "text-primary", i18nKey: "pipeline" },
  { key: "project", label: "Accounts", icon: Briefcase, tone: "text-violet-600", i18nKey: "projects" },
  { key: "employee", label: "Employees", icon: UserCircle2, tone: "text-emerald-600", i18nKey: "employees" },
  { key: "activity", label: "Activities", icon: CalendarCheck, tone: "text-amber-600", i18nKey: "activities" },
  { key: "settings", label: "Settings", icon: SettingsIcon, tone: "text-rose-600", i18nKey: "settings" },
];

function fmtTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

function HistoryPage() {
  const { t } = useI18n();
  const { history } = useStoreState();
  const [mod, setMod] = useState<HistoryModule | "all">("all");
  const [q, setQ] = useState("");
  const [actor, setActor] = useState("all");

  const actors = useMemo(() => Array.from(new Set(history.map((h) => h.actor))), [history]);
  const filtered = history.filter((h) =>
    (mod === "all" || h.module === mod) &&
    (actor === "all" || h.actor === actor) &&
    (q === "" || [h.target, h.action, h.details ?? ""].join(" ").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppShell panel="admin" user={{ name: "hafez Rahim", role: t("admin"), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" }} pageTitle={t("history")}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const active = mod === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMod(m.key)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "bg-card text-foreground ring-1 ring-border hover:bg-accent"
                }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? "" : m.tone}`} />
              {t(m.i18nKey) ?? m.label}
            </button>
          );
        })}
        <div className="relative ms-auto">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="h-9 w-56 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ paddingInlineStart: "2.25rem", paddingInlineEnd: "0.75rem" }}
          />
        </div>
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">{t("all")} — {t("actor")}</option>
          {actors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("auditLog")} · {filtered.length} entries
        </div>
        <ol className="relative">
          {filtered.map((h, idx) => {
            const m = MODULES.find((x) => x.key === h.module)!;
            const Icon = m.icon;
            return (
              <li key={h.id} className={`relative flex gap-4 px-5 py-4 ${idx < filtered.length - 1 ? "border-b border-border" : ""}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary ${m.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-foreground">{h.actor}</span>
                    <span className="text-sm text-muted-foreground">{h.action}</span>
                    <span className="font-semibold text-foreground">· {h.target}</span>
                    <span className="ms-auto font-mono text-[11px] text-muted-foreground">{fmtTime(h.ts)}</span>
                  </div>
                  {h.details && <div className="mt-1 text-sm text-muted-foreground">{h.details}</div>}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(m.i18nKey) ?? m.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{shortId(h.id)}</span>
                  </div>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">{t("noEntriesMatchFilters")}</li>
          )}
        </ol>
      </div>
    </AppShell>
  );
}