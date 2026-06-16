import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/role";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  Network,
  Eye,
  EyeOff,
  Bug,
  Server,
  Copy,
  Check,
  Download,
  Activity,
  KeyRound,
  FileCode2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ScannerPanel, FirewallPanel } from "@/components/admin/SecurityPanels";

export const Route = createFileRoute("/admin/security")({
  component: SecurityCenterPage,
  head: () => ({ meta: [{ title: "Security Center · INT-CRM" }] }),
});

// ---------- IIS web.config templates ----------

const IIS_HEADERS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <httpProtocol>
      <customHeaders>
        <!-- Disable framing (clickjacking) -->
        <add name="X-Frame-Options" value="DENY" />
        <!-- Block MIME sniffing -->
        <add name="X-Content-Type-Options" value="nosniff" />
        <!-- Cross-origin protections -->
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
        <add name="Cross-Origin-Opener-Policy" value="same-origin" />
        <add name="Cross-Origin-Resource-Policy" value="same-site" />
        <!-- Limit browser features -->
        <add name="Permissions-Policy" value="camera=(), microphone=(), geolocation=(), interest-cohort=()" />
        <!-- Force HTTPS for one year incl. subdomains -->
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
        <!-- Content Security Policy: tighten 'connect-src' to your Supabase/API origin -->
        <add name="Content-Security-Policy" value="default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" />
        <!-- Remove server fingerprinting -->
        <remove name="X-Powered-By" />
      </customHeaders>
    </httpProtocol>
    <security>
      <requestFiltering removeServerHeader="true">
        <!-- Limit request size (10 MB) -->
        <requestLimits maxAllowedContentLength="10485760" />
        <!-- Block path traversal & suspicious URLs -->
        <denyUrlSequences>
          <add sequence=".." />
          <add sequence=":" />
        </denyUrlSequences>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>`;

const IIS_PRIVATE_IP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <security>
      <!-- Requires the "IP and Domain Restrictions" IIS role service. -->
      <ipSecurity allowUnlisted="false" enableReverseDns="false">
        <!-- Loopback -->
        <add ipAddress="127.0.0.1" allowed="true" />
        <!-- RFC1918 private ranges -->
        <add ipAddress="10.0.0.0"    subnetMask="255.0.0.0"   allowed="true" />
        <add ipAddress="172.16.0.0"  subnetMask="255.240.0.0" allowed="true" />
        <add ipAddress="192.168.0.0" subnetMask="255.255.0.0" allowed="true" />
      </ipSecurity>
    </security>
  </system.webServer>
</configuration>`;

const IIS_REWRITE_HTTPS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Force HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="off" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
        <!-- SPA fallback so deep links resolve to index.html -->
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
      <outboundRules>
        <!-- Strip leaky headers if a backend reverse-proxy adds them -->
        <rule name="Remove Server header">
          <match serverVariable="RESPONSE_Server" pattern=".+" />
          <action type="Rewrite" value="" />
        </rule>
      </outboundRules>
    </rewrite>
  </system.webServer>
</configuration>`;

// ---------- helpers ----------

function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  return false;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".lan") || h.endsWith(".intranet")) return true;
  return isPrivateIPv4(h);
}

type CheckStatus = "pass" | "warn" | "fail" | "info";

interface HeaderCheck {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_HEADERS: HeaderCheck[] = [
  { name: "Strict-Transport-Security", required: true, description: "Forces HTTPS for return visits." },
  { name: "Content-Security-Policy", required: true, description: "Mitigates XSS by limiting allowed sources." },
  { name: "X-Frame-Options", required: true, description: "Stops clickjacking via iframes." },
  { name: "X-Content-Type-Options", required: true, description: "Disables MIME sniffing." },
  { name: "Referrer-Policy", required: true, description: "Prevents URL leakage to third parties." },
  { name: "Permissions-Policy", required: false, description: "Disables unused browser features." },
  { name: "Cross-Origin-Opener-Policy", required: false, description: "Isolates the browsing context." },
];

// ---------- UI ----------

function StatusPill({ status, children }: { status: CheckStatus; children: React.ReactNode }) {
  const cls =
    status === "pass" ? "bg-emerald-100 text-emerald-700 ring-emerald-300" :
    status === "warn" ? "bg-amber-100 text-amber-700 ring-amber-300" :
    status === "fail" ? "bg-rose-100 text-rose-700 ring-rose-300" :
                        "bg-slate-100 text-slate-700 ring-slate-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ring-1 ${cls}`}>
      {children}
    </span>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <header className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function CodeBlock({ code, filename }: { code: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`${filename} copied`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed");
    }
  };
  const download = () => {
    const blob = new Blob([code], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
          <FileCode2 className="h-3.5 w-3.5" /> {filename}
        </span>
        <div className="flex gap-1">
          <button onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={download} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>
      <pre className="max-h-[320px] overflow-auto px-3 py-3 text-[11px] leading-relaxed text-slate-100"><code>{code}</code></pre>
    </div>
  );
}

