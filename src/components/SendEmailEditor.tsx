import { useEffect, useState } from "react";
import { Loader2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

type TemplateLite = {
  id: string;
  name_en: string;
  name_ar: string | null;
  channel: string;
  subject_en: string | null;
  subject_ar: string | null;
  body_en: string;
  body_ar: string | null;
};

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
};

function Txt({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none" />
      )}
    </div>
  );
}

export function SendEmailEditor() {
  const { dir } = useI18n();
  const { user, isAdmin } = useAuth() as any;
  const isAr = dir === "rtl";
  const [templates, setTemplates] = useState<TemplateLite[]>([]);
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [when, setWhen] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });

  const reload = async () => {
    setLoading(true);
    let jobsQuery = supabase.from("email_jobs").select("*").order("scheduled_for", { ascending: false }).limit(50);
    if (!isAdmin && user?.id) jobsQuery = jobsQuery.eq("created_by", user.id);
    const [tps, js] = await Promise.all([
      supabase.from("notification_templates").select("id,name_en,name_ar,channel,subject_en,subject_ar,body_en,body_ar").eq("enabled", true).eq("channel", "Email").order("name_en"),
      jobsQuery,
    ]);
    if (tps.error) toast.error(tps.error.message);
    else setTemplates((tps.data ?? []) as TemplateLite[]);
    if (js.error) toast.error(js.error.message);
    else setJobs((js.data ?? []) as EmailJob[]);
    setLoading(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAdmin, user?.id]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tp = templates.find((t) => t.id === id);
    if (!tp) return;
    setSubject((isAr ? tp.subject_ar : tp.subject_en) || tp.subject_en || "");
    setBody((isAr ? tp.body_ar : tp.body_en) || tp.body_en || "");
  };

  const submit = async () => {
    const list = recipients.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) { toast.error(isAr ? "أضف مستلمًا واحدًا على الأقل" : "Add at least one recipient"); return; }
    const bad = list.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (bad) { toast.error((isAr ? "بريد غير صالح: " : "Invalid email: ") + bad); return; }
    if (!subject.trim() || !body.trim()) { toast.error(isAr ? "الموضوع والمحتوى مطلوبان" : "Subject and body are required"); return; }
    const scheduled_for = schedule === "now" ? new Date().toISOString() : new Date(when).toISOString();
    setSubmitting(true);
    const { error } = await supabase.from("email_jobs").insert({
      template_id: templateId || null,
      recipients: list,
      subject,
      body,
      scheduled_for,
      status: "queued",
      created_by: user?.id ?? null,
    });
    if (error) { setSubmitting(false); toast.error(error.message); return; }

    // For immediate sends, kick the dispatcher right away so the user
    // doesn't have to wait for the next cron tick. Fire-and-forget: any
    // dev-runtime quirks (e.g. cloudflare:sockets unavailable in Vite SSR)
    // must not block the UI — cron will pick the job up as a fallback.
    if (schedule === "now") {
      void supabase.functions.invoke("email-dispatch", { body: {} }).catch(() => {});
    }

    setSubmitting(false);
    toast.success(isAr ? (schedule === "now" ? "تم الإرسال" : "تمت جدولة الرسالة") : (schedule === "now" ? "Sent" : "Scheduled"));
    setRecipients(""); setSubject(""); setBody(""); setTemplateId("");
    reload();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("email_jobs").update({ status: "canceled" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(isAr ? "تم الإلغاء" : "Canceled"); reload(); }
  };

  const remove = async (id: string) => {
    if (!confirm(isAr ? "حذف هذه المهمة؟" : "Delete this job?")) return;
    const { error } = await supabase.from("email_jobs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else reload();
  };

  const statusBadge = (s: EmailJob["status"]) => {
    const map: Record<EmailJob["status"], string> = {
      queued: "bg-amber-100 text-amber-700",
      sending: "bg-sky-100 text-sky-700",
      sent: "bg-emerald-100 text-emerald-700",
      failed: "bg-rose-100 text-rose-700",
      canceled: "bg-zinc-200 text-zinc-700",
    };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[s]}`}>{s}</span>;
  };

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{isAr ? "إرسال بريد إلكتروني" : "Send Email"}</h2>
          <p className="text-sm text-muted-foreground">{isAr ? "اختر قالبًا، حدد المستلمين، وأرسل الآن أو جدول لاحقًا." : "Pick a template, choose recipients, send now or schedule for later."}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "القالب" : "Template"}</label>
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">{isAr ? "بدون قالب — اكتب يدويًا" : "No template — write manually"}</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{isAr ? (t.name_ar || t.name_en) : t.name_en}</option>
              ))}
            </select>
          </div>

          <Txt label={isAr ? "المستلمون (مفصولون بفواصل)" : "Recipients (comma / space separated)"} value={recipients} onChange={setRecipients} />
          <div className="mt-3">
            <Txt label={isAr ? "الموضوع" : "Subject"} value={subject} onChange={setSubject} />
          </div>
          <div className="mt-3">
            <Txt label={isAr ? "المحتوى" : "Body"} value={body} onChange={setBody} textarea />
          </div>

          <div className="mt-4 rounded-lg border border-border p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">{isAr ? "الجدولة" : "Scheduling"}</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="when" checked={schedule === "now"} onChange={() => setSchedule("now")} />
                <span>{isAr ? "إرسال الآن" : "Send now"}</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="when" checked={schedule === "later"} onChange={() => setSchedule("later")} />
                <span>{isAr ? "جدولة لاحقًا" : "Schedule for later"}</span>
              </label>
              {schedule === "later" && (
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Mail className="h-4 w-4" /> {schedule === "now" ? (isAr ? "إرسال" : "Send") : (isAr ? "جدولة" : "Schedule")}
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {isAr
              ? "ملاحظة: تُخزَّن المهام في قائمة الانتظار وتُسلَّم بواسطة عامل SMTP. تأكد من تفعيل إعدادات SMTP."
              : "Note: jobs are stored in the queue and delivered by the SMTP worker. Make sure SMTP settings are enabled."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{isAr ? "قائمة الإرسال (أحدث 50)" : "Queue (latest 50)"}</h3>
            <button onClick={reload} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">{isAr ? "تحديث" : "Refresh"}</button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {isAr ? "جارٍ التحميل..." : "Loading..."}</div>
          ) : jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{isAr ? "لا توجد مهام بعد." : "No jobs yet."}</div>
          ) : (
            <ul className="space-y-2">
              {jobs.map((j) => (
                <li key={j.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {statusBadge(j.status)}
                        <span className="truncate font-semibold">{j.subject || "—"}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{j.recipients.join(", ")}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {isAr ? "موعد: " : "Scheduled: "}{new Date(j.scheduled_for).toLocaleString()}
                        {j.sent_at && <> · {isAr ? "أُرسلت: " : "Sent: "}{new Date(j.sent_at).toLocaleString()}</>}
                      </div>
                      {j.error && <div className="mt-1 text-[11px] text-rose-600">{j.error}</div>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {(j.status === "queued") && (
                        <button onClick={() => cancel(j.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">{isAr ? "إلغاء" : "Cancel"}</button>
                      )}
                      <button onClick={() => remove(j.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                        <Trash2 className="inline h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
