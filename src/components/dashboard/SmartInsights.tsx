import { Lead, LeadStatus } from "@/lib/mock-data";
import { Activity } from "@/lib/store";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, User, Target } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMemo } from "react";
import { fmtMoney } from "@/lib/mock-data";
import { getProbabilityForStatus } from "@/lib/store";

interface Props {
  leads: Lead[];
  employees: any[];
  activities: Activity[];
}

export function SmartInsights({ leads, employees, activities }: Props) {
  const { t } = useI18n();

  const insights = useMemo(() => {
    const items = [];
    
    // 1. Top performer insight
    if (employees.length > 0) {
      const topPerformer = [...employees].sort((a, b) => b.perf - a.perf)[0];
      if (topPerformer && topPerformer.perf >= 100) {
        items.push({
          icon: <User className="h-4 w-4 text-emerald-500" />,
          title: "Top Performer Alert",
          desc: `${topPerformer.name} is leading the team with ${topPerformer.perf}% of their target achieved!`,
          color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
        });
      }
    }

    // 2. Conversion / Pipeline Health Insight
    const totalLeads = leads.length;
    const wonLeads = leads.filter(l => l.status === "won").length;
    const convRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
    const negotiatingLeads = leads.filter(l => l.status === "negotiation");
    
    if (convRate > 0) {
      items.push({
        icon: <TrendingUp className="h-4 w-4 text-sky-500" />,
        title: "Pipeline Momentum",
        desc: `Your team's conversion rate is ${convRate}%. There are ${negotiatingLeads.length} deals in negotiation—focus on closing them to boost this rate!`,
        color: "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400"
      });
    }

    // 3. Inactive Leads Warning
    let inactiveCount = 0;
    leads.forEach(l => {
      if (l.status !== "won" && l.status !== "lost" && l.status !== "archived") {
        let diffDays = 0;
        const rawDate = (l as any).updatedAtIso || l.updatedAt || (l as any).createdAt;
        if (typeof rawDate === "string" && rawDate.includes("d ago")) {
          const m = rawDate.match(/(\d+)d\s*ago/);
          if (m) diffDays = parseInt(m[1], 10);
        } else if (rawDate) {
          const tMs = new Date(rawDate).getTime();
          if (!isNaN(tMs)) {
            diffDays = Math.floor((Date.now() - tMs) / (1000 * 60 * 60 * 24));
          }
        }
        if (diffDays >= 14) inactiveCount++;
      }
    });

    if (inactiveCount > 0) {
      items.push({
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        title: "Action Required",
        desc: `${inactiveCount} leads have been inactive for over 14 days. Re-assign them or schedule follow-up activities to keep the pipeline moving.`,
        color: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
      });
    }

    // 4. Expected Revenue / Financial Forecast
    let expectedRevenue = 0;
    leads.forEach(l => {
      if (l.status !== "lost" && l.status !== "won" && l.status !== "archived") {
        const prob = getProbabilityForStatus(l.status) ?? 0;
        expectedRevenue += (l.value || 0) * (prob / 100);
      }
    });
    
    if (expectedRevenue > 0) {
      items.push({
        icon: <Target className="h-4 w-4 text-purple-500" />,
        title: "Revenue Forecast",
        desc: `Based on your current active pipeline and closing probabilities, you have an expected forecasted revenue of ${fmtMoney(expectedRevenue)}.`,
        color: "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400"
      });
    }

    return items;
  }, [leads, employees, activities]);

  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="font-display text-base font-bold text-foreground">Smart Insights</h3>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, idx) => (
          <div key={idx} className={`p-4 rounded-xl border flex gap-4 transition hover:-translate-y-0.5 ${insight.color}`}>
            <div className="mt-0.5 bg-background p-2 rounded-full shadow-sm shrink-0">
              {insight.icon}
            </div>
            <div>
              <h4 className="font-bold mb-1">{insight.title}</h4>
              <p className="text-sm opacity-90 leading-relaxed">{insight.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
