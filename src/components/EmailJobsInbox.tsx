import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

type EmailJob = {
  id: string;
  template_id: string | null;
  recipients: string[];
  subject: string;
  body: string;
  scheduled_for: string;
  status: "queued" | "sending" | "sent" | "failed" | "canceled";
  error: string | null;
  sent_at: string | null;
  created_at: string;
  created_by: string | null;
};

type Filter = "all" | "queued" | "scheduled" | "sending" | "sent" | "failed" | "canceled";

type AccountOption = {
  user_id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string | null;
  role: string | null;
};

export function EmailJobsInbox() {
  const { dir } = useI18n();
  const { user, isAdmin } = useAuth() as any;
  const isAr = dir === "rtl";
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  // Admin-only: which account inbox to view. "all" = every account.
  const [accountId, setAccountId] = useState<string>("all");

  // Load account directory for name lookups (sender names) and admin switcher.
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data, error } = await supabase.rpc("chat_directory");
      if (!error && data) {
        setAccounts(
          (data as any[]).map((r) => ({
            user_id: r.user_id,
            full_name_en: r.full_name_en,
            full_name_ar: r.full_name_ar,
            email: r.email,
            role: r.role,
          })),
        );
      }
    })();
  }, [user?.id]);

  const roleLabel = (r: string | null | undefined) => {
    if (!r) return "";
    const en: Record<string, string> = {
      admin: "Admin",
      manager: "Manager",
      finance: "Finance",
      hr: "HR",
      employee: "Employee",
    };
    const ar: Record<string, string> = {
      admin: "مدير النظام",
      manager: "مدير",
      finance: "مالية",
      hr: "موارد بشرية",
      employee: "موظف",
    };
    return (isAr ? ar[r] : en[r]) || r;
  };

  const senderMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) {
      const name =
        (isAr ? a.full_name_ar : a.full_name_en) || a.full_name_en || a.email || a.user_id;
      const rl = roleLabel(a.role);
      map.set(a.user_id, rl ? `${rl} · ${name}` : name);
    }
    if (user?.id && user?.email && !map.has(user.id)) {
      map.set(user.id, user.email);
    }
    return map;
  }, [accounts, isAr, user]);

  const reload = async () => {
    setLoading(true);
    let query = supabase
      .from("email_jobs")
      .select("*")
      .order("scheduled_for", { ascending: false })
      .limit(200);
    if (!isAdmin && user?.id) query = query.eq("created_by", user.id);
    else if (isAdmin && accountId !== "all") query = query.eq("created_by", accountId);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setJobs((data ?? []) as EmailJob[]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("email_jobs_inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_jobs" }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.id, accountId]);

  const now = Date.now();
  const counts = useMemo(() => {
    const c = {
      all: jobs.length,
      queued: 0,
      scheduled: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      canceled: 0,
    };
    for (const j of jobs) {
      const isScheduled = j.status === "queued" && new Date(j.scheduled_for).getTime() > now;
      if (isScheduled) c.scheduled++;
      else if (j.status === "queued") c.queued++;
      (c as any)[j.status]++;
    }
    return c;
  }, [jobs, now]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return jobs.filter((j) => {
      const isScheduled = j.status === "queued" && new Date(j.scheduled_for).getTime() > now;
      if (filter === "scheduled" && !isScheduled) return false;
      if (filter === "queued" && (j.status !== "queued" || isScheduled)) return false;
      if (filter !== "all" && filter !== "scheduled" && filter !== "queued" && j.status !== filter)
        return false;
      if (!ql) return true;
      return (
        j.subject?.toLowerCase().includes(ql) ||
        j.recipients?.some((r) => r.toLowerCase().includes(ql)) ||
        j.body?.toLowerCase().includes(ql)
      );
    });
  }, [jobs, filter, q, now]);

  const cancel = async (id: string) => {
    const { error } = await supabase.from("email_jobs").update({ status: "canceled" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(isAr ? "تم الإلغاء" : "Canceled");
      reload();
    }
  };
  const retry = async (id: string) => {
    const { error } = await supabase
      .from("email_jobs")
      .update({ status: "queued", error: null, scheduled_for: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(isAr ? "أُعيدت الجدولة" : "Requeued");
      reload();
    }
  };
  const remove = async (id: string) => {
    if (!confirm(isAr ? "حذف هذه المهمة؟" : "Delete this job?")) return;
    const { error } = await supabase.from("email_jobs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else reload();
  };

  const statusBadge = (s: EmailJob["status"], scheduled?: boolean) => {
    const label = scheduled ? (isAr ? "مجدول" : "scheduled") : s;
    const map: Record<string, string> = {
      queued: "bg-amber-100 text-amber-700",
      scheduled: "bg-violet-100 text-violet-700",
      sending: "bg-sky-100 text-sky-700",
      sent: "bg-emerald-100 text-emerald-700",
      failed: "bg-rose-100 text-rose-700",
      canceled: "bg-zinc-200 text-zinc-700",
    };
    const key = scheduled ? "scheduled" : s;
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[key]}`}
      >
        {label}
      </span>
    );
  };

  const tabs: { key: Filter; en: string; ar: string }[] = [
    { key: "all", en: "All", ar: "الكل" },
    { key: "queued", en: "Queued", ar: "قائمة الانتظار" },
    { key: "scheduled", en: "Scheduled", ar: "مجدول" },
    { key: "sending", en: "Sending", ar: "قيد الإرسال" },
    { key: "sent", en: "Sent", ar: "أُرسلت" },
    { key: "failed", en: "Failed", ar: "فشل" },
    { key: "canceled", en: "Canceled", ar: "ملغى" },
  ];

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Inbox className="h-5 w-5" /> {isAr ? "صندوق مهام البريد" : "Email Jobs Inbox"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "عرض المهام قيد الانتظار، المرسلة، الفاشلة والمجدولة."
              : "View queued, sent, failed and scheduled email jobs."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              title={isAr ? "اختر حساباً" : "Select account inbox"}
            >
              <option value="all">{isAr ? "كل الحسابات" : "All accounts"}</option>
              {accounts.map((a) => {
                const label =
                  (isAr ? a.full_name_ar : a.full_name_en) ||
                  a.full_name_en ||
                  a.email ||
                  a.user_id;
                return (
                  <option key={a.user_id} value={a.user_id}>
                    {label}
                  </option>
                );
              })}
            </select>
          )}
          <button
            onClick={reload}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
          >
            <RefreshCw className="h-3 w-3" /> {isAr ? "تحديث" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${filter === t.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent"}`}
          >
            {isAr ? t.ar : t.en} <span className="opacity-70">({(counts as any)[t.key]})</span>
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isAr ? "بحث بالمستلم أو الموضوع..." : "Search recipient or subject..."}
          className="ms-auto h-9 w-64 rounded-lg border border-border bg-background px-3 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {isAr ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {isAr ? "لا توجد مهام مطابقة." : "No matching jobs."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((j) => {
            const isScheduled = j.status === "queued" && new Date(j.scheduled_for).getTime() > now;
            return (
              <li key={j.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {statusBadge(j.status, isScheduled)}
                      <span className="truncate font-semibold">{j.subject || "—"}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {j.recipients.join(", ")}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-medium">{isAr ? "المرسل: " : "Sender: "}</span>
                      {senderMap.get(j.created_by || "") || j.created_by || "—"}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {isAr ? "موعد: " : "Scheduled: "}
                      {new Date(j.scheduled_for).toLocaleString()}
                      {j.sent_at && (
                        <>
                          {" "}
                          · {isAr ? "أُرسلت: " : "Sent: "}
                          {new Date(j.sent_at).toLocaleString()}
                        </>
                      )}
                    </div>
                    {j.error && <div className="mt-1 text-[11px] text-rose-600">{j.error}</div>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {j.status === "queued" && (
                      <button
                        onClick={() => cancel(j.id)}
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    )}
                    {(j.status === "failed" || j.status === "canceled") && (
                      <button
                        onClick={() => retry(j.id)}
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                      >
                        {isAr ? "إعادة" : "Retry"}
                      </button>
                    )}
                    <button
                      onClick={() => remove(j.id)}
                      className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="inline h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
