import { Lead } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { fmtMoney } from "@/lib/mock-data";

interface Props {
  leads: Lead[];
}

export function PipelineFunnel({ leads }: Props) {
  const { t } = useI18n();
  const { settings } = useStoreState();
  const stages = settings.stages;

  const activeLeads = leads.filter((l) => l.status !== "lost" && l.status !== "archived");
  const totalActive = activeLeads.length;

  const getStageCount = (key: string) => activeLeads.filter((l) => l.status === key).length;
  const getStageValue = (key: string) =>
    activeLeads.filter((l) => l.status === key).reduce((sum, l) => sum + (l.value || 0), 0);

  const maxCount = Math.max(...stages.map((s) => getStageCount(s.key)), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h3 className="mb-6 font-display text-base font-bold text-foreground">Pipeline Funnel</h3>
      <div className="space-y-4">
        {stages.map((stage, idx) => {
          if (stage.key === "lost" || stage.key === "archived") return null;

          const count = getStageCount(stage.key);
          const value = getStageValue(stage.key);
          const percentage = Math.max((count / maxCount) * 100, 5); // min 5% width for visibility

          return (
            <div key={stage.key} className="relative group">
              <div className="flex items-end justify-between mb-1 text-sm">
                <span className="font-semibold text-foreground">{stage.label}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {count} leads ({fmtMoney(value)})
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: stage.color || "var(--color-primary)",
                    opacity: 1 - idx * 0.1, // slightly fade each subsequent stage for funnel effect
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
