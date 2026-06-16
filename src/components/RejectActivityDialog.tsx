import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { actions } from "@/lib/store";
import { X } from "lucide-react";

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { message: "Reason must be at least 3 characters" })
    .max(500, { message: "Reason must be less than 500 characters" }),
});

export function RejectActivityDialog({
  activityId,
  activityTitle,
  actor,
  onClose,
}: {
  activityId: string;
  activityTitle?: string;
  actor?: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({ reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid reason");
      return;
    }
    setSubmitting(true);
    try {
      actions.rejectActivity(activityId, parsed.data.reason, actor);
      toast.success("Activity rejected");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reject activity");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Reject activity</h3>
            {activityTitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{activityTitle}</p>
            )}
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="text-xs font-semibold text-foreground">Reason</label>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => { setReason(e.target.value); if (error) setError(null); }}
          maxLength={500}
          rows={4}
          placeholder="Tell the employee why this activity is being rejected…"
          className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className={error ? "text-rose-600" : "text-muted-foreground"}>
            {error ?? `${reason.length}/500`}
          </span>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {submitting ? "Rejecting…" : "Reject activity"}
          </button>
        </div>
      </div>
    </div>
  );
}
