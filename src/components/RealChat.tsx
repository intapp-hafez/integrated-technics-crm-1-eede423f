import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Smile, Paperclip, Check, CheckCheck, MessageCircle, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

interface Props {
  peerProfileId: string;
  peerName: string;
  peerPhoto?: string;
  peerInitials: string;
  meName?: string;
  mePhoto?: string;
  meInitials?: string;
}

const EMOJIS = [
  "😀","😁","😂","🤣","😊","😇","🙂","😉","😍","🥰",
  "😘","😎","🤩","🤔","🤗","🤝","👍","👎","👏","🙌",
  "🙏","💪","🔥","✨","🎉","🎯","💼","📈","📊","📝",
  "📌","📎","📧","📞","✅","❌","⚠️","⏰","💡","💯",
  "❤️","💙","💚","💛","🧡","💜","🤍","🌟","⭐","☕",
];

export function RealChat({
  peerProfileId,
  peerName,
  peerPhoto,
  peerInitials,
  meName = "You",
  mePhoto,
  meInitials = "ME",
}: Props) {
  const { t, dir, lang } = useI18n();
  const { profile } = useAuth();
  const myId = profile?.id;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCat, setActiveCat] = useState<"greetings" | "tasks" | "approvals" | "closing">("greetings");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const quickReplies = useMemo(() => {
    const ar = {
      greetings: ["مرحبًا 👋", "صباح الخير ☀️", "مساء النور 🌙", "أهلًا بك 🤝", "كيف حالك؟ 🙂"],
      tasks: ["ابدأ بالعميل التالي 📌", "حدّث حالة المشروع 📊", "أرسل التقرير اليومي 📝", "تواصل مع العميل 📞", "راجع العرض 📄"],
      approvals: ["تمت الموافقة ✅", "بحاجة إلى تعديل ⚠️", "مرفوض ❌", "موافق مبدئيًا 👍", "انتظر مراجعة الإدارة 🕒"],
      closing: ["شكرًا لجهودك 🙏", "عمل ممتاز 🔥", "إلى اللقاء 👋", "بالتوفيق ✨", "نتابع غدًا 📅"],
    };
    const en = {
      greetings: ["Hi 👋", "Good morning ☀️", "Good evening 🌙", "Welcome 🤝", "How are you? 🙂"],
      tasks: ["Move to next lead 📌", "Update project status 📊", "Send daily report 📝", "Call the client 📞", "Review the offer 📄"],
      approvals: ["Approved ✅", "Needs revision ⚠️", "Rejected ❌", "Tentatively approved 👍", "Pending admin review 🕒"],
      closing: ["Thanks for your effort 🙏", "Great job 🔥", "Bye 👋", "Good luck ✨", "Let's follow up tomorrow 📅"],
    };
    return lang === "ar" ? ar : en;
  }, [lang]);

  // Initial load + realtime subscribe
  useEffect(() => {
    if (!myId || !peerProfileId) return;
    let cancelled = false;
    setLoading(true);
    setMessages([]);

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,sender_id,recipient_id,body,created_at,delivered_at,read_at")
        .or(
          `and(sender_id.eq.${myId},recipient_id.eq.${peerProfileId}),and(sender_id.eq.${peerProfileId},recipient_id.eq.${myId})`
        )
        .order("created_at", { ascending: true })
        .limit(500);
      if (!cancelled && !error && data) setMessages(data as Msg[]);
      setLoading(false);
      const nowIso = new Date().toISOString();
      // mark incoming as delivered first, then read (since viewing the conversation)
      void supabase
        .from("messages")
        .update({ delivered_at: nowIso, read_at: nowIso })
        .eq("recipient_id", myId)
        .eq("sender_id", peerProfileId)
        .is("read_at", null);
    })();

    const ch = supabase
      .channel(`chat:${[myId, peerProfileId].sort().join(":")}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload: any) => {
          const row = (payload.new ?? payload.old) as Msg;
          if (!row) return;
          const inPair =
            (row.sender_id === myId && row.recipient_id === peerProfileId) ||
            (row.sender_id === peerProfileId && row.recipient_id === myId);
          if (!inPair) return;
          if (payload.eventType === "INSERT") {
            setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
            if (row.recipient_id === myId) {
              const nowIso = new Date().toISOString();
              void supabase
                .from("messages")
                .update({ delivered_at: nowIso, read_at: nowIso })
                .eq("id", row.id);
            }
          } else if (payload.eventType === "UPDATE") {
            setMessages((m) => m.map((x) => (x.id === row.id ? { ...x, ...row } : x)));
          } else if (payload.eventType === "DELETE") {
            setMessages((m) => m.filter((x) => x.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [myId, peerProfileId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [peerProfileId]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? draft).trim();
    if (!text || !myId || !peerProfileId) return;
    setDraft("");
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 0);
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Msg = {
      id: tempId,
      sender_id: myId,
      recipient_id: peerProfileId,
      body: text,
      created_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
    };
    setMessages((m) => [...m, optimistic]);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: myId, recipient_id: peerProfileId, body: text })
      .select()
      .single();
    if (error) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      console.error("send failed", error);
      return;
    }
    setMessages((m) => m.map((x) => (x.id === tempId ? (data as Msg) : x)));
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const dayKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (dayKey(iso) === dayKey(today.toISOString())) return t("today");
    if (dayKey(iso) === dayKey(yesterday.toISOString())) return t("yesterday");
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
  };

  const Avatar = ({ photo, initials, alt }: { photo?: string; initials: string; alt: string }) =>
    photo ? (
      <img src={photo} alt={alt} loading="lazy" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-primary/30" />
    ) : (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-[10px] font-bold text-primary-foreground">
        {initials}
      </div>
    );

  const categories: Array<{ key: typeof activeCat; label: string; icon: string }> = [
    { key: "greetings", label: t("catGreetings"), icon: "👋" },
    { key: "tasks", label: t("catTasks"), icon: "📌" },
    { key: "approvals", label: t("catApprovals"), icon: "✅" },
    { key: "closing", label: t("catClosing"), icon: "🎯" },
  ];

  let lastDay = "";

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-secondary/60 to-secondary/20 px-5 py-3">
        <div className="relative">
          <Avatar photo={peerPhoto} initials={peerInitials} alt={peerName} />
          <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-foreground">{peerName}</div>
          <div className="text-[11px] text-emerald-600 font-medium">{t("online")}</div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      >
        {loading && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {lang === "ar" ? "جارٍ التحميل..." : "Loading..."}
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
              {t("conversationStart")}
            </div>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          const dk = dayKey(m.created_at);
          const showDay = dk !== lastDay;
          lastDay = dk;
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-secondary/80 px-3 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {dayLabel(m.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar
                  photo={mine ? mePhoto : peerPhoto}
                  initials={mine ? meInitials : peerInitials}
                  alt={mine ? meName : peerName}
                />
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-ee-sm"
                        : "bg-card text-foreground border border-border rounded-es-sm"
                    }`}
                  >
                    {m.body}
                  </div>
                  <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                    <span>{fmtTime(m.created_at)}</span>
                    {mine && (() => {
                      const isPending = m.id.startsWith("tmp-");
                      const tip = isPending
                        ? (lang === "ar" ? "جارٍ الإرسال" : "Sending")
                        : m.read_at
                        ? `${lang === "ar" ? "تمت القراءة" : "Read"} • ${fmtTime(m.read_at)}`
                        : m.delivered_at
                        ? `${lang === "ar" ? "تم التسليم" : "Delivered"} • ${fmtTime(m.delivered_at)}`
                        : (lang === "ar" ? "تم الإرسال" : "Sent");
                      const icon = isPending ? (
                        <Clock className="h-3 w-3 opacity-60" />
                      ) : m.read_at ? (
                        <CheckCheck className="h-3 w-3 text-sky-500" />
                      ) : m.delivered_at ? (
                        <CheckCheck className="h-3 w-3 opacity-70" />
                      ) : (
                        <Check className="h-3 w-3 opacity-70" />
                      );
                      return <span title={tip} aria-label={tip}>{icon}</span>;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick replies */}
      <div className="border-t border-border bg-secondary/20 px-3 pt-2">
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCat(c.key)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                activeCat === c.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {quickReplies[activeCat].map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground hover:border-primary hover:bg-primary/5"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="relative border-t border-border bg-card p-3">
        {showEmoji && (
          <div
            className="absolute bottom-[88px] z-20 grid w-[280px] grid-cols-10 gap-1 rounded-xl border border-border bg-popover p-2 shadow-lg"
            style={dir === "rtl" ? { right: 12 } : { left: 12 }}
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setDraft((d) => d + e);
                  inputRef.current?.focus();
                }}
                className="rounded text-lg hover:bg-accent"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-end gap-2"
        >
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
            aria-label={t("emoji")}
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
            aria-label={t("attach")}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={!myId ? (lang === "ar" ? "يجب تسجيل الدخول" : "Sign in to chat") : t("typeMessage")}
            disabled={!myId || !peerProfileId}
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!draft.trim() || !myId || !peerProfileId}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-brand)] transition hover:bg-primary/90 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
