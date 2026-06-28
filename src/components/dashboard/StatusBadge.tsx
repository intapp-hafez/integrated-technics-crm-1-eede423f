const map: Record<string, string> = {
  // Lead statuses
  new: "bg-sky-100 text-sky-700",
  contacted: "bg-blue-100 text-blue-700",
  qualified: "bg-violet-100 text-violet-700",
  proposal: "bg-amber-100 text-amber-700",
  negotiation: "bg-orange-100 text-orange-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
  // Attendance
  present: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  absent: "bg-rose-100 text-rose-700",
  leave: "bg-slate-100 text-slate-700",
  // Project statuses
  "On Track": "bg-emerald-100 text-emerald-700",
  "At Risk": "bg-amber-100 text-amber-700",
  Delayed: "bg-rose-100 text-rose-700",
  Completed: "bg-blue-100 text-blue-700",
  "On Hold": "bg-slate-100 text-slate-700",
  // Quotation statuses (parity with finance)
  draft: "bg-secondary text-muted-foreground",
  sent: "bg-sky-100 text-sky-700",
  pending_approval: "bg-amber-100 text-amber-700",
  negotiating: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  // Activity statuses
  done: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  scheduled: "bg-amber-100 text-amber-700",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = map[status] ?? "bg-secondary text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label ?? status}
    </span>
  );
}
