import { useEffect, useState } from "react";
import { Check, XCircle, Paperclip, Upload, Download, Eye, ShieldCheck, ShieldX, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { actions, type Activity } from "@/lib/store";
import { RejectActivityDialog } from "./RejectActivityDialog";

type AttachmentRow = {
  id: string;
  name_en: string;
  storage_path: string;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
};

const BUCKET = "activity-attachments";

function fmtSize(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isUuid(v?: string) {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function ActivityApprovalCard({
  activity,
  canApprove,
  actor,
}: {
  activity: Activity;
  canApprove: boolean;
  actor?: string;
}) {
  const [note, setNote] = useState(activity.reviewNote ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => { setNote(activity.reviewNote ?? ""); }, [activity.id, activity.reviewNote]);

  const loadAttachments = async () => {
    if (!isUuid(activity.id)) return;
    setLoadingAtt(true);
    const { data, error } = await supabase
      .from("attachments")
      .select("id,name_en,storage_path,mime,size_bytes,created_at")
      .eq("parent_table", "activity")
      .eq("parent_id", activity.id)
      .order("created_at", { ascending: false });
    setLoadingAtt(false);
    if (error) { console.warn(error); return; }
    setAttachments((data ?? []) as AttachmentRow[]);
  };

  useEffect(() => { loadAttachments(); /* eslint-disable-next-line */ }, [activity.id]);

  const handleUpload = async (file: File) => {
    if (!isUuid(activity.id)) { toast.error("Cannot attach: activity not saved yet"); return; }
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const path = `${activity.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const ins = await supabase.from("attachments").insert({
        parent_table: "activity",
        parent_id: activity.id,
        name_en: file.name,
        storage_path: path,
        mime: file.type || null,
        size_bytes: file.size,
        uploaded_by: uid,
      });
      if (ins.error) throw ins.error;
      toast.success("Attachment uploaded");
      loadAttachments();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openOrDownload = async (att: AttachmentRow, mode: "preview" | "download") => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(att.storage_path, 60 * 10);
    if (error || !data?.signedUrl) { toast.error("Cannot open file"); return; }
    if (mode === "preview") {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = att.name_en;
      document.body.appendChild(a); a.click(); a.remove();
    }
  };

  const saveNote = () => {
    setSavingNote(true);
    actions.setActivityReviewNote(activity.id, note, actor);
    setTimeout(() => { setSavingNote(false); toast.success("Note saved"); }, 250);
  };

  const onApprove = () => {
    actions.approveActivity(activity.id, actor, note.trim() || undefined);
    toast.success(`Activity approved${activity.owner ? ` · ${activity.owner} notified` : ""}`);
  };

  const status = activity.approvalStatus ?? "approved";

  return (
    <div className="mt-2 w-full rounded-xl border border-border bg-secondary/30 p-3" onClick={(e) => e.stopPropagation()}>
      {/* Creator chip */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Created by</span>
        <div className="flex items-center gap-2 rounded-full bg-card px-2 py-1 ring-1 ring-border">
          {activity.createdByPhoto ? (
            <img src={activity.createdByPhoto} alt={`${activity.createdByName ?? activity.owner ?? "Creator"} avatar`} aria-label={`Created by ${activity.createdByName ?? activity.owner ?? "Unknown"}`} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div role="img" aria-label={`Created by ${activity.createdByName ?? activity.owner ?? "Unknown"}`} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {(activity.createdByName ?? activity.owner ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
          )}
          <span className="font-semibold text-foreground">{activity.createdByName ?? activity.owner ?? "Unknown"}</span>
        </div>
        {activity.createdAt && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {new Date(activity.createdAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Resolution history block */}
      {status !== "pending" && (
        <div className={`mt-3 rounded-lg border p-2.5 text-xs ${status === "approved" ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"}`}>
          <div className="flex flex-wrap items-center gap-2">
            {status === "approved" ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <ShieldX className="h-4 w-4 text-rose-600" />
            )}
            <span className={`font-bold uppercase tracking-wider text-[10px] ${status === "approved" ? "text-emerald-700" : "text-rose-700"}`}>
              {status === "approved" ? "Approved" : "Rejected"}
            </span>
            {activity.approvedByName && (
              <span className="font-semibold text-foreground">by {activity.approvedByName}</span>
            )}
            {activity.approvedAt && (
              <span className="text-muted-foreground">· {new Date(activity.approvedAt).toLocaleString()}</span>
            )}
          </div>
          {activity.rejectionReason && (
            <div className="mt-1 text-rose-700"><strong>Reason:</strong> {activity.rejectionReason}</div>
          )}
          {activity.reviewNote && (
            <div className="mt-1 text-foreground"><strong>Note:</strong> {activity.reviewNote}</div>
          )}
        </div>
      )}

      {/* Attachments */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Paperclip className="h-3 w-3" /> Attachments {attachments.length > 0 && `(${attachments.length})`}
          </div>
          <label className={`inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/20 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            <Upload className="h-3 w-3" /> {uploading ? "Uploading…" : "Add file"}
            <input
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
            />
          </label>
        </div>
        {loadingAtt && <div className="text-[11px] text-muted-foreground">Loading…</div>}
        {!loadingAtt && attachments.length === 0 && (
          <div className="rounded-md border border-dashed border-border px-2 py-2 text-[11px] text-muted-foreground">No attachments yet.</div>
        )}
        {attachments.length > 0 && (
          <ul className="space-y-1">
            {attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-2 rounded-md bg-card px-2 py-1.5 ring-1 ring-border">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground">{att.name_en}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtSize(att.size_bytes)} · {att.mime ?? "file"}</div>
                </div>
                <button onClick={() => openOrDownload(att, "preview")} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10" title="Preview">
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <button onClick={() => openOrDownload(att, "download")} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent" title="Download">
                  <Download className="h-3 w-3" /> Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Review note + actions */}
      {canApprove && status === "pending" && (
        <div className="mt-3 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Review note (optional, shared with creator)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Add a note before approving or rejecting…"
            className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:border-primary focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={saveNote}
              disabled={savingNote || note === (activity.reviewNote ?? "")}
              className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border hover:bg-accent disabled:opacity-50"
            >
              {savingNote ? "Saving…" : "Save note"}
            </button>
            <button
              onClick={() => setRejectOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
          </div>
        </div>
      )}

      {rejectOpen && (
        <RejectActivityDialog
          activityId={activity.id}
          activityTitle={activity.title}
          actor={actor}
          onClose={() => setRejectOpen(false)}
        />
      )}
    </div>
  );
}
