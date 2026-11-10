import { Lead } from "@/lib/mock-data";
import { Activity } from "@/lib/store";
import { Sparkles, TrendingUp, AlertTriangle, Target, User, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMemo } from "react";
import { fmtMoney } from "@/lib/mock-data";
import { getLeadProbability } from "@/lib/store";
import { Link } from "@tanstack/react-router";

interface Props {
  leads: Lead[];
  employees: any[];
  activities: Activity[];
}

export function SmartInsights({ leads, employees, activities }: Props) {
  const { t, dir } = useI18n();
  const isAr = dir === "rtl";

  const insights = useMemo(() => {
    const items = [];

    // 1. Top performer insight
    if (employees.length > 0) {
      const topPerformer = [...employees].sort((a, b) => b.perf - a.perf)[0];
      if (topPerformer && topPerformer.perf >= 100) {
        items.push({
          icon: <User className="h-5 w-5 text-white" />,
          iconBg: "bg-emerald-500 shadow-emerald-500/25",
          category: isAr ? "نجم الأداء" : "Top Performer",
          badgeText: `${topPerformer.perf}% ${isAr ? "الهدف" : "Target"}`,
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          title: isAr ? "تألق في تحقيق الأهداف" : "Top Performer Alert",
          desc: isAr
            ? `يقود الموظف ${topPerformer.name} الفريق بإنجاز ${topPerformer.perf}% من المستهدف السنوي!`
            : `${topPerformer.name} is leading the team with ${topPerformer.perf}% of their annual target achieved!`,
          cardBorder: "border-emerald-500/20 hover:border-emerald-500/50",
          cardGradient: "from-emerald-500/[0.04] to-card",
          link: "/manager/employees",
          actionText: isAr ? "عرض أداء الموظف" : "View Performance",
        });
      }
    }

    // 2. Conversion / Pipeline Health Insight
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.status === "won").length;
    const convRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
    const negotiatingLeads = leads.filter((l) => l.status === "negotiation");

    if (convRate > 0) {
      items.push({
        icon: <TrendingUp className="h-5 w-5 text-white" />,
        iconBg: "bg-sky-500 shadow-sky-500/25",
        category: isAr ? "زخم المبيعات" : "Pipeline Momentum",
        badgeText: `${convRate}% ${isAr ? "معدل التحويل" : "Win Rate"}`,
        badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        title: isAr ? "زخم خط الصفقات" : "Pipeline Momentum",
        desc: isAr
          ? `معدل تحويل الصفقات الحالي هو ${convRate}%. يوجد ${negotiatingLeads.length} صفقات في مرحلة التفاوض—التركيز عليها سيرفع معدل الإغلاق!`
          : `Your team's conversion rate is ${convRate}%. There are ${negotiatingLeads.length} deals in negotiation—focus on closing them to boost this rate!`,
        cardBorder: "border-sky-500/20 hover:border-sky-500/50",
        cardGradient: "from-sky-500/[0.04] to-card",
        link: "/manager/pipeline",
        actionText: isAr ? "متابعة صفقات التفاوض" : "View Negotiation Deals",
      });
    }

    // 3. Inactive Leads Warning
    let inactiveCount = 0;
    leads.forEach((l) => {
      const s = (l.status || "").toLowerCase().trim();
      const stage = ((l as any).stage || "").toLowerCase().trim();
      if (
        s !== "won" &&
        s !== "lost" &&
        s !== "achieved" &&
        s !== "archived" &&
        s !== "closed" &&
        stage !== "won" &&
        stage !== "lost" &&
        stage !== "achieved" &&
        stage !== "archived" &&
        stage !== "closed"
      ) {
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
        icon: <AlertTriangle className="h-5 w-5 text-white" />,
        iconBg: "bg-amber-500 shadow-amber-500/25",
        category: isAr ? "إجراء عاجل" : "Urgent Action",
        badgeText: `${inactiveCount} ${isAr ? "عميل معلق" : "Leads Stalled"}`,
        badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        title: isAr ? "تنبيه العملاء غير النشطين" : "Action Required",
        desc: isAr
          ? `يوجد ${inactiveCount} عميل لم يسجل عليهم نشاط منذ أكثر من 14 يوماً. نوصي بإعادة تعيينهم أو جدولة أنشطة متابعة فورية.`
          : `${inactiveCount} leads have been inactive for over 14 days. Re-assign them or schedule follow-up activities to keep the pipeline moving.`,
        cardBorder: "border-amber-500/25 hover:border-amber-500/60",
        cardGradient: "from-amber-500/[0.05] to-card",
        link: "/manager/reports/inactive-leads",
        actionText: isAr ? "فتح تقرير غير النشطين" : "Open Inactive Report",
      });
    }

    // 4. Expected Revenue / Financial Forecast
    let expectedRevenue = 0;
    leads.forEach((l) => {
      if (l.status !== "lost" && l.status !== "won" && l.status !== "archived") {
        const prob = getLeadProbability(l);
        expectedRevenue += (l.value || 0) * (prob / 100);
      }
    });

    if (expectedRevenue > 0) {
      items.push({
        icon: <Target className="h-5 w-5 text-white" />,
        iconBg: "bg-purple-600 shadow-purple-600/25",
        category: isAr ? "توقعات الإيرادات" : "Revenue Forecast",
        badgeText: `${fmtMoney(expectedRevenue)}`,
        badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
        title: isAr ? "توقعات الإيرادات المحتملة" : "Revenue Forecast",
        desc: isAr
          ? `بناءً على صفقات خط المبيعات النشطة واحتمالية الإغلاق، فإن الإيراد المتوقع هو ${fmtMoney(expectedRevenue)}.`
          : `Based on your current active pipeline and closing probabilities, you have an expected forecasted revenue of ${fmtMoney(expectedRevenue)}.`,
        cardBorder: "border-purple-500/20 hover:border-purple-500/50",
        cardGradient: "from-purple-500/[0.04] to-card",
        link: "/manager/pipeline",
        actionText: isAr ? "استعراض خط الصفقات" : "Inspect Pipeline",
      });
    }

    return items;
  }, [leads, employees, activities, isAr]);

  if (insights.length === 0) return null;

  const gridColsClass =
    insights.length === 1
      ? "grid-cols-1"
      : insights.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-xs">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-foreground">
                {isAr ? "رؤى وتوصيات ذكية" : "AI Smart Insights"}
              </h3>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {isAr ? "تحليل مباشر" : "Live Analysis"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isAr
                ? "توصيات ذكية ومؤشرات تنبيه مبنية على حالة الصفقات والأنشطة الفعلية"
                : "Actionable recommendations based on real-time team pipeline activity"}
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold text-muted-foreground">
          {insights.length} {isAr ? "رؤى متاحة" : "Active Recommendations"}
        </div>
      </div>

      {/* Modern Symmetrical Card Grid */}
      <div className={`grid gap-4 p-5 ${gridColsClass}`}>
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`group flex flex-col justify-between rounded-xl border bg-gradient-to-b p-5 shadow-xs transition-all hover:shadow-md ${insight.cardBorder} ${insight.cardGradient}`}
          >
            <div>
              {/* Category & Metric Pill */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {insight.category}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold shadow-2xs ${insight.badgeColor}`}
                >
                  {insight.badgeText}
                </span>
              </div>

              {/* Icon & Description */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105 ${insight.iconBg}`}
                >
                  {insight.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="mb-1 text-sm font-bold text-foreground">{insight.title}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{insight.desc}</p>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            {insight.link && (
              <div className="mt-4 border-t border-border/60 pt-3 text-xs">
                <Link
                  to={insight.link as any}
                  className="inline-flex items-center gap-1 font-bold text-primary transition-transform group-hover:translate-x-1"
                >
                  <span>{insight.actionText}</span>
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
