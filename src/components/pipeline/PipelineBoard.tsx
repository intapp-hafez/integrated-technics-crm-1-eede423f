import { useState, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { getProbabilityForStatus, type LeadStatus, useStoreState } from "@/lib/store";
import { GripVertical, ExternalLink, ChevronLeft, ChevronRight, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/pipeline/PipelineFilters";
import { formatDate } from "@/lib/utils";
import {
  StageTransitionDialog,
  type StageTransitionPayload,
} from "@/components/pipeline/StageTransitionDialog";

export function PipelineBoard({
  leads,
  role,
}: {
  leads: any[];
  role: "admin" | "employee" | "manager";
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { settings } = useStoreState();

  const [view, setView] = useState<"board" | "table">("board");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStatus | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [pending, setPending] = useState<StageTransitionPayload | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (dir: 1 | -1) =>
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  const allStages = settings.stages.filter((s) => s.key !== "archived");
  const stages =
    stageFilter.length === 0 ? allStages : allStages.filter((s) => stageFilter.includes(s.key));

  const stageOptions = allStages.map((s) => ({
    value: s.key,
    label: (t(s.key as any) as string) ?? s.label,
  }));

  const getLeadDetailRoute = (leadId: string) => {
    if (role === "admin") return { to: "/admin/leads/$leadId", params: { leadId } };
    if (role === "manager") return { to: "/manager/leads/$leadId", params: { leadId } };
    return { to: "/employee/leads/$leadId", params: { leadId } };
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {view === "board" && (
            <>
              <GripVertical className="h-3.5 w-3.5" />
              {t("dragCardHint")}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${view === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title={(t("board" as any) as string) || "Board"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{(t("board" as any) as string) || "Board"}</span>
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title={(t("table" as any) as string) || "Table"}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{(t("table" as any) as string) || "Table"}</span>
            </button>
          </div>
          <MultiSelect
            label={(t("stage") as string) ?? "Stage"}
            options={stageOptions}
            selected={stageFilter}
            onChange={setStageFilter}
          />
          {view === "board" && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollBy(-1)}
                aria-label="Scroll stages left"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollBy(1)}
                aria-label="Scroll stages right"
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start">{(t("lead" as any) as string) || "Lead"}</th>
                  <th className="px-4 py-3 text-start">{(t("contact" as any) as string) || "Contact"}</th>
                  {role !== "employee" && <th className="px-4 py-3 text-start">{t("owner") || "Owner"}</th>}
                  <th className="px-4 py-3 text-start">{t("stage") || "Stage"}</th>
                  <th className="px-4 py-3 text-start">{t("value") || "Value"}</th>
                  <th className="px-4 py-3 text-start">{t("probability") || "Probability"}</th>
                  <th className="px-4 py-3 text-start">{(t("expectedClose" as any) as string) || "Expected Close"}</th>
                  <th className="px-4 py-3 text-end">{(t("actions" as any) as string) || "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stages.flatMap((stage) =>
                  leads
                    .filter((l) => l.status === stage.key)
                    .map((l) => {
                      const prob = getProbabilityForStatus(l.status) ?? 0;
                      const target = getLeadDetailRoute(l.id);
                      return (
                        <tr
                          key={l.id}
                          onClick={() => navigate(target as any)}
                          className="cursor-pointer hover:bg-primary/5 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground hover:text-primary">
                              {l.code || l.company}
                            </div>
                            <div className="text-xs text-muted-foreground">{l.company}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            <div>{l.contact || "—"}</div>
                            {l.phone && <div className="text-[11px] opacity-75">{l.phone}</div>}
                          </td>
                          {role !== "employee" && (
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                                {l.owner || "Unassigned"}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                              style={{
                                backgroundColor: `${stage.color}20`,
                                color: stage.color,
                                border: `1px solid ${stage.color}40`,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              {t(stage.key as any) ?? stage.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-primary text-xs">
                            {fmtMoney(l.value)}
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
                          <td className="px-4 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                            <Link
                              to={target.to as any}
                              params={target.params as any}
                              className="inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary transition"
                              title={t("openLead") || "Open Lead"}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    }),
                )}
                {leads.filter((l) => stages.some((s) => s.key === l.status)).length === 0 && (
                  <tr>
                    <td colSpan={role !== "employee" ? 8 : 7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t("noLeadsYet") || "No leads to show"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scroll-smooth">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);
          const totalValue = stageLeads.reduce((sum, l) => sum + l.value, 0);
          const isOver = overStage === stage.key;
          const isActive = activeStage === stage.key;
          return (
            <div
              key={stage.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.key as LeadStatus);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                const lid = e.dataTransfer.getData("text/lead-id") || dragId;
                if (lid) {
                  const lead = leads.find((l) => l.id === lid);
                  if (lead && lead.status !== stage.key) {
                    setPending({
                      lead,
                      toStage: stage.key as LeadStatus,
                      toLabel: (t(stage.key as any) as string) ?? stage.label,
                    });
                  }
                }
                setDragId(null);
                setOverStage(null);
              }}
              className={`w-[310px] min-w-[310px] max-w-[310px] shrink-0 rounded-xl p-3 transition border-t-4 shadow-sm ${
                isOver ? "ring-2 ring-primary" : isActive ? "ring-2 ring-primary/60" : ""
              }`}
              style={{
                borderTopColor: stage.color,
                backgroundColor: isOver
                  ? `${stage.color}20`
                  : isActive
                    ? `${stage.color}15`
                    : `${stage.color}05`,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveStage((s) => (s === stage.key ? null : stage.key))}
                className={`sticky top-0 z-10 -mx-3 -mt-3 mb-3 flex w-[calc(100%+1.5rem)] items-center justify-between rounded-t-xl px-4 py-2 text-left backdrop-blur transition`}
                style={{ backgroundColor: isActive ? `${stage.color}25` : `${stage.color}15` }}
                aria-pressed={isActive}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {t(stage.key as any) ?? stage.label}
                  </span>
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border">
                    {stageLeads.length}
                  </span>
                </div>
                {isActive && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
                )}
              </button>
              <div className="mb-2 px-1 font-mono text-[10px] text-muted-foreground">
                {fmtMoney(totalValue)}
              </div>

              <div className="min-h-[80px] space-y-2">
                {stageLeads.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(l.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/lead-id", l.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    onClick={() => {
                      const targetRoute =
                        role === "admin"
                          ? "/admin/leads/$leadId"
                          : role === "manager"
                            ? "/manager/leads/$leadId"
                            : "/employee/leads/$leadId";
                      navigate({ to: targetRoute, params: { leadId: l.id } });
                    }}
                    className={`group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition active:cursor-grabbing ${
                      dragId === l.id
                        ? "opacity-50 border-primary"
                        : "border-border hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="line-clamp-3 font-semibold text-foreground leading-snug break-words">
                          {l.code || l.company}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{l.contact}</div>
                      </div>
                      <Link
                        to={
                          role === "admin"
                            ? "/admin/leads/$leadId"
                            : role === "manager"
                              ? "/manager/leads/$leadId"
                              : "/employee/leads/$leadId"
                        }
                        params={{ leadId: l.id }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-primary"
                        aria-label={t("openLead")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        {fmtMoney(l.value)}
                      </span>
                      <div
                        className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full truncate max-w-[120px]"
                        title={l.owner}
                      >
                        {l.owner}
                      </div>
                    </div>
                    {(() => {
                      const prob = getProbabilityForStatus(l.status) ?? 0;
                      return (
                        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                prob >= 70
                                  ? "bg-emerald-500"
                                  : prob >= 40
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                            />
                            {prob}% {t("probability")}
                          </span>
                          {l.expectedCloseDate && (
                            <span className="font-mono">{formatDate(l.expectedCloseDate)}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border py-6 text-center text-[11px] text-muted-foreground">
                    {t("dropLeadsHere")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
      <StageTransitionDialog open={!!pending} payload={pending} onClose={() => setPending(null)} />
    </>
  );
}
