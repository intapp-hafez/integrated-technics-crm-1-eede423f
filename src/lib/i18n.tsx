import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en, type Dict } from "./i18n/en";
import { ar } from "./i18n/ar";

type Lang = "en" | "ar";

const getDict = (): Record<Lang, Dict> => ({ en, ar });

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
      return saved === "ar" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("int-crm:lang", l);
    } catch {}
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value: I18nCtx = {
    lang,
    setLang,
    t: (k) => getDict()[lang][k] ?? getDict().en[k],
    dir: lang === "ar" ? "rtl" : "ltr",
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function LangToggle({ className }: { className?: string } = {}) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={`inline-flex h-9 items-center rounded-lg border border-border bg-card p-0.5 text-xs font-semibold shadow-xs ${className ?? ""}`}
      role="group"
      aria-label="Language switch"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-md px-2.5 py-1 text-xs transition-all duration-200 cursor-pointer font-bold ${
          lang === "en"
            ? "bg-[#F58220] text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`rounded-md px-2.5 py-1 text-xs transition-all duration-200 cursor-pointer font-bold ${
          lang === "ar"
            ? "bg-[#F58220] text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        عربي
      </button>
    </div>
  );
}
