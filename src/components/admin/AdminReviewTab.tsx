import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { AlertTriangle, Clock, Target, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { fmtMoney } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

type Lead = any;
type Activity = any;

interface AdminReviewTabProps {
  leads: Lead[];
  activities: Activity[];
}

export function AdminReviewTab({ leads, activities }: AdminReviewTabProps) {
  const { t } = useI18n();

  const insights = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const HOURLY_RATE = 20; // assumed cost per hour
    const HOURS_PER_ACTIVITY = 1; // assumed time per activity

    const overdue: Lead[] = [];
    const closedEarly: Lead[] = [];
    const closedLate: Lead[] = [];
    const highCost: { lead: Lead; cost: number; percent: number; activitiesCount: number }[] = [];

    for (const lead of leads) {
      const isWon = lead.status === "won";
      const isLost = lead.status === "lost";
      const leadActivities = activities.filter((a) => a.leadId === lead.id);

      // Cost analysis
      const estimatedCost = leadActivities.length * HOURS_PER_ACTIVITY * HOURLY_RATE;
      const budget = lead.value || 0;
      if (budget > 0 && !isLost) {
        const costPercent = (estimatedCost / budget) * 100;
        // Flag if cost > 10% of budget and it's not won yet, or if it's generally high cost
        if (costPercent > 10 && !isWon) {
          highCost.push({
            lead,
            cost: estimatedCost,
            percent: costPercent,
            activitiesCount: leadActivities.length,
          });
        }
      }

      // Timing analysis
      if (lead.expectedCloseDate) {
        if (isWon) {
          // Simplification: checking if it was won before or after expected date
          // using the generic updated string is hard, we'll compare today if it's won today,
          // but if we don't have exactly when it was won, we compare expected with today
          // Assuming it was won recently for mock purposes
          if (lead.expectedCloseDate >= today) {
            closedEarly.push(lead);
          } else {
            closedLate.push(lead);
          }
        } else if (!isLost) {
          if (lead.expectedCloseDate < today) {
            overdue.push(lead);
          }
        }
      }
    }

    return { overdue, closedEarly, closedLate, highCost };
  }, [leads, activities]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Closed Early</p>
              <p className="text-2xl font-bold">{insights.closedEarly.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Closed Late</p>
              <p className="text-2xl font-bold">{insights.closedLate.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overdue Leads</p>
              <p className="text-2xl font-bold">{insights.overdue.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">High Cost Risk</p>
              <p className="text-2xl font-bold">{insights.highCost.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h3 className="font-display font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Closed Early
            </h3>
          </div>
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {insights.closedEarly.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No leads closed early.
              </div>
            ) : (
              insights.closedEarly.map((lead) => {
                const expected = new Date(lead.expectedCloseDate);
                const now = new Date();
                const diffTime = Math.max(0, expected.getTime() - now.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <Link
                    to="/admin/leads/$leadId"
                    params={{ leadId: lead.id }}
                    key={lead.id}
                    className="p-4 flex justify-between items-center hover:bg-muted/50 transition block"
                  >
                    <div>
                      <p className="font-semibold text-sm group-hover:text-primary">
                        {lead.company}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expected: {formatDate(lead.expectedCloseDate)} · {diffDays} days early ·
                        Closed{" "}
                        {lead.updatedAt.includes("ago")
                          ? lead.updatedAt
                          : formatDate(lead.updatedAt)}
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-md shrink-0 ml-4">
                      Excellent
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h3 className="font-display font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Closed Late
            </h3>
          </div>
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {insights.closedLate.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No leads closed late.
              </div>
            ) : (
              insights.closedLate.map((lead) => (
                <Link
                  to="/admin/leads/$leadId"
                  params={{ leadId: lead.id }}
                  key={lead.id}
                  className="p-4 flex justify-between items-center hover:bg-muted/50 transition block"
                >
                  <div>
                    <p className="font-semibold text-sm group-hover:text-primary">{lead.company}</p>
                    <p className="text-xs text-muted-foreground">
                      Expected: {formatDate(lead.expectedCloseDate)}
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-amber-500/10 text-amber-600 px-2 py-1 rounded-md shrink-0 ml-4">
                    Delayed
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h3 className="font-display font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Overdue Leads Action Required
            </h3>
          </div>
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {insights.overdue.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No overdue leads.</div>
            ) : (
              insights.overdue.map((lead) => (
                <Link
                  to="/admin/leads/$leadId"
                  params={{ leadId: lead.id }}
                  key={lead.id}
                  className="p-4 flex justify-between items-center hover:bg-muted/50 transition block"
                >
                  <div>
                    <p className="font-semibold text-sm group-hover:text-primary">{lead.company}</p>
                    <p className="text-xs text-muted-foreground">
                      Expected: {formatDate(lead.expectedCloseDate)}
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-rose-500/10 text-rose-600 px-2 py-1 rounded-md shrink-0 ml-4">
                    Overdue
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h3 className="font-display font-bold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-purple-500" />
              High Cost / Low ROI Warning
            </h3>
          </div>
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {insights.highCost.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No high cost leads.
              </div>
            ) : (
              insights.highCost.map((item) => (
                <Link
                  to="/admin/leads/$leadId"
                  params={{ leadId: item.lead.id }}
                  key={item.lead.id}
                  className="p-4 hover:bg-muted/50 transition block group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-sm group-hover:text-primary">
                      {item.lead.company}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {fmtMoney(item.lead.value)} Budget
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.activitiesCount} activities logged ({item.activitiesCount} est. hours)
                  </p>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{ width: `${Math.min(item.percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-right mt-1 font-medium text-purple-600">
                    Est. Cost: {fmtMoney(item.cost)} ({item.percent.toFixed(1)}%)
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
