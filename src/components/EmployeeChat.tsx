import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Trash2, Smile, Paperclip, Check, CheckCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Msg {
  id: string;
  from: "admin" | "employee";
  text: string;
  ts: number;
  read?: boolean;
}

interface Props {
  employeeId: string;
  employeeName: string;
  employeePhoto?: string;
  employeeInitials: string;
  adminName: string;
  adminPhoto?: string;
  adminInitials: string;
  /** Who is using this chat UI. Non-admin viewers don't see the admin sender toggle. */
  viewerRole?: "admin" | "employee";
}

const storageKey = (id: string) => `int-crm:chat:${id}`;

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "😉",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤩",
  "🤔",
  "🤗",
  "🤝",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "🎉",
  "🎯",
  "💼",
  "📈",
  "📊",
  "📝",
  "📌",
  "📎",
  "📧",
  "📞",
  "✅",
  "❌",
  "⚠️",
  "⏰",
  "💡",
  "💯",
  "❤️",
  "💙",
  "💚",
  "💛",
  "🧡",
  "💜",
  "🤍",
  "🌟",
  "⭐",
  "☕",
];

function seedFor(_id: string, employeeName: string, adminName: string): Msg[] {
  const now = Date.now();
  return [
    {
      id: "s1",
      from: "employee",
      text: `مرحبًا ${adminName} 👋، أحتاج مراجعة العرض المرسل لشركة Aramco.`,
      ts: now - 1000 * 60 * 60 * 26,
      read: true,
    },
    {
      id: "s2",
      from: "admin",
      text: `أهلًا ${employeeName.split(" ")[0]} 🙌، تمام سأراجعه اليوم وأرد عليك.`,
      ts: now - 1000 * 60 * 60 * 25,
      read: true,
    },
    {
      id: "s3",
      from: "employee",
      text: "شكرًا 🙏، في انتظار ملاحظاتك.",
      ts: now - 1000 * 60 * 60 * 24,
      read: true,
    },
  ];
}

