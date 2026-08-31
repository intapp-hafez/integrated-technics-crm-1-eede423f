import { formatDate } from "@/lib/utils";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtMoney, type Lead, type LeadStatus } from "@/lib/mock-data";
import {
  actions,
  useStoreState,
  getProbabilityForStatus,
  type Project,
  type LocationCity,
} from "@/lib/store";
import { filterMyProjects } from "@/lib/employeeProjects";
import { useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronRight,
  ArrowRight,
  LayoutGrid,
  Table as TableIcon,
  ExternalLink,
  Download,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { z } from "zod";
import { ExcelImportModal } from "@/components/ExcelImportModal";
import { useConfirm } from "@/components/shared/ConfirmDialog";

const leadSchema = z.object({
  company: z
    .string()
    .trim()
    .min(2, "Company is required (min 2 chars)")
    .max(120, "Company too long"),
  contact: z.string().trim().min(2, "Client name is required").max(120, "Client name too long"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email too long")
    .or(z.literal("")),
  industry: z.string().trim().max(80, "Industry too long").optional(),
  value: z.number().min(0, "Value must be ≥ 0").max(1_000_000_000, "Value too high"),
});

export const Route = createFileRoute("/employee/leads")({
  component: LeadsPage,
});

// Statuses are read dynamically from settings.stages

function LeadsPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { leads, settings } = useStoreState();
  const stageLabel = (k: string) =>
    settings.stages.find((s) => s.key === k)?.label ?? t(k as any) ?? k;
  const isDetailRoute = useRouterState({
    select: (state) =>
      state.location.pathname.startsWith("/employee/leads/") &&
      state.location.pathname !== "/employee/leads/",
  });
  const [view, setView] = useState<"cards" | "table">("cards");
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [showImport, setShowImport] = useState(false);
  // All hooks MUST be declared before any early return
  const { profile } = useAuth();
  const { projects } = useStoreState();

  if (isDetailRoute) return <Outlet />;

  const ME = profile?.full_name_en || profile?.full_name_ar || "hafez Rahim";
  const myProjects = filterMyProjects(projects, {
    profileId: (profile as any)?.profileId,
    userId: (profile as any)?.id,
    name: ME,
  });
  const safeCurrentName = ME.toLowerCase();

  const myLeads = leads.filter((l) => (l.owner || "").toLowerCase() === safeCurrentName);
  const filtered =
    statusFilter === "all" ? myLeads : myLeads.filter((l) => l.status === statusFilter);

  return (
    <AppShell
      panel="employee"
      user={{
        name: ME,
        role: t("employee"),
        initials: ME.split(" ")
          .map((w) => w[0])
          .join("")
          .substring(0, 2)
          .toUpperCase(),
        photo:
          profile?.avatar_url ||
          "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
      }}
      pageTitle={t("myLeads")}
    >
      <div className="sticky top-16 z-10 -mx-4 mb-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-xl md:border md:bg-card md:px-4 md:py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {filtered.length} {t("leads") || "leads"}
          </span>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setView("cards")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title={isAr ? "بطاقات" : "Cards"}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isAr ? "بطاقات" : "Cards"}</span>
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title={isAr ? "جدول" : "Table"}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isAr ? "جدول" : "Table"}</span>
              </button>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5 rotate-180" /> {t("importExcel")}
            </button>
            <button
              onClick={() => setEditing("new")}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-brand)] active:scale-[0.98] hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> {t("addLead")}
            </button>
          </div>
        </div>
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["all", ...settings.statuses] as const).map((s) => {
            const active = statusFilter === s;
            const stage = settings.stages.find((st) => st.key === s);
            const label = s === "all" ? "All" : (stage?.label ?? t(s as any) ?? s);
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start">{(t("lead" as any) as string) || "Lead"}</th>
                  <th className="px-4 py-3 text-start">{(t("contact" as any) as string) || "Contact"}</th>
                  <th className="px-4 py-3 text-start">{(t("phone" as any) as string) || "Phone"}</th>
                  <th className="px-4 py-3 text-start">{(t("stage" as any) as string) || "Stage"}</th>
                  <th className="px-4 py-3 text-start">{(t("value" as any) as string) || "Value"}</th>
                  <th className="px-4 py-3 text-start">{(t("probability" as any) as string) || "Probability"}</th>
                  <th className="px-4 py-3 text-start">{(t("expectedClose" as any) as string) || "Expected Close"}</th>
                  <th className="px-4 py-3 text-end">{(t("actions" as any) as string) || "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((l) => {
                  const prob = getProbabilityForStatus(l.status) ?? 0;
                  const relProj = projects.find(
                    (p) =>
                      p.id === (l as any).projectId ||
                      p.id === (l as any).project_id ||
                      p.name === l.company ||
                      p.client === l.company,
                  );
                  const displayPhone = l.phone || relProj?.clientPhone;
                  const isWonOrLost = l.status === "won" || l.status === "lost";

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-primary/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to="/employee/leads/$leadId"
                          params={{ leadId: l.id }}
                          className="font-semibold text-foreground hover:text-primary transition-colors block"
                        >
                          {l.code || l.company}
                        </Link>
                        {l.code && l.code !== l.company && (
                          <div className="text-xs text-muted-foreground">{l.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">{l.contact || "—"}</div>
                        {l.industry && <div className="text-[11px] opacity-75">{l.industry}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {displayPhone ? (
                          <a href={`tel:${displayPhone}`} className="hover:text-primary hover:underline">
                            {displayPhone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={l.status} label={stageLabel(l.status)} />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-primary text-xs">
                        {(l.value || 0) === 0 ? (
                          <span className="text-rose-500 font-semibold">{fmtMoney(0)}</span>
                        ) : (
                          fmtMoney(l.value)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <span
                            className={`h-2 w-2 rounded-full ${prob >= 70 ? "bg-emerald-500" : prob >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                          />
                          {prob}%
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {l.expectedCloseDate ? formatDate(l.expectedCloseDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() =>
                              setEditing({
                                ...l,
                                projectId: l.projectId || relProj?.id,
                                phone: l.phone || relProj?.clientPhone || "",
                              })
                            }
                            disabled={isWonOrLost}
                            className={`rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary transition ${isWonOrLost ? "opacity-40 cursor-not-allowed" : ""}`}
                            title={t("edit") || "Edit"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <Link
                            to="/employee/leads/$leadId"
                            params={{ leadId: l.id }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary transition"
                            title={t("openLead") || "Open Lead"}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t("noLeadsYet") || "No leads to show"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <LeadCard
              key={l.id}
              lead={l}
              onEdit={() => {
                const relProj = projects.find(
                  (p) =>
                    p.id === (l as any).projectId ||
                    p.id === (l as any).project_id ||
                    p.name === l.company ||
                    p.client === l.company,
                );
                setEditing({
                  ...l,
                  projectId: l.projectId || relProj?.id,
                  phone: l.phone || relProj?.clientPhone || "",
                });
              }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              {t("noLeadsYet") || "No leads to show"}
            </div>
          )}
        </div>
      )}

      {editing && (
        <LeadFormModal
          allowOwnerChange={false}
          defaultOwner={ME}
          filteredProjects={myProjects}
          initial={editing === "new" ? null : editing}
          locations={settings.locations}
          onClose={() => setEditing(null)}
        />
      )}
      {showImport && <ExcelImportModal type="leads" onClose={() => setShowImport(false)} />}
    </AppShell>
  );
}

function LeadCard({ lead: l, onEdit }: { lead: Lead; onEdit: () => void }) {
  const { t } = useI18n();
  const { settings, projects } = useStoreState();
  const stageLabel = (k: string) =>
    settings.stages.find((s) => s.key === k)?.label ?? t(k as any) ?? k;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div
        className={`relative p-4 transition-transform duration-200 ease-out ${
          (l.value || 0) === 0 ? "bg-rose-50/50" : "bg-card"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <Link to="/employee/leads/$leadId" params={{ leadId: l.id }} className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold text-foreground">
              {l.code || l.company}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {(() => {
                const relatedProject = projects.find(
                  (p) => p.id === (l as any).projectId || p.id === (l as any).project_id,
                );
                const displayPhone = l.phone || relatedProject?.clientPhone;
                return (
                  <>
                    {l.contact} {displayPhone ? `· ${displayPhone}` : ""} · {l.industry || "—"}
                  </>
                );
              })()}
            </div>
          </Link>
          <StatusBadge status={l.status} label={stageLabel(l.status)} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <a
            href={l.email ? `mailto:${l.email}` : undefined}
            onClick={(e) => !l.email && e.preventDefault()}
            className={`flex items-center justify-center gap-1.5 rounded-lg bg-secondary/60 px-2 py-2 text-[11px] font-semibold transition active:scale-[0.97] ${l.email ? "text-foreground hover:bg-secondary" : "cursor-not-allowed text-muted-foreground/60"}`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate">Email</span>
          </a>
          <a
            href={(() => {
              const relatedProject = projects.find(
                (p) => p.id === (l as any).projectId || p.id === (l as any).project_id,
              );
              const displayPhone = l.phone || relatedProject?.clientPhone;
              return displayPhone ? `tel:${displayPhone}` : undefined;
            })()}
            onClick={(e) => {
              const relatedProject = projects.find(
                (p) => p.id === (l as any).projectId || p.id === (l as any).project_id,
              );
              const displayPhone = l.phone || relatedProject?.clientPhone;
              if (!displayPhone) e.preventDefault();
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg bg-secondary/60 px-2 py-2 text-[11px] font-semibold transition active:scale-[0.97] ${(() => {
              const relatedProject = projects.find(
                (p) => p.id === (l as any).projectId || p.id === (l as any).project_id,
              );
              return l.phone || relatedProject?.clientPhone
                ? "text-foreground hover:bg-secondary"
                : "cursor-not-allowed text-muted-foreground/60";
            })()}`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Call</span>
          </a>
          <button
            onClick={(l.status === "won" || l.status === "lost") ? undefined : onEdit}
            disabled={(l.status === "won" || l.status === "lost")}
            className={`flex items-center justify-center gap-1.5 rounded-lg bg-secondary/60 px-2 py-2 text-[11px] font-semibold transition ${(l.status === "won" || l.status === "lost") ? "cursor-not-allowed opacity-50 text-muted-foreground" : "text-foreground active:scale-[0.97] hover:bg-secondary"}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>{t("edit")}</span>
          </button>
        </div>

        <Link
          to="/employee/leads/$leadId"
          params={{ leadId: l.id }}
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs transition hover:border-primary/40 hover:bg-secondary/40"
        >
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
            {l.expectedCloseDate ? (
              <>
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">
                  Follow-up ·{" "}
                  <span className="font-semibold text-foreground">
                    {formatDate(l.expectedCloseDate)}
                  </span>
                </span>
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{l.city || l.source || "Details"}</span>
              </>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex flex-col items-end gap-0.5">
              {(l.value || 0) === 0 ? (
                <>
                  <span className="font-mono text-sm font-bold text-rose-600">{fmtMoney(0)}</span>
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-rose-500 font-sans">
                    <span aria-hidden>⚠</span> {t("noValue" as any) || "No Value"}
                  </span>
                </>
              ) : (
                <span className="font-mono text-sm font-bold text-foreground">
                  {fmtMoney(l.value)}
                </span>
              )}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </Link>

        {(() => {
          const isWon = (l.status === "won" || l.status === "lost");
          const isLost = l.status === "lost";
          const pct = getProbabilityForStatus(l.status) ?? 0;
          const barColor = isWon
            ? "bg-emerald-500"
            : isLost
              ? "bg-rose-500"
              : pct >= 70
                ? "bg-emerald-500"
                : pct >= 40
                  ? "bg-amber-500"
                  : "bg-sky-500";
          const textColor = isWon
            ? "text-emerald-600"
            : isLost
              ? "text-rose-600"
              : "text-muted-foreground";
          return (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all duration-500 ease-out ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold ${textColor}`}>{pct}%</span>
              </div>
              <div className="mt-1 text-[9px] text-muted-foreground">{l.updatedAt}</div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
