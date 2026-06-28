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
import { ProjectRequestDialog } from "./ProjectRequestDialog";
import { Edit } from "lucide-react";

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
  account_type?: string | null;
  other_account_type?: string | null;
  category_en?: string | null;
  extra_contacts?: string | null;
};

export function ProjectRequestsPanel({ mode }: { mode: "approver" | "mine" }) {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Req | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">(
    mode === "approver" ? "pending" : "all",
  );

  const [reviewTarget, setReviewTarget] = useState<Req | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [editingRequest, setEditingRequest] = useState<Req | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_requests")
      .select("*, requester:profiles!project_requests_requested_by_fkey(full_name_en)")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as any);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (req: Req) => {
    setBusyId(req.id);
    const { error } = await supabase.rpc("approve_project_request" as any, { _id: req.id });
    setBusyId(null);
    if (error) {
      if (error.message.includes("Duplicate")) {
        toast.error("Duplicate detected. Please request changes.");
        setReviewTarget(req);
        setReviewReason("");
        setReviewError(null);
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Approved & project created");
    load();
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    const trimmed = reviewReason.trim();
    if (trimmed.length < 3) {
      setReviewError("Please provide a reason for the review (min. 3 characters).");
      return;
    }
    setReviewError(null);
    setBusyId(reviewTarget.id);
    const { error } = await supabase.rpc("review_project_request" as any, {
      _id: reviewTarget.id,
      _note: trimmed,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Changes requested");
    setReviewTarget(null);
    setReviewReason("");
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
    const { error } = await supabase.rpc("reject_project_request" as any, {
      _id: rejectTarget.id,
      _note: trimmed,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request rejected");
    setRejectTarget(null);
    setRejectReason("");
    load();
  };

  const visible = rows.filter((r) => activeTab === "all" || r.status === activeTab);

  const TABS = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ] as const;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold">
          {mode === "approver" ? "Accounts · Requests" : "My accounts"}
        </h3>
        <button onClick={load} className="text-[11px] font-semibold text-primary hover:underline">
          Refresh
        </button>
      </div>

      <div className="mb-4 flex gap-2 border-b border-border">
        {TABS.map((tab) => {
          const count =
            tab.id === "all" ? rows.length : rows.filter((r) => r.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
      {!loading && visible.length === 0 && (
        <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          No requests.
        </div>
      )}
      {visible.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm mt-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Account Info</th>
                <th className="px-4 py-3 font-semibold">Client Contact</th>
                <th className="px-4 py-3 font-semibold">Request Details</th>
                <th className="px-4 py-3 font-semibold text-right">Actions / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="font-bold text-foreground text-[13px]">{r.name_en}</div>
                    {(r.account_type || r.category_en) && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {r.account_type
                          ? r.account_type === "Other" && r.other_account_type
                            ? r.other_account_type
                            : r.account_type
                          : r.category_en}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    <div className="font-medium text-foreground">{r.client_name_en}</div>
                    <div>{r.contact_name_en}</div>
                    <div className="mt-1 flex flex-col gap-0.5 text-[11px]">
                      {r.email && <span>{r.email}</span>}
                      {r.phone && <span>{r.phone}</span>}
                    </div>
                    {r.extra_contacts && (
                      <div className="mt-2 text-[10px]">
                        <div className="font-semibold text-foreground uppercase tracking-wider mb-0.5">
                          Extra Contacts
                        </div>
                        <ul className="space-y-0.5">
                          {(() => {
                            try {
                              const arr = JSON.parse(r.extra_contacts);
                              return arr.map((c: any, i: number) => (
                                <li key={i}>
                                  <span className="font-medium text-foreground">{c.name}</span>
                                  {c.title && ` (${c.title})`}
                                  {c.phone && ` · ${c.phone}`}
                                </li>
                              ));
                            } catch {
                              return <li>Error parsing extra contacts</li>;
                            }
                          })()}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {mode === "approver" && r.requester?.full_name_en && (
                      <div className="text-[10px] uppercase tracking-wider">
                        By{" "}
                        <span className="font-semibold text-foreground">
                          {r.requester.full_name_en}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px]">
                      <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}
                    </div>
                    {r.status === "rejected" && (
                      <div className="mt-2 flex items-start gap-1.5 rounded bg-rose-50 p-1.5 text-[11px] text-rose-800 border border-rose-100">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <div>
                          <b>Reason:</b>{" "}
                          {r.decision_note || <i className="text-rose-600">No reason provided</i>}
                        </div>
                      </div>
                    )}
                    {r.status === "approved" && r.decision_note && (
                      <div className="mt-2 rounded bg-secondary/50 p-1.5 text-[11px]">
                        <b>Note:</b> {r.decision_note}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="flex flex-col items-end gap-2">
                      {r.status === "pending" && mode === "approver" && (
                        <div className="flex items-center gap-2">
                          <button
                            disabled={busyId === r.id}
                            onClick={() => {
                              setRejectTarget(r);
                              setRejectReason("");
                              setRejectError(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                          <button
                            disabled={busyId === r.id}
                            onClick={() => approve(r)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </button>
                        </div>
                      )}
                      {r.status === "pending" && mode === "mine" && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => setEditingRequest(r)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
                        >
                          <Edit className="h-3 w-3" /> Edit
                        </button>
                      )}
                      {r.status === "approved" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                          <ShieldCheck className="h-3 w-3" /> Approved
                        </span>
                      )}
                      {r.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">
                          <ShieldX className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason("");
            setRejectError(null);
          }
        }}
      >
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
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
                setRejectError(null);
              }}
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

      <Dialog
        open={!!reviewTarget}
        onOpenChange={(o) => {
          if (!o) {
            setReviewTarget(null);
            setReviewReason("");
            setReviewError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes (Duplicate Detected)</DialogTitle>
            <DialogDescription>
              This request matches an existing client or request. Write a note to the creator to fix
              the issue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Review Note <span className="text-primary">*</span>
            </label>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              rows={4}
              placeholder="e.g. This matches an existing client, please update the name/phone…"
              className="w-full rounded-md border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            {reviewError && <div className="text-xs text-rose-600">{reviewError}</div>}
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setReviewTarget(null);
                setReviewReason("");
                setReviewError(null);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              Cancel
            </button>
            <button
              disabled={busyId === reviewTarget?.id}
              onClick={submitReview}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Send Note
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingRequest && (
        <ProjectRequestDialog
          existingRequest={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSubmitted={() => {
            setEditingRequest(null);
            load();
          }}
        />
      )}
    </div>
  );
}