export function EmployeeChat({
  employeeId,
  employeeName,
  employeePhoto,
  employeeInitials,
  adminName,
  adminPhoto,
  adminInitials,
  viewerRole = "admin",
}: Props) {
  const { t, dir, lang } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sendAs, setSendAs] = useState<"admin" | "employee">(viewerRole);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCat, setActiveCat] = useState<"greetings" | "tasks" | "approvals" | "closing">(
    "greetings",
  );
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const replyTimer = useRef<number | null>(null);

  const quickReplies = useMemo(() => {
    const ar = {
      greetings: ["مرحبًا 👋", "صباح الخير ☀️", "مساء النور 🌙", "أهلًا بك 🤝", "كيف حالك؟ 🙂"],
      tasks: [
        "ابدأ بالعميل التالي 📌",
        "حدّث حالة المشروع 📊",
        "أرسل التقرير اليومي 📝",
        "تواصل مع العميل 📞",
        "راجع العرض 📄",
      ],
      approvals: [
        "تمت الموافقة ✅",
        "بحاجة إلى تعديل ⚠️",
        "مرفوض ❌",
        "موافق مبدئيًا 👍",
        "انتظر مراجعة الإدارة 🕒",
      ],
      closing: ["شكرًا لجهودك 🙏", "عمل ممتاز 🔥", "إلى اللقاء 👋", "بالتوفيق ✨", "نتابع غدًا 📅"],
    };
    const en = {
      greetings: ["Hi 👋", "Good morning ☀️", "Good evening 🌙", "Welcome 🤝", "How are you? 🙂"],
      tasks: [
        "Move to next lead 📌",
        "Update project status 📊",
        "Send daily report 📝",
        "Call the client 📞",
        "Review the offer 📄",
      ],
      approvals: [
        "Approved ✅",
        "Needs revision ⚠️",
        "Rejected ❌",
        "Tentatively approved 👍",
        "Pending admin review 🕒",
      ],
      closing: [
        "Thanks for your effort 🙏",
        "Great job 🔥",
        "Bye 👋",
        "Good luck ✨",
        "Let's follow up tomorrow 📅",
      ],
    };
    return lang === "ar" ? ar : en;
  }, [lang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey(employeeId));
      if (raw) {
        setMessages(JSON.parse(raw));
      } else {
        const seeded = seedFor(employeeId, employeeName, adminName);
        setMessages(seeded);
        localStorage.setItem(storageKey(employeeId), JSON.stringify(seeded));
      }
    } catch {
      setMessages([]);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [employeeId, employeeName, adminName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey(employeeId), JSON.stringify(messages));
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, employeeId]);

  const pushMessage = (from: "admin" | "employee", text: string) => {
    setMessages((m) => [
      ...m,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        from,
        text,
        ts: Date.now(),
        read: false,
      },
    ]);
  };

  const send = (overrideText?: string) => {
    const text = (overrideText ?? draft).trim();
    if (!text) return;
    pushMessage(sendAs, text);
    setDraft("");
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 0);

    // Simulated auto-reply from the other side
    if (replyTimer.current) window.clearTimeout(replyTimer.current);
    setTyping(true);
    replyTimer.current = window.setTimeout(
      () => {
        setTyping(false);
        const other = sendAs === "admin" ? "employee" : "admin";
        const pool =
          lang === "ar"
            ? ["تمام 👍", "تم الاستلام ✅", "سأتابع الآن 🙌", "شكرًا 🙏", "حاضر 💪"]
            : ["Okay 👍", "Got it ✅", "On it 🙌", "Thanks 🙏", "Sure thing 💪"];
        pushMessage(other, pool[Math.floor(Math.random() * pool.length)]);
        // mark previous outgoing as read
        setMessages((m) => m.map((x) => (x.from === sendAs ? { ...x, read: true } : x)));
      },
      1400 + Math.random() * 900,
    );
  };

  const clear = () => {
    if (typeof window === "undefined") return;
    if (!window.confirm(lang === "ar" ? "هل تريد مسح المحادثة؟" : "Clear this conversation?"))
      return;
    setMessages([]);
    localStorage.removeItem(storageKey(employeeId));
  };

  const fmtTime = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const dayKey = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  const dayLabel = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (dayKey(ts) === dayKey(today.getTime())) return t("today");
    if (dayKey(ts) === dayKey(yesterday.getTime())) return t("yesterday");
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const Avatar = ({ photo, initials, alt }: { photo?: string; initials: string; alt: string }) =>
    photo ? (
      <img
        src={photo}
        alt={alt}
        loading="lazy"
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-primary/30"
      />
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
    <div
      className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
      dir={dir}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-secondary/60 to-secondary/20 px-5 py-3">
        <div className="relative">
          <Avatar
            photo={viewerRole === "admin" ? employeePhoto : adminPhoto}
            initials={viewerRole === "admin" ? employeeInitials : adminInitials}
            alt={viewerRole === "admin" ? employeeName : adminName}
          />
          <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-foreground">
            {viewerRole === "admin" ? employeeName : adminName}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            {typing ? t("typing") : t("online")}
          </div>
        </div>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" /> {t("clearChat")}
        </button>
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
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {t("conversationStart")}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.from === "admin";
          const dk = dayKey(m.ts);
          const showDay = dk !== lastDay;
          lastDay = dk;
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-secondary/80 px-3 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {dayLabel(m.ts)}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar
                  photo={mine ? adminPhoto : employeePhoto}
                  initials={mine ? adminInitials : employeeInitials}
                  alt={mine ? adminName : employeeName}
                />
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-ee-sm"
                        : "bg-card text-foreground border border-border rounded-es-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                    <span>{fmtTime(m.ts)}</span>
                    {mine &&
                      (m.read ? (
                        <CheckCheck className="h-3 w-3 text-sky-500" />
                      ) : (
                        <Check className="h-3 w-3" />
                      ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex items-end gap-2">
            <Avatar
              photo={sendAs === "admin" ? employeePhoto : adminPhoto}
              initials={sendAs === "admin" ? employeeInitials : adminInitials}
              alt="typing"
            />
            <div className="rounded-2xl border border-border bg-card px-3 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          </div>
        )}
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
        {viewerRole === "admin" && (
          <div className="mb-2 inline-flex rounded-md border border-border bg-secondary/50 p-0.5 text-[11px]">
            <button
              onClick={() => setSendAs("admin")}
              className={`rounded px-2 py-1 font-semibold transition ${sendAs === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {t("admin")} ({t("you")})
            </button>
            <button
              onClick={() => setSendAs("employee")}
              className={`rounded px-2 py-1 font-semibold transition ${sendAs === "employee" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {employeeName.split(" ")[0]}
            </button>
          </div>
        )}

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
            send();
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
                send();
              }
            }}
            rows={1}
            placeholder={t("typeMessage")}
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
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
