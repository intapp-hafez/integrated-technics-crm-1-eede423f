import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, ChevronRight, Inbox, AlertCircle, User, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/email-inbox")({
  component: AdminEmailInboxPage,
  head: () => ({ meta: [{ title: "Email Jobs · Admin" }] }),
});

type EmailJob = {
  id: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduled_for: string;
  status: "queued" | "sending" | "sent" | "failed" | "canceled";
  error: string | null;
  sent_at: string | null;
  created_at: string;
  created_by: string | null;
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
};

type DeliveryLog = {
  id: string;
  job_id: string;
  recipient: string;
  status: "sent" | "failed" | "retry" | "skipped";
  error: string | null;
  attempt: number;
  created_at: string;
};

type SenderInfo = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
};

type Filter = "all" | "queued" | "sending" | "sent" | "failed" | "canceled";

const ROLE_LABEL_EN: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  finance: "Finance",
  hr: "HR",
  employee: "Employee",
};
const ROLE_LABEL_AR: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مدير",
  finance: "مالية",
  hr: "موارد بشرية",
  employee: "موظف",
};

function AdminEmailInboxPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [logsByJob, setLogsByJob] = useState<Record<string, DeliveryLog[]>>({});
  const [senders, setSenders] = useState<Record<string, SenderInfo>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [senderFilter, setSenderFilter] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);
  const senderDropdownRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsedSenders, setCollapsedSenders] = useState<Record<string, boolean>>({});

  const reload = async () => {
    setLoading(true);
    setErrorMsg(null);
    const [{ data: js, error: e1 }, { data: ls, error: e2 }] = await Promise.all([
      supabase.from("email_jobs").select("*").order("created_at", { ascending: false }).limit(500),
      supabase
        .from("email_delivery_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    if (e1) {
      setErrorMsg(e1.message);
      toast.error(e1.message);
    }
    if (e2) console.warn(e2.message);
    const jobsList = (js ?? []) as EmailJob[];
    setJobs(jobsList);
    const grouped: Record<string, DeliveryLog[]> = {};
    (ls ?? []).forEach((l: any) => {
      (grouped[l.job_id] ||= []).push(l as DeliveryLog);
    });
    setLogsByJob(grouped);

    // Fetch sender profiles
    const senderIds = Array.from(
      new Set(jobsList.map((j) => j.created_by).filter(Boolean)),
    ) as string[];
    if (senderIds.length) {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,full_name_en,full_name_ar,email")
          .in("user_id", senderIds),
        supabase.from("user_roles").select("user_id,role").in("user_id", senderIds),
      ]);
      const roleMap: Record<string, string> = {};
      (roles ?? []).forEach((r: any) => {
        const prev = roleMap[r.user_id];
        const order = ["admin", "manager", "finance", "hr", "employee"];
        if (!prev || order.indexOf(r.role) < order.indexOf(prev)) roleMap[r.user_id] = r.role;
      });
      const map: Record<string, SenderInfo> = {};
      (profs ?? []).forEach((p: any) => {
        map[p.user_id] = {
          user_id: p.user_id,
          name: (isAr ? p.full_name_ar : p.full_name_en) || p.full_name_en || p.email || "—",
          email: p.email,
          role: roleMap[p.user_id] || "employee",
        };
      });
      setSenders(map);
    } else {
      setSenders({});
    }
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("admin_email_inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_jobs" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "email_delivery_logs" }, () =>
        reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (senderDropdownRef.current && !senderDropdownRef.current.contains(e.target as Node)) {
        setSenderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: jobs.length,
      queued: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      canceled: 0,
    };
    for (const j of jobs) if (c[j.status] !== undefined) c[j.status]++;
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filter !== "all" && j.status !== filter) return false;
      if (senderFilter.length > 0 && j.created_by && !senderFilter.includes(j.created_by))
        return false;
      if (!ql) return true;
      return (
        j.subject?.toLowerCase().includes(ql) ||
        j.recipients?.some((r) => r.toLowerCase().includes(ql)) ||
        (j.error || "").toLowerCase().includes(ql) ||
        (senders[j.created_by || ""]?.name || "").toLowerCase().includes(ql)
      );
    });
  }, [jobs, filter, senderFilter, q, senders]);

  const senderOptions = useMemo(() => {
    return Object.values(senders).sort((a, b) => a.name.localeCompare(b.name));
  }, [senders]);

  // Group by sender
  const grouped = useMemo(() => {
    const g: Record<string, { sender: SenderInfo | null; key: string; jobs: EmailJob[] }> = {};
    for (const j of filtered) {
      const key = j.created_by || "__unknown__";
      if (!g[key]) g[key] = { key, sender: senders[key] || null, jobs: [] };
      g[key].jobs.push(j);
    }
    return Object.values(g).sort((a, b) => {
      const ta = a.jobs[0] ? new Date(a.jobs[0].created_at).getTime() : 0;
      const tb = b.jobs[0] ? new Date(b.jobs[0].created_at).getTime() : 0;
      return tb - ta;
    });
  }, [filtered, senders]);

  const retry = async (id: string) => {
    const { error } = await supabase
      .from("email_jobs")
      .update({
        status: "queued",
        error: null,
        attempts: 0,
        scheduled_for: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(isAr ? "أُعيد الإرسال" : "Requeued");
      reload();
    }
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("email_jobs").update({ status: "canceled" }).eq("id", id);
    if (error) toast.error(error.message);
    else reload();
  };

  const tabs: { key: Filter; en: string; ar: string }[] = [
    { key: "all", en: "All", ar: "الكل" },
    { key: "queued", en: "Queued", ar: "قائمة الانتظار" },
    { key: "sending", en: "Sending", ar: "قيد الإرسال" },
    { key: "sent", en: "Sent", ar: "أُرسلت" },
    { key: "failed", en: "Failed", ar: "فشل" },
    { key: "canceled", en: "Canceled", ar: "ملغى" },
  ];

  const statusColor: Record<string, string> = {
    queued: "bg-amber-100 text-amber-700",
    sending: "bg-sky-100 text-sky-700",
    sent: "bg-emerald-100 text-emerald-700",
    failed: "bg-rose-100 text-rose-700",
    canceled: "bg-zinc-200 text-zinc-700",
    retry: "bg-violet-100 text-violet-700",
    skipped: "bg-zinc-100 text-zinc-600",
  };

  const senderLabel = (s: SenderInfo | null) => {
    if (!s) return isAr ? "غير معروف" : "Unknown sender";
    const role = (isAr ? ROLE_LABEL_AR : ROLE_LABEL_EN)[s.role] || s.role;
    return `${role} · ${s.name}`;
  };

  return (
    <AppShell
      panel="admin"
      user={{ name: "", role: "Admin", initials: "" }}
      pageTitle={isAr ? "صندوق البريد" : "Email Jobs Inbox"}
    >
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <Inbox className="h-5 w-5" /> {isAr ? "مهام البريد الإلكتروني" : "Email Jobs"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "مجمّعة حسب المرسل لتسهيل القراءة. اضغط رأس المجموعة للطي/التوسيع."
                : "Grouped by sender for easier scanning. Click a sender header to collapse/expand."}
            </p>
          </div>
          <button
            onClick={reload}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
          >
            <RefreshCw className="h-3 w-3" /> {isAr ? "تحديث" : "Refresh"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filter === t.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              {isAr ? t.ar : t.en} <span className="opacity-70">({counts[t.key]})</span>
            </button>
          ))}
          <div ref={senderDropdownRef} className="relative">
            <button
              onClick={() => setSenderDropdownOpen((v) => !v)}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition ${senderFilter.length > 0 ? "border-primary bg-primary/10" : "border-border bg-background"}`}
            >
              <User className="h-4 w-4" />
              {senderFilter.length === 0
                ? isAr
                  ? "المرسل"
                  : "Sender"
                : `${senderFilter.length} ${isAr ? "مرسل" : "sender"}${senderFilter.length > 1 && !isAr ? "s" : ""}`}
              {senderFilter.length > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSenderFilter([]);
                  }}
                  className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-muted text-[10px] hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>
            {senderDropdownOpen && (
              <div className="absolute z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-lg">
                {senderOptions.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    {isAr ? "لا يوجد مرسلون" : "No senders"}
                  </div>
                ) : (
                  <>
                    <div className="mb-1 flex items-center justify-between px-2 py-1">
                      <button
                        onClick={() => setSenderFilter(senderOptions.map((s) => s.user_id))}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        {isAr ? "تحديد الكل" : "Select all"}
                      </button>
                      <button
                        onClick={() => setSenderFilter([])}
                        className="text-[10px] font-semibold text-muted-foreground hover:underline"
                      >
                        {isAr ? "إلغاء التحديد" : "Clear"}
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {senderOptions.map((s) => {
                        const checked = senderFilter.includes(s.user_id);
                        return (
                          <label
                            key={s.user_id}
                            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${checked ? "bg-accent" : "hover:bg-accent/50"}`}
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary" : "border-border bg-background"}`}
                            >
                              {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => {
                                setSenderFilter((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== s.user_id)
                                    : [...prev, s.user_id],
                                );
                              }}
                            />
                            <span className="truncate">
                              {(isAr ? ROLE_LABEL_AR : ROLE_LABEL_EN)[s.role] || s.role} · {s.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              isAr ? "بحث بالمرسل أو المستلم أو الموضوع..." : "Search sender, recipient, subject..."
            }
            className="ms-auto h-9 w-72 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>

        {errorMsg && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {isAr ? "جارٍ التحميل..." : "Loading..."}
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {isAr ? "لا توجد مهام مطابقة." : "No matching jobs."}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((g) => {
              const collapsed = collapsedSenders[g.key] ?? false;
              return (
                <div key={g.key} className="rounded-lg border border-border bg-background">
                  <button
                    onClick={() => setCollapsedSenders((p) => ({ ...p, [g.key]: !collapsed }))}
                    className="flex w-full items-center gap-2 rounded-t-lg bg-secondary/50 px-3 py-2 text-start hover:bg-secondary"
                  >
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition ${collapsed ? "" : "rotate-90"}`}
                    />
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{senderLabel(g.sender)}</span>
                    {g.sender?.email && (
                      <span className="truncate text-xs text-muted-foreground">
                        · {g.sender.email}
                      </span>
                    )}
                    <span className="ms-auto rounded-full bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {g.jobs.length} {isAr ? "رسالة" : "messages"}
                    </span>
                  </button>

                  {!collapsed && (
                    <ul className="divide-y divide-border">
                      {g.jobs.map((j) => {
                        const isOpen = openId === j.id;
                        const logs = logsByJob[j.id] || [];
                        return (
                          <li key={j.id}>
                            <div className="flex items-start justify-between gap-2 p-3">
                              <button
                                onClick={() => setOpenId(isOpen ? null : j.id)}
                                className="flex flex-1 items-start gap-2 text-start"
                              >
                                <ChevronRight
                                  className={`mt-1 h-4 w-4 shrink-0 transition ${isOpen ? "rotate-90" : ""}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor[j.status] || "bg-zinc-100 text-zinc-700"}`}
                                    >
                                      {j.status}
                                    </span>
                                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                      {isAr ? "محاولات" : "attempts"}: {j.attempts || 0}/
                                      {j.max_attempts || 5}
                                    </span>
                                    <span className="truncate font-semibold">
                                      {j.subject || "—"}
                                    </span>
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {j.recipients?.join(", ")}
                                  </div>
                                  <div className="mt-1 text-[11px] text-muted-foreground">
                                    {isAr ? "موعد: " : "Scheduled: "}
                                    {new Date(j.scheduled_for).toLocaleString()}
                                    {j.last_attempt_at && (
                                      <>
                                        {" · "}
                                        {isAr ? "آخر محاولة: " : "Last attempt: "}
                                        {new Date(j.last_attempt_at).toLocaleString()}
                                      </>
                                    )}
                                  </div>
                                  {j.error && (
                                    <div className="mt-1 flex items-start gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                      <span>{j.error}</span>
                                    </div>
                                  )}
                                </div>
                              </button>
                              <div className="flex shrink-0 flex-col gap-1">
                                {(j.status === "failed" || j.status === "canceled") && (
                                  <button
                                    onClick={() => retry(j.id)}
                                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                                  >
                                    {isAr ? "إعادة المحاولة" : "Retry"}
                                  </button>
                                )}
                                {j.status === "queued" && (
                                  <button
                                    onClick={() => cancel(j.id)}
                                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                                  >
                                    {isAr ? "إلغاء" : "Cancel"}
                                  </button>
                                )}
                              </div>
                            </div>

                            {isOpen && (
                              <div className="border-t border-border bg-secondary/30 p-3">
                                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                  {isAr ? "سجل التسليم لكل مستلم" : "Per-recipient delivery log"}
                                </h3>
                                {logs.length === 0 ? (
                                  <div className="text-xs text-muted-foreground">
                                    {isAr ? "لا توجد إدخالات بعد." : "No log entries yet."}
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                          <th className="px-2 py-1 text-start">
                                            {isAr ? "المستلم" : "Recipient"}
                                          </th>
                                          <th className="px-2 py-1 text-start">
                                            {isAr ? "الحالة" : "Status"}
                                          </th>
                                          <th className="px-2 py-1 text-start">
                                            {isAr ? "المحاولة" : "Attempt"}
                                          </th>
                                          <th className="px-2 py-1 text-start">
                                            {isAr ? "الوقت" : "Time"}
                                          </th>
                                          <th className="px-2 py-1 text-start">
                                            {isAr ? "الخطأ" : "Error"}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {logs.map((l) => (
                                          <tr key={l.id}>
                                            <td className="px-2 py-1 font-mono">{l.recipient}</td>
                                            <td className="px-2 py-1">
                                              <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor[l.status] || ""}`}
                                              >
                                                {l.status}
                                              </span>
                                            </td>
                                            <td className="px-2 py-1">#{l.attempt}</td>
                                            <td className="px-2 py-1 text-muted-foreground">
                                              {new Date(l.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-1 text-rose-600">
                                              {l.error || "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
