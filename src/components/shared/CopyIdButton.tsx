import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyIdButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={copied ? "Copied!" : `Copy ${value}`}
      aria-label="Copy full ID"
      className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition ${className}`}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
