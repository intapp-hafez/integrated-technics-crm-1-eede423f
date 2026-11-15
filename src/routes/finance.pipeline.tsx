import { formatDate } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState, getLeadProbability, type LeadStatus } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { MultiSelect } from "@/components/pipeline/PipelineFilters";
import {
  GripVertical,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  DollarSign,
  Briefcase,
  Handshake,
  CheckCircle2,
  Calendar,
  Download,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  StageTransitionDialog,
  type StageTransitionPayload,
} from "@/components/pipeline/StageTransitionDialog";

export const Route = createFileRoute("/finance/pipeline")({
  component: FinancePipelinePage,
  head: () => ({ meta: [{ title: "Pipeline (Negotiation & Won) · Finance · INT-CRM" }] }),
});

const FINANCE_STAGES = ["negotiation", "won"] as const;

function FinancePipelinePage() {
  const { t, dir } = useI18n();
  const isAr = dir === "rtl";
  const { leads, settings, employees } = useStoreState();
  const navigate = useNavigate();
  const { profile, user: authUser } = useAuth();

  const displayName =
    (isAr ? profile?.full_name_ar : profile?.full_name_en) ||
    profile?.full_name_en ||
    authUser?.email ||
    "Finance Team";
  const initials =
    (displayName || "")
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FN";

  const user = {
    name: displayName,
    role: isAr ? "مالية" : "Finance Officer",
    initials,
    photo: profile?.avatar_url || undefined,
  };

  const [view, setView] = useState<"board" | "table">("board");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStatus | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [pending, setPending] = useState<StageTransitionPayload | null>(null);

  // Strictly filter stages to Negotiation and Won only
  const allFinanceStages = settings.stages.filter((s) =>
    (FINANCE_STAGES as readonly string[]).includes(s.key),
  );
  const stages =
    stageFilter.length === 0
      ? allFinanceStages
      : allFinanceStages.filter((s) => stageFilter.includes(s.key));

  // Base leads visible in Finance: only those currently in Negotiation or Won
  const baseLeads = leads.filter((l) =>
    (FINANCE_STAGES as readonly string[]).includes((l.status || "").toLowerCase().trim()),
  );

  // Build employee options from owners of negotiation and won deals
  const employeeOptions = (() => {
    const set = new Set<string>();
    baseLeads.forEach((l) => {
      if (l.owner) set.add(l.owner);
    });
    employees.forEach((e: any) => {
      if (e?.name && set.has(e.name)) set.add(e.name);
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((n) => ({ value: n, label: n }));
  })();

  const stageOptions = allFinanceStages.map((s) => ({
    value: s.key,
    label: (t(s.key as any) as string) ?? s.label,
  }));

  const visibleLeads =
    employeeFilter.length === 0
      ? baseLeads
      : baseLeads.filter((l) => employeeFilter.includes(l.owner));

  // Metrics for Finance Toolbar
  const negotiationLeads = visibleLeads.filter((l) => l.status === "negotiation");
  const wonLeads = visibleLeads.filter((l) => l.status === "won");

  const negotiationTotal = negotiationLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const wonTotal = wonLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const totalFinancialPipeline = negotiationTotal + wonTotal;

  const isEmployeeFiltered = employeeFilter.length > 0;

  const handleExportToExcel = () => {
    if (!visibleLeads || visibleLeads.length === 0) {
      toast.error(isAr ? "لا توجد صفقات لتصديرها" : "No deals to export");
      return;
    }

    const rows = visibleLeads.map((l) => {
      const prob = getLeadProbability(l);
      const val = Number(l.value) || 0;
      const stageObj = settings.stages.find((s) => s.key === l.status);
      const stageLabel = (t(l.status as any) as string) ?? stageObj?.label ?? l.status;

      return isAr
        ? {
            "رمز الصفقة": l.code || l.id,
            "العميل / الشركة": l.company || "—",
            "جهة الاتصال": l.contact || "—",
            "الهاتف": l.phone || (l as any).clientPhone || "—",
            "البريد الإلكتروني": (l as any).email || "—",
            "المسؤول": l.owner || "—",
            "المرحلة": stageLabel,
            "القيمة ($)": val,
            "نسبة النجاح %": prob,
            "القيمة المرجحة ($)": Math.round((val * prob) / 100),
            "تاريخ الإغلاق المتوقع": (l as any).expectedCloseDate ? formatDate((l as any).expectedCloseDate) : "—",
            "المدينة": l.city || "—",
            "تاريخ التحديث": l.updatedAt ? formatDate(l.updatedAt) : "—",
          }
        : {
            "Deal Code": l.code || l.id,
            "Account / Company": l.company || "—",
            "Contact Person": l.contact || "—",
            "Phone": l.phone || (l as any).clientPhone || "—",
            "Email": (l as any).email || "—",
            "Owner": l.owner || "—",
            "Stage": stageLabel,
            "Value ($)": val,
            "Probability (%)": prob,
            "Weighted Value ($)": Math.round((val * prob) / 100),
            "Expected Close Date": (l as any).expectedCloseDate ? formatDate((l as any).expectedCloseDate) : "—",
            "City": l.city || "—",
            "Last Updated": l.updatedAt ? formatDate(l.updatedAt) : "—",
          };
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 20 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isAr ? "صفقات المالية" : "Finance Deals");

    const summaryRows = [
      {
        [isAr ? "المؤشر المالي" : "Metric"]: isAr ? "إجمالي خط صفقات المالية" : "Total Finance Pipeline",
        [isAr ? "عدد الصفقات" : "Deals"]: visibleLeads.length,
        [isAr ? "القيمة الإجمالية ($)" : "Total Value ($)"]: totalFinancialPipeline,
      },
      {
        [isAr ? "المؤشر المالي" : "Metric"]: isAr ? "صفقات مكتسبة (Won)" : "Won Deals",
        [isAr ? "عدد الصفقات" : "Deals"]: wonLeads.length,
        [isAr ? "القيمة الإجمالية ($)" : "Total Value ($)"]: wonTotal,
      },
      {
        [isAr ? "المؤشر المالي" : "Metric"]: isAr ? "قيد التفاوض (Negotiation)" : "Negotiation Deals",
        [isAr ? "عدد الصفقات" : "Deals"]: negotiationLeads.length,
        [isAr ? "القيمة الإجمالية ($)" : "Total Value ($)"]: negotiationTotal,
      },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, isAr ? "ملخص مالي" : "Financial Summary");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Finance-Pipeline-${stamp}.xlsx`);

    toast.success(
      isAr
        ? `تم تصدير ${visibleLeads.length} صفقة إلى إكسل بنجاح`
        : `Successfully exported ${visibleLeads.length} deals to Excel`
    );
  };

  return (
    <AppShell panel="finance" user={user} pageTitle={t("pipeline")}>
      {/* Top Banner / Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        {/* KPI Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Total Negotiation Value */}
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 shadow-2xs">
            <Handshake className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div className="text-xs">
              <span className="font-semibold text-muted-foreground">
                {isAr ? "قيد التفاوض" : "Negotiation"}:
              </span>{" "}
              <strong className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {fmtMoney(negotiationTotal)}
              </strong>{" "}
              <span className="text-[11px] text-muted-foreground">({negotiationLeads.length})</span>
            </div>
          </div>

          {/* Total Won Value */}
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs">
              <span className="font-semibold text-muted-foreground">
                {isAr ? "صفقات مكتسبة" : "Won Deals"}:
              </span>{" "}
              <strong className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {fmtMoney(wonTotal)}
              </strong>{" "}
              <span className="text-[11px] text-muted-foreground">({wonLeads.length})</span>
            </div>
          </div>

          {/* Combined Total */}
          <div className="inline-flex items-center gap-2.5 rounded-xl border-2 border-primary/40 bg-primary/15 dark:bg-primary/25 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span>
              <span className="font-bold text-foreground">
                {isAr ? "إجمالي خط المالية" : "Total Finance Pipeline"}:
              </span>{" "}
              <strong className="font-mono text-sm font-black text-primary">
                {fmtMoney(totalFinancialPipeline)}
              </strong>
            </span>
            <span className="rounded-md border border-primary/30 bg-primary/25 px-2 py-0.5 text-[11px] font-extrabold text-primary">
              {visibleLeads.length} {isAr ? "صفقة" : "Deals"}
            </span>
          </div>

          {view === "board" && (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <GripVertical className="h-3.5 w-3.5" />
              {t("dragCardHint")}
            </span>
          )}
        </div>

        {/* View toggles & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                view === "board"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={(t("board" as any) as string) || "Board"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{(t("board" as any) as string) || "Board"}</span>
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                view === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={(t("table" as any) as string) || "Table"}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{(t("table" as any) as string) || "Table"}</span>
            </button>
          </div>

          {employeeOptions.length > 0 && (
            <MultiSelect
              label={(t("employee") as string) ?? "Employee"}
              options={employeeOptions}
              selected={employeeFilter}
              onChange={setEmployeeFilter}
            />
          )}

          <MultiSelect
            label={(t("stage") as string) ?? "Stage"}
            options={stageOptions}
            selected={stageFilter}
            onChange={setStageFilter}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            className="h-9 gap-2 rounded-xl border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
            title={isAr ? "تصدير إلى إكسل" : "Export to Excel"}
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>{isAr ? "تصدير إلى إكسل" : "Export to Excel"}</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {view === "table" ? (
        /* ── TABLE VIEW ── */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start">{(t("lead" as any) as string) || "Lead"}</th>
                  <th className="px-4 py-3 text-start">{(t("contact" as any) as string) || "Contact"}</th>
                  <th className="px-4 py-3 text-start">{t("owner") || "Owner"}</th>
                  <th className="px-4 py-3 text-start">{t("stage") || "Stage"}</th>
                  <th className="px-4 py-3 text-end">{t("value") || "Value"}</th>
                  <th className="px-4 py-3 text-start">{t("probability") || "Probability"}</th>
                  <th className="px-4 py-3 text-start">
                    {(t("expectedClose" as any) as string) || "Expected Close"}
                  </th>
                  <th className="px-4 py-3 text-end">{(t("actions" as any) as string) || "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stages.flatMap((stage) =>
                  visibleLeads
                    .filter((l) => l.status === stage.key)
                    .map((l) => {
                      const prob = getLeadProbability(l);
                      return (
                        <tr
                          key={l.id}
                          onClick={() =>
                            navigate({ to: "/finance/leads/$leadId", params: { leadId: l.id } })
                          }
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
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-foreground">{l.owner}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                              style={{
                                backgroundColor: `${stage.color}20`,
                                color: stage.color,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              {(t(stage.key as any) as string) ?? stage.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-end font-mono text-sm font-bold text-foreground">
                            {fmtMoney(l.value)}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono">
                            <span className="font-bold text-primary">{prob}%</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {l.updatedAt ? formatDate(l.updatedAt) : "—"}
                          </td>
                          <td className="px-4 py-3 text-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate({ to: "/finance/leads/$leadId", params: { leadId: l.id } });
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    }),
                )}
                {visibleLeads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      {isAr
                        ? "لا توجد صفقات حالية في مرحلتي التفاوض أو الإغلاق (Won)."
                        : "No deals found in Negotiation or Won stages."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── BOARD VIEW (2 COLUMNS: NEGOTIATION & WON) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {stages.map((stage) => {
            const stageLeads = visibleLeads.filter((l) => l.status === stage.key);
            const stageTotal = stageLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
            const isOver = overStage === stage.key;
            const isActive = activeStage === stage.key;

            return (
              <div
                key={stage.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (overStage !== stage.key) setOverStage(stage.key as LeadStatus);
                }}
                onDragLeave={() => setOverStage(null)}
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
                className={`rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 border-t-4 ${
                  isOver ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
                style={{
                  borderTopColor: stage.color,
                }}
              >
                {/* Stage Header */}
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-3 w-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="font-display text-base font-bold text-foreground">
                      {(t(stage.key as any) as string) ?? stage.label}
                    </h3>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="text-end">
                    <div className="font-mono text-sm font-bold text-foreground">
                      {fmtMoney(stageTotal)}
                    </div>
                  </div>
                </div>

                {/* Deal Cards Container */}
                <div className="space-y-3 min-h-[300px]">
                  {stageLeads.map((l) => {
                    const prob = getLeadProbability(l);
                    return (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={(e) => {
                          setDragId(l.id);
                          e.dataTransfer.setData("text/lead-id", l.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverStage(null);
                        }}
                        className="group relative cursor-grab rounded-xl border border-border/80 bg-background p-4 shadow-xs hover:border-primary/50 hover:shadow-md transition-all active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <Link
                              to="/finance/leads/$leadId"
                              params={{ leadId: l.id }}
                              className="font-display font-bold text-foreground hover:text-primary transition-colors text-sm"
                            >
                              {l.company}
                            </Link>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {l.contact || "—"}
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <span className="font-mono text-sm font-black text-primary">
                              {fmtMoney(l.value)}
                            </span>
                          </div>
                        </div>

                        {/* Meta: Owner, Phone, Expected Date */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/50 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            {l.owner}
                          </span>

                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {l.updatedAt ? formatDate(l.updatedAt) : "—"}
                          </span>
                        </div>

                        {/* Bottom Action Footer */}
                        <div className="mt-3 flex items-center justify-between pt-2 text-xs">
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                            {prob}% {isAr ? "احتمالية" : "Prob."}
                          </span>
                          <Link
                            to="/finance/leads/$leadId"
                            params={{ leadId: l.id }}
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
                          >
                            <span>{isAr ? "عرض التفاصيل" : "View Deal"}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {stageLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
                      <p>
                        {isAr
                          ? `لا توجد صفقات في مرحلة ${(t(stage.key as any) as string) ?? stage.label}`
                          : `No deals in ${(t(stage.key as any) as string) ?? stage.label}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stage Transition Dialog */}
      <StageTransitionDialog
        open={!!pending}
        payload={pending}
        onClose={() => setPending(null)}
      />
    </AppShell>
  );
}
