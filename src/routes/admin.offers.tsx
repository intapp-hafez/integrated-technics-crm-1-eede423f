import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { FileBadge, Plus, RefreshCw, CheckCircle2, FileText, Search, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtMoney } from "@/lib/mock-data";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const Route = createFileRoute("/admin/offers")({
  component: AdminOffersPage,
  head: () => ({ meta: [{ title: "Quotations & Offers · Admin" }] }),
});

function AdminOffersPage() {
  const { t, dir } = useI18n();
  const { quotations } = useStoreState();
  const [search, setSearch] = useState("");
  const isDetail = useRouterState({ select: (s) => s.location.pathname.startsWith("/admin/offers/") });

  const filtered = useMemo(() => {
    return quotations.filter((q) => 
      q.client.toLowerCase().includes(search.toLowerCase()) || 
      q.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [quotations, search]);

  if (isDetail) return <Outlet />;


  const stats = {
    total: quotations.length,
    accepted: quotations.filter(q => q.status === "accepted").length,
    negotiating: quotations.filter(q => q.status === "negotiating").length,
    value: quotations.reduce((s, q) => s + (q.status !== "rejected" ? q.value : 0), 0)
  };

  return (
    <AppShell panel="admin" user={{ name: "hafez Rahim", role: t("admin"), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" }} pageTitle={t("offers")}>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: dir === "rtl" ? "إجمالي العروض" : "Total Offers", v: stats.total, color: "text-foreground", bg: "bg-secondary" },
          { label: t("accepted"), v: stats.accepted, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: t("negotiating"), v: stats.negotiating, color: "text-violet-600", bg: "bg-violet-50" },
          { label: dir === "rtl" ? "قيمة العروض النشطة" : "Active Value", v: fmtMoney(stats.value), color: "text-primary", bg: "bg-primary/10" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-2 font-mono text-2xl font-bold ${s.color}`}>{s.v}</div>
          </div>
        ))}
      </div>

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
        <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-accent ms-auto">
          <Download className="h-4 w-4" /> Export
        </button>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> {dir === "rtl" ? "إنشاء عرض" : "New Offer"}
        </button>
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
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("owner")}</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("feedback")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((q) => (
                <tr key={q.id} className="cursor-pointer transition hover:bg-primary/5">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    <Link to="/admin/offers/$quotationId" params={{ quotationId: q.id }} className="hover:text-primary">{shortId(q.id)}</Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <Link to="/admin/offers/$quotationId" params={{ quotationId: q.id }} className="hover:text-primary">{q.client}</Link>
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
                  <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{q.owner}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]" title={q.feedback}>
                    {q.feedback || "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t("nothingHere")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
