import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Building2, Briefcase, Trash2 } from "lucide-react";
import { useStoreState } from "@/lib/store";
import { adminAddDepartment, adminDeleteDepartment, adminAddPosition, adminDeletePosition } from "@/lib/admin-api";
import { Header, BilingualImportBar, PageBar, inputCls } from "./shared";
import { useConfirm } from "@/components/ConfirmDialog";

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────
// Departments Tab
// ─────────────────────────────────────────────
export function DepartmentsTab() {
  return (
    <section>
      <Header title="Departments" hint="Bilingual departments used across user profiles." />
      <DepartmentsEditor />
    </section>
  );
}

function DepartmentsEditor() {
  const { settings } = useStoreState();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const items = settings.departments ?? [];
  const existingEn = items.map((d) => d.nameEn);
  const existingSet = new Set(existingEn.map((s) => s.trim().toLowerCase()));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const add = async () => {
    const name = en.trim();
    if (!name) return;
    if (existingSet.has(name.toLowerCase())) { toast.error("Department already exists"); return; }
    setBusy(true);
    try {
      await adminAddDepartment({ name_en: name, name_ar: ar.trim() || null });
      setEn(""); setAr("");
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ message: "Delete this department?" }))) return;
    try {
      await adminDeleteDepartment({ id });
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <BilingualImportBar
        label="departments" templateName="departments-template.xlsx" sheetName="Departments"
        sampleRows={[["Sales", "المبيعات"], ["Engineering", "الهندسة"], ["Finance", "المالية"]]}
        existingEn={existingEn}
        onImportRow={async ({ en, ar }) => { await adminAddDepartment({ name_en: en, name_ar: ar || null }); qc.invalidateQueries({ queryKey: ["supabase-sync"] }); }}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Name (EN)" className={inputCls} />
        <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder="الاسم (AR)" dir="rtl" className={inputCls} />
        <button onClick={add} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {pageItems.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{d.nameEn}</span>
              {d.nameAr && <span className="text-xs text-muted-foreground" dir="rtl">{d.nameAr}</span>}
            </div>
            <button onClick={() => remove(d.id)} className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No departments yet</div>}
      </div>
      <PageBar page={page} setPage={setPage} total={items.length} pageSize={PAGE_SIZE} />
      <ConfirmDialog />
    </div>
  );
}

// ─────────────────────────────────────────────
// Positions Tab
// ─────────────────────────────────────────────
export function PositionsTab() {
  return (
    <section>
      <Header title="Positions" hint="Job titles / positions used across user profiles." />
      <PositionsEditor />
    </section>
  );
}

function PositionsEditor() {
  const { settings } = useStoreState();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const items = settings.positions ?? [];
  const existingEn = items.map((p) => p.nameEn);
  const existingSet = new Set(existingEn.map((s) => s.trim().toLowerCase()));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const add = async () => {
    const name = en.trim();
    if (!name) return;
    if (existingSet.has(name.toLowerCase())) { toast.error("Position already exists"); return; }
    setBusy(true);
    try {
      await adminAddPosition({ name_en: name, name_ar: ar.trim() || null });
      setEn(""); setAr("");
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ message: "Delete this position?" }))) return;
    try {
      await adminDeletePosition({ id });
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <BilingualImportBar
        label="positions" templateName="positions-template.xlsx" sheetName="Positions"
        sampleRows={[["Sales Manager", "مدير مبيعات"], ["Engineer", "مهندس"], ["Accountant", "محاسب"]]}
        existingEn={existingEn}
        onImportRow={async ({ en, ar }) => { await adminAddPosition({ name_en: en, name_ar: ar || null }); qc.invalidateQueries({ queryKey: ["supabase-sync"] }); }}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Title (EN)" className={inputCls} />
        <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder="المسمى (AR)" dir="rtl" className={inputCls} />
        <button onClick={add} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {pageItems.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{p.nameEn}</span>
              {p.nameAr && <span className="text-xs text-muted-foreground" dir="rtl">{p.nameAr}</span>}
            </div>
            <button onClick={() => remove(p.id)} className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No positions yet</div>}
      </div>
      <PageBar page={page} setPage={setPage} total={items.length} pageSize={PAGE_SIZE} />
      <ConfirmDialog />
    </div>
  );
}
