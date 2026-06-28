import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Option {
  value: string;
  label: string;
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };

  const summary =
    selected.length === 0
      ? (placeholder ?? t("all") ?? "All")
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold">{label}:</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 min-w-[140px] items-center justify-between gap-2 rounded-md border border-input bg-background px-2 text-xs text-foreground hover:bg-accent"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute right-0 z-50 mt-1 max-h-72 w-64 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">—</div>
          )}
          {options.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.value)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs">{o.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
