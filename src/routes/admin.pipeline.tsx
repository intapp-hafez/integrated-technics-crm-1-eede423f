import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState, type LeadStatus } from "@/lib/store";
import { useRole } from "@/lib/role";
import { MultiSelect } from "@/components/PipelineFilters";
import { GripVertical, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  StageTransitionDialog,
  type StageTransitionPayload,
} from "@/components/StageTransitionDialog";

export const Route = createFileRoute("/admin/pipeline")({
  component: PipelinePage,
  head: () => ({ meta: [{ title: "Pipeline · INT-CRM" }] }),
});

function PipelinePage() {
  const { t } = useI18n();
  const { leads, settings, employees } = useStoreState();
  const navigate = useNavigate();
  const { role } = useRole();
  const panel = role;
  const user = {
    name: "",
    role: t(role as any),
    initials: "HR",
    photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStatus | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [pending, setPending] = useState<StageTransitionPayload | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dir: 1 | -1) =>
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  const allStages = settings.stages.filter((s) => s.key !== "archived");
  const stages =
    stageFilter.length === 0 ? allStages : allStages.filter((s) => stageFilter.includes(s.key));

  // Build employee options from leads' owners + known employees
  const employeeOptions = (() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.owner) set.add(l.owner);
    });
    employees.forEach((e: any) => {
      if (e?.name) set.add(e.name);
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((n) => ({ value: n, label: n }));
  })();

  const stageOptions = allStages.map((s) => ({
    value: s.key,
    label: (t(s.key as any) as string) ?? s.label,
  }));

  const visibleLeads =
    employeeFilter.length === 0 ? leads : leads.filter((l) => employeeFilter.includes(l.owner));

  return (
    <AppShell panel={panel} user={user} pageTitle={t("pipeline")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
          {t("dragCardHint")}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MultiSelect
            label={(t("employee") as string) ?? "Employee"}
            options={employeeOptions}
            selected={employeeFilter}
            onChange={setEmployeeFilter}
          />
          <MultiSelect
            label={(t("stage") as string) ?? "Stage"}
            options={stageOptions}
            selected={stageFilter}
            onChange={setStageFilter}
          />
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
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scroll-smooth">
        {stages.map((stage) => {
          const stageLeads = visibleLeads.filter((l) => l.status === stage.key);
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
              className={`min-w-[240px] shrink-0 rounded-xl p-3 transition ${isOver ? "bg-primary/10 ring-2 ring-primary" : isActive ? "bg-primary/5 ring-2 ring-primary/60" : "bg-secondary/40"}`}
            >
              <button
                type="button"
                onClick={() => setActiveStage((s) => (s === stage.key ? null : stage.key))}
                className={`sticky top-0 z-10 -mx-3 -mt-3 mb-3 flex w-[calc(100%+1.5rem)] items-center justify-between rounded-t-xl px-4 py-2 text-left backdrop-blur transition ${isActive ? "bg-primary/15" : "bg-secondary/80"}`}
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
                        role === "admin" ? "/admin/leads/$leadId" : "/employee/leads/$leadId";
                      navigate({ to: targetRoute, params: { leadId: l.id } });
                    }}
                    className={`group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition active:cursor-grabbing ${
                      dragId === l.id
                        ? "opacity-50 border-primary"
                        : "border-border hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-foreground">{l.company}</div>
                        <div className="truncate text-xs text-muted-foreground">{l.contact}</div>
                      </div>
                      <Link
                        to={role === "admin" ? "/admin/leads/$leadId" : "/employee/leads/$leadId"}
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
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {l.owner
                          .split(" ")
                          .map((w: string) => w[0])
                          .join("")}
                      </div>
                    </div>
                    {l.probability !== undefined && (
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${l.probability >= 70 ? "bg-emerald-500" : l.probability >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                          />
                          {l.probability}% {t("probability")}
                        </span>
                        {l.expectedCloseDate && (
                          <span className="font-mono">{l.expectedCloseDate}</span>
                        )}
                      </div>
                    )}
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
      <StageTransitionDialog open={!!pending} payload={pending} onClose={() => setPending(null)} />
    </AppShell>
  );
}
