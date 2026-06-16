import { useMemo, useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import { RealChat } from "@/components/RealChat";
import { useI18n } from "@/lib/i18n";

export interface ChatContact {
  profileId: string;
  name: string;
  role?: string;
  photo?: string;
  initials: string;
}

interface Props {
  contacts: ChatContact[];
  me: { name?: string; photo?: string; initials?: string };
  emptyHint?: string;
}

export function ChatWithContacts({ contacts, me, emptyHint }: Props) {
  const { dir, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(contacts[0]?.profileId ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.role ?? "").toLowerCase().includes(q),
    );
  }, [query, contacts]);

  const selected =
    contacts.find((c) => c.profileId === selectedId) ?? contacts[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              style={{ insetInlineStart: "0.625rem" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={dir === "rtl" ? "ابحث..." : "Search..."}
              className="h-9 w-full rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ paddingInlineStart: "2rem", paddingInlineEnd: "0.625rem" }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {emptyHint ?? (lang === "ar" ? "لا أحد للمحادثة." : "No one to chat with.")}
            </div>
          )}
          {filtered.map((c) => {
            const active = c.profileId === (selected?.profileId ?? "");
            return (
              <button
                key={c.profileId}
                onClick={() => setSelectedId(c.profileId)}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start transition ${
                  active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent"
                }`}
              >
                {c.photo ? (
                  <img
                    src={c.photo}
                    alt={c.name}
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-[11px] font-bold text-primary-foreground">
                    {c.initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{c.name}</div>
                  {c.role && (
                    <div className="truncate text-[11px] text-muted-foreground">{c.role}</div>
                  )}
                </div>
                <MessageCircle
                  className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`}
                />
              </button>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0">
        {selected ? (
          <RealChat
            key={selected.profileId}
            peerProfileId={selected.profileId}
            peerName={selected.name}
            peerPhoto={selected.photo}
            peerInitials={selected.initials}
            meName={me.name}
            mePhoto={me.photo}
            meInitials={me.initials ?? "ME"}
          />
        ) : (
          <div className="flex h-[640px] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            {emptyHint ?? (lang === "ar" ? "اختر شخصًا للمحادثة." : "Pick someone to chat with.")}
          </div>
        )}
      </div>
    </div>
  );
}
