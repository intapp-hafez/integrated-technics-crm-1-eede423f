import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { fmtMoney } from "@/lib/mock-data";
import { ArrowLeft, Building2, Mail, Phone, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/employee-accounts/$employeeId")({
  component: EmployeeAccountsPage,
  head: ({ params }) => ({
    meta: [{ title: `Accounts · ${params.employeeId} · INT-CRM` }],
  }),
});

function EmployeeAccountsPage() {
  const { employeeId } = Route.useParams();
  const { t, dir } = useI18n();
  const { employees, leads } = useStoreState();

  const emp = employees.find((e) => e.id === employeeId);

  // Build the per-account rollup in a single O(leads) pass, then sort.
  const accounts = useMemo(() => {
    if (!emp)
      return [] as Array<{
        key: string;
        name: string;
        leads: number;
        won: number;
        value: number;
        email?: string;
        phone?: string;
        hasWon: boolean;
      }>;
    const ownerLc = emp.name.toLowerCase();
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        leads: number;
        won: number;
        value: number;
        email?: string;
        phone?: string;
        hasWon: boolean;
      }
    >();
    for (const l of leads) {
      if ((l.owner || "").toLowerCase() !== ownerLc) continue;
      const rawName = (l.company || "").trim();
      const key = rawName.toLowerCase();
      if (!key) continue;
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          name: rawName,
          leads: 0,
          won: 0,
          value: 0,
          email: (l as any).email || undefined,
          phone: (l as any).phone || undefined,
          hasWon: false,
        };
        map.set(key, row);
      }
      row.leads += 1;
      row.value += Number((l as any).value ?? 0) || 0;
      if (l.status === "won") {
        row.won += 1;
        row.hasWon = true;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.leads - a.leads);
  }, [emp, leads]);

  const wonAccounts = accounts.filter((a) => a.hasWon).length;
  const winRate = accounts.length ? Math.round((wonAccounts / accounts.length) * 100) : 0;

  const user = {
    name: "",
    role: t("admin"),
    initials: "HR",
    photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };

  return (
    <AppShell
      panel="admin"
      user={user}
      pageTitle={
        emp
          ? `${dir === "rtl" ? "حسابات" : "Accounts"} — ${emp.name}`
          : dir === "rtl"
            ? "حسابات"
            : "Accounts"
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to="/admin/employees/$employeeId"
          params={{ employeeId }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {dir === "rtl" ? "الملف الشخصي" : "Employee profile"}
        </Link>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {dir === "rtl" ? "معدل كسب الحسابات" : "Account Won Rate"}
          </span>
          <span className="font-mono text-sm font-bold text-emerald-600">{winRate}%</span>
          <span className="text-[11px] text-muted-foreground">
            ({wonAccounts}/{accounts.length})
          </span>
        </div>
      </div>

      {!emp ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {dir === "rtl" ? "لم يتم العثور على الموظف." : "Employee not found."}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {dir === "rtl"
            ? "لا توجد حسابات مرتبطة بهذا الموظف."
            : "No accounts related to this employee yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <div
              key={a.key}
              className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-sm font-bold text-foreground">
                    {a.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {a.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {a.email}
                      </span>
                    )}
                    {a.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {a.phone}
                      </span>
                    )}
                  </div>
                </div>
                {a.hasWon && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    {t("won")}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-lg border border-border text-center">
                <div className="py-2">
                  <div className="font-mono text-sm font-bold text-foreground">{a.leads}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("leads")}
                  </div>
                </div>
                <div className="py-2">
                  <div className="font-mono text-sm font-bold text-emerald-600">{a.won}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("won")}
                  </div>
                </div>
                <div className="py-2">
                  <div className="font-mono text-xs font-bold text-foreground">
                    {fmtMoney(a.value)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {dir === "rtl" ? "القيمة" : "Value"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
