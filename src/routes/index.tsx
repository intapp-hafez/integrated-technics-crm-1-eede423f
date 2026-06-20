import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useI18n, LangToggle } from "@/lib/i18n";
import { PANEL_PATH, ROLE_PRIORITY, setStoredRole, useAuth, type Role } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function friendlyAuthError(msg: string, isAr: boolean): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
    return isAr ? "البريد الإلكتروني أو كلمة المرور غير صحيحة." : "Incorrect email or password.";
  }
  if (m.includes("email not confirmed")) {
    return isAr ? "لم يتم تأكيد البريد الإلكتروني بعد. تحقق من بريدك." : "Your email isn't confirmed yet. Check your inbox.";
  }
  if (m.includes("user disabled") || m.includes("banned") || m.includes("user is disabled") || m.includes("user_banned")) {
    return isAr ? "هذا الحساب معطّل أو موقوف. تواصل مع المسؤول." : "This account is disabled or locked. Contact your administrator.";
  }
  if (m.includes("too many") || m.includes("rate limit") || m.includes("over_request_rate")) {
    return isAr ? "محاولات كثيرة جدًا. حاول لاحقًا." : "Too many attempts. Please try again later.";
  }
  if (m.includes("network") || m.includes("failed to fetch")) {
    return isAr ? "تعذّر الاتصال بالخادم. تحقق من الإنترنت." : "Network error. Check your connection.";
  }
  return msg;
}

function Index() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const { user: authUser, panel: authPanel, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If a session is already restored on mount/refresh, send the user to their panel
  // instead of forcing them to sign in again.
  useEffect(() => {
    if (authLoading) return;
    if (authUser && authPanel) {
      navigate({ to: PANEL_PATH[authPanel], replace: true });
    }
  }, [authLoading, authUser, authPanel, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInErr || !data.user) {
        setError(friendlyAuthError(signInErr?.message ?? "Sign in failed", dir === "rtl"));
        return;
      }

      const { data: profileRow, error: profileErr } = await supabase
        .from("profiles")
        .select("active")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (profileRow && profileRow.active === false) {
        await supabase.auth.signOut();
        setError(dir === "rtl" ? "هذا الحساب معطّل. تواصل مع المسؤول." : "This account is deactivated. Contact your administrator.");
        return;
      }

      const { data: rolesRows, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      if (rolesErr) {
        setError(friendlyAuthError(rolesErr.message, dir === "rtl"));
        return;
      }

      const owned = new Set((rolesRows ?? []).map((r) => r.role as string));
      const role = ROLE_PRIORITY.find((r) => owned.has(r)) as Role | undefined;
      if (!role) {
        await supabase.auth.signOut();
        setError(
          dir === "rtl"
            ? "لا توجد صلاحيات مرتبطة بحسابك. تواصل مع المسؤول."
            : "No role assigned to this account. Contact your administrator.",
        );
        return;
      }
      setStoredRole(role);
      navigate({ to: PANEL_PATH[role], replace: true });
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Sign in failed", dir === "rtl"));
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="relative min-h-screen overflow-hidden bg-background" dir={dir}>
      {/* Decorative gradient panel */}
      <div className="absolute inset-y-0 hidden w-1/2 lg:block" style={{ insetInlineStart: 0 }}>
        <div className="relative h-full w-full" style={{ background: "var(--gradient-sidebar)" }}>
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, oklch(0.706 0.181 49.5 / 0.6), transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.706 0.181 49.5 / 0.3), transparent 50%)",
            }}
          />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg">
                <img src={logo} alt="Integrated Technics" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold tracking-tight">INT-CRM</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Integrated Technics
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
                {dir === "rtl"
                  ? "منصة العمليات والعلاقات الذكية للمؤسسات."
                  : "The operational intelligence layer for your enterprise."}
              </h2>
              <p className="max-w-md text-base text-white/70">
                {dir === "rtl"
                  ? "إدارة العملاء، الفرص، المشاريع، الموظفين والحضور — في منصة واحدة موحّدة متكاملة مع Odoo 19."
                  : "Unify leads, pipelines, projects, employees and attendance — fully integrated with Odoo 19."}
              </p>
            </div>

            <div className="text-[11px] text-white/40">
              {t("developedBy")} · {t("poweredBy")}
            </div>
          </div>
        </div>
      </div>

      {/* Login card */}
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12 lg:ms-[50%] lg:w-1/2">
        <div className="absolute top-6 flex items-center gap-3" style={{ insetInlineEnd: "1.5rem" }}>
          <LangToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 lg:hidden mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow ring-1 ring-border">
              <img src={logo} alt="INT-CRM" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <div className="font-display text-xl font-extrabold">INT-CRM</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Integrated Technics
              </div>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            {t("welcome")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("signInSub")}</p>

          <form className="mt-8 space-y-4" onSubmit={handleSignIn}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("email")}
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.875rem" }} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@integratedtechnics.com"
                  className="h-11 w-full rounded-lg border border-border bg-card text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ paddingInlineStart: "2.5rem", paddingInlineEnd: "0.875rem" }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("password")}
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.875rem" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-border bg-card text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ paddingInlineStart: "2.5rem", paddingInlineEnd: "2.75rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  style={{ insetInlineEnd: "0.5rem" }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] transition hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {dir === "rtl" ? "تسجيل الدخول" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            {dir === "rtl"
              ? "سيتم توجيهك إلى لوحتك تلقائيًا حسب صلاحياتك."
              : "You'll be routed to your panel automatically based on your role."}
          </p>

          <p className="mt-10 text-center text-[11px] text-muted-foreground">
            © 2026 Integrated Technics · INT-CRM v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
