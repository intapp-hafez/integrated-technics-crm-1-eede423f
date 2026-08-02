import { useState } from "react";
import { useStoreState, actions } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Plus, X, GripVertical, Check, Trash2 } from "lucide-react";
import { Header } from "./shared";

// ─────────────────────────────────────────────
// Statuses Tab
// ─────────────────────────────────────────────
export function StatusesTab() {
  const { t } = useI18n();
  return (
    <section>
      <Header title={t("leadStatuses")} hint={t("statusesDesc")} />
      <StatusesEditor />
    </section>
  );
}

function StatusesEditor() {
  const { settings } = useStoreState();
  const { t } = useI18n();
  const [val, setVal] = useState("");
  const PROTECTED = new Set(["new", "won", "lost"]);
  const add = () => {
    if (!val.trim()) return;
    actions.addStatus(val.trim());
    setVal("");
  };
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="e.g. Meeting Scheduled, Proposal Sent, Archived"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={add}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {settings.statuses.map((s) => {
          const stage = settings.stages.find((st) => st.key === s);
          const label = stage?.label ?? t(s as any) ?? s;
          const locked = PROTECTED.has(s);
          return (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1"
              style={{
                background: `${stage?.color ?? "#64748b"}1a`,
                color: stage?.color ?? "#64748b",
                borderColor: stage?.color,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: stage?.color ?? "#64748b" }}
              />
              {label}
              {!locked && (
                <button
                  onClick={() => actions.removeStatus(s)}
                  className="ml-1 rounded p-0.5 text-current/70 hover:bg-black/10"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Statuses sync to the pipeline, lead forms, and filters. New, Won, and Lost are protected and
        can't be removed.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Stages Tab
// ─────────────────────────────────────────────
export function StagesTab() {
  const { t } = useI18n();
  const { settings } = useStoreState();
  return (
    <section>
      <Header
        title={t("pipelineStages")}
        hint={`${t("stagesDesc") ?? ""} Drag the handle to reorder — this controls the progression order in the Pipeline board.`}
      />
      <div className="space-y-2">
        {settings.stages.map((st, idx) => (
          <StageRow
            key={st.key}
            stageKey={st.key}
            label={st.label}
            color={st.color}
            index={idx}
            total={settings.stages.length}
          />
        ))}
      </div>
    </section>
  );
}

function StageRow({
  stageKey,
  label,
  color,
  index,
  total,
}: {
  stageKey: string;
  label: string;
  color: string;
  index: number;
  total: number;
}) {
  const { t } = useI18n();
  const [val, setVal] = useState(label);
  const [dragOver, setDragOver] = useState<"top" | "bottom" | null>(null);
  const dirty = val !== label;
  const locked = ["new", "won", "lost"].includes(stageKey);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/stage-index", String(index));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setDragOver(e.clientY < rect.top + rect.height / 2 ? "top" : "bottom");
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/stage-index"));
        if (Number.isNaN(from) || from === index) {
          setDragOver(null);
          return;
        }
        let to = dragOver === "bottom" ? index + 1 : index;
        if (from < to) to -= 1;
        to = Math.max(0, Math.min(total - 1, to));
        actions.reorderStages(from, to);
        setDragOver(null);
      }}
      className={`relative flex items-center gap-3 rounded-lg border bg-background p-3 transition ${dragOver ? "border-primary" : "border-border"}`}
    >
      {dragOver === "top" && (
        <span className="absolute inset-x-0 -top-1 h-0.5 rounded bg-primary" />
      )}
      {dragOver === "bottom" && (
        <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded bg-primary" />
      )}
      <span
        className="flex h-7 w-5 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span className="w-6 text-center font-mono text-[11px] text-muted-foreground">
        {index + 1}
      </span>
      <input
        type="color"
        value={color}
        onChange={(e) => actions.setStageColor(stageKey, e.target.value)}
        className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0"
        aria-label="Stage color"
      />
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {t(stageKey as any) ?? stageKey}
      </span>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="h-9 flex-1 rounded-md border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
      />
      <button
        disabled={!dirty}
        onClick={() => actions.renameStage(stageKey, val)}
        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${dirty ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"}`}
      >
        <Check className="h-3.5 w-3.5" /> {t("save")}
      </button>
      {!locked && (
        <button
          onClick={() => actions.removeStatus(stageKey)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
          aria-label="Delete stage"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Activity Types Tab
// ─────────────────────────────────────────────
export function ActivityTypesTab() {
  const { t } = useI18n();
  const { settings } = useStoreState();
  const [newType, setNewType] = useState("");
  return (
    <section>
      <Header title={t("activityTypes")} hint={t("activityTypesDesc")} />
      <div className="mb-4 flex gap-2">
        <input
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          placeholder="e.g. Demo, Workshop"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={() => {
            if (newType.trim()) {
              actions.addActivityType(newType.trim());
              setNewType("");
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {settings.activityTypes.map((tp) => (
          <span
            key={tp}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground ring-1 ring-border"
          >
            {tp}
            <button
              onClick={() => actions.removeActivityType(tp)}
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${tp}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {settings.activityTypes.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No activity types yet. Add one above.
          </span>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Workday Tab
// ─────────────────────────────────────────────
export function WorkdayTab() {
  const { settings } = useStoreState();
  return (
    <section>
      <Header
        title="Standard Workday Hours"
        hint="Used as the 100% baseline when calculating attendance percentages across admin and employee panels."
      />
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hours per workday
          </label>
          <input
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={settings.workdayHours ?? 8}
            onChange={(e) => actions.setWorkdayHours(Number(e.target.value))}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="rounded-lg bg-secondary px-4 py-2 text-sm">
          <span className="text-muted-foreground">Current baseline:</span>{" "}
          <span className="font-mono font-bold text-foreground">{settings.workdayHours ?? 8}h</span>{" "}
          <span className="text-muted-foreground">= 100%</span>
        </div>
      </div>
    </section>
  );
}
