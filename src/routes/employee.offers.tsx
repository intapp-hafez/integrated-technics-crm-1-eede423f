import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { FileBadge, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtMoney } from "@/lib/mock-data";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const Route = createFileRoute("/employee/offers")({
  component: EmployeeOffersPage,
  head: () => ({ meta: [{ title: "My Quotations & Offers · INT-CRM" }] }),
});

function EmployeeOffersPage() {
  const { t, dir } = useI18n();
  const { quotations, leads, profile } = useStoreState();
  const [search, setSearch] = useState("");
  const OWNER = profile.name;
  const isDetail = useRouterState({ select: (s) => s.location.pathname.startsWith("/employee/offers/") });

  const myQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (q.owner === OWNER) return true;
      const lead = leads.find((l: any) => l.id === q.leadId);
      return !!lead && lead.owner === OWNER;
    });
  }, [quotations, leads, OWNER]);

  const filtered = useMemo(() => {
    return myQuotations.filter((q) =>
      q.client.toLowerCase().includes(search.toLowerCase()) ||
      q.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [myQuotations, search]);

  if (isDetail) return <Outlet />;

  const initials = OWNER.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppShell panel="employee" user={{ name: OWNER, role: t("employee"), initials, photo: profile.avatarUrl }} pageTitle={t("offers")}>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="h-10 w-full rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none"
            style={{ paddingInlineStart: "2.25rem" }}
          />
        </div>
      </div>


      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("client")}</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("date")}</th>
                <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("value")}</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("status")}</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("revisions")}</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("feedback")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((q) => (
                <tr key={q.id} className="cursor-pointer transition hover:bg-primary/5">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    <Link to="/employee/offers/$quotationId" params={{ quotationId: q.id }} className="hover:text-primary">{shortId(q.id)}</Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <Link to="/employee/offers/$quotationId" params={{ quotationId: q.id }} className="hover:text-primary">{q.client}</Link>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">{q.submissionDate}</td>
                  <td className="px-4 py-3 text-end font-mono font-bold text-foreground">{fmtMoney(q.value)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={q.status} label={t(q.status as any) || q.status.replace("_", " ")} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                      {q.revisions}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]" title={q.feedback}>
                    {q.feedback || "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t("nothingHere")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
