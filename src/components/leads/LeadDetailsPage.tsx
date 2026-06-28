import { Link, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LocationPicker } from "@/components/LocationPicker";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { shortId } from "@/lib/utils";
import { CopyIdButton } from "@/components/CopyIdButton";
import { actions, useStoreState } from "@/lib/store";
import { useRole } from "@/lib/role";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  sbListLeadNotes,
  sbAddNote,
  sbDeleteNote,
  sbListLeadAttachments,
  sbUploadLeadAttachment,
  sbDeleteLeadAttachment,
  sbSignedAttachmentUrl,
  validateLeadAttachment,
  LEAD_ATTACHMENT_ALLOWED_EXT,
} from "@/lib/supabaseWrites";

import {
  ArrowLeft,
  Paperclip,
  FileText,
  Plus,
  MapPin,
  Building2,
  User,
  DollarSign,
  History as HistoryIcon,
  CalendarCheck,
  Workflow,
  Clock4,
  Timer,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  TrendingUp,
  Target,
  Mail,
  Phone,
  Globe,
  ChevronDown,
} from "lucide-react";

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const newId = () => {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
function fmtBytes(n?: number | null) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  // Stable, locale-independent format to avoid SSR/client hydration mismatch
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LeadDetailsPage({ leadId }: { leadId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { role } = useRole();
  const panel = role;
  const user = { name: "hafez Rahim", role: t(role as any), initials: "HR" };
  const { leads, activities, history, settings, leadDistricts } = useStoreState();
  const lead = leads.find((l) => l.id === leadId);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const persistable = isUuid(leadId);

  const notesQuery = useQuery({
    queryKey: ["lead-notes", leadId],
    queryFn: () => sbListLeadNotes(leadId),
    enabled: persistable,
  });
  const filesQuery = useQuery({
    queryKey: ["lead-attachments", leadId],
    queryFn: () => sbListLeadAttachments(leadId),
    enabled: persistable,
  });

  if (!lead) {
    return (
      <AppShell panel={panel} user={user} pageTitle="Lead">
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Lead <span className="font-mono">{leadId}</span> not found.
          </p>
          <Link to="/admin/leads" className="mt-3 inline-block text-sm font-semibold text-primary">
            {t("backToLeads")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const leadNotes = notesQuery.data ?? [];
  const leadFiles = filesQuery.data ?? [];
  const leadActivities = activities.filter((a) => a.leadId === leadId);
  const leadHistory = history.filter((h) => h.target === lead.company);
  const stageHistory = leadHistory.filter((h) => h.module === "pipeline");

  async function handleAddNote() {
    const text = noteText.trim();
    if (!text) return;
    if (!persistable) {
      setNoteError("This lead can't store notes (not synced yet).");
      return;
    }
    setSavingNote(true);
    setNoteError(null);
    try {
      const id = newId();
      await sbAddNote(id, leadId, text);
      setNoteText("");
      await qc.invalidateQueries({ queryKey: ["lead-notes", leadId] });
    } catch (e: any) {
      setNoteError(e?.message ?? "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      await sbDeleteNote(noteId);
      await qc.invalidateQueries({ queryKey: ["lead-notes", leadId] });
    } catch (e: any) {
      setNoteError(e?.message ?? "Failed to delete note");
    }
  }

  async function handleUpload(file: File) {
    if (!persistable) {
      setUploadError("This lead can't store files (not synced yet).");
      return;
    }
    const invalid = validateLeadAttachment(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await sbUploadLeadAttachment(leadId, file);
      toast.success("Uploaded");
      await qc.invalidateQueries({ queryKey: ["lead-attachments", leadId] });
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(attId: string, path: string) {
    try {
      const ok = await sbDeleteLeadAttachment(attId, path);
      if (ok) await qc.invalidateQueries({ queryKey: ["lead-attachments", leadId] });
    } catch (e: any) {
      setUploadError(e?.message ?? "Failed to delete file");
    }
  }

  async function handleDownload(path: string, name: string) {
    const url = await sbSignedAttachmentUrl(path);
    if (!url) {
      toast.error("Could not generate download link");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Time spent per employee on this lead
  const timeByOwner = new Map<string, { mins: number; count: number }>();
  for (const a of leadActivities) {
    const cur = timeByOwner.get(a.owner) ?? { mins: 0, count: 0 };
    cur.mins += a.estMinutes ?? 0;
    cur.count += 1;
    timeByOwner.set(a.owner, cur);
  }
  const totalMins = Array.from(timeByOwner.values()).reduce((s, v) => s + v.mins, 0);
  const fmtH = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return mins ? (h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`) : "0";
  };

  return (
    <AppShell panel={panel} user={user} pageTitle={lead.company}>
      <button
        onClick={() => router.history.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> {t("backToLeads")}
      </button>

      {/* Header card */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-extrabold text-foreground">
                {lead.company}
              </h2>
              <StatusBadge status={lead.status} label={t(lead.status as any)} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> {lead.contact}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {lead.industry}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> {fmtMoney(lead.value)}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs">
                {shortId(lead.id)}
                <CopyIdButton value={lead.id} />
              </span>
            </div>
            <LocationPicker
              cities={settings.locations}
              city={lead.city}
              district={leadDistricts[lead.id] ?? ""}
              onChange={(city, district) => actions.setLeadLocation(lead.id, city, district)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Timeline */}
        <div className="lg:col-span-2">
          <Section title={t("timeline")} icon={HistoryIcon}>
            <ol className="relative ms-3 border-s border-border ps-5">
              {leadHistory.length === 0 && (
                <li className="text-sm text-muted-foreground">No history yet.</li>
              )}
              {leadHistory.map((h) => (
                <li key={h.id} className="relative pb-5 last:pb-0">
                  <span className="absolute -start-[27px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="text-xs text-muted-foreground">
                    {fmtTime(h.ts)} ·{" "}
                    <span className="font-semibold text-foreground">{h.actor}</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{h.action}</div>
                  {h.details && <div className="text-xs text-muted-foreground">{h.details}</div>}
                </li>
              ))}
            </ol>
          </Section>

          <Section title={t("relatedActivities")} icon={CalendarCheck}>
            {leadActivities.length > 0 && (
              <div className="mb-4 rounded-xl bg-secondary/50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock4 className="h-3.5 w-3.5 text-primary" /> Time spent on this lead
                  </div>
                  <div className="font-mono text-lg font-bold text-foreground">
                    {fmtH(totalMins)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {Array.from(timeByOwner.entries()).map(([owner, v]) => (
                    <div key={owner} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">
                        {owner} <span className="text-muted-foreground">· {v.count} action(s)</span>
                      </span>
                      <span className="font-mono font-bold text-primary">{fmtH(v.mins)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {leadActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">No activities linked to this lead.</p>
            )}
            <div className="space-y-2">
              {leadActivities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {a.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.dueDate} {a.time} · {a.owner}
                    </div>
                  </div>
                  {a.estMinutes != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/20">
                      <Timer className="h-3 w-3" /> {fmtH(a.estMinutes)}
                    </span>
                  )}
                  <span className="text-xs font-semibold capitalize text-muted-foreground">
                    {a.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("stageHistory")} icon={Workflow}>
            {stageHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stage changes yet — drag this lead on the Pipeline board to log one.
              </p>
            ) : (
              <ol className="relative ms-3 border-s border-border ps-5">
                {stageHistory.map((h) => {
                  const parts = (h.details || "").split("→").map((s) => s.trim());
                  const fromLabel = parts[0] || "";
                  const toLabel = parts[1] || h.action.replace(/^Moved to\s*/i, "");
                  const stageColor = (label: string) =>
                    settings.stages.find((st) => st.label.toLowerCase() === label.toLowerCase())
                      ?.color ?? "#64748b";
                  return (
                    <li key={h.id} className="relative pb-5 last:pb-0">
                      <span className="absolute -start-[27px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="text-xs text-muted-foreground">
                        {fmtTime(h.ts)} ·{" "}
                        <span className="font-semibold text-foreground">{h.actor}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        {fromLabel && (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1"
                            style={{
                              background: `${stageColor(fromLabel)}1A`,
                              color: stageColor(fromLabel),
                              borderColor: stageColor(fromLabel),
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: stageColor(fromLabel) }}
                            />
                            {fromLabel}
                          </span>
                        )}
                        <span className="text-muted-foreground">→</span>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ring-1"
                          style={{
                            background: `${stageColor(toLabel)}1A`,
                            color: stageColor(toLabel),
                            borderColor: stageColor(toLabel),
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: stageColor(toLabel) }}
                          />
                          {toLabel}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
        </div>

        {/* Right: Info + Notes + Attachments */}
        <div>
          {/* Lead Info Card */}
          <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Lead Details
              </h3>
            </div>
            <div className="space-y-0">
              {/* Pipeline Status — inline dropdown */}
              <div className="flex items-start gap-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-1.5 w-32 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-0.5">
                  <Workflow className="h-3.5 w-3.5" />
                  Stage
                </div>
                <div className="flex-1 relative inline-flex">
                  <select
                    value={lead.status}
                    disabled={changingStatus}
                    onChange={async (e) => {
                      const next = e.target.value as any;
                      if (next === lead.status) return;
                      setChangingStatus(true);
                      try {
                        actions.moveLead(lead.id, next, user.name);
                        toast.success(
                          `Stage → ${settings.stages.find((s) => s.key === next)?.label ?? next}`
                        );
                      } finally {
                        setChangingStatus(false);
                      }
                    }}
                    className="h-8 w-full appearance-none rounded-lg border bg-card pe-7 ps-3 text-xs font-semibold shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/50 disabled:opacity-60"
                    style={{
                      borderColor: (settings.stages.find((s) => s.key === lead.status)?.color ?? "#64748b") + "99",
                      color: settings.stages.find((s) => s.key === lead.status)?.color ?? "inherit",
                    }}
                  >
                    {settings.stages.map((s) => (
                      <option key={s.key} value={s.key} style={{ color: s.color }}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <InfoRow label="Owner" icon={User}>
                {lead.owner || "—"}
              </InfoRow>
              <InfoRow label="Industry" icon={Building2}>
                {lead.industry || "—"}
              </InfoRow>
              <InfoRow label="Email" icon={Mail}>
                {(lead as any).email ? (
                  <a
                    href={`mailto:${(lead as any).email}`}
                    className="text-primary hover:underline font-mono text-xs"
                  >
                    {(lead as any).email}
                  </a>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Source" icon={Globe}>
                {(lead as any).source || "—"}
              </InfoRow>
              <InfoRow label="Value" icon={DollarSign}>
                <span className="font-mono font-bold text-primary">{fmtMoney(lead.value)}</span>
                {lead.probability !== undefined && (
                  <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {lead.probability}%
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Expected Close" icon={CalendarCheck}>
                {(lead as any).expectedCloseDate || "—"}
              </InfoRow>
              <InfoRow label="Location" icon={MapPin}>
                {[lead.city, leadDistricts[lead.id], (lead as any).street]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </InfoRow>
              {(lead as any).description && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Description
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {(lead as any).description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Section title={t("notes")} icon={FileText}>
            <div className="mb-3 flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddNote();
                }}
                placeholder="Add a quick note..."
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                disabled={savingNote || !noteText.trim()}
                onClick={handleAddNote}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingNote ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}{" "}
                {t("addNote")}
              </button>
            </div>
            {!persistable && (
              <p className="mb-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                This lead isn't synced to the database yet, so notes can't be saved.
              </p>
            )}
            {noteError && (
              <div className="mb-2 flex items-start gap-1.5 rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> <span>{noteError}</span>
              </div>
            )}
            <div className="space-y-2">
              {notesQuery.isLoading && (
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading notes…
                </p>
              )}
              {notesQuery.isError && !notesQuery.isLoading && (
                <div className="flex items-start gap-1.5 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold">Couldn't load notes</div>
                    <div className="opacity-80">
                      {(notesQuery.error as any)?.message ?? "Please try again."}
                    </div>
                  </div>
                  <button onClick={() => notesQuery.refetch()} className="font-semibold underline">
                    Retry
                  </button>
                </div>
              )}
              {!notesQuery.isLoading && !notesQuery.isError && leadNotes.length === 0 && (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
              {leadNotes.map((n) => (
                <div key={n.id} className="group rounded-lg border border-border bg-background p-3">
                  <div className="text-sm text-foreground">{n.text_en || n.text_ar}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{fmtTime(n.created_at)}</span>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="font-semibold text-rose-600 opacity-0 hover:underline group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("attachments")} icon={Paperclip}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                handleUpload(file);
                e.target.value = "";
              }}
            />
            <button
              disabled={uploading || !persistable}
              onClick={() => fileInputRef.current?.click()}
              className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background py-6 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}{" "}
              {uploading ? "Uploading…" : `${t("upload")} — saved to the cloud`}
            </button>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Allowed: {LEAD_ATTACHMENT_ALLOWED_EXT.join(", ").toUpperCase()} · Max 3 MB
            </p>
            {!persistable && (
              <p className="mb-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                This lead isn't synced to the database yet, so files can't be uploaded.
              </p>
            )}
            {uploadError && (
              <div className="mb-2 flex items-start gap-1.5 rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> <span>{uploadError}</span>
              </div>
            )}
            <div className="space-y-2">
              {filesQuery.isLoading && (
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading files…
                </p>
              )}
              {filesQuery.isError && !filesQuery.isLoading && (
                <div className="flex items-start gap-1.5 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold">Couldn't load files</div>
                    <div className="opacity-80">
                      {(filesQuery.error as any)?.message ?? "Please try again."}
                    </div>
                  </div>
                  <button onClick={() => filesQuery.refetch()} className="font-semibold underline">
                    Retry
                  </button>
                </div>
              )}
              {!filesQuery.isLoading && !filesQuery.isError && leadFiles.length === 0 && (
                <p className="text-sm text-muted-foreground">No files yet.</p>
              )}
              {leadFiles.map((f) => (
                <div
                  key={f.id}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => handleDownload(f.storage_path, f.name_en)}
                      className="truncate block text-start text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {f.name_en}
                    </button>
                    <div className="text-[11px] text-muted-foreground">
                      {fmtBytes(f.size_bytes)} · {fmtTime(f.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(f.storage_path, f.name_en)}
                    title="Download"
                    className="rounded p-1 text-muted-foreground opacity-0 hover:bg-accent hover:text-primary group-hover:opacity-100"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(f.id, f.storage_path)}
                    title="Delete"
                    className="rounded p-1 text-rose-600 opacity-0 hover:bg-rose-50 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: any;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-1.5 w-32 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-0.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="flex-1 text-sm text-foreground">{children}</div>
    </div>
  );
}
