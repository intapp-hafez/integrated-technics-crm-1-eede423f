import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Ban,
  ListChecks,
} from "lucide-react";
import { runSecurityScan, listScanRuns, type ScanFinding } from "@/lib/security/scanner.functions";
import {
  listBlocklist,
  listWhitelist,
  listSecurityEvents,
  blockIp,
  unblockIp,
  whitelistIp,
  removeWhitelist,
  firewallStats,
} from "@/lib/security/firewall.functions";

function Pill({
  status,
  children,
}: {
  status: "pass" | "fail" | "warn" | "info";
  children: React.ReactNode;
}) {
  const map = {
    pass: "bg-emerald-100 text-emerald-700 ring-emerald-300",
    fail: "bg-rose-100 text-rose-700 ring-rose-300",
    warn: "bg-amber-100 text-amber-700 ring-amber-300",
    info: "bg-slate-100 text-slate-700 ring-slate-300",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ring-1 ${map[status]}`}
    >
      {children}
    </span>
  );
}

function StatusIcon({ status }: { status: ScanFinding["status"] }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-rose-600" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <Info className="h-4 w-4 text-slate-500" />;
}

export function ScannerPanel() {
  const qc = useQueryClient();
  const runs = useQuery({ queryKey: ["sec-runs"], queryFn: () => listScanRuns() });
  const [lastResult, setLastResult] = useState<{
    score: number;
    findings: ScanFinding[];
    summary: any;
  } | null>(null);
  const scan = useMutation({
    mutationFn: () => runSecurityScan(),
    onSuccess: (r: any) => {
      setLastResult(r);
      qc.invalidateQueries({ queryKey: ["sec-runs"] });
      toast.success(`Scan complete — score ${r.score}/100`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Scan failed"),
  });

  const findings = lastResult?.findings ?? [];
  const grouped = findings.reduce<Record<string, ScanFinding[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});
  const score = lastResult?.score ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">OWASP Top 10 / 2025 — Active Scan</h3>
            <p className="text-xs text-muted-foreground">
              Probes headers, CSRF, XSS reflection, SQLi error-leak, auth gating, session cookies,
              RLS, middleware.
            </p>
          </div>
          <button
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Activity className="h-4 w-4" /> {scan.isPending ? "Running…" : "Run full scan"}
          </button>
        </div>
        {score !== null && (
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <div className="flex flex-col items-center rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-card p-5">
              <div
                className={`text-5xl font-extrabold ${score >= 85 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-rose-600"}`}
              >
                {score}
              </div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider">
                Security score
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <span className="font-bold text-emerald-600">{lastResult?.summary.pass}</span> pass
              </div>
              <div>
                <span className="font-bold text-amber-600">{lastResult?.summary.warn}</span> warn
              </div>
              <div>
                <span className="font-bold text-rose-600">{lastResult?.summary.fail}</span> fail
              </div>
              <div>
                <span className="font-bold">{lastResult?.summary.total}</span> total
              </div>
            </div>
          </div>
        )}
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="rounded-2xl border border-border bg-card p-4">
          <h4 className="mb-3 font-display text-sm font-bold capitalize">{cat}</h4>
          <ul className="space-y-2">
            {items.map((f) => (
              <li key={f.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-3">
                  <StatusIcon status={f.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{f.title}</span>
                      <Pill status={f.status}>{f.status}</Pill>
                      <span className="text-[10px] font-mono text-muted-foreground">{f.owasp}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {f.severity}
                      </span>
                    </div>
                    {f.evidence && (
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground break-all">
                        {f.evidence}
                      </div>
                    )}
                    {f.status !== "pass" && f.remediation && (
                      <div className="mt-1 text-xs text-foreground">
                        <span className="font-semibold">Fix: </span>
                        {f.remediation}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-bold">
          <ListChecks className="h-4 w-4" /> Recent scans
        </h4>
        <ul className="divide-y divide-border">
          {(runs.data?.runs ?? []).map((r: any) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">
                {new Date(r.started_at).toLocaleString()}
              </span>
              <span
                className={`font-bold ${r.score >= 85 ? "text-emerald-600" : r.score >= 60 ? "text-amber-600" : "text-rose-600"}`}
              >
                {r.score ?? "—"}/100
              </span>
            </li>
          ))}
          {!runs.data?.runs?.length && (
            <li className="py-3 text-center text-xs text-muted-foreground">No scans yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export function FirewallPanel() {
  const qc = useQueryClient();

  const block = useQuery({ queryKey: ["fw-block"], queryFn: () => listBlocklist() });
  const white = useQuery({ queryKey: ["fw-white"], queryFn: () => listWhitelist() });
  const events = useQuery({
    queryKey: ["fw-events"],
    queryFn: () => listSecurityEvents({ data: { limit: 50 } }),
  });
  const stats = useQuery({
    queryKey: ["fw-stats"],
    queryFn: () => firewallStats(),
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fw-block"] });
    qc.invalidateQueries({ queryKey: ["fw-white"] });
    qc.invalidateQueries({ queryKey: ["fw-stats"] });
  };

  const [newBlockIp, setNewBlockIp] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [newWhiteIp, setNewWhiteIp] = useState("");
  const [newWhiteNote, setNewWhiteNote] = useState("");

  const addBlock = useMutation({
    mutationFn: () =>
      blockIp({
        data: { ip: newBlockIp.trim(), reason: newBlockReason || "Manual block", minutes: 1440 },
      }),
    onSuccess: () => {
      setNewBlockIp("");
      setNewBlockReason("");
      toast.success("IP blocked");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const addWhite = useMutation({
    mutationFn: () => whitelistIp({ data: { ip: newWhiteIp.trim(), note: newWhiteNote } }),
    onSuccess: () => {
      setNewWhiteIp("");
      setNewWhiteNote("");
      toast.success("IP whitelisted");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const remBlock = useMutation({
    mutationFn: (ip: string) => unblockIp({ data: { ip } }),
    onSuccess: () => {
      toast.success("IP removed from blocklist");
      invalidate();
    },
  });
  const remWhite = useMutation({
    mutationFn: (ip: string) => removeWhitelist({ data: { ip } }),
    onSuccess: () => {
      toast.success("Removed from whitelist");
      invalidate();
    },
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Blocked IPs", stats.data?.blocklistSize ?? 0, "text-rose-600"],
          ["Whitelist", stats.data?.whitelistSize ?? 0, "text-emerald-600"],
          ["Blocked req (24h)", stats.data?.counts?.blocked_request ?? 0, "text-rose-600"],
          ["Rate limited (24h)", stats.data?.counts?.rate_limit ?? 0, "text-amber-600"],
          ["Suspicious payloads", stats.data?.counts?.suspicious_payload ?? 0, "text-rose-600"],
          ["CSRF rejects", stats.data?.counts?.csrf_reject ?? 0, "text-amber-600"],
          ["Failed logins", stats.data?.counts?.failed_login ?? 0, "text-amber-600"],
          ["Unauthorized admin", stats.data?.counts?.unauthorized_admin ?? 0, "text-rose-600"],
        ].map(([label, val, color]) => (
          <div key={label as string} className="rounded-xl border border-border bg-card p-3">
            <div className={`text-2xl font-extrabold ${color}`}>{val as number}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {label as string}
            </div>
          </div>
        ))}
      </div>

      {/* Blocklist */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
          <Ban className="h-4 w-4 text-rose-600" /> Blocked IPs (auto + manual)
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={newBlockIp}
            onChange={(e) => setNewBlockIp(e.target.value)}
            placeholder="IP address"
            className="flex-1 min-w-[160px] rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            value={newBlockReason}
            onChange={(e) => setNewBlockReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 min-w-[160px] rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => addBlock.mutate()}
            disabled={!newBlockIp.trim() || addBlock.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Block IP
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">IP</th>
                <th className="text-left p-2">Reason</th>
                <th className="text-left p-2">Trigger</th>
                <th className="text-left p-2">Hits</th>
                <th className="text-left p-2">Expires</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(block.data?.entries ?? []).map((b) => (
                <tr key={b.id}>
                  <td className="p-2 font-mono">{b.ip}</td>
                  <td className="p-2">{b.reason}</td>
                  <td className="p-2">
                    <Pill status="warn">{b.triggered_by}</Pill>
                  </td>
                  <td className="p-2">{b.hits}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {b.expires_at ? new Date(b.expires_at).toLocaleString() : "Permanent"}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => remBlock.mutate(b.ip)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!block.data?.entries?.length && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">
                    No blocked IPs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Whitelist */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Whitelist (bypasses blocks + rate
          limits)
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={newWhiteIp}
            onChange={(e) => setNewWhiteIp(e.target.value)}
            placeholder="IP address"
            className="flex-1 min-w-[160px] rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            value={newWhiteNote}
            onChange={(e) => setNewWhiteNote(e.target.value)}
            placeholder="Note (e.g. office IP)"
            className="flex-1 min-w-[160px] rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => addWhite.mutate()}
            disabled={!newWhiteIp.trim() || addWhite.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Whitelist
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">IP</th>
                <th className="text-left p-2">Note</th>
                <th className="text-left p-2">Added</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(white.data?.entries ?? []).map((w) => (
                <tr key={w.id}>
                  <td className="p-2 font-mono">{w.ip}</td>
                  <td className="p-2">{w.note || "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => remWhite.mutate(w.ip)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!white.data?.entries?.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-xs text-muted-foreground">
                    No whitelisted IPs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Events */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
          <Activity className="h-4 w-4" /> Recent security events
        </h3>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground sticky top-0 bg-card">
              <tr>
                <th className="text-left p-2">When</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">IP</th>
                <th className="text-left p-2">Path</th>
                <th className="text-left p-2">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(events.data?.events ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="p-2 text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <Pill
                      status={
                        e.severity === "critical" || e.severity === "high"
                          ? "fail"
                          : e.severity === "warn"
                            ? "warn"
                            : "info"
                      }
                    >
                      {e.event_type}
                    </Pill>
                  </td>
                  <td className="p-2 font-mono">{e.ip ?? "—"}</td>
                  <td className="p-2 font-mono truncate max-w-[200px]">{e.path ?? "—"}</td>
                  <td className="p-2">{e.severity}</td>
                </tr>
              ))}
              {!events.data?.events?.length && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    No events yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
