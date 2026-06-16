import { useEffect, useState, useCallback } from "react";
import { Check, X, Clock, ShieldCheck, ShieldX, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Req = {
  id: string;
  name_en: string;
  client_name_en: string;
  contact_name_en: string;
  email: string;
  phone: string;
  budget: number | null;
  status: "pending" | "approved" | "rejected";
  decision_note: string | null;
  created_at: string;
  requested_by: string;
  requester?: { full_name_en: string | null } | null;
};

export function ProjectRequestsPanel({ mode }: { mode: "approver" | "mine" }) {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Req | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_requests")
      .select("id,name_en,client_name_en,contact_name_en,email,phone,budget,status,decision_note,created_at,requested_by,requester:profiles!project_requests_requested_by_fkey(full_name_en)")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as any);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("approve_project_request" as any, { _id: id });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Approved & project created");
    load();
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 3) {
      setRejectError("Please provide a rejection reason (min. 3 characters).");
      return;
    }
    setRejectError(null);
    setBusyId(rejectTarget.id);
    const { error } = await supabase.rpc("reject_project_request" as any, { _id: rejectTarget.id, _note: trimmed });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Request rejected");
    setRejectTarget(null);
    setRejectReason("");
    load();
  };

  const visible = mode === "approver" ? rows.filter(r => r.status === "pending") : rows;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold">{mode === "approver" ? "Project Requests · Pending Approval" : "My Project Requests"}</h3>
        <button onClick={load} className="text-[11px] font-semibold text-primary hover:underline">Refresh</button>
      </div>
      {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
      {!loading && visible.length === 0 && (
        <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">No requests.</div>
      )}
      <ul className="space-y-2">
        {visible.map(r => (
          <li key={r.id} className="rounded-lg border border-border bg-background p-3 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-foreground">{r.name_en}</div>
                <div className="text-muted-foreground">{r.client_name_en} · {r.contact_name_en}</div>
                <div className="text-muted-foreground">{r.email} · {r.phone}</div>
                {mode === "approver" && r.requester?.full_name_en && (
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">By {r.requester.full_name_en}</div>
                )}
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.status === "pending" && mode === "approver" && (
                  <>
                    <button disabled={busyId === r.id} onClick={() => { setRejectTarget(r); setRejectReason(""); setRejectError(null); }} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                      <X className="h-3 w-3" /> Reject
                    </button>
                    <button disabled={busyId === r.id} onClick={() => approve(r.id)} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                      <Check className="h-3 w-3" /> Approve
                    </button>
                  </>
                )}
                {r.status === "approved" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <ShieldCheck className="h-3 w-3" /> Approved
                  </span>
                )}
                {r.status === "rejected" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                    <ShieldX className="h-3 w-3" /> Rejected
                  </span>
                )}
              </div>
            </div>
            {r.status === "rejected" && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <div><b>Rejection reason:</b> {r.decision_note || <i className="text-rose-600">No reason provided</i>}</div>
              </div>
            )}
            {r.status === "approved" && r.decision_note && (
              <div className="mt-2 rounded-md bg-secondary/50 p-2 text-[11px]"><b>Note:</b> {r.decision_note}</div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); setRejectError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject project request</DialogTitle>
            <DialogDescription>
              Provide a clear reason. The employee will see this on their request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rejection reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g. Duplicate client / missing budget / scope unclear…"
              className="w-full rounded-md border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            {rejectError && <div className="text-xs text-rose-600">{rejectError}</div>}
          </div>
          <DialogFooter>
            <button
              onClick={() => { setRejectTarget(null); setRejectReason(""); setRejectError(null); }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              Cancel
            </button>
            <button
              disabled={busyId === rejectTarget?.id}
              onClick={submitReject}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Confirm reject
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