function SecurityCenterPage() {
  const { t } = useI18n();
  const { role, isAdmin } = useRole();
  const [blackBox, setBlackBox] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sec_blackbox") === "1";
  });
  const [antiTamper, setAntiTamper] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sec_antitamper") === "1";
  });
  const [autoMaskOnBlur, setAutoMaskOnBlur] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sec_automask") === "1";
  });
  const [tamperEvents, setTamperEvents] = useState<{ at: number; kind: string; detail?: string }[]>([]);
  const [hostInfo, setHostInfo] = useState<{ host: string; protocol: string; private: boolean } | null>(null);
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [headersLoading, setHeadersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"scanner" | "firewall" | "config">("scanner");


  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    setHostInfo({
      host,
      protocol: window.location.protocol.replace(":", ""),
      private: isPrivateHost(host),
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("sec-blackbox", blackBox);
    if (blackBox) localStorage.setItem("sec_blackbox", "1");
    else localStorage.removeItem("sec_blackbox");
  }, [blackBox]);

  // Auto-mask when the tab loses focus (shoulder-surfing / screen-share protection).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!autoMaskOnBlur) {
      localStorage.removeItem("sec_automask");
      return;
    }
    localStorage.setItem("sec_automask", "1");
    const onHide = () => document.body.classList.add("sec-blackbox");
    const onShow = () => { if (!blackBox) document.body.classList.remove("sec-blackbox"); };
    const onVis = () => (document.visibilityState === "hidden" ? onHide() : onShow());
    window.addEventListener("blur", onHide);
    window.addEventListener("focus", onShow);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onHide);
      window.removeEventListener("focus", onShow);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [autoMaskOnBlur, blackBox]);

  // Anti-tamper: frame-busting, devtools-open heuristic, print/screenshot shortcut deterrence,
  // and a console banner to mitigate self-XSS social-engineering.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!antiTamper) {
      localStorage.removeItem("sec_antitamper");
      return;
    }
    localStorage.setItem("sec_antitamper", "1");
    const log = (kind: string, detail?: string) =>
      setTamperEvents((prev) => [{ at: Date.now(), kind, detail }, ...prev].slice(0, 25));

    // 1. Frame-busting — refuse to render inside a foreign iframe.
    try {
      if (window.top && window.top !== window.self) {
        log("framed", "Page loaded inside an iframe — breaking out.");
        window.top.location.href = window.self.location.href;
      }
    } catch {
      log("framed", "Cross-origin iframe detected — blanking page.");
      document.body.style.display = "none";
    }

    // 2. Self-XSS console warning.
    // eslint-disable-next-line no-console
    console.log(
      "%c⛔ STOP",
      "color:#fff;background:#dc2626;font-size:32px;font-weight:900;padding:4px 12px;border-radius:6px;"
    );
    // eslint-disable-next-line no-console
    console.log(
      "%cPasting code here can hand your account to an attacker. Close this tab and contact IT if someone asked you to do this.",
      "color:#b91c1c;font-size:14px;font-weight:600;"
    );

    // 3. Devtools-open heuristic (window outer/inner delta).
    const devtoolsTimer = window.setInterval(() => {
      const threshold = 160;
      const wDiff = window.outerWidth - window.innerWidth;
      const hDiff = window.outerHeight - window.innerHeight;
      if (wDiff > threshold || hDiff > threshold) {
        document.body.classList.add("sec-blackbox");
      } else if (!blackBox && !document.hidden) {
        document.body.classList.remove("sec-blackbox");
      }
    }, 1000);

    // 4. Block right-click + screenshot/print shortcuts on sensitive fields.
    const onCtx = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".sec-mask, [data-sensitive]")) {
        e.preventDefault();
        log("contextmenu", "Right-click blocked on sensitive element.");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === "p" || k === "s")) {
        e.preventDefault();
        log("shortcut", `${e.ctrlKey ? "Ctrl" : "Cmd"}+${k.toUpperCase()} blocked.`);
        toast.warning(`${k === "p" ? "Print" : "Save"} disabled by Security Center.`);
      }
      if (k === "printscreen") {
        document.body.classList.add("sec-blackbox");
        log("printscreen", "PrintScreen detected — auto-masked.");
        window.setTimeout(() => { if (!blackBox) document.body.classList.remove("sec-blackbox"); }, 4000);
      }
    };
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection()?.toString() ?? "";
      const target = e.target as HTMLElement | null;
      if (target?.closest(".sec-mask, [data-sensitive]") && sel) {
        e.preventDefault();
        e.clipboardData?.setData("text/plain", "•".repeat(sel.length));
        log("copy", "Copy from sensitive element replaced with mask.");
      }
    };

    window.addEventListener("contextmenu", onCtx);
    window.addEventListener("keydown", onKey);
    window.addEventListener("copy", onCopy);
    return () => {
      window.clearInterval(devtoolsTimer);
      window.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("copy", onCopy);
    };
  }, [antiTamper, blackBox]);


  const runHeaderScan = async () => {
    setHeadersLoading(true);
    try {
      const res = await fetch(window.location.origin + "/", { method: "GET", cache: "no-store" });
      const obj: Record<string, string> = {};
      res.headers.forEach((v, k) => { obj[k.toLowerCase()] = v; });
      setHeaders(obj);
      toast.success("Headers fetched");
    } catch (e: any) {
      toast.error(`Scan failed: ${e?.message ?? "unknown"}`);
    } finally {
      setHeadersLoading(false);
    }
  };

  const headerResults = useMemo(() => {
    if (!headers) return null;
    return REQUIRED_HEADERS.map((h) => {
      const v = headers[h.name.toLowerCase()];
      const status: CheckStatus = v ? "pass" : h.required ? "fail" : "warn";
      return { ...h, value: v, status };
    });
  }, [headers]);

  if (!isAdmin) {
    return (
      <AppShell panel={role} user={{ name: "Admin", role: "Admin", initials: "AD" }} pageTitle="Security Center">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-10 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="font-display text-xl font-bold">Admins only</h2>
          <p className="mt-1 text-sm text-muted-foreground">You need admin privileges to view the Security Center.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell panel={role} user={{ name: "Admin", role: "Admin", initials: "AD" }} pageTitle="Security Center">
      {/* Hero */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-extrabold text-foreground">Security Center</h2>
            <p className="text-sm text-muted-foreground">
              Hardening guidance for an IIS deployment restricted to private IP ranges. Use the live scanner and copy the IIS snippets into your <span className="font-mono">web.config</span>.
            </p>
          </div>
          {hostInfo && (
            <div className="flex flex-col items-end gap-1 text-xs">
              <StatusPill status={hostInfo.protocol === "https" ? "pass" : "fail"}>
                {hostInfo.protocol.toUpperCase()}
              </StatusPill>
              <StatusPill status={hostInfo.private ? "pass" : "warn"}>
                {hostInfo.private ? "Private network" : "Public origin"}
              </StatusPill>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {[
          { id: "scanner", label: "OWASP Scanner" },
          { id: "firewall", label: "Firewall / IP Lists" },
          { id: "config", label: "Headers & IIS Config" },
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeTab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "scanner" && <ScannerPanel />}
      {activeTab === "firewall" && <FirewallPanel />}
      {activeTab === "config" && (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Header Security */}
        <Section icon={Lock} title="HTTP Header Security" subtitle="Verify response headers and apply the IIS template.">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={runHeaderScan}
              disabled={headersLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Activity className="h-3.5 w-3.5" /> {headersLoading ? "Scanning…" : "Scan current origin"}
            </button>
            {headerResults && (
              <span className="text-[11px] text-muted-foreground">
                {headerResults.filter((r) => r.status === "pass").length}/{headerResults.length} present
              </span>
            )}
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(headerResults ?? REQUIRED_HEADERS.map((h) => ({ ...h, status: "info" as CheckStatus, value: undefined as string | undefined }))).map((h) => (
              <li key={h.name} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">{h.name}</span>
                    {!h.required && <span className="text-[10px] font-bold uppercase text-muted-foreground">optional</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{h.description}</div>
                  {h.value && <div className="mt-1 truncate font-mono text-[11px] text-foreground/80">{h.value}</div>}
                </div>
                <StatusPill status={h.status}>
                  {h.status === "pass" ? "Present" : h.status === "fail" ? "Missing" : h.status === "warn" ? "Recommended" : "Not scanned"}
                </StatusPill>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-500" />
            Some headers are stripped from preview proxies — re-run this scan against your IIS host for accurate results.
          </p>
        </Section>

        {/* Black-boxing */}
        <Section icon={blackBox ? EyeOff : Eye} title="Black-Boxing (Screen Privacy)" subtitle="Mask sensitive cells when sharing a screen.">
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Mask values across the app</div>
                <p className="text-[11px] text-muted-foreground">
                  Blurs monetary values, contact info and IDs. Stored locally on this device only.
                </p>
              </div>
              <button
                onClick={() => setBlackBox((v) => !v)}
                aria-pressed={blackBox}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${blackBox ? "bg-primary" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${blackBox ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="mt-3 rounded-md border border-dashed border-border p-3 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview</div>
              <div className="mt-1 flex flex-wrap gap-3">
                <span>Email: <span className="sec-mask" data-sensitive>jane.doe@company.com</span></span>
                <span>Amount: <span className="sec-mask" data-sensitive>$48,300</span></span>
                <span>Phone: <span className="sec-mask" data-sensitive>+966 55 123 4567</span></span>
              </div>
            </div>

            {/* Auto-mask on tab blur */}
            <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-muted/30 p-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground">Auto-mask when tab loses focus</div>
                <p className="text-[11px] text-muted-foreground">Hides sensitive values on Alt-Tab, screen-share switch, or window blur.</p>
              </div>
              <button
                onClick={() => setAutoMaskOnBlur((v) => !v)}
                aria-pressed={autoMaskOnBlur}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${autoMaskOnBlur ? "bg-primary" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${autoMaskOnBlur ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Add the <span className="font-mono">sec-mask</span> class or <span className="font-mono">data-sensitive</span> attribute to any element that should hide during demos and shoulder-surfing.
            </p>
          </div>
        </Section>

        {/* Anti-Tamper */}
        <Section icon={ShieldAlert} title="Anti-Tamper Shield" subtitle="Active client-side defenses against framing, copy theft and console attacks.">
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Enable defensive runtime</div>
                <p className="text-[11px] text-muted-foreground">
                  Frame-busts foreign iframes, blocks right-click & copy on masked fields, intercepts Ctrl/Cmd+P/S, auto-masks on PrintScreen and devtools open, and prints a self-XSS warning in the console.
                </p>
              </div>
              <button
                onClick={() => setAntiTamper((v) => !v)}
                aria-pressed={antiTamper}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${antiTamper ? "bg-rose-600" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${antiTamper ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <ul className="mt-3 grid grid-cols-1 gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
              <li>• Frame-busting (clickjacking)</li>
              <li>• Right-click block on sensitive cells</li>
              <li>• Ctrl/Cmd + P / S interception</li>
              <li>• PrintScreen auto-mask (4s)</li>
              <li>• Devtools-open heuristic → mask</li>
              <li>• Copy from masked → bullets</li>
              <li>• Self-XSS console banner</li>
              <li>• Persisted per device</li>
            </ul>

            <div className="mt-3 rounded-md border border-dashed border-border p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent tamper events</div>
              {tamperEvents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No events yet.</p>
              ) : (
                <ul className="max-h-32 space-y-0.5 overflow-auto text-[11px]">
                  {tamperEvents.map((ev, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="font-mono font-semibold text-foreground">{ev.kind}</span>
                      <span className="truncate text-muted-foreground">{ev.detail}</span>
                      <span className="font-mono text-muted-foreground">{new Date(ev.at).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-2 text-[11px] text-amber-700">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              Client-side hardening only — keep CSP, HSTS and IP allowlists on IIS as the primary defense.
            </p>
          </div>
        </Section>


        {/* XSS */}
        <Section icon={Bug} title="XSS Defense" subtitle="What we enforce in code + what the server must enforce.">
          <ul className="space-y-2 text-xs">
            <li className="flex items-start gap-2">
              <StatusPill status="pass">In code</StatusPill>
              <span>React escapes interpolated text by default — never call <span className="font-mono">dangerouslySetInnerHTML</span> with user input.</span>
            </li>
            <li className="flex items-start gap-2">
              <StatusPill status="pass">In code</StatusPill>
              <span>All form inputs validated with <span className="font-mono">zod</span> schemas before hitting Supabase.</span>
            </li>
            <li className="flex items-start gap-2">
              <StatusPill status="warn">Server</StatusPill>
              <span>Apply the <span className="font-mono">Content-Security-Policy</span> header from the IIS template below to block injected scripts at the browser.</span>
            </li>
            <li className="flex items-start gap-2">
              <StatusPill status="warn">Server</StatusPill>
              <span>Keep <span className="font-mono">X-Content-Type-Options: nosniff</span> so a tampered upload can't execute as a script.</span>
            </li>
            <li className="flex items-start gap-2">
              <StatusPill status="info">Audit</StatusPill>
              <span>Search the repo for <span className="font-mono">dangerouslySetInnerHTML</span>, <span className="font-mono">eval(</span> and <span className="font-mono">new Function(</span> before each release.</span>
            </li>
          </ul>
        </Section>

        {/* Networking / private IP */}
        <Section icon={Network} title="Networking · Private IPs" subtitle="Restrict the IIS site to RFC1918 ranges only.">
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Globe className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold text-foreground">Allowed subnets</div>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                  <li><span className="font-mono">10.0.0.0/8</span></li>
                  <li><span className="font-mono">172.16.0.0/12</span></li>
                  <li><span className="font-mono">192.168.0.0/16</span></li>
                  <li><span className="font-mono">127.0.0.1</span> (loopback)</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Server className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold text-foreground">IIS prerequisites</div>
                <p className="text-muted-foreground">Install the <span className="font-mono">IP and Domain Restrictions</span> and <span className="font-mono">URL Rewrite</span> role services. Bind the site to the internal NIC only; do not publish port 80/443 on the public firewall.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <KeyRound className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold text-foreground">TLS inside the LAN</div>
                <p className="text-muted-foreground">Issue an internal CA certificate (or use AD Certificate Services) and bind HTTPS — HSTS only works over TLS.</p>
              </div>
            </div>
          </div>
        </Section>
      </div>
      )}

      {activeTab === "config" && (
      <div className="mt-6 space-y-5">
        <h3 className="font-display text-lg font-bold text-foreground">IIS <span className="font-mono text-base">web.config</span> templates</h3>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <CodeBlock code={IIS_HEADERS_XML} filename="web.config (security headers)" />
          <CodeBlock code={IIS_PRIVATE_IP_XML} filename="web.config (private IP allowlist)" />
          <CodeBlock code={IIS_REWRITE_HTTPS_XML} filename="web.config (HTTPS + SPA rewrite)" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Merge these snippets into a single <span className="font-mono">web.config</span> at the IIS site root. After deploying, re-run "Scan current origin" above to confirm the headers are live.
        </p>
      </div>
      )}
    </AppShell>
  );
}

