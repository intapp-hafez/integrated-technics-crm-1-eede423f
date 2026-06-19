import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en } from "./i18n/en";
import { ar } from "./i18n/ar";
import type { Dict } from "./i18n/en";

type Lang = "en" | "ar";

const dict: Record<Lang, Dict> = { en, ar };


interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: keyof Dict) => string;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("int-crm:lang");
      return (saved === "ar" || saved === "en") ? saved : "en";
    } catch {
      return "en";
    }
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("int-crm:lang", l); } catch {}
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value: I18nCtx = {
    lang,
    setLang,
    t: (k) => dict[lang][k] ?? dict.en[k],
    dir: lang === "ar" ? "rtl" : "ltr",
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Toggle language"
    >
      <span className={lang === "en" ? "text-primary" : "text-muted-foreground"}>EN</span>
      <span className="text-muted-foreground">/</span>
      <span className={lang === "ar" ? "text-primary" : "text-muted-foreground"}>عربي</span>
    </button>
  );
}