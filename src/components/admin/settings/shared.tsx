// Shared primitives reused across Settings tab components
import React, { useState } from "react";
import { Plus, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import type { UserRoleKey } from "@/lib/store";

export const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function Header({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-5 border-b border-border pb-4">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </div>
      {children}
    </label>
  );
}

export function TxtField({
  label,
  value,
  onChange,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
        />
      )}
    </div>
  );
}

const PAGE_SIZE_DEFAULT = 10;

export function PageBar({
  page,
  setPage,
  total,
  pageSize = PAGE_SIZE_DEFAULT,
}: {
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
      <span>
        Showing {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(Math.max(1, cur - 1))}
          disabled={cur <= 1}
          className="rounded border border-border bg-card px-2 py-1 font-semibold text-foreground hover:bg-accent disabled:opacity-50"
        >
          Prev
        </button>
        <span className="px-2">
          Page {cur} / {pages}
        </span>
        <button
          onClick={() => setPage(Math.min(pages, cur + 1))}
          disabled={cur >= pages}
          className="rounded border border-border bg-card px-2 py-1 font-semibold text-foreground hover:bg-accent disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function BilingualImportBar({
  label,
  templateName,
  sheetName,
  sampleRows,
  existingEn,
  onImportRow,
}: {
  label: string;
  templateName: string;
  sheetName: string;
  sampleRows: string[][];
  existingEn: string[];
  onImportRow: (row: { en: string; ar: string }) => Promise<void>;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const rows = [["Name (EN)", "Name (AR)"], ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, templateName);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const seen = new Set(existingEn.map((s) => s.trim().toLowerCase()));
      let ok = 0,
        fail = 0,
        dup = 0;
      for (const r of rows) {
        const get = (keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(r).find((x) => x.trim().toLowerCase() === k.toLowerCase());
            if (found) return String(r[found] ?? "").trim();
          }
          return "";
        };
        const en = get([
          "Name (EN)",
          "Name EN",
          "name_en",
          "name",
          "Name",
          "Title (EN)",
          "Title EN",
          "title_en",
          "title",
          "Title",
        ]);
        const ar = get(["Name (AR)", "Name AR", "name_ar", "Title (AR)", "Title AR", "title_ar"]);
        if (!en) continue;
        const key = en.toLowerCase();
        if (seen.has(key)) {
          dup++;
          continue;
        }
        seen.add(key);
        try {
          await onImportRow({ en, ar });
          ok++;
        } catch {
          fail++;
        }
      }
      toast.success(
        `Imported ${ok} ${label}${dup ? ` · ${dup} duplicate${dup === 1 ? "" : "s"} skipped` : ""}${fail ? ` · ${fail} failed` : ""}`,
      );
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-background p-3">
      <span className="text-xs font-semibold text-muted-foreground">Bulk import:</span>
      <button
        onClick={downloadTemplate}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
      >
        <Download className="h-3.5 w-3.5" /> Download template
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" /> {busy ? "Importing…" : "Import from Excel"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleImport}
        className="hidden"
      />
      <span className="ms-auto text-[11px] text-muted-foreground">
        Columns: Name (EN), Name (AR)
      </span>
    </div>
  );
}
